import React from "react";
import firebase from "firebase/compat/app";
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

  React.useEffect(() => {
    firebase.auth().onAuthStateChanged((user) => {
      dispatch({
        type: SET_USER,
        payload: user,
      });
    });
  }, []);

  React.useEffect(() => {
    const db = firebase.firestore();

    const calendarReference = db
      .collection("calendars")
      .doc(name.toLocaleLowerCase());

    calendarReference.onSnapshot((calendar) => {
      if (calendar.exists) {
        dispatch({
          type: SET_CALENDAR,
          payload: calendar.data() as CalendarType,
        });
      } else {
        navigate("/");
      }
    });

    db.collection("users")
      .where("calendar", "==", calendarReference)
      .onSnapshot((users) => {
        dispatch({
          type: SET_USERS,
          payload: users.docs.map((user) => ({ ...user.data() }) as UserType),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
