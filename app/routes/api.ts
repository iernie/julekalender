import { adminDb } from "../firebase.server";
import { toCalendarId } from "../helpers";
import type { Route } from "./+types/api";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      // Public read-only API, consumed from other origins.
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });

/**
 * Public read-only API: today's winner for a calendar.
 *
 * Runs with the Admin SDK, so it bypasses firestore.rules and must do its own
 * access check for private calendars.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const calendarId = toCalendarId(params.name ?? "");
  if (!calendarId) return json({ error: "Kalendernavn mangler" });

  const apiKey = new URL(request.url).searchParams.get("apiKey");

  const calendar = (await adminDb.collection("calendars").doc(calendarId).get()).data();

  if (!calendar) return json({ error: "Kalender ikke funnet" }, 404);
  if (calendar.public === false && calendar.owner !== apiKey) {
    return json({ error: "Mangler tilgang til kalender" }, 403);
  }

  const users = await adminDb.collection("users").where("calendarId", "==", calendarId).get();

  if (users.empty) return json({ error: "Ingen brukere funnet" }, 404);

  const today = new Date().getDate().toString();
  const winner = users.docs
    .map((entry) => entry.data())
    .find((user) => Array.isArray(user.won) && user.won.includes(today));

  return json(winner ? { name: winner.name, image: winner.image } : {});
}
