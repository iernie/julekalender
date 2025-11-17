import React from "react";
import { Outlet, useParams } from "react-router";
import StateProvider from "../../StateProvider";
import Notification from "../../components/Notification";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import Snowfall from "react-snowfall";
import { useWindowSize } from "react-use";
import styles from "./App.module.css";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export default function App() {
  const [init, setInit] = React.useState(false);
  const { width, height } = useWindowSize();
  const { name } = useParams<{ name: string }>();

  React.useEffect(() => {
    const app = initializeApp();
    getAuth(app);
    getAnalytics(app);
    getFirestore(app);
    getStorage(app);
    setInit(true);
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
