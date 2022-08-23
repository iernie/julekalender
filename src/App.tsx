import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StateProvider from "./StateProvider";
import StateContainer from "./components/StateContainer";
import Notification from "./components/Notification";
import Welcome from "./pages/Welcome";
import Calendar from "./pages/Calendar";
import Admin from "./pages/Admin";
import Open from "./pages/Open";
import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
// import Snowfall from "react-snowfall";
// import { useWindowSize } from "react-use";
import styles from "./App.module.scss";

function App() {
  const [config, setConfig] = React.useState<Object>();

  // const { width, height } = useWindowSize();

  React.useEffect(() => {
    fetch("/__/firebase/init.json")
      .then((res) => res.json())
      .then((config) => {
        firebase.initializeApp(config);
        setConfig(config);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  if (config && !firebase.apps.length) {
    firebase.analytics();
  }

  if (!firebase.apps.length) {
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
      {/* <Snowfall color="white" style={{ height, width }} /> */}
    </StateProvider>
  );
}

export default App;
