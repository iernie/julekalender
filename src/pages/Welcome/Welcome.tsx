import React from "react";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import {
  User,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useState, SET_NOTIFICATION } from "../../StateProvider";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { CalendarType } from "../../types";
import { FiLogIn, FiLogOut } from "react-icons/fi";
import { Tooltip as ReactTooltip } from "react-tooltip";
import Title from "../../components/Title";
import styles from "./Welcome.module.scss";

const Welcome: React.FC = () => {
  const [, dispatch] = useState();
  const [user, setUser] = React.useState<User | null>(null);
  const [calendars, setCalendars] = React.useState<Array<CalendarType>>([]);
  const navigate = useNavigate();
  const [name, setName] = React.useState<string>();
  const db = getFirestore();

  const login = () => {
    signInWithPopup(getAuth(), new GoogleAuthProvider())
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
    getAuth().onAuthStateChanged((user) => {
      setUser(user);
    });
  }, []);

  React.useEffect(() => {
    const getCalendars = async () => {
      if (user) {
        const calendarReference = collection(db, "calendars");
        const calendarQuery = query(
          calendarReference,
          where("owner", "==", user.uid),
        );

        onSnapshot(calendarQuery, (calendars) => {
          setCalendars(
            calendars.docs.map((doc) => ({ ...doc.data() }) as CalendarType),
          );
        });
      }
    };
    getCalendars();
  }, [user]);

  const logout = async () => {
    await getAuth().signOut();
    setCalendars([]);
  };

  const createCalendar = async () => {
    dispatch({ type: SET_NOTIFICATION });
    if (name) {
      const calendarReference = doc(db, "calendars", name.toLocaleLowerCase());
      const calendarSnap = await getDoc(calendarReference);

      if (calendarSnap.exists()) {
        dispatch({
          type: SET_NOTIFICATION,
          payload: "Kalender finnes allerede",
        });
      } else {
        await setDoc(calendarReference, {
          id: uuidv4(),
          createdAt: Timestamp.fromDate(new Date()),
          deleteBy: Timestamp.fromDate(
            new Date(new Date().getFullYear() + 1, 1, 1),
          ),
          owner: user?.uid ?? undefined,
          name,
          public: true,
          settings: {
            fair: true,
          },
        } as CalendarType);
        navigate(`/${name.toLocaleLowerCase()}`);
      }
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
          data-tooltip-id="login"
          size="1.5rem"
          className={styles.login}
          onClick={login}
        />
      ) : (
        <FiLogOut
          data-tooltip-id="login"
          size="1.5rem"
          className={styles.login}
          onClick={logout}
        />
      )}
      <ReactTooltip id="login" place="bottom">
        {!user ? "Logg inn" : "Logg ut"}
      </ReactTooltip>
      <Title>Julekalender as a Service</Title>
      <div className={styles.form}>
        <input
          type="text"
          placeholder="Kalendernavn..."
          className={styles.input}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          disabled={!name || name === ""}
          type="button"
          className={styles.button}
          onClick={createCalendar}
        >
          Opprett
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
