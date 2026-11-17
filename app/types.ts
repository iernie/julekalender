/**
 * Shapes as held in app state: Timestamps are normalised to ISO strings by
 * `app/serialize.ts` so loader data and onSnapshot data match. The documents in
 * Firestore still store real Timestamps. Users live in the
 * `calendars/{calendarId}/users` subcollection, so they carry no calendar or
 * owner field of their own.
 */

export type UserType = {
  id: string;
  name: string;
  image: string;
  createdAt: string;
  deleteBy: string;
  won: Array<string>;
};

export type CalendarType = {
  id: string;
  name: string;
  createdAt: string;
  deleteBy: string;
  settings: {
    giftsPerUser?: number;
    fair?: boolean;
    ignoreWeekends?: boolean;
  };
  owner: string;
  public: boolean;
};
