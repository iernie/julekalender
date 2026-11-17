import { pngResponse, renderOgImage } from "../og.server";
import { SiteOgImage } from "../og.templates";
import type { Route } from "./+types/og.site";

/** Static preview for the front page and for calendars that cannot have their own. */
export async function loader({ request }: Route.LoaderArgs) {
  // Same reasoning as the root loader: the request URL is Cloud Run's in production.
  const origin = process.env.PUBLIC_ORIGIN || request.url;
  return pngResponse(await renderOgImage(SiteOgImage({ host: new URL(origin).host })), 86_400);
}
