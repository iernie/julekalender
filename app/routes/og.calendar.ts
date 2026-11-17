import { adminDb } from "../firebase.server";
import { toCalendarId } from "../helpers";
import { toCalendar, toUser } from "../serialize";
import { pngResponse, renderOgImage } from "../og.server";
import { CalendarOgImage } from "../og.templates";
import type { Route } from "./+types/og.calendar";

const DAYS = 24;

export async function loader({ params }: Route.LoaderArgs) {
  const calendarId = toCalendarId(params.name ?? "");
  const snapshot = await adminDb.collection("calendars").doc(calendarId).get();
  const data = snapshot.data();

  // Private calendars must not expose a preview; 404 rather than 403 so the
  // existence of the calendar is not confirmed either.
  if (!data || data.public === false) {
    throw new Response("Not found", { status: 404 });
  }

  const users = await snapshot.ref.collection("users").get();
  const opened = new Set(users.docs.flatMap((entry) => toUser(entry.data()).won)).size;

  return pngResponse(
    await renderOgImage(CalendarOgImage({ calendar: toCalendar(data), opened, total: DAYS })),
  );
}
