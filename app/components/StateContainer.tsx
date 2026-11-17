import React from "react";
import { type Unsubscribe } from "firebase/auth";
import { collection, doc, getFirestore, onSnapshot } from "firebase/firestore";
import { useAppState, SET_CALENDAR, SET_NOTIFICATION, SET_USERS } from "../StateProvider";
import { Outlet, useNavigate, useParams } from "react-router";
import Loading from "./Loading";
import { toCalendarId } from "../helpers";
import { toCalendar, toUser } from "../serialize";
import { adminDb } from "../firebase.server";
import type { Route } from "./+types/StateContainer";

/**
 * Server-renders public calendars so the first paint has real content and
 * shared links work. Private calendars cannot be authorised here — the server
 * has no user session — so they fall through to the client listeners below and
 * briefly show the loading state, as before.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const calendarId = toCalendarId(params.name ?? "");
  const snapshot = await adminDb.collection("calendars").doc(calendarId).get();
  const data = snapshot.data();

  if (!data) throw new Response("Kalender ikke funnet", { status: 404 });
  if (data.public === false) return { calendar: null, users: [] };

  const users = await snapshot.ref.collection("users").get();

  return {
    calendar: toCalendar(data),
    users: users.docs.map((entry) => toUser(entry.data())),
  };
}

const StateContainer = () => {
  const [{ calendar, user }, dispatch] = useAppState();
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const db = getFirestore();

  // undefined until onAuthStateChanged first fires; null once signed out.
  const authReady = user !== undefined;
  const uid = user?.uid ?? null;

  React.useEffect(() => {
    // `user` is undefined until onAuthStateChanged first fires. Subscribing
    // before then would attach an unauthenticated listener, which a private
    // calendar rejects outright — the listener errors and is not retried.
    if (!name || !authReady) return;

    const calendarId = toCalendarId(name);
    const calendarReference = doc(db, "calendars", calendarId);

    const unsubCalendar = onSnapshot(
      calendarReference,
      (calendarSnap) => {
        if (calendarSnap.exists()) {
          dispatch({
            type: SET_CALENDAR,
            payload: toCalendar(calendarSnap.data() as Record<string, unknown>),
          });
        } else {
          dispatch({ type: SET_NOTIFICATION, payload: "Kalenderen finnes ikke lenger" });
          navigate("/");
        }
      },
      // A rejected listener is never retried, so surface it rather than
      // leaving the page silently stuck or empty.
      () => {
        dispatch({
          type: SET_NOTIFICATION,
          payload: "Du har ikke tilgang til denne kalenderen",
        });
        navigate("/");
      },
    );

    // A plain listing of the subcollection: the `list` rule reads only the
    // parent calendar, so no `where` clause is needed to satisfy it.
    const userQuery = collection(calendarReference, "users");

    const unsubUsers: Unsubscribe = onSnapshot(
      userQuery,
      (users) => {
        dispatch({
          type: SET_USERS,
          payload: users.docs.map((entry) => toUser(entry.data() as Record<string, unknown>)),
        });
      },
      () => {
        dispatch({ type: SET_NOTIFICATION, payload: "Klarte ikke laste brukerne" });
        dispatch({ type: SET_USERS, payload: [] });
      },
    );

    return () => {
      unsubCalendar();
      unsubUsers();
    };
    // `uid` is an intentional extra dependency: a Firestore listener that was
    // rejected is never retried, so changing identity has to resubscribe.
    // oxlint-disable-next-line exhaustive-effect-dependencies
  }, [authReady, db, dispatch, name, navigate, uid]);

  if (!calendar) return <Loading />;

  return <Outlet />;
};

export default StateContainer;
