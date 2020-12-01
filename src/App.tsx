import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import StateProvider from "./StateProvider";
import StateContainer from "./components/StateContainer";
import Notification from "./components/Notification";
import Welcome from "./pages/Welcome";
import Calendar from "./pages/Calendar";
import Admin from "./pages/Admin";
import Open from "./pages/Open";
import firebase from "firebase/app";
import "firebase/analytics";
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";
import Snowfall from "react-snowfall";
import { useWindowSize } from "react-use";
import styles from "./App.module.scss";

function App() {
  const [config, setConfig] = React.useState<Object>();

  const { width, height } = useWindowSize();

  React.useEffect(() => {
    fetch("/__/firebase/init.json")
      .then((res) => res.json())
      .then((config) => {
        setConfig(config);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  if (config && !firebase.apps.length) {
    firebase.initializeApp(config);
    firebase.analytics();
  }

  if (!firebase.apps.length) {
    return null;
  }

  return (
    <StateProvider>
      <div className={styles.content}>
        <Router>
          <Switch>
            <Route path="/:name">
              <StateContainer>
                <Switch>
                  <Route exact path="/:name/settings">
                    <Admin />
                  </Route>
                  <Route exact path="/:name/open/:day">
                    <Open />
                  </Route>
                  <Route>
                    <Calendar />
                  </Route>
                </Switch>
              </StateContainer>
            </Route>
            <Route>
              <Welcome />
            </Route>
          </Switch>
        </Router>
      </div>
      <Notification />
      <Snowfall color="white" style={{ height, width }} />
    </StateProvider>
  );
}

export default App;
