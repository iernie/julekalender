import { type FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { FUNCTIONS_REGION } from "./helpers";

export const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

/**
 * In production, Firebase App Hosting injects the web app config and the no-arg
 * `initializeApp()` picks it up. The VITE_FIREBASE_* vars in `.env.local` are
 * *emulator* values: they are baked into the client bundle at build time, and
 * using them outside emulator mode would override App Hosting's injected config
 * with a fake api key. So only honour them when emulators are explicitly on.
 */
const explicitConfig = (): FirebaseOptions | undefined => {
  if (!useEmulators) return undefined;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return undefined;
  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
};

const createApp = () => {
  const config = explicitConfig();
  if (config) return initializeApp(config);
  try {
    return initializeApp();
  } catch {
    // Server render without an injected config. Nothing here calls the client
    // SDK during SSR, but modules construct service handles at import time, so
    // the app object still has to exist.
    return initializeApp({ projectId: "unconfigured" });
  }
};

/**
 * Initialised at module scope rather than in an effect so that server render
 * and first client render are identical, and so components can construct
 * Firestore/Storage handles while rendering.
 */
export const firebaseApp = getApps()[0] ?? createApp();

if (useEmulators && !import.meta.env.SSR) {
  const host = "127.0.0.1";
  connectAuthEmulator(getAuth(firebaseApp), `http://${host}:9099`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(getFirestore(firebaseApp), host, 8081);
  connectStorageEmulator(getStorage(firebaseApp), host, 9199);
  connectFunctionsEmulator(getFunctions(firebaseApp, FUNCTIONS_REGION), host, 5001);
}
