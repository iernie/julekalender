import { adminDb } from "../firebase.server";
import { toCalendarId } from "../helpers";
import { toCalendar, toUser } from "../serialize";
import { pngResponse, renderOgImage, toDataUrl } from "../og.server";
import { DayOgImage } from "../og.templates";
import type { Route } from "./+types/og.day";

export async function loader({ params }: Route.LoaderArgs) {
  const calendarId = toCalendarId(params.name ?? "");
  const day = Number(params.day);

  if (!Number.isInteger(day) || day < 1 || day > 24) {
    throw new Response("Not found", { status: 404 });
  }

  const snapshot = await adminDb.collection("calendars").doc(calendarId).get();
  const data = snapshot.data();

  if (!data || data.public === false) {
    throw new Response("Not found", { status: 404 });
  }

  const users = await adminDb.collection("users").where("calendarId", "==", calendarId).get();
  const winner = users.docs
    .map((entry) => toUser(entry.data()))
    .find((user) => user.won.includes(String(day)));

  return pngResponse(
    await renderOgImage(
      DayOgImage({
        calendar: toCalendar(data),
        day: String(day),
        winner,
        image: await toDataUrl(winner?.image),
      }),
    ),
  );
}
