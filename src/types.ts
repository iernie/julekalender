import firebase from "firebase/compat/app";

export type UserType = {
  id: string;
  calendar: firebase.firestore.DocumentReference<firebase.firestore.DocumentData>;
  name: string;
  image: string;
  createdAt: firebase.firestore.Timestamp;
  deleteBy: firebase.firestore.Timestamp;
  won: Array<string>;
};

export type CalendarType = {
  id: string;
  name: string;
  createdAt: firebase.firestore.Timestamp;
  deleteBy: firebase.firestore.Timestamp;
  settings: {
    giftsPerUser?: number;
    fair?: boolean;
    ignoreWeekends?: boolean;
  };
  owner?: string;
  public?: boolean;
};
