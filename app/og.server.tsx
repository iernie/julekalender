import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), "assets/fonts");

type Fonts = Array<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }>;

let fontsPromise: Promise<Fonts> | undefined;

/** Read once per instance; the files are ~250 KB together. */
const loadFonts = (): Promise<Fonts> => {
  fontsPromise ??= Promise.all([
    readFile(join(FONT_DIR, "Roboto-Regular.ttf")),
    readFile(join(FONT_DIR, "Roboto-Bold.ttf")),
  ]).then(([regular, bold]): Fonts => [
    { name: "Roboto", data: regular, weight: 400, style: "normal" },
    { name: "Roboto", data: bold, weight: 700, style: "normal" },
  ]);
  return fontsPromise;
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
    fonts: await loadFonts(),
  });

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_WIDTH },
  })
    .render()
    .asPng();

  return new Uint8Array(png);
};

export const pngResponse = (png: Uint8Array) =>
  new Response(png as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      // Winners change at most once a day; let scrapers and CDNs cache briefly.
      "Cache-Control": "public, max-age=300, s-maxage=300",
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
