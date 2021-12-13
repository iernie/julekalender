import React from "react";
import classnames from "classnames";
import { getDate, getMonth, getYear, getDay } from "date-fns";
import { useState } from "../../StateProvider";
import { useHistory, useParams, Link } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import Title from "../../components/Title";
import styles from "./Calendar.module.scss";
import ReactTooltip from "react-tooltip";

const Calendar: React.FC = () => {
  const [{ calendar, users }] = useState();
  const history = useHistory();
  const { name } = useParams<{ name: string }>();

  const firstDayOfTheMonth =
    getDay(new Date(getYear(new Date()), 11, 1)) === 0
      ? 6
      : getDay(new Date(getYear(new Date()), 11, 1)) - 1;

  return (
    <div className={styles.calendar}>
      <Title>{calendar.name}</Title>
      <FiSettings
        data-tip
        data-for="admin"
        size="1.5rem"
        className={styles.settings}
        onClick={() => {
          history.push(`/${name.toLowerCase()}/settings`);
        }}
      />
      <ReactTooltip id="admin" place="bottom" effect="solid">
        Innstillinger
      </ReactTooltip>
      <div className={styles.days}>
        {Array.from(Array(firstDayOfTheMonth).keys()).map((day) => (
          <div className={styles.hidden}>{day}</div>
        ))}
        {Array.from(Array(24).keys()).map((day) => {
          const open = day < getDate(new Date()) && getMonth(new Date()) === 11;
          const winner = users?.find(
            (user) => user.won.indexOf(`${day + 1}`) !== -1
          );
          const ignoreWeekend =
            calendar.settings.ignoreWeekends &&
            (getDay(new Date(getYear(new Date()), 11, day + 1)) === 0 ||
              getDay(new Date(getYear(new Date()), 11, day + 1)) === 6);
          const dayClass = classnames({
            [styles.day]: true,
            [styles.winner]: winner !== undefined,
            [styles.open]: open && !winner,
            [styles.ignore]: ignoreWeekend,
          });

          if (open && !winner && !ignoreWeekend) {
            return (
              <Link
                to={`/${calendar.name.toLowerCase()}/open/${day + 1}`}
                key={day + 1}
                className={dayClass}
              >
                <span className={styles.number}>{day + 1}</span>
              </Link>
            );
          }

          return (
            <div key={day + 1} className={dayClass}>
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
