import { Timestamp } from "firebase/firestore";

/** Region the callables are deployed to. Must match functions/src/index.ts. */
export const FUNCTIONS_REGION = "europe-west1";

/** Firestore document id for a calendar. Must satisfy the rules' id pattern. */
export const toCalendarId = (name: string) => name.toLocaleLowerCase();

/**
 * `avatars` is the Storage prefix for the seeded default avatars, and the
 * storage rules key write access off the calendar id, so the name is reserved.
 * Kept in step with `validCalendarId` in firestore.rules.
 */
export const RESERVED_CALENDAR_IDS = ["avatars"];

export const isValidCalendarId = (id: string) =>
  /^[a-z0-9æøå_-]{2,40}$/.test(id) && !RESERVED_CALENDAR_IDS.includes(id);

/**
 * Calendars and their users expire via the Firestore TTL policy on `deleteBy`.
 * January 1st of the following year — note month is zero-indexed.
 */
export const expiresAt = () => Timestamp.fromDate(new Date(new Date().getFullYear() + 1, 0, 1));
