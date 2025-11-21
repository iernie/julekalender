import React from "react";
import { type Unsubscribe, getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  onSnapshot,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { useState, SET_CALENDAR, SET_USERS, SET_USER } from "../StateProvider";
import { Outlet, useNavigate, useParams } from "react-router";
import Loading from "./Loading";
import { type CalendarType, type UserType } from "../types";
import { initializeServerApp } from "firebase/app";
import type { Route } from "./+types/StateContainer";

export async function loader({ params }: Route.LoaderArgs) {
  const app = initializeServerApp(import.meta.env.FIREBASE_WEBAPP_CONFIG);
  const db = getFirestore(app);

  const calendarReference = doc(
    db,
    "calendars",
    params.name!.toLocaleLowerCase()
  );

  const calendarSnapshot = await getDoc(calendarReference);

  const userReference = collection(db, "users");
  const userQuery = query(
    userReference,
    where("calendar", "==", calendarReference)
  );

  const userSnapshot = await getDocs(userQuery);

  return {
    calendar: calendarSnapshot.data(),
    users: userSnapshot.docs.map((u) => u.data()),
  };
}

export function HydrateFallback() {
  return <Loading />;
}

export default function StateContainer({ loaderData }: Route.ComponentProps) {
  console.log(loaderData);
  const [{ calendar }, dispatch] = useState();
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const db = getFirestore();

  React.useEffect(() => {
    getAuth().onAuthStateChanged((user) => {
      dispatch({ type: SET_USER, payload: user });
    });
  }, []);

  React.useEffect(() => {
    let unsub1: Unsubscribe | null;
    let unsub2: Unsubscribe | null;
    const getCalendar = async () => {
      const calendarReference = doc(db, "calendars", name!.toLocaleLowerCase());

      unsub1 = onSnapshot(calendarReference, (calendarSnap) => {
        if (calendarSnap.exists()) {
          dispatch({
            type: SET_CALENDAR,
            payload: calendarSnap.data() as CalendarType,
          });
        } else {
          navigate("/");
        }
      });

      const userReference = collection(db, "users");
      const userQuery = query(
        userReference,
        where("calendar", "==", calendarReference)
      );

      unsub2 = onSnapshot(userQuery, (users) => {
        dispatch({
          type: SET_USERS,
          payload: users.docs.map((doc) => ({ ...doc.data() }) as UserType),
        });
      });
    };
    getCalendar();
    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, [name]);

  if (Object.keys(calendar).length === 0) return <Loading />;

  return (
    <>
      <title>{`Julekalender - ${calendar.name}`}</title>
      <Outlet />
    </>
  );
}
