import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  ALICE,
  BOB,
  calendar,
  newTestEnvironment,
  seed,
  seedLegacyCalendar,
  user,
} from "./helpers";

let env: RulesTestEnvironment;

const asAlice = () => env.authenticatedContext(ALICE).firestore();
const asBob = () => env.authenticatedContext(BOB).firestore();
const asGuest = () => env.unauthenticatedContext().firestore();

type TestFirestore = ReturnType<typeof asAlice>;

const userDoc = (db: TestFirestore, calendarId: string, userId: string) =>
  doc(db, "calendars", calendarId, "users", userId);
const usersOf = (db: TestFirestore, calendarId: string) =>
  collection(db, "calendars", calendarId, "users");

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

  // The TTL policy only sweeps documents whose `deleteBy` is a timestamp.
  it("rejects a calendar that would never expire", async () => {
    await assertFails(
      setDoc(doc(asAlice(), "calendars", "kontoret"), {
        ...calendar(ALICE),
        deleteBy: "2027-02-01",
      }),
    );

    const { deleteBy: _deleteBy, ...withoutDeleteBy } = calendar(ALICE);
    await assertFails(setDoc(doc(asAlice(), "calendars", "kontoret"), withoutDeleteBy));
  });

  it("stops the owner postponing expiry or adding unknown fields", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(
      updateDoc(doc(asAlice(), "calendars", "kontoret"), {
        deleteBy: new Date(2099, 1, 1),
      }),
    );
    await assertFails(updateDoc(doc(asAlice(), "calendars", "kontoret"), { isAdmin: true }));
  });

  // The create rules are stricter than what older versions wrote. The update
  // rules read those fields through `get(key, null)` so that a document
  // predating them is still editable by its owner, and so that a missing
  // `deleteBy` — which the TTL policy skips — can be filled in.
  describe("documents predating the current rules", () => {
    it("stay editable by their owner", async () => {
      await seedLegacyCalendar(env, "kontoret", ALICE);
      await assertSucceeds(
        updateDoc(doc(asAlice(), "calendars", "kontoret"), { "settings.fair": false }),
      );
    });

    it("may have a missing deleteBy filled in", async () => {
      await seedLegacyCalendar(env, "kontoret", ALICE);
      await assertSucceeds(
        updateDoc(doc(asAlice(), "calendars", "kontoret"), { deleteBy: new Date(2027, 1, 1) }),
      );
    });

    it("may not have deleteBy set to anything the TTL policy ignores", async () => {
      await seedLegacyCalendar(env, "kontoret", ALICE);
      await assertFails(
        updateDoc(doc(asAlice(), "calendars", "kontoret"), { deleteBy: "2027-01-01" }),
      );
    });
  });
});

describe("users", () => {
  it("lets the calendar owner add a user", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertSucceeds(setDoc(userDoc(asAlice(), "kontoret", "user-2"), user("user-2")));
  });

  it("stops a stranger adding a user to someone else's calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(setDoc(userDoc(asBob(), "kontoret", "user-2"), user("user-2")));
  });

  it("rejects adding a user to a calendar that does not exist", async () => {
    await assertFails(setDoc(userDoc(asAlice(), "finnes-ikke", "user-2"), user("user-2")));
  });

  it("rejects a user whose id does not match its document id", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(setDoc(userDoc(asAlice(), "kontoret", "user-2"), user("user-3")));
  });

  it("rejects a new user that already has wins", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(setDoc(userDoc(asAlice(), "kontoret", "user-2"), user("user-2", ["1"])));
  });

  // The fields the subcollection made redundant must not creep back in, or a
  // document could again claim a calendar or owner its path contradicts.
  it("rejects the old calendar and owner fields", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    const db = asAlice();
    await assertFails(
      setDoc(userDoc(db, "kontoret", "user-2"), { ...user("user-2"), calendarId: "annet" }),
    );
    await assertFails(
      setDoc(userDoc(db, "kontoret", "user-2"), { ...user("user-2"), owner: ALICE }),
    );
  });

  it("lets anyone read users of a public calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertSucceeds(getDoc(userDoc(asGuest(), "kontoret", "user-1")));
  });

  // The app loads users by listing the subcollection, not with a get. List
  // rules are evaluated against the query, so this needs its own coverage.
  it("lets anyone list users of a public calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertSucceeds(getDocs(usersOf(asGuest(), "kontoret")));
  });

  it("lets the owner list users of their private calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE, isPublic: false });
    await assertSucceeds(getDocs(usersOf(asAlice(), "kontoret")));
  });

  it("stops a stranger listing users of a private calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE, isPublic: false });
    await assertFails(getDocs(usersOf(asBob(), "kontoret")));
    await assertFails(getDocs(usersOf(asGuest(), "kontoret")));
  });

  // Users are only ever reached through their calendar. A collection-group
  // query across every calendar would leak private calendars' users.
  it("stops listing users across calendars", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(getDocs(collectionGroup(asAlice(), "users")));
  });

  it("allows reading a user that does not exist in a readable calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertSucceeds(getDoc(userDoc(asAlice(), "kontoret", "finnes-ikke")));
  });

  it("hides users of a private calendar", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE, isPublic: false });
    await assertFails(getDoc(userDoc(asBob(), "kontoret", "user-1")));
    await assertSucceeds(getDoc(userDoc(asAlice(), "kontoret", "user-1")));
  });

  it("lets the owner rename a user", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertSucceeds(updateDoc(userDoc(asAlice(), "kontoret", "user-1"), { name: "Rudolf" }));
  });

  it("stops a stranger renaming a user", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(updateDoc(userDoc(asBob(), "kontoret", "user-1"), { name: "Rudolf" }));
  });

  // The anti-cheat guarantee: only the drawWinner callable may write `won`.
  it("stops even the owner writing won", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(updateDoc(userDoc(asAlice(), "kontoret", "user-1"), { won: ["1"] }));
  });

  it("stops a stranger writing won", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(updateDoc(userDoc(asBob(), "kontoret", "user-1"), { won: ["1"] }));
  });

  it("rejects a user that would never expire", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(
      setDoc(userDoc(asAlice(), "kontoret", "user-2"), {
        ...user("user-2"),
        deleteBy: "2027-02-01",
      }),
    );
  });

  it("stops the owner postponing a user's expiry or adding unknown fields", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    const db = asAlice();
    await assertFails(
      updateDoc(userDoc(db, "kontoret", "user-1"), { deleteBy: new Date(2099, 0, 1) }),
    );
    await assertFails(updateDoc(userDoc(db, "kontoret", "user-1"), { isAdmin: true }));
  });

  it("lets only the owner delete a user", async () => {
    await seed(env, { calendarId: "kontoret", owner: ALICE });
    await assertFails(deleteDoc(userDoc(asBob(), "kontoret", "user-1")));
    await assertSucceeds(deleteDoc(userDoc(asAlice(), "kontoret", "user-1")));
  });
});
