import { readFileSync } from "node:fs";
import { type RulesTestEnvironment, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

export const ALICE = "alice";
export const BOB = "bob";

export const newTestEnvironment = (): Promise<RulesTestEnvironment> =>
  initializeTestEnvironment({
    projectId: "demo-julekal-rules-test",
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

export const user = (id: string, won: Array<string> = []) => ({
  id,
  name: "Nissen",
  image: "https://example.com/a.png",
  createdAt: new Date(),
  deleteBy: new Date(),
  won,
});

/**
 * Seeds a calendar shaped the way older versions of the app wrote them: no
 * `id`, `createdAt`, `deleteBy` or `public`. The update rules must still let
 * its owner edit it, and must let the missing `deleteBy` be filled in.
 */
export const seedLegacyCalendar = async (
  env: RulesTestEnvironment,
  calendarId: string,
  owner: string,
) => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "calendars", calendarId), {
      name: "Kontoret",
      owner,
      settings: { fair: true },
    });
  });
};

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
    await setDoc(doc(calendarRef, "users", userId), user(userId, won));
  });
};
