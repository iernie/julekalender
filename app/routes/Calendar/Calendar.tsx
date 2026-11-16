import classnames from "clsx";
import { getDate, getDay, getMonth, getYear } from "date-fns";
import React from "react";
import { FiSettings } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router";
import { Tooltip as ReactTooltip } from "react-tooltip";
import IconButton from "../../components/IconButton";
import NavBar from "../../components/NavBar";
import PageTitle from "../../components/PageTitle";
import { toCalendarId } from "../../helpers";
import { genericMeta, metaCalendarData, metaOrigin, socialMeta } from "../../meta";
import { useAppState, useCalendar } from "../../StateProvider";
import type { Route } from "./+types/Calendar";
import styles from "./Calendar.module.css";

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = metaCalendarData(matches);
  const calendar = data?.calendar;
  if (!calendar) return genericMeta();

  const id = toCalendarId(calendar.name);
  const opened = new Set(data.users.flatMap((user) => user.won)).size;

  return socialMeta({
    title: `${calendar.name} - Julekalender`,
    description: `${opened} av 24 luker er åpnet i julekalenderen til ${calendar.name}.`,
    image: `${metaOrigin(matches)}/og/${id}/og.png`,
  });
};

export default function Calendar() {
  const [{ users }] = useAppState();
  const calendar = useCalendar();
  // Held in state so the grid re-evaluates when the tab regains focus across
  // midnight, rather than reading the clock during render.
  const [now, setNow] = React.useState<Date>(() => new Date());
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const [hotkey, setHotkey] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        setHotkey(true);
      } else {
        setHotkey(false);
      }
    };

    window.addEventListener("keydown", onKeyDown, false);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  React.useEffect(() => {
    const onVisibilityChange = () => {
      setNow(new Date());
    };

    window.addEventListener("visibilitychange", onVisibilityChange, false);
    window.addEventListener("focus", onVisibilityChange, false);

    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, []);

  if (!name) return null;

  const today = getDate(now);
  const calendarYear = getYear(new Date(calendar.createdAt));

  const firstDayOfTheMonth =
    getDay(new Date(calendarYear, 11, 1)) === 0 ? 7 : getDay(new Date(calendarYear, 11, 1));

  return (
    <div className={styles.calendar}>
      <NavBar
        right={
          <>
            <IconButton
              data-tooltip-id="admin"
              label="Innstillinger"
              onClick={() => navigate(`/${toCalendarId(name)}/settings`)}
            >
              <FiSettings size="1.5rem" />
            </IconButton>
            <ReactTooltip id="admin" place="bottom">
              Innstillinger
            </ReactTooltip>
          </>
        }
      />
      <PageTitle>{calendar.name}</PageTitle>
      <div className={styles.days}>
        {Array.from(Array(24).keys()).map((day) => {
          const open = hotkey || (day < today && getMonth(now) === 11);
          const winner = users?.find((user) => user.won.indexOf(`${day + 1}`) !== -1);
          const ignoreWeekend =
            calendar.settings.ignoreWeekends &&
            (getDay(new Date(calendarYear, 11, day + 1)) === 0 ||
              getDay(new Date(calendarYear, 11, day + 1)) === 6);
          const dayClass = classnames({
            [styles.day]: true,
            [styles.winner]: winner !== undefined,
            [styles.open]: open && !winner,
            [styles.ignore]: ignoreWeekend,
            [styles.firstday]: day === 0,
          });

          const css = {
            "--grid-column-start": firstDayOfTheMonth,
            "--tile-index": day,
          } as React.CSSProperties;
          const tileCss = { "--tile-index": day } as React.CSSProperties;

          if (open && !winner && !ignoreWeekend) {
            return (
              <Link
                to={`/${toCalendarId(calendar.name)}/open/${day + 1}`}
                key={day + 1}
                className={dayClass}
                style={day === 0 ? css : tileCss}
              >
                <span className={styles.number}>{day + 1}</span>
              </Link>
            );
          }

          return (
            <div key={day + 1} className={dayClass} style={day === 0 ? css : tileCss}>
              {winner && (
                <div className={styles.avatar}>
                  <img className={styles.image} src={winner.image} alt={winner.name} />
                </div>
              )}
              <span className={styles.number}>{day + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
