import { readFileSync } from "node:fs";
import { type RulesTestEnvironment, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, type DocumentReference, setDoc } from "firebase/firestore";

export const ALICE = "alice";
export const BOB = "bob";

export const newTestEnvironment = (): Promise<RulesTestEnvironment> =>
  initializeTestEnvironment({
    projectId: "julekal-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8081,
    },
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });

export const calendar = (owner: string, isPublic = true) => ({
  id: "calendar-uuid",
  name: "Kontoret",
  createdAt: new Date(),
  deleteBy: new Date(),
  owner,
  public: isPublic,
  settings: { fair: true },
});

export const user = (
  id: string,
  owner: string,
  calendarId: string,
  calendarRef: DocumentReference,
  won: Array<string> = [],
) => ({
  id,
  name: "Nissen",
  image: "https://example.com/a.png",
  calendar: calendarRef,
  calendarId,
  owner,
  createdAt: new Date(),
  deleteBy: new Date(),
  won,
});

/** Seeds a calendar and one user, bypassing rules. */
export const seed = async (
  env: RulesTestEnvironment,
  {
    calendarId,
    owner,
    isPublic = true,
    userId = "user-1",
    won = [] as Array<string>,
  }: {
    calendarId: string;
    owner: string;
    isPublic?: boolean;
    userId?: string;
    won?: Array<string>;
  },
) => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const calendarRef = doc(db, "calendars", calendarId);
    await setDoc(calendarRef, calendar(owner, isPublic));
    await setDoc(doc(db, "users", userId), user(userId, owner, calendarId, calendarRef, won));
  });
};
