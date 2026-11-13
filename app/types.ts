import { Timestamp, DocumentReference, type DocumentData } from "firebase/firestore";

export type UserType = {
  id: string;
  calendar: DocumentReference<DocumentData>;
  calendarId: string;
  owner: string;
  name: string;
  image: string;
  createdAt: Timestamp;
  deleteBy: Timestamp;
  won: Array<string>;
};

export type CalendarType = {
  id: string;
  name: string;
  createdAt: Timestamp;
  deleteBy: Timestamp;
  settings: {
    giftsPerUser?: number;
    fair?: boolean;
    ignoreWeekends?: boolean;
  };
  owner: string;
  public: boolean;
};
