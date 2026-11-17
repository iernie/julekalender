import { type CalendarType, type UserType } from "./types";
import bauble from "./assets/bauble.svg?raw";

const BAUBLE_URL = `data:image/svg+xml,${encodeURIComponent(bauble)}`;

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

const GREY = "#c9cac8";
/** Doors up to this day are drawn opened in the site preview's calendar grid. */
const OPENED_UNTIL = 10;
const DOOR = 76;
const DOOR_GAP = 10;

const door = (day: number): React.ReactNode => (
  <div
    key={day}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: DOOR,
      height: DOOR,
      marginLeft: day % 6 === 1 ? 0 : DOOR_GAP,
      background: day <= OPENED_UNTIL ? RED : GREY,
      color: "#fff",
      fontSize: 34,
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
    }}
  >
    {day}
  </div>
);

/** Front page: wordmark and tagline beside a calendar grid. */
export const SiteOgImage = ({ host }: { host: string }): React.ReactNode => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      background: CREAM,
      fontFamily: BODY_FONT,
      padding: "0 72px",
      boxSizing: "border-box",
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", flex: 1, marginRight: 48 }}>
      <img src={BAUBLE_URL} alt="" width={96} height={96} />
      <div
        style={{
          display: "flex",
          fontSize: 84,
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          color: RED,
          marginTop: 20,
          lineHeight: 1,
        }}
      >
        Julekalender
      </div>
      <div style={{ display: "flex", fontSize: 40, color: DARK, marginTop: 8 }}>as a Service</div>
      <div style={{ display: "flex", fontSize: 32, color: DARK, marginTop: 40, maxWidth: 440 }}>
        Lag din egen julekalender på et blunk.
      </div>
      <div style={{ display: "flex", fontSize: 26, color: RED, marginTop: 28 }}>{host}</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column" }}>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} style={{ display: "flex", marginTop: row === 0 ? 0 : DOOR_GAP }}>
          {Array.from({ length: 6 }, (_, column) => door(row * 6 + column + 1))}
        </div>
      ))}
    </div>
  </div>
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
