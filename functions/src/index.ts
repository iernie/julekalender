/**
 * Callable functions for Julekalender.
 *
 * Winner selection lives here rather than in the browser: `firestore.rules`
 * forbids clients from writing `users.won`, so these callables (which run with
 * the Admin SDK and bypass rules) are the only writers of winners.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import { randomInt } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

initializeApp();

const DAYS = 24;

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
  if (typeof calendarId !== "string" || !/^[a-z0-9æøå_-]{2,40}$/.test(calendarId)) {
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

    const snapshot = await tx.get(
      db.collection("users").where("calendar", "==", reference).where("won", "array-contains", day),
    );

    snapshot.docs.forEach((doc) => {
      tx.update(doc.ref, { won: FieldValue.arrayRemove(day) });
    });

    return { reset: snapshot.size };
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
