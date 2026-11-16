import React from "react";
import classnames from "clsx";
import { getDate, getMonth, getYear, getDay } from "date-fns";
import { useState } from "../../StateProvider";
import { useNavigate, useParams, Link } from "react-router";
import { FiSettings } from "react-icons/fi";
import PageTitle from "../../components/PageTitle";
import IconButton from "../../components/IconButton";
import { toCalendarId } from "../../helpers";
import styles from "./Calendar.module.css";
import { Tooltip as ReactTooltip } from "react-tooltip";

export default function Calendar() {
  const [{ calendar, users }] = useState();
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
      <PageTitle>{calendar.name}</PageTitle>
      <IconButton
        data-tooltip-id="admin"
        className={styles.settings}
        label="Innstillinger"
        onClick={() => navigate(`/${toCalendarId(name)}/settings`)}
      >
        <FiSettings size="1.5rem" />
      </IconButton>
      <ReactTooltip id="admin" place="bottom">
        Innstillinger
      </ReactTooltip>
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

          if (open && !winner && !ignoreWeekend) {
            return (
              <Link
                to={`/${toCalendarId(calendar.name)}/open/${day + 1}`}
                key={day + 1}
                className={dayClass}
              >
                <span className={styles.number}>{day + 1}</span>
              </Link>
            );
          }

          const css = {
            "--grid-column-start": firstDayOfTheMonth,
          } as React.CSSProperties;

          return (
            <div key={day + 1} className={dayClass} style={day === 0 ? css : undefined}>
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
