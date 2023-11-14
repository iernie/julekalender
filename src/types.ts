import { Timestamp, DocumentReference, DocumentData } from "firebase/firestore";

export type UserType = {
  id: string;
  calendar: DocumentReference<DocumentData>;
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
  owner?: string | null;
  public?: boolean;
};
