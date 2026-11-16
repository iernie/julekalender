import React from "react";
import { useRouteLoaderData } from "react-router";
import { type User } from "firebase/auth";
import { type CalendarType, type UserType } from "./types";

export const SET_NOTIFICATION = "SET_NOTIFICATION";
export const SET_CALENDAR = "SET_CALENDAR";
export const SET_USERS = "SET_USERS";
export const SET_USER = "SET_USER";

type State = {
  notification?: string;
  calendar: CalendarType;
  users?: Array<UserType>;
  user?: User | null;
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
      payload: User | null;
    };

const intitialState: State = {
  calendar: {} as CalendarType,
};

const Context = React.createContext<[State, React.Dispatch<Action>]>([intitialState, () => null]);

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

/** Route id of the `:name` layout, whose loader server-renders the calendar. */
const CALENDAR_ROUTE_ID = "components/StateContainer";

type CalendarRouteData = {
  calendar: CalendarType | null;
  users: Array<UserType>;
};

const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Seeded from the calendar route's loader so the server render already has
  // data and the first client render matches it.
  const loaded = useRouteLoaderData(CALENDAR_ROUTE_ID) as CalendarRouteData | undefined;

  const [state, dispatch] = React.useReducer(reducer, intitialState, (base) =>
    loaded?.calendar ? { ...base, calendar: loaded.calendar, users: loaded.users } : base,
  );
  // useReducer returns a new tuple each render, which would re-render every
  // consumer regardless of whether the state actually changed.
  const value = React.useMemo<[State, React.Dispatch<Action>]>(() => [state, dispatch], [state]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default StateProvider;
