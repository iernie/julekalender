/**
 * Shapes as held in app state: Timestamps are normalised to ISO strings by
 * `app/serialize.ts` so loader data and onSnapshot data match. The documents in
 * Firestore still store real Timestamps, and users additionally store a
 * `calendar` DocumentReference used by the callables.
 */

export type UserType = {
  id: string;
  calendarId: string;
  owner: string;
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
