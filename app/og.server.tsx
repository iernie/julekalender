import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
// `?inline` embeds the files in the server bundle as base64 data URLs. Reading
// them from disk at runtime does not work: the build never copies them next to
// `build/server/index.js`, so every OG request failed with ENOENT.
import robotoRegular from "./assets/fonts/Roboto-Regular.ttf?inline";
import playfairBold from "./assets/fonts/PlayfairDisplay-Bold.ttf?inline";
import { BODY_FONT, DISPLAY_FONT } from "./og.templates";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

type Fonts = Array<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }>;

const fromDataUrl = (url: string): Buffer => Buffer.from(url.slice(url.indexOf(",") + 1), "base64");

let fonts: Fonts | undefined;

/** Decoded once per instance. */
const loadFonts = (): Fonts => {
  fonts ??= [
    { name: BODY_FONT, data: fromDataUrl(robotoRegular), weight: 400, style: "normal" },
    { name: DISPLAY_FONT, data: fromDataUrl(playfairBold), weight: 700, style: "normal" },
  ];
  return fonts;
};

/**
 * Renders a satori element tree to PNG.
 *
 * Social scrapers reject SVG for og:image, so this has to rasterise. satori
 * turns the tree into SVG and resvg rasterises it.
 */
export const renderOgImage = async (element: React.ReactNode): Promise<Uint8Array> => {
  const svg = await satori(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: loadFonts(),
  });

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_WIDTH },
  })
    .render()
    .asPng();

  return new Uint8Array(png);
};

/** Defaults to a short cache: winners change at most once a day. */
export const pngResponse = (png: Uint8Array, maxAge = 300) =>
  new Response(png as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}`,
    },
  });

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * Inlines a remote avatar as a data URL.
 *
 * satori can fetch images itself, but it refuses private addresses (so the
 * Storage emulator never works locally) and gives no control over timeouts.
 * Returns undefined on any failure; the templates render without the image.
 */
export const toDataUrl = async (url: string | undefined): Promise<string | undefined> => {
  if (!url) return undefined;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return undefined;

    const type = response.headers.get("content-type") ?? "image/png";
    if (!type.startsWith("image/")) return undefined;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_AVATAR_BYTES) return undefined;

    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return undefined;
  }
};
