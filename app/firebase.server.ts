import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Admin SDK used by route loaders. On App Hosting this runs on Cloud Run with
 * Application Default Credentials, so `initializeApp()` needs no arguments.
 *
 * Locally the emulators are selected through the standard FIRESTORE_EMULATOR_HOST
 * variable. Vite exposes `.env.local` to SSR code via import.meta.env, so the
 * flag is translated into the process env the Admin SDK reads.
 */
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8081";
  // The Admin SDK demands a project id when there are no credentials.
  process.env.GOOGLE_CLOUD_PROJECT ??= import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "demo-julekal";
}

const app =
  getApps()[0] ??
  initializeApp({
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  });

export const adminDb = getFirestore(app);
