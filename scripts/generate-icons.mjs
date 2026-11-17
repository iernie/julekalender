// Regenerates the favicons and app icons in public/ from app/assets/bauble.svg.
// Run with `pnpm icons` after editing the SVG and commit the output.
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const source = readFileSync(new URL("../app/assets/bauble.svg", import.meta.url), "utf8");
const inner = source.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const out = (file) => new URL(`../public/${file}`, import.meta.url);

const render = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

// App icons are opaque: iOS fills transparency with black, and launchers crop
// to their own shape, so the bauble sits inside the central safe zone.
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#e0e1dd"/>
  <g transform="translate(9.6 9.6) scale(0.7)">${inner}</g>
</svg>`;

writeFileSync(out("favicon.svg"), source);
writeFileSync(out("favicon.png"), render(source, 64));
writeFileSync(out("logo192.png"), render(tile, 192));
writeFileSync(out("logo512.png"), render(tile, 512));
console.log("Icons written to public/");
