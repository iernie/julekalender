import React from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { useState, SET_CALENDAR, SET_USERS, SET_USER } from "../StateProvider";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "./Loading";
import { CalendarType, UserType } from "../types";

const StateContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [{ calendar }, dispatch] = useState();
  const navigate = useNavigate();
  const { name } = useParams() as { name: string; day: string };
  const db = getFirestore();

  React.useEffect(() => {
    getAuth().onAuthStateChanged((user) => {
      dispatch({
        type: SET_USER,
        payload: user,
      });
    });
  }, []);

  React.useEffect(() => {
    const getCalendar = async () => {
      const calendarReference = doc(db, "calendars", name.toLocaleLowerCase());

      onSnapshot(calendarReference, (calendarSnap) => {
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
        where("calendar", "==", calendarReference),
      );

      onSnapshot(userQuery, (users) => {
        dispatch({
          type: SET_USERS,
          payload: users.docs.map((doc) => ({ ...doc.data() }) as UserType),
        });
      });
    };
    getCalendar();
  }, [name]);

  React.useEffect(() => {
    if (calendar) {
      document.title = `Julekalender - ${calendar.name}`;
    } else {
      document.title = "Julekalender";
    }
    return () => {
      document.title = "Julekalender";
    };
  }, [calendar]);

  if (Object.keys(calendar).length === 0) return <Loading />;

  return <>{children}</>;
};

export default StateContainer;
