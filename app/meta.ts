import { type CalendarType, type UserType } from "./types";

type MetaMatch = { id: string; loaderData?: unknown } | undefined;

type CalendarRouteData = {
  calendar: CalendarType | null;
  users: Array<UserType>;
};

const loaderDataFor = (matches: Array<MetaMatch>, id: string) =>
  matches.find((match) => match?.id === id)?.loaderData;

/** Absolute origin, published by the root loader; og:image cannot be relative. */
export const metaOrigin = (matches: Array<MetaMatch>): string =>
  (loaderDataFor(matches, "root") as { origin?: string } | undefined)?.origin ?? "";

/**
 * Calendar route data, or null for a private calendar — its loader
 * deliberately returns an empty shell, so previews stay generic.
 */
export const metaCalendarData = (matches: Array<MetaMatch>): CalendarRouteData | null =>
  (loaderDataFor(matches, "components/StateContainer") as CalendarRouteData | undefined) ?? null;

/**
 * Used when a calendar is private or not loaded. A route's meta replaces its
 * parent's, so returning [] would leave the page with no title at all.
 */
export const genericMeta = () =>
  socialMeta({
    title: "Julekalender as a Service",
    description: "Lag din egen julekalender på et blunk.",
  });

export const socialMeta = ({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image?: string;
}) => [
  // A route's meta replaces its parent's rather than merging, so the
  // site-wide tags have to be repeated here.
  { property: "og:site_name", content: "Julekalender as a Service" },
  { property: "og:type", content: "website" },
  { title },
  { name: "description", content: description },
  { property: "og:title", content: title },
  { property: "og:description", content: description },
  { name: "twitter:title", content: title },
  { name: "twitter:description", content: description },
  ...(image
    ? [
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ]
    : []),
];
