import React from "react";
import firebase from "firebase";
import classnames from "classnames";
import { useState, SET_NOTIFICATION } from "../../StateProvider";
import { Redirect, useHistory, useParams } from "react-router-dom";
import Confetti from "react-confetti";
import { FiHome, FiRefreshCcw } from "react-icons/fi";
import Title from "../../components/Title";
import { useWindowSize } from "react-use";
import styles from "./Open.module.scss";

const Open: React.FC = () => {
  const [{ calendar, users }, dispatch] = useState();
  const { name, day } = useParams<{ name: string; day: string }>();
  const history = useHistory();

  const { width, height } = useWindowSize();

  const db = firebase.firestore();

  const winner = users?.find((user) => user.won.indexOf(day) !== -1);

  const [step, setStep] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (step === 1) {
      setTimeout(() => {
        setStep(2);
      }, Math.random() * 6000 + 2000);
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
    return <Redirect to={`/${name}`} />;
  }

  const chooseWinner = () => {
    setStep(0);
    const highestWins = Math.max(...users.map((user) => user.won.length));
    const lowestWins = Math.min(...users.map((user) => user.won.length));

    const filteredUsers = users
      .filter(
        (user) =>
          !calendar.settings.fair ||
          highestWins === lowestWins ||
          user.won.length < highestWins
      )
      .filter(
        (user) =>
          !calendar.settings.giftsPerUser ||
          user.won.length < calendar.settings.giftsPerUser
      );

    if (filteredUsers.length === 0) {
      dispatch({
        type: SET_NOTIFICATION,
        payload: "Tom for vinnere",
      });
      history.push(`/${name}`);
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

    db.collection("users")
      .doc(newWinner.id)
      .update({
        won: [...newWinner.won, day],
      })
      .then(() => {
        setStep(1);
      })
      .catch(() => {});
  };

  const stepClass = classnames({
    [styles[`step-${step}`]]: true,
  });

  return (
    <div>
      <Title>Vinneren er...</Title>
      <FiHome
        size="1.5rem"
        className={styles.settings}
        onClick={() => {
          history.push(`/${name}`);
        }}
      />
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
          <FiRefreshCcw
            size="1.5rem"
            className={styles.refresh}
            onClick={() => {
              setStep(0);
              db.collection("users")
                .doc(winner?.id)
                .update({
                  won: winner?.won.filter((d) => d !== day),
                })
                .then(() => {})
                .catch(() => {});
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
    </div>
  );
};

export default Open;
