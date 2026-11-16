import { type CalendarType, type UserType } from "./types";

type TimestampLike = { toDate: () => Date };

const isTimestampLike = (value: unknown): value is TimestampLike =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as TimestampLike).toDate === "function";

/**
 * Firestore Timestamps do not survive the loader wire format, and the Admin and
 * client SDKs return different Timestamp classes. Everything in app state is
 * normalised to an ISO string so loader data and onSnapshot data are the same
 * shape.
 */
const toIso = (value: unknown): string => {
  if (isTimestampLike(value)) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
};

export const toCalendar = (data: Record<string, unknown>): CalendarType => ({
  id: String(data.id ?? ""),
  name: String(data.name ?? ""),
  createdAt: toIso(data.createdAt),
  deleteBy: toIso(data.deleteBy),
  owner: String(data.owner ?? ""),
  public: data.public !== false,
  settings: (data.settings ?? {}) as CalendarType["settings"],
});

export const toUser = (data: Record<string, unknown>): UserType => ({
  id: String(data.id ?? ""),
  calendarId: String(data.calendarId ?? ""),
  owner: String(data.owner ?? ""),
  name: String(data.name ?? ""),
  image: String(data.image ?? ""),
  createdAt: toIso(data.createdAt),
  deleteBy: toIso(data.deleteBy),
  won: Array.isArray(data.won) ? (data.won as Array<string>).map(String) : [],
});
