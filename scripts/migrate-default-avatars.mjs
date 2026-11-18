// One-off migration: points users whose `image` is a default avatar in Storage
// (`avatars/<n>.png`) at the copy the app now serves from `public/avatars/`.
//
// Dry run by default; pass --apply to write. Only `image` is updated, so
// `deleteBy` and the rest of the document are untouched.
//
//   GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/migrate-default-avatars.mjs --project julekal
//   GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/migrate-default-avatars.mjs --project julekal --apply
//
// Against the emulator, set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 instead of
// credentials. --origin defaults to PUBLIC_ORIGIN from apphosting.yaml.
//
// Once it has run, nothing references Storage `avatars/` any more: delete that
// prefix from the bucket and drop the `avatars` calendar id reservation.
import { parseArgs } from "node:util";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const { values } = parseArgs({
  options: {
    project: { type: "string" },
    origin: { type: "string", default: "https://kalender.christmas" },
    apply: { type: "boolean", default: false },
  },
});

if (!values.project) {
  console.error("Missing --project");
  process.exit(1);
}

// Storage download URLs encode the object path: .../o/avatars%2F7.png?alt=media&token=...
const STORAGE_AVATAR = /\/o\/avatars%2F(\d+)\.png(?:\?|$)/;
// A batch holds at most 500 writes.
const BATCH_SIZE = 500;

initializeApp({ projectId: values.project });
const db = getFirestore();

const updates = [];
const calendars = await db.collection("calendars").listDocuments();

for (const calendar of calendars) {
  // oxlint-disable-next-line no-await-in-loop
  const users = await calendar.collection("users").get();
  for (const user of users.docs) {
    const match = STORAGE_AVATAR.exec(String(user.get("image") ?? ""));
    if (match) {
      updates.push({ ref: user.ref, image: `${values.origin}/avatars/${match[1]}.png` });
    }
  }
}

console.log(
  `${updates.length} users in ${calendars.length} calendars use a Storage default avatar.`,
);

if (!values.apply) {
  for (const { ref, image } of updates.slice(0, 10)) console.log(`  ${ref.path} -> ${image}`);
  console.log("Dry run. Pass --apply to write.");
  process.exit(0);
}

for (let index = 0; index < updates.length; index += BATCH_SIZE) {
  const batch = db.batch();
  for (const { ref, image } of updates.slice(index, index + BATCH_SIZE)) {
    batch.update(ref, { image });
  }
  // oxlint-disable-next-line no-await-in-loop
  await batch.commit();
}

console.log(`Updated ${updates.length} users.`);
