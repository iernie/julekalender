import { Timestamp } from "firebase/firestore";

/** Region the callables are deployed to. Must match functions/src/index.ts. */
export const FUNCTIONS_REGION = "europe-west1";

/** Firestore document id for a calendar. Must satisfy the rules' id pattern. */
export const toCalendarId = (name: string) => name.toLocaleLowerCase();

/** Kept in step with `validCalendarId` in firestore.rules. */
export const isValidCalendarId = (id: string) => /^[a-z0-9æøå_-]{2,40}$/.test(id);

/**
 * Calendars and their users expire via the Firestore TTL policy on `deleteBy`.
 * February 1st of the following year — note month is zero-indexed.
 */
export const expiresAt = () => Timestamp.fromDate(new Date(new Date().getFullYear() + 1, 1, 1));
