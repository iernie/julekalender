import firebase from "firebase";

export type UserType = {
  id: string;
  calendar: firebase.firestore.DocumentReference<firebase.firestore.DocumentData>;
  name: string;
  image: string;
  createdAt: Date;
  won: Array<string>;
};

export type CalendarType = {
  id: string;
  name: string;
  createdAt: Date;
  settings: {
    giftsPerUser?: number;
    fair?: boolean;
  };
};
