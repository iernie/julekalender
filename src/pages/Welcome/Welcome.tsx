import React from "react";
import firebase from "firebase";
import { useState, SET_NOTIFICATION } from "../../StateProvider";
import { useHistory } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { CalendarType } from "../../types";
import Title from "../../components/Title";
import styles from "./Welcome.module.scss";

const Welcome: React.FC = () => {
  const [, dispatch] = useState();
  const history = useHistory();
  const [name, setName] = React.useState<string>();

  const db = firebase.firestore();

  const createCalendar = () => {
    dispatch({ type: SET_NOTIFICATION });
    if (name) {
      db.collection("calendars")
        .doc(name.toLocaleLowerCase())
        .get()
        .then((calendar) => {
          if (calendar.exists) {
            dispatch({
              type: SET_NOTIFICATION,
              payload: "Kalender finnes allerede",
            });
          } else {
            db.collection("calendars")
              .doc(name.toLocaleLowerCase())
              .set({
                id: uuidv4(),
                createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
                name,
                settings: {
                  fair: true,
                },
                winners: [],
              } as CalendarType)
              .then(() => {
                history.push(`/${name}`);
              });
          }
        });
    } else {
      dispatch({
        type: SET_NOTIFICATION,
        payload: "Navn kan ikke være tomt",
      });
    }
  };

  return (
    <div className={styles.welcome}>
      <Title>Julekalender as a Service</Title>
      <div className={styles.form}>
        <input
          type="text"
          placeholder="Navn..."
          className={styles.input}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          disabled={!name || name === ""}
          type="button"
          className={styles.button}
          onClick={createCalendar}
        >
          Legg til
        </button>
      </div>
    </div>
  );
};

export default Welcome;
