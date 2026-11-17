import React from "react";
import classnames from "clsx";
import { useAppState, useCalendar, SET_NOTIFICATION } from "../../StateProvider";
import { Navigate, useNavigate, useParams } from "react-router";
import Confetti from "react-confetti";
import { FiHome, FiRotateCcw, FiUserMinus } from "react-icons/fi";
import PageTitle from "../../components/PageTitle";
import IconButton from "../../components/IconButton";
import NavBar from "../../components/NavBar";
import styles from "./Open.module.css";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { FUNCTIONS_REGION, toCalendarId } from "../../helpers";
import { useMounted, usePrefersReducedMotion, useWindowSize } from "../../hooks";
import { genericMeta, metaCalendarData, metaOrigin, socialMeta } from "../../meta";
import type { Route } from "./+types/Open";
import { getFunctions, httpsCallable } from "firebase/functions";

export const meta: Route.MetaFunction = ({ matches, params }) => {
  const data = metaCalendarData(matches);
  const calendar = data?.calendar;
  const day = params.day;
  if (!calendar || !day) return genericMeta(matches);

  const id = toCalendarId(calendar.name);
  const winner = data.users.find((user) => user.won.includes(day));

  return socialMeta({
    title: winner
      ? `${winner.name || "Vinneren"} vant luke ${day} - ${calendar.name}`
      : `Luke ${day} - ${calendar.name}`,
    description: winner
      ? `${winner.name || "Vinneren"} vant gaven bak luke ${day} i julekalenderen til ${calendar.name}.`
      : `Luke ${day} i julekalenderen til ${calendar.name} er ikke åpnet ennå.`,
    image: `${metaOrigin(matches)}/og/${id}/${day}/og.png`,
  });
};

export default function Open() {
  const [{ users }, dispatch] = useAppState();
  const calendar = useCalendar();
  const { name, day } = useParams<{ name: string; day: string }>();
  const navigate = useNavigate();

  const { width, height } = useWindowSize();
  const mounted = useMounted();
  const reducedMotion = usePrefersReducedMotion();

  const winner = day ? users?.find((user) => user.won.indexOf(day) !== -1) : undefined;

  const [excluded, setExcluded] = React.useState<ReadonlySet<string>>(() => new Set());
  const [step, setStep] = React.useState<number | null>(null);
  const [drawn, setDrawn] = React.useState<boolean>(false);
  const [showUsers, setShowUsers] = React.useState<boolean>(false);

  // Derived rather than pushed into state from an effect: an already-drawn day
  // lands straight on the final step, and the box only opens once the draw has
  // resolved, the suspense delay has passed and the winner has reached state.
  const current = step === 1 && drawn && winner ? 2 : (step ?? (winner ? 3 : null));

  React.useEffect(() => {
    if (current !== 2) return;
    const timer = setTimeout(() => setStep(3), 400);
    return () => clearTimeout(timer);
  }, [current]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (!["INPUT", "LABEL", "UL", "LI"].includes((e.target as HTMLElement).nodeName)) {
        setShowUsers(false);
      }
    };

    if (showUsers) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUsers]);

  if (!name) return null;
  if (!users) return null;

  if (users.length === 0) {
    dispatch({ type: SET_NOTIFICATION, payload: "Fant ingen brukere" });
    return <Navigate to={`/${toCalendarId(name)}`} />;
  }

  const highestWins = Math.max(...users.map((user) => user.won.length));
  const lowestWins = Math.min(...users.map((user) => user.won.length));

  // Mirrors the authoritative filtering in the drawWinner callable; used only
  // to render the checkbox list.
  const viableUsers = users
    .filter(
      (user) =>
        !calendar.settings.fair || highestWins === lowestWins || user.won.length < highestWins,
    )
    .filter(
      (user) => !calendar.settings.giftsPerUser || user.won.length < calendar.settings.giftsPerUser,
    );

  const notify = (error: unknown, fallback: string) => {
    const message = (error as { message?: string })?.message?.replace(/^.*?: /, "") ?? fallback;
    dispatch({ type: SET_NOTIFICATION, payload: message || fallback });
  };

  const chooseWinner = async () => {
    if (!day) return;
    // Start shaking straight away; the network round trip runs concurrently
    // with the suspense delay instead of before it.
    setDrawn(false);
    setStep(1);
    try {
      const suspense = new Promise((resolve) => setTimeout(resolve, Math.random() * 6000 + 2000));
      const draw = httpsCallable<
        { calendarId: string; day: string; excluded: Array<string> },
        { id: string; name: string; image: string }
      >(getFunctions(undefined, FUNCTIONS_REGION), "drawWinner");

      await Promise.all([
        draw({
          calendarId: toCalendarId(name),
          day,
          excluded: [...excluded],
        }),
        suspense,
      ]);
      setDrawn(true);
    } catch (error) {
      setStep(null);
      notify(error, "Klarte ikke velge ny vinner");
    }
  };

  const resetWinner = async () => {
    if (!day) return;
    setStep(0);
    try {
      const reset = httpsCallable<{ calendarId: string; day: string }, unknown>(
        getFunctions(undefined, FUNCTIONS_REGION),
        "resetWinner",
      );
      await reset({ calendarId: toCalendarId(name), day });
      setStep(null);
    } catch (error) {
      setStep(3);
      notify(error, "Klarte ikke nullstille vinner");
    }
  };

  const stepClass = classnames({ [styles[`step-${current}`]]: true });

  return (
    <div>
      <NavBar
        right={
          <>
            <div className={styles.usersMenu}>
              <IconButton
                data-tooltip-id="users"
                label="Fjern brukere fra dagens trekning"
                onClick={() => setShowUsers(true)}
              >
                <FiUserMinus size="1.5rem" />
              </IconButton>
              <ReactTooltip id="users" place="bottom">
                Fjern brukere fra dagens trekning
              </ReactTooltip>
              <ul
                className={classnames({
                  [styles.userlist]: true,
                  [styles.visible]: showUsers,
                })}
              >
                {users.map((user) => (
                  <li key={user.id}>
                    <label>
                      <input
                        disabled={viableUsers.every((u) => u.id !== user.id)}
                        type="checkbox"
                        checked={
                          viableUsers.some((u) => u.id === user.id) && !excluded.has(user.id)
                        }
                        onChange={(e) => {
                          setExcluded((previous) => {
                            const next = new Set(previous);
                            if (e.target.checked) {
                              next.delete(user.id);
                            } else {
                              next.add(user.id);
                            }
                            return next;
                          });
                        }}
                      />
                      {user.name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <IconButton
              data-tooltip-id="home"
              label="Hjem"
              onClick={() => navigate(`/${toCalendarId(name)}`)}
            >
              <FiHome size="1.5rem" />
            </IconButton>
            <ReactTooltip id="home" place="bottom">
              Hjem
            </ReactTooltip>
          </>
        }
      />
      <PageTitle>Luke {day}</PageTitle>
      <div className={stepClass}>
        <div className={styles.winner}>
          <div className={styles.avatar}>
            <img className={styles.image} src={winner?.image} alt={winner?.name} />
          </div>
          <p className={styles.winnerLabel}>Vinneren er</p>
          <h1 className={styles.winnerName}>{winner?.name}</h1>
        </div>
        {(current === null || current < 3) && (
          <button
            type="button"
            className={styles.giftbox}
            aria-label="Trekk dagens vinner"
            disabled={current === 0 || current === 1}
            onClick={chooseWinner}
          >
            <div className={styles.cover}>
              <div className={styles.bow}></div>
            </div>
            <div className={styles.box}></div>
          </button>
        )}
        {current === 3 && (
          <IconButton
            data-tooltip-id="refresh"
            className={styles.refresh}
            label="Nullstill vinner"
            onClick={resetWinner}
          >
            <FiRotateCcw size="1.5rem" />
          </IconButton>
        )}
      </div>
      {mounted && !reducedMotion && current !== 0 && (
        <Confetti
          recycle={false}
          run={current !== null && current > 1}
          width={width}
          height={height}
        />
      )}
      <ReactTooltip id="refresh" place="bottom">
        Nullstill vinner
      </ReactTooltip>
    </div>
  );
}
