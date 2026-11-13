import React from "react";
import { type Unsubscribe, getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { useState, SET_CALENDAR, SET_USERS, SET_USER } from "../StateProvider";
import { Outlet, useNavigate, useParams } from "react-router";
import Loading from "./Loading";
import { toCalendarId } from "../helpers";
import { type CalendarType, type UserType } from "../types";

const StateContainer = () => {
  const [{ calendar }, dispatch] = useState();
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const db = getFirestore();

  React.useEffect(() => {
    return getAuth().onAuthStateChanged((user) => {
      dispatch({ type: SET_USER, payload: user });
    });
  }, [dispatch]);

  React.useEffect(() => {
    if (!name) return;

    const calendarReference = doc(db, "calendars", toCalendarId(name));

    const unsubCalendar = onSnapshot(
      calendarReference,
      (calendarSnap) => {
        if (calendarSnap.exists()) {
          dispatch({
            type: SET_CALENDAR,
            payload: calendarSnap.data() as CalendarType,
          });
        } else {
          navigate("/");
        }
      },
      () => navigate("/")
    );

    const userQuery = query(
      collection(db, "users"),
      where("calendar", "==", calendarReference)
    );

    const unsubUsers: Unsubscribe = onSnapshot(
      userQuery,
      (users) => {
        dispatch({
          type: SET_USERS,
          payload: users.docs.map((entry) => ({ ...entry.data() }) as UserType),
        });
      },
      () => {
        dispatch({ type: SET_USERS, payload: [] });
      }
    );

    return () => {
      unsubCalendar();
      unsubUsers();
    };
  }, [db, dispatch, name, navigate]);

  if (Object.keys(calendar).length === 0) return <Loading />;

  return (
    <>
      <title>{`Julekalender - ${calendar.name}`}</title>
      <Outlet />
    </>
  );
};

export default StateContainer;
