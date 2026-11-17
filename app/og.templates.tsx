import { type CalendarType, type UserType } from "./types";

/** Matches the site: Roboto for body text, Playfair Display for headings. */
export const BODY_FONT = "Roboto";
export const DISPLAY_FONT = "Playfair Display";

const RED = "#d52b1e";
const CREAM = "#e0e1dd";
const DARK = "#4d4f53";

const shell = (children: React.ReactNode): React.ReactNode => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: CREAM,
      fontFamily: BODY_FONT,
      padding: 64,
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);

const footer = (text: string): React.ReactNode => (
  <div style={{ display: "flex", marginTop: 40, fontSize: 30, color: DARK }}>{text}</div>
);

/** Calendar overview: name plus how many days have been opened. */
export const CalendarOgImage = ({
  calendar,
  opened,
  total,
}: {
  calendar: CalendarType;
  opened: number;
  total: number;
}): React.ReactNode =>
  shell(
    <>
      <div style={{ display: "flex", fontSize: 40, color: DARK, letterSpacing: 2 }}>
        JULEKALENDER
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 96,
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          color: RED,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        {calendar.name}
      </div>
      {footer(`${opened} av ${total} luker åpnet`)}
    </>,
  );

/** Day page: the winner, or an unopened door. */
export const DayOgImage = ({
  calendar,
  day,
  winner,
  image,
}: {
  calendar: CalendarType;
  day: string;
  winner?: UserType;
  /** Data URL; remote URLs are inlined by the caller. */
  image?: string;
}): React.ReactNode =>
  shell(
    <>
      <div style={{ display: "flex", fontSize: 36, color: DARK }}>
        {calendar.name} · {day}. desember
      </div>
      {winner ? (
        <>
          {image ? (
            <img
              src={image}
              alt=""
              width={220}
              height={220}
              style={{
                borderRadius: 110,
                marginTop: 28,
                border: `8px solid ${RED}`,
                objectFit: "cover",
              }}
            />
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              color: RED,
              marginTop: 24,
              textAlign: "center",
            }}
          >
            {winner.name || "Vinneren"}
          </div>
          {footer("vant dagens gave")}
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              fontSize: 180,
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              color: RED,
              marginTop: 16,
            }}
          >
            {day}
          </div>
          {footer("Luken er ikke åpnet ennå")}
        </>
      )}
    </>,
  );
