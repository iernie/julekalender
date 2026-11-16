/**
 * Callable functions for Julekalender.
 *
 * Winner selection lives here rather than in the browser: `firestore.rules`
 * forbids clients from writing `users.won`, so these callables (which run with
 * the Admin SDK and bypass rules) are the only writers of winners.
 */

import { logger, setGlobalOptions } from "firebase-functions/v2";
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import express from "express";
import cors from "cors";
import { randomInt } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

initializeApp();

const DAYS = 24;

/**
 * Storage prefix for the seeded default avatars. Reserved as a calendar id in
 * firestore.rules and storage.rules so it cannot be claimed.
 */
const RESERVED_PREFIX = "avatars";

/** Must match `validCalendarId` in firestore.rules. */
const CALENDAR_ID = /^[a-z0-9æøå_-]{2,40}$/;

/** Documents per `getAll` call in the orphan sweep. */
const GET_ALL_CHUNK = 300;

/** Throws unless the caller owns the calendar. Returns the calendar data. */
const assertOwner = async (
  uid: string | undefined,
  calendarId: string,
  tx?: FirebaseFirestore.Transaction,
) => {
  if (!uid) throw new HttpsError("unauthenticated", "Ikke innlogget");

  const reference = getFirestore().collection("calendars").doc(calendarId);
  const snapshot = tx ? await tx.get(reference) : await reference.get();
  const calendar = snapshot.data();

  if (!calendar) throw new HttpsError("not-found", "Kalender ikke funnet");
  if (calendar.owner !== uid) {
    throw new HttpsError("permission-denied", "Ikke din kalender");
  }
  return { reference, calendar };
};

const assertDay = (day: unknown): string => {
  const parsed = typeof day === "string" ? parseInt(day, 10) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > DAYS) {
    throw new HttpsError("invalid-argument", "Ugyldig dag");
  }
  return String(parsed);
};

const assertCalendarId = (calendarId: unknown): string => {
  if (typeof calendarId !== "string" || !CALENDAR_ID.test(calendarId)) {
    throw new HttpsError("invalid-argument", "Ugyldig kalendernavn");
  }
  return calendarId;
};

type DrawRequest = {
  calendarId: string;
  day: string;
  excluded?: Array<string>;
};

export const drawWinner = onCall<DrawRequest>(async (request) => {
  const calendarId = assertCalendarId(request.data?.calendarId);
  const day = assertDay(request.data?.day);
  const excluded = new Set(request.data?.excluded ?? []);

  const db = getFirestore();

  return db.runTransaction(async (tx) => {
    const { reference, calendar } = await assertOwner(request.auth?.uid, calendarId, tx);

    const snapshot = await tx.get(db.collection("users").where("calendar", "==", reference));
    const users = snapshot.docs.map((doc) => {
      const data = doc.data() as {
        id: string;
        name: string;
        image: string;
        won: Array<string>;
      };
      return { ref: doc.ref, data };
    });

    if (users.length === 0) {
      throw new HttpsError("failed-precondition", "Fant ingen brukere");
    }

    // The transaction makes this check authoritative: two admins opening the
    // same day concurrently cannot both draw.
    if (users.some(({ data }) => data.won.includes(day))) {
      throw new HttpsError("already-exists", "Dagen er allerede trukket");
    }

    const settings = calendar.settings ?? {};
    const counts = users.map(({ data }) => data.won.length);
    const highest = Math.max(...counts);
    const lowest = Math.min(...counts);
    const giftsPerUser = typeof settings.giftsPerUser === "number" ? settings.giftsPerUser : null;

    const viable = users
      .filter(({ data }) => !settings.fair || highest === lowest || data.won.length < highest)
      .filter(({ data }) => giftsPerUser === null || data.won.length < giftsPerUser)
      .filter(({ data }) => !excluded.has(data.id));

    if (viable.length === 0) {
      throw new HttpsError("failed-precondition", "Tom for vinnere");
    }

    // crypto.randomInt is uniform; Math.random() * n has modulo bias.
    const winner = viable[randomInt(0, viable.length)];

    tx.update(winner.ref, { won: FieldValue.arrayUnion(day) });

    return {
      id: winner.data.id,
      name: winner.data.name,
      image: winner.data.image,
    };
  });
});

export const resetWinner = onCall<{ calendarId: string; day: string }>(async (request) => {
  const calendarId = assertCalendarId(request.data?.calendarId);
  const day = assertDay(request.data?.day);

  const db = getFirestore();

  return db.runTransaction(async (tx) => {
    const { reference } = await assertOwner(request.auth?.uid, calendarId, tx);

    const snapshot = await tx.get(db.collection("users").where("calendar", "==", reference));

    // Filtered in memory rather than with a second `array-contains` clause,
    // which would need a composite index. A calendar has a handful of users.
    const matching = snapshot.docs.filter((entry) => {
      const won = entry.data().won;
      return Array.isArray(won) && won.includes(day);
    });

    matching.forEach((entry) => {
      tx.update(entry.ref, { won: FieldValue.arrayRemove(day) });
    });

    return { reset: matching.length };
  });
});

/**
 * Deletes a calendar, its users and their uploaded avatars. Done server-side so
 * the cascade cannot be left half-finished by a closed browser tab.
 */
export const deleteCalendar = onCall<{ calendarId: string }>(async (request) => {
  const calendarId = assertCalendarId(request.data?.calendarId);
  const { reference } = await assertOwner(request.auth?.uid, calendarId);

  const db = getFirestore();
  const users = await db.collection("users").where("calendar", "==", reference).get();

  const batch = db.batch();
  users.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(reference);
  await batch.commit();

  // Avatars uploaded for this calendar all live under `<calendarId>/`.
  await getStorage()
    .bucket()
    .deleteFiles({ prefix: `${calendarId}/` })
    .catch(() => undefined);

  return { deleted: users.size };
});

/**
 * Deletes a calendar's uploaded avatars once the calendar document is gone.
 *
 * `deleteCalendar` already does this inline, but it is not the only way a
 * calendar disappears: the TTL policy on `deleteBy` sweeps calendars every
 * January without calling any callable, and TTL deletions do fire this
 * trigger. Without it, every avatar ever uploaded would stay in the bucket
 * forever. Deleting an already-empty prefix is a no-op, so running after
 * `deleteCalendar` is harmless.
 */
export const cleanUpCalendarAvatars = onDocumentDeleted(
  // Firestore 2nd-gen triggers run in the database's Eventarc location, and
  // Eventarc maps the `eur3` multi-region (see firebase.json) to
  // europe-west4 — not the europe-west1 the other functions use. Deploying
  // this one to the global region is rejected.
  { document: "calendars/{calendarId}", region: "europe-west4" },
  async (event) => {
    const { calendarId } = event.params;

    await getStorage()
      .bucket()
      .deleteFiles({ prefix: `${calendarId}/`, force: true })
      .catch((error: unknown) => {
        // The monthly sweep is the backstop, but a trigger that fails every
        // time should not be invisible until then.
        logger.warn("Failed to delete avatars for a deleted calendar", { calendarId, error });
      });
  },
);

/**
 * Monthly reconciliation sweep for the avatar bucket.
 *
 * The delete trigger above is the primary cleanup, but it is best-effort: a
 * failed invocation is never retried, and avatars uploaded for a calendar that
 * was deleted while the trigger was down would be orphaned for good. Storage
 * has no TTL of its own, so this walks the bucket's top-level prefixes — one
 * per calendar — and removes those with no calendar document behind them.
 */
export const sweepOrphanedAvatars = onSchedule("0 4 1 * *", async () => {
  const bucket = getStorage().bucket();
  const db = getFirestore();

  const prefixes = new Set<string>();
  let pageToken: string | undefined;

  do {
    // Pages must be walked in order: each one yields the next page token.
    // oxlint-disable-next-line no-await-in-loop
    const [, , response] = await bucket.getFiles({
      delimiter: "/",
      autoPaginate: false,
      pageToken,
    });
    // `delimiter` makes the API return directory-like prefixes instead of
    // every object, but the typings do not model that response shape.
    const apiResponse = response as { prefixes?: Array<string>; nextPageToken?: string };

    for (const prefix of apiResponse.prefixes ?? []) prefixes.add(prefix);
    pageToken = apiResponse.nextPageToken;
  } while (pageToken);

  // The seeded default avatars belong to no calendar and must survive.
  prefixes.delete(`${RESERVED_PREFIX}/`);

  // This is the default bucket, which other Firebase features may also write
  // to. Only prefixes shaped like a calendar id are ours to delete — a sweep
  // that deletes whatever it fails to recognise is one bad page away from
  // destroying someone else's data.
  const calendarIds = [...prefixes]
    .map((prefix) => prefix.replace(/\/$/, ""))
    .filter((id) => CALENDAR_ID.test(id));

  if (calendarIds.length === 0) return;

  // getAll takes one request for the whole list; chunk it so a project with
  // thousands of calendars does not blow the request size limit.
  const snapshots: Array<FirebaseFirestore.DocumentSnapshot> = [];

  for (let index = 0; index < calendarIds.length; index += GET_ALL_CHUNK) {
    const chunk = calendarIds.slice(index, index + GET_ALL_CHUNK);
    // getAll preserves the order of its arguments, which the filter relies on.
    // oxlint-disable-next-line no-await-in-loop
    snapshots.push(...(await db.getAll(...chunk.map((id) => db.collection("calendars").doc(id)))));
  }

  const orphaned = calendarIds.filter((_, index) => !snapshots[index].exists);

  // allSettled, not all: deleteFiles rejects on the first object it cannot
  // remove, and onSchedule does not retry, so one bad object would otherwise
  // cost the whole month's sweep.
  const results = await Promise.allSettled(
    orphaned.map((calendarId) => bucket.deleteFiles({ prefix: `${calendarId}/`, force: true })),
  );
  const failed = results.filter((result) => result.status === "rejected");

  logger.info("Swept orphaned avatar prefixes", {
    scanned: calendarIds.length,
    deleted: orphaned.length - failed.length,
    failed: failed.length,
  });
});

/**
 * Public read-only API. Moves into the React Router app in a later phase; kept
 * here for now so api.kalender.christmas keeps working.
 */
const app = express();
app.use(cors({ origin: "*" }));

app.get("/api", (_, response) => {
  response.json({ error: "Kalendernavn mangler" });
});

/**
 * Express does not forward rejections from async handlers, so an unhandled
 * rejection would crash the instance. Wrap them explicitly.
 */
const asyncHandler =
  <P extends Record<string, string>>(
    handler: (request: express.Request<P>, response: express.Response) => Promise<void>,
  ) =>
  (request: express.Request<P>, response: express.Response, next: express.NextFunction) => {
    handler(request, response).catch(next);
  };

app.get(
  "/api/:name",
  asyncHandler<{ name: string }>(async (request, response) => {
    const { name } = request.params;
    const { apiKey } = request.query;

    const calendarReference = getFirestore().collection("calendars").doc(name.toLocaleLowerCase());

    const calendar = (await calendarReference.get()).data();
    if (!calendar) {
      response.json({ error: "Kalender ikke funnet" });
      return;
    }
    if (calendar.public === false && calendar.owner !== apiKey) {
      response.json({ error: "Mangler tilgang til kalender" });
      return;
    }

    const users = await getFirestore()
      .collection("users")
      .where("calendar", "==", calendarReference)
      .get();

    if (users.empty) {
      response.json({ error: "Ingen brukere funnet" });
      return;
    }

    const today = new Date().getDate().toString();
    const winner = users.docs.map((doc) => doc.data()).find((user) => user.won.includes(today));

    response.json(winner ? { name: winner.name, image: winner.image } : {});
  }),
);

// Keeps the historical contract: the API always answers with JSON.
app.use(
  (
    _error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    response.json({ error: "En feil skjedde" });
  },
);

export const api = onRequest(app);
