import React from "react";
import classnames from "classnames";
import { useState, SET_NOTIFICATION } from "../../StateProvider";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Confetti from "react-confetti";
import { FiHome, FiRotateCcw } from "react-icons/fi";
import Title from "../../components/Title";
import { useWindowSize } from "react-use";
import styles from "./Open.module.scss";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { UserType } from "../../types";
import { doc, getFirestore, updateDoc } from "firebase/firestore";

const Open: React.FC = () => {
  const [{ calendar, users }, dispatch] = useState();
  const { name, day } = useParams() as { name: string; day: string };
  const navigate = useNavigate();
  const db = getFirestore();

  const { width, height } = useWindowSize();

  const winner = users?.find((user) => user.won.indexOf(day) !== -1);

  const refreshedWinners = React.useRef<Array<UserType["id"]>>([]);
  const [step, setStep] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (step === 1) {
      setTimeout(
        () => {
          setStep(2);
        },
        Math.random() * 6000 + 2000,
      );
    }

    if (step === 2) {
      setTimeout(() => {
        setStep(3);
      }, 400);
    }
  }, [step]);

  React.useEffect(() => {
    if (winner && step === null) setStep(3);
  }, [step, winner]);

  if (!users) return null;

  if (users.length === 0) {
    dispatch({
      type: SET_NOTIFICATION,
      payload: "Fant ingen brukere",
    });
    return <Navigate to={`/${name.toLocaleLowerCase()}`} />;
  }

  const chooseWinner = async () => {
    setStep(0);
    const highestWins = Math.max(...users.map((user) => user.won.length));
    const lowestWins = Math.min(...users.map((user) => user.won.length));

    const filteredUsers = users
      .filter((user) => refreshedWinners.current.indexOf(user.id) === -1)
      .filter(
        (user) =>
          !calendar.settings.fair ||
          highestWins === lowestWins ||
          user.won.length < highestWins,
      )
      .filter(
        (user) =>
          !calendar.settings.giftsPerUser ||
          user.won.length < calendar.settings.giftsPerUser,
      );

    if (filteredUsers.length === 0) {
      dispatch({
        type: SET_NOTIFICATION,
        payload: "Tom for vinnere",
      });
      navigate(`/${name.toLocaleLowerCase()}`);
      return;
    }

    const newWinner =
      filteredUsers[Math.floor(Math.random() * filteredUsers.length)];

    if (!newWinner) {
      dispatch({
        type: SET_NOTIFICATION,
        payload: "Klarte ikke velge ny vinner",
      });
      return;
    }

    refreshedWinners.current.push(newWinner.id);

    const userReference = doc(db, "users", newWinner.id);
    await updateDoc(userReference, {
      won: [...newWinner.won, day],
    });
    setStep(1);
  };

  const stepClass = classnames({
    [styles[`step-${step}`]]: true,
  });

  return (
    <div>
      <Title>Vinneren er...</Title>
      <FiHome
        data-tooltip-id="home"
        size="1.5rem"
        className={styles.settings}
        onClick={() => {
          navigate(`/${name.toLocaleLowerCase()}`);
        }}
      />
      <ReactTooltip id="home" place="bottom">
        Hjem
      </ReactTooltip>
      <div className={stepClass}>
        <div className={styles.winner}>
          <div className={styles.avatar}>
            <img
              className={styles.image}
              src={winner?.image}
              alt={winner?.name}
            />
          </div>

          <h1>{winner?.name}</h1>
        </div>
        {(step === null || step < 3) && (
          <div
            className={styles.giftbox}
            onClick={() => (step !== 1 ? chooseWinner() : () => {})}
          >
            <div className={styles.cover}>
              <div className={styles.bow}></div>
            </div>
            <div className={styles.box}></div>
          </div>
        )}
        {step !== null && step === 3 && (
          <FiRotateCcw
            data-tooltip-id="refresh"
            size="1.5rem"
            className={styles.refresh}
            onClick={async () => {
              if (winner) {
                setStep(0);
                const userReference = doc(db, "users", winner.id);
                await updateDoc(userReference, {
                  won: winner?.won.filter((d) => d !== day),
                });
              }
            }}
          />
        )}
      </div>
      {step !== 0 && (
        <Confetti
          recycle={false}
          run={step !== null && step > 1}
          width={width}
          height={height}
        />
      )}
      <ReactTooltip id="refresh" place="bottom">
        Nullstill vinner
      </ReactTooltip>
    </div>
  );
};

export default Open;
