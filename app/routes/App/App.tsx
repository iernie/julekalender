import React from "react";
import { Outlet } from "react-router";
import StateProvider, { SET_USER, useAppState } from "../../StateProvider";
import Notification from "../../components/Notification";
import { getAnalytics, isSupported } from "firebase/analytics";
import Snowfall from "react-snowfall";
import styles from "./App.module.css";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { firebaseApp, useEmulators } from "../../firebase";
import { useMounted, usePrefersReducedMotion, useWindowSize } from "../../hooks";

export default function App() {
  return (
    <StateProvider>
      <AppShell />
    </StateProvider>
  );
}

function AppShell() {
  const [, dispatch] = useAppState();
  const { width, height } = useWindowSize();
  // Sized from the window, so it cannot be server rendered without a mismatch.
  const mounted = useMounted();
  const reducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    const auth = getAuth(firebaseApp);

    // Single auth listener for the whole app: it lives here rather than in the
    // calendar layout so routes outside that layout see the same user.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      dispatch({ type: SET_USER, payload: user });
    });

    // Every visitor needs an identity so calendars they create have an owner.
    // Not awaited before rendering: reading a public calendar does not require
    // auth, and blocking here would mean the server renders nothing.
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(() => undefined);
    }

    return unsubscribe;
  }, [dispatch]);

  React.useEffect(() => {
    // Analytics has no emulator and would try to reach Google in dev.
    if (useEmulators) return;
    isSupported()
      .then((supported) => {
        if (supported) getAnalytics(firebaseApp);
      })
      .catch(() => undefined);
  }, []);

  return (
    <>
      <main className={styles.content}>
        <Outlet />
      </main>
      <Notification />
      {mounted && !reducedMotion && <Snowfall color="white" style={{ height, width }} />}
    </>
  );
}
