import React from "react";
import firebase from "firebase/app";
import { CalendarType, UserType } from "./types";

export const SET_NOTIFICATION = "SET_NOTIFICATION";
export const SET_CALENDAR = "SET_CALENDAR";
export const SET_USERS = "SET_USERS";
export const SET_USER = "SET_USER";

type State = {
  notification?: string;
  calendar: CalendarType;
  users?: Array<UserType>;
  user?: firebase.User | null;
};
type Action =
  | {
      type: typeof SET_NOTIFICATION;
      payload?: string;
    }
  | {
      type: typeof SET_CALENDAR;
      payload: CalendarType;
    }
  | {
      type: typeof SET_USERS;
      payload: Array<UserType>;
    }
  | {
      type: typeof SET_USER;
      payload: firebase.User | null;
    };

const intitialState: State = {
  calendar: {} as CalendarType,
};

const Context = React.createContext<[State, React.Dispatch<Action>]>([
  intitialState,
  () => null,
]);

export const useState = () => React.useContext(Context);

const reducer = (state: State = intitialState, action: Action): State => {
  switch (action.type) {
    case SET_NOTIFICATION:
      return { ...state, notification: action.payload };
    case SET_CALENDAR:
      return { ...state, calendar: action.payload };
    case SET_USERS:
      return { ...state, users: action.payload };
    case SET_USER:
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

const StateProvider: React.FC = ({ children }) => {
  return (
    <Context.Provider value={React.useReducer(reducer, intitialState)}>
      {children}
    </Context.Provider>
  );
};

export default StateProvider;
