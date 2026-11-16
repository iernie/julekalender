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
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  signInAnonymously,
  signInWithPopup,
  type Unsubscribe,
} from "firebase/auth";
import { useAppState, SET_NOTIFICATION } from "../../StateProvider";
import { Link, useNavigate } from "react-router";
import { type CalendarType } from "../../types";
import { expiresAt, isValidCalendarId, toCalendarId } from "../../helpers";
import { toCalendar } from "../../serialize";
import { FiLogIn, FiLogOut } from "react-icons/fi";
import { Tooltip as ReactTooltip } from "react-tooltip";
import PageTitle from "../../components/PageTitle";
import IconButton from "../../components/IconButton";
import NavBar from "../../components/NavBar";
import styles from "./Welcome.module.css";

export default function Welcome() {
  // Auth state comes from the single listener in the root layout.
  const [{ user }, dispatch] = useAppState();
  const [calendars, setCalendars] = React.useState<Array<CalendarType>>([]);
  const navigate = useNavigate();
  const [name, setName] = React.useState<string>("");
  const db = getFirestore();

  const isAnonymous = user?.isAnonymous ?? true;
  const uid = user?.uid;

  const login = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      // Upgrade the anonymous account so calendars created before signing in
      // stay owned by the same uid.
      if (auth.currentUser?.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
        // The Google account already exists; sign into it instead. Calendars
        // created under the throwaway anonymous uid are left behind.
        try {
          await signInWithPopup(auth, provider);
          return;
        } catch {
          // fall through to the generic failure notice
        }
      }
      if (code === "auth/popup-closed-by-user") return;
      dispatch({ type: SET_NOTIFICATION, payload: "Klarte ikke logge inn." });
    }
  };

  React.useEffect(() => {
    if (!uid) return;

    const calendarQuery = query(collection(db, "calendars"), where("owner", "==", uid));
    const unsub: Unsubscribe = onSnapshot(calendarQuery, (snapshot) => {
      setCalendars(snapshot.docs.map((entry) => toCalendar(entry.data())));
    });

    return () => {
      unsub();
      setCalendars([]);
    };
  }, [db, uid]);

  const logout = async () => {
    const auth = getAuth();
    await auth.signOut();
    setCalendars([]);
    // Keep an identity around so the user can still create calendars.
    await signInAnonymously(auth);
  };

  const createCalendar = async () => {
    dispatch({ type: SET_NOTIFICATION });

    const trimmed = name.trim();
    if (!trimmed) {
      dispatch({ type: SET_NOTIFICATION, payload: "Navn kan ikke være tomt" });
      return;
    }

    const calendarId = toCalendarId(trimmed);
    if (!isValidCalendarId(calendarId)) {
      dispatch({
        type: SET_NOTIFICATION,
        payload: "Navnet må være 2-40 tegn og kan kun inneholde bokstaver, tall, - og _",
      });
      return;
    }

    if (!uid) {
      dispatch({ type: SET_NOTIFICATION, payload: "Klarte ikke logge inn." });
      return;
    }

    const calendarReference = doc(db, "calendars", calendarId);
    const calendarSnap = await getDoc(calendarReference);

    if (calendarSnap.exists()) {
      dispatch({ type: SET_NOTIFICATION, payload: "Kalender finnes allerede" });
      return;
    }

    // Stored shape, not CalendarType: Firestore holds real Timestamps.
    await setDoc(calendarReference, {
      id: crypto.randomUUID(),
      createdAt: Timestamp.fromDate(new Date()),
      deleteBy: expiresAt(),
      owner: uid,
      name: trimmed,
      public: true,
      settings: {
        fair: true,
      },
    });
    navigate(`/${calendarId}`);
  };

  return (
    <div className={styles.welcome}>
      <NavBar
        right={
          <>
            <IconButton
              data-tooltip-id="login"
              label={isAnonymous ? "Logg inn" : "Logg ut"}
              onClick={isAnonymous ? login : logout}
            >
              {isAnonymous ? <FiLogIn size="1.5rem" /> : <FiLogOut size="1.5rem" />}
            </IconButton>
            <ReactTooltip id="login" place="bottom">
              {isAnonymous ? "Logg inn" : "Logg ut"}
            </ReactTooltip>
          </>
        }
      />
      <PageTitle>Julekalender as a Service</PageTitle>
      <div className={styles.form}>
        <input
          type="text"
          placeholder="Kalendernavn..."
          className={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          disabled={name.trim() === ""}
          type="button"
          className={styles.button}
          onClick={createCalendar}
        >
          Opprett
        </button>
      </div>
      {isAnonymous && <p className={styles.hint}>Logg inn med Google for å eie kalendrene dine.</p>}
      {calendars.length > 0 && (
        <>
          <h2 className={styles.calendars}>Dine kalendere</h2>
          {calendars.map((calendar) => {
            return (
              <Link
                key={calendar.name}
                className={styles.link}
                to={`/${toCalendarId(calendar.name)}`}
              >
                {calendar.name}
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}
