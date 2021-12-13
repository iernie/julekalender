import React from "react";
import firebase from "firebase/compat/app";
import { useState, SET_NOTIFICATION } from "../../StateProvider";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { CalendarType } from "../../types";
import { FiLogIn, FiLogOut } from "react-icons/fi";
import ReactTooltip from "react-tooltip";
import Title from "../../components/Title";
import styles from "./Welcome.module.scss";

const Welcome: React.FC = () => {
  const [, dispatch] = useState();
  const [user, setUser] = React.useState<firebase.User | null>(null);
  const [calendars, setCalendars] = React.useState<Array<CalendarType>>([]);
  const navigate = useNavigate();
  const [name, setName] = React.useState<string>();

  const db = firebase.firestore();

  const login = () => {
    firebase
      .auth()
      .signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then((result) => {
        if (!result.user) {
          dispatch({
            type: SET_NOTIFICATION,
            payload: "Klarte ikke logge inn.",
          });
        }
      })
      .catch(() => {
        dispatch({ type: SET_NOTIFICATION, payload: "Klarte ikke logge inn." });
      });
  };

  React.useEffect(() => {
    firebase.auth().onAuthStateChanged((user) => {
      setUser(user);
      ReactTooltip.rebuild();
    });
  }, []);

  React.useEffect(() => {
    if (user) {
      firebase
        .firestore()
        .collection("calendars")
        .where("owner", "==", user.uid)
        .onSnapshot((snapshot) => {
          setCalendars(
            snapshot.docs.map((doc) => ({ ...doc.data() } as CalendarType))
          );
        });
    }
  }, [user]);

  const logout = () => {
    firebase
      .auth()
      .signOut()
      .then(() => {
        setCalendars([]);
      })
      .catch(() => {});
  };

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
                public: true,
                settings: {
                  fair: true,
                },
              } as CalendarType)
              .then(() => {
                navigate(`/${name.toLocaleLowerCase()}`);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      dispatch({
        type: SET_NOTIFICATION,
        payload: "Navn kan ikke være tomt",
      });
    }
  };

  return (
    <div className={styles.welcome}>
      {!user ? (
        <FiLogIn
          data-tip
          data-for="login"
          size="1.5rem"
          className={styles.login}
          onClick={login}
        />
      ) : (
        <FiLogOut
          data-tip
          data-for="login"
          size="1.5rem"
          className={styles.login}
          onClick={logout}
        />
      )}
      <ReactTooltip id="login" place="bottom" effect="solid">
        {!user ? "Logg inn" : "Logg ut"}
      </ReactTooltip>
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
      {calendars.length > 0 && (
        <>
          <h2 className={styles.calendars}>Dine kalendere</h2>
          {calendars.map((calendar) => {
            return (
              <Link
                key={calendar.name}
                className={styles.link}
                to={`/${calendar.name.toLocaleLowerCase()}`}
              >
                {calendar.name}
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
};

export default Welcome;
