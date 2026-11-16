import React from "react";
import { Outlet } from "react-router";
import StateProvider from "../../StateProvider";
import Notification from "../../components/Notification";
import { getAnalytics, isSupported } from "firebase/analytics";
import Snowfall from "react-snowfall";
import styles from "./App.module.css";
import { getAuth, signInAnonymously } from "firebase/auth";
import { firebaseApp, useEmulators } from "../../firebase";
import { useMounted, usePrefersReducedMotion, useWindowSize } from "../../hooks";

export default function App() {
  const { width, height } = useWindowSize();
  // Sized from the window, so it cannot be server rendered without a mismatch.
  const mounted = useMounted();
  const reducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    const auth = getAuth(firebaseApp);

    // Every visitor needs an identity so calendars they create have an owner.
    // Not awaited before rendering: reading a public calendar does not require
    // auth, and blocking here would mean the server renders nothing.
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(() => undefined);
    }

    // Analytics has no emulator and would try to reach Google in dev.
    if (!useEmulators) {
      isSupported()
        .then((supported) => {
          if (supported) getAnalytics(firebaseApp);
        })
        .catch(() => undefined);
    }
  }, []);

  return (
    <StateProvider>
      <main className={styles.content}>
        <Outlet />
      </main>
      <Notification />
      {mounted && !reducedMotion && <Snowfall color="white" style={{ height, width }} />}
    </StateProvider>
  );
}
