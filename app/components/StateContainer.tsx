import React from "react";
import { type Unsubscribe, getAuth } from "firebase/auth";
import { collection, doc, getFirestore, onSnapshot, query, where } from "firebase/firestore";
import { useState, SET_CALENDAR, SET_USERS, SET_USER } from "../StateProvider";
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

  const users = await adminDb.collection("users").where("calendarId", "==", calendarId).get();

  return {
    calendar: toCalendar(data),
    users: users.docs.map((entry) => toUser(entry.data())),
  };
}

const StateContainer = () => {
  const [{ calendar, user }, dispatch] = useState();
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const db = getFirestore();

  // undefined until onAuthStateChanged first fires; null once signed out.
  const authReady = user !== undefined;
  const uid = user?.uid ?? null;

  React.useEffect(() => {
    return getAuth().onAuthStateChanged((next) => {
      dispatch({ type: SET_USER, payload: next });
    });
  }, [dispatch]);

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
          navigate("/");
        }
      },
      () => navigate("/"),
    );

    // Must filter on calendarId, not the `calendar` reference: firestore.rules
    // evaluates list operations against the query, so every field the rule
    // reads has to be constrained here.
    const userQuery = query(collection(db, "users"), where("calendarId", "==", calendarId));

    const unsubUsers: Unsubscribe = onSnapshot(
      userQuery,
      (users) => {
        dispatch({
          type: SET_USERS,
          payload: users.docs.map((entry) => toUser(entry.data() as Record<string, unknown>)),
        });
      },
      () => {
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

  if (Object.keys(calendar).length === 0) return <Loading />;

  return (
    <>
      <title>{`Julekalender - ${calendar.name}`}</title>
      <Outlet />
    </>
  );
};

export default StateContainer;
