import React from "react";
import classnames from "clsx";
import { getDate, getMonth, getYear, getDay } from "date-fns";
import { useState } from "../../StateProvider";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import Title from "../../components/Title";
import styles from "./Calendar.module.css";
import { Tooltip as ReactTooltip } from "react-tooltip";

const Calendar: React.FC = () => {
  const [{ calendar, users }] = useState();
  const navigate = useNavigate();
  const { name } = useParams() as { name: string };
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

  const firstDayOfTheMonth =
    getDay(new Date(getYear(calendar.createdAt.toDate()), 11, 1)) === 0
      ? 7
      : getDay(new Date(getYear(calendar.createdAt.toDate()), 11, 1));

  return (
    <div className={styles.calendar}>
      <Title>{calendar.name}</Title>
      <FiSettings
        data-tooltip-id="admin"
        size="1.5rem"
        className={styles.settings}
        onClick={() => {
          navigate(`/${name.toLocaleLowerCase()}/settings`);
        }}
      />
      <ReactTooltip id="admin" place="bottom">
        Innstillinger
      </ReactTooltip>
      <div className={styles.days}>
        {Array.from(Array(24).keys()).map((day) => {
          const open =
            hotkey ||
            (day < getDate(new Date()) && getMonth(new Date()) === 11);
          const winner = users?.find(
            (user) => user.won.indexOf(`${day + 1}`) !== -1,
          );
          const ignoreWeekend =
            calendar.settings.ignoreWeekends &&
            (getDay(
              new Date(getYear(calendar.createdAt.toDate()), 11, day + 1),
            ) === 0 ||
              getDay(
                new Date(getYear(calendar.createdAt.toDate()), 11, day + 1),
              ) === 6);
          const dayClass = classnames({
            [styles.day]: true,
            [styles.winner]: winner !== undefined,
            [styles.open]: open && !winner,
            [styles.ignore]: ignoreWeekend,
            [styles.first]: day === 0,
          });

          if (open && !winner && !ignoreWeekend) {
            return (
              <Link
                to={`/${calendar.name.toLocaleLowerCase()}/open/${day + 1}`}
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
            <div
              key={day + 1}
              className={dayClass}
              style={day === 0 ? css : undefined}
            >
              {winner && (
                <div className={styles.avatar}>
                  <img
                    className={styles.image}
                    src={winner.image}
                    alt={winner.name}
                  />
                </div>
              )}
              <span className={styles.number}>{day + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
