import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StateProvider from "./StateProvider";
import StateContainer from "./components/StateContainer";
import Notification from "./components/Notification";
import Welcome from "./pages/Welcome";
import Calendar from "./pages/Calendar";
import Admin from "./pages/Admin";
import Open from "./pages/Open";
import { getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import Snowfall from "react-snowfall";
import { useWindowSize } from "react-use";
import styles from "./App.module.scss";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function App() {
  const { width, height } = useWindowSize();

  React.useEffect(() => {
    fetch("/__/firebase/init.json")
      .then((res) => res.json())
      .then((config) => {
        const app = initializeApp(config);
        getAuth(app);
        getAnalytics(app);
        getFirestore(app);
        getStorage(app);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  if (!getApps().length) {
    return null;
  }

  return (
    <StateProvider>
      <div className={styles.content}>
        <Router>
          <Routes>
            <Route
              path=":name/*"
              element={
                <StateContainer>
                  <Routes>
                    <Route path="/settings" element={<Admin />} />
                    <Route path="/open/:day" element={<Open />} />
                    <Route path="/" element={<Calendar />} />
                  </Routes>
                </StateContainer>
              }
            />
            <Route path="/" element={<Welcome />} />
          </Routes>
        </Router>
      </div>
      <Notification />
      <Snowfall color="white" style={{ height, width }} />
    </StateProvider>
  );
}

export default App;
