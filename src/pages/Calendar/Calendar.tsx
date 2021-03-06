import React from "react";
import classnames from "classnames";
import { getDate, getMonth } from "date-fns";
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

  return (
    <div className={styles.calendar}>
      <Title>{calendar.name}</Title>
      <FiSettings
        data-tip
        data-for="admin"
        size="1.5rem"
        className={styles.settings}
        onClick={() => {
          history.push(`/${name}/settings`);
        }}
      />
      <ReactTooltip id="admin" place="bottom" effect="solid">
        Innstillinger
      </ReactTooltip>
      <div className={styles.days}>
        {Array.from(Array(24).keys()).map((day) => {
          const open = day < getDate(new Date()) && getMonth(new Date()) === 11;
          const winner = users?.find(
            (user) => user.won.indexOf(`${day + 1}`) !== -1
          );
          const dayClass = classnames({
            [styles.day]: true,
            [styles.winner]: winner !== undefined,
            [styles.open]: open && !winner,
          });

          if (open && !winner) {
            return (
              <Link
                to={`${calendar.name}/open/${day + 1}`}
                key={day + 1}
                className={dayClass}
              >
                {day + 1}
              </Link>
            );
          }

          return (
            <div key={day + 1} className={dayClass}>
              {!winner && day + 1}
              {winner && (
                <div className={styles.avatar}>
                  <img
                    className={styles.image}
                    src={winner.image}
                    alt={winner.name}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
