import React from "react";
import firebase from "firebase/app";
import { useState, SET_CALENDAR, SET_USERS, SET_USER } from "../StateProvider";
import { useHistory, useParams } from "react-router-dom";
import Loading from "./Loading";
import { CalendarType, UserType } from "../types";
import ReactTooltip from "react-tooltip";

const StateContainer: React.FC = ({ children }) => {
  const [{ calendar }, dispatch] = useState();
  const history = useHistory();
  const { name } = useParams<{ name: string; day: string }>();

  React.useEffect(() => {
    firebase.auth().onAuthStateChanged((user) => {
      dispatch({
        type: SET_USER,
        payload: user,
      });
      ReactTooltip.rebuild();
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
        history.push("/");
      }
    });

    db.collection("users")
      .where("calendar", "==", calendarReference)
      .onSnapshot((users) => {
        dispatch({
          type: SET_USERS,
          payload: users.docs.map((user) => ({ ...user.data() } as UserType)),
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
