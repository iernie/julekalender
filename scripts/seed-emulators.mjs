/**
 * Seeds the Storage emulator with the default avatars from `static/`.
 *
 * The app reads these from `avatars/<n>.png` when adding a user. A fresh
 * emulator bucket is empty, so without this "Legg til ny bruker" fails on
 * getDownloadURL.
 *
 * Uploads go through the emulator's GCS JSON API, which bypasses
 * storage.rules — the rules deliberately make `avatars/` read-only.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const HOST = process.env.STORAGE_EMULATOR_HOST ?? "http://127.0.0.1:9199";
const BUCKET = process.env.VITE_FIREBASE_STORAGE_BUCKET ?? "demo-julekal.firebasestorage.app";
const SOURCE = "static";

const reachable = async () => {
  try {
    await fetch(HOST, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
};

if (!(await reachable())) {
  console.error(
    `Storage emulator not reachable at ${HOST}.\nStart it first with: npm run emulators`,
  );
  process.exit(1);
}

const files = (await readdir(SOURCE)).filter((name) => name.endsWith(".png"));

if (files.length === 0) {
  console.error(`No .png files found in ${SOURCE}/`);
  process.exit(1);
}

const upload = async (file) => {
  const body = await readFile(join(SOURCE, file));
  const name = encodeURIComponent(`avatars/${file}`);
  const url = `${HOST}/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${name}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload ${file}: ${response.status} ${await response.text()}`);
  }
};

try {
  await Promise.all(files.map(upload));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Seeded ${files.length} avatars into ${BUCKET}.`);
