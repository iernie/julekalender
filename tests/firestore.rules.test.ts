import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ALICE, BOB, calendar, newTestEnvironment, seed, user } from "./helpers";

let env: RulesTestEnvironment;

const asAlice = () => env.authenticatedContext(ALICE).firestore();
const asBob = () => env.authenticatedContext(BOB).firestore();
const asGuest = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await newTestEnvironment();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe("calendars", () => {
  it("lets a signed-in user create a calendar they own", async () => {
    await assertSucceeds(setDoc(doc(asAlice(), "calendars", "kontoret"), calendar(ALICE)));
  });

  it("rejects creating a calendar owned by someone else", async () => {
    await assertFails(setDoc(doc(asAlice(), "calendars", "kontoret"), calendar(BOB)));
  });

  it("rejects an unauthenticated create", async () => {
    await assertFails(setDoc(doc(asGuest(), "calendars", "kontoret"), calendar(ALICE)));
  });

  it("rejects a document id that does not match the name", async () => {
    await assertFails(setDoc(doc(asAlice(), "calendars", "noe-annet"), calendar(ALICE)));
  });

  it("rejects an invalid calendar id", async () => {
    await assertFails(setDoc(doc(asAlice(), "calendars", "A"), calendar(ALICE)));
    await assertFails(setDoc(doc(asAlice(), "calendars", "Kontoret"), calendar(ALICE)));
  });

  it("rejects unknown fields", async () => {
    await assertFails(
      setDoc(doc(asAlice(), "calendars", "kontoret"), {
        ...calendar(ALICE),
        isAdmin: true,
      }),
    );
  });

  it("lets anyone read a public calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertSucceeds(getDoc(doc(asGuest(), "calendars", "kontoret")));
  });

  // The app checks name availability with getDoc before creating. `resource`
  // is null for a missing document, so the read rule must tolerate it rather
  // than raising a null evaluation error.
  it("allows reading a calendar that does not exist", async () => {
    await assertSucceeds(getDoc(doc(asAlice(), "calendars", "finnes-ikke")));
    await assertSucceeds(getDoc(doc(asGuest(), "calendars", "finnes-ikke")));
  });

  it("hides a private calendar from everyone but the owner", async () => {
    await seed(env, {
      calendarId: "kontoret",
      owner: ALICE,
      isPublic: false,
    });
    await assertFails(getDoc(doc(asGuest(), "calendars", "kontoret")));
    await assertFails(getDoc(doc(asBob(), "calendars", "kontoret")));
    await assertSucceeds(getDoc(doc(asAlice(), "calendars", "kontoret")));
  });

  // Welcome lists calendars with where("owner","==",uid). The list rule must
  // read nothing the query does not constrain.
  it("lets an owner list their own calendars", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    const db = asAlice();
    await assertSucceeds(getDocs(query(collection(db, "calendars"), where("owner", "==", ALICE))));
  });

  it("stops listing calendars owned by someone else", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    const db = asBob();
    await assertFails(getDocs(query(collection(db, "calendars"), where("owner", "==", ALICE))));
  });

  it("lets the owner update settings", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertSucceeds(
      updateDoc(doc(asAlice(), "calendars", "kontoret"), {
        "settings.fair": false,
      }),
    );
  });

  it("stops a stranger updating a public calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(
      updateDoc(doc(asBob(), "calendars", "kontoret"), {
        "settings.fair": false,
      }),
    );
  });

  it("stops a stranger deleting a public calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(deleteDoc(doc(asBob(), "calendars", "kontoret")));
    await assertSucceeds(deleteDoc(doc(asAlice(), "calendars", "kontoret")));
  });

  it("stops the owner transferring ownership or renaming", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(updateDoc(doc(asAlice(), "calendars", "kontoret"), { owner: BOB }));
    await assertFails(updateDoc(doc(asAlice(), "calendars", "kontoret"), { name: "Annet" }));
  });
});

describe("users", () => {
  it("lets the calendar owner add a user", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    const db = asAlice();
    await assertSucceeds(
      setDoc(
        doc(db, "users", "user-2"),
        user("user-2", ALICE, "kontoret", doc(db, "calendars", "kontoret")),
      ),
    );
  });

  it("stops a stranger adding a user to someone else's calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    const db = asBob();
    await assertFails(
      setDoc(
        doc(db, "users", "user-2"),
        user("user-2", BOB, "kontoret", doc(db, "calendars", "kontoret")),
      ),
    );
  });

  it("rejects a new user that already has wins", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    const db = asAlice();
    await assertFails(
      setDoc(
        doc(db, "users", "user-2"),
        user("user-2", ALICE, "kontoret", doc(db, "calendars", "kontoret"), ["1"]),
      ),
    );
  });

  it("lets anyone read users of a public calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertSucceeds(getDoc(doc(asGuest(), "users", "user-1")));
  });

  // The app loads users with a query, not a get. Firestore evaluates list
  // rules against the query, so this needs its own coverage: a rule reading a
  // field the query does not constrain fails with an empty `resource`.
  it("lets anyone list users of a public calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    const db = asGuest();
    await assertSucceeds(
      getDocs(query(collection(db, "users"), where("calendarId", "==", "kontoret"))),
    );
  });

  it("lets the owner list users of their private calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE, isPublic: false });
    const db = asAlice();
    await assertSucceeds(
      getDocs(query(collection(db, "users"), where("calendarId", "==", "kontoret"))),
    );
  });

  it("stops a stranger listing users of a private calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE, isPublic: false });
    const db = asBob();
    await assertFails(
      getDocs(query(collection(db, "users"), where("calendarId", "==", "kontoret"))),
    );
  });

  it("allows reading a user that does not exist", async () => {
    await assertSucceeds(getDoc(doc(asAlice(), "users", "finnes-ikke")));
  });

  it("hides users of a private calendar", async () => {
    await seed(env, {
      calendarId: "kontoret",
      owner: ALICE,
      isPublic: false,
    });
    await assertFails(getDoc(doc(asBob(), "users", "user-1")));
    await assertSucceeds(getDoc(doc(asAlice(), "users", "user-1")));
  });

  it("lets the owner rename a user", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertSucceeds(updateDoc(doc(asAlice(), "users", "user-1"), { name: "Rudolf" }));
  });

  it("stops a stranger renaming a user", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(updateDoc(doc(asBob(), "users", "user-1"), { name: "Rudolf" }));
  });

  // The anti-cheat guarantee: only the drawWinner callable may write `won`.
  it("stops even the owner writing won", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(updateDoc(doc(asAlice(), "users", "user-1"), { won: ["1"] }));
  });

  it("stops a stranger writing won", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(updateDoc(doc(asBob(), "users", "user-1"), { won: ["1"] }));
  });

  it("stops reassigning a user to another calendar or owner", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(updateDoc(doc(asAlice(), "users", "user-1"), { owner: BOB }));
    await assertFails(updateDoc(doc(asAlice(), "users", "user-1"), { calendarId: "annet" }));
  });

  it("lets only the owner delete a user", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(deleteDoc(doc(asBob(), "users", "user-1")));
    await assertSucceeds(deleteDoc(doc(asAlice(), "users", "user-1")));
  });
});
