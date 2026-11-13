import React from "react";
import { Outlet } from "react-router";
import StateProvider from "../../StateProvider";
import Notification from "../../components/Notification";
import { type FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import Snowfall from "react-snowfall";
import { useWindowSize } from "react-use";
import styles from "./App.module.css";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * In production, Firebase App Hosting injects the web app config and the no-arg
 * `initializeApp()` picks it up automatically. Locally that injection does not
 * happen, so fall back to explicit VITE_FIREBASE_* vars from `.env.local`.
 */
const firebaseConfig = (): FirebaseOptions | undefined => {
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

export default function App() {
  const [init, setInit] = React.useState(false);
  const { width, height } = useWindowSize();

  React.useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const config = firebaseConfig();
      const app = getApps()[0] ?? (config ? initializeApp(config) : initializeApp());
      const auth = getAuth(app);
      getFirestore(app);
      getStorage(app);

      // Every visitor needs an identity so calendars they create have an owner.
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      if (await isSupported()) getAnalytics(app);
      if (!cancelled) setInit(true);
    };

    start().catch(() => {
      if (!cancelled) setInit(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!init) {
    return null;
  }

  return (
    <StateProvider>
      <div className={styles.content}>
        <Outlet />
      </div>
      <Notification />
      <Snowfall color="white" style={{ height, width }} />
    </StateProvider>
  );
}
