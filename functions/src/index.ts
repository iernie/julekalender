import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
import * as express from "express";
import * as cors from "cors";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

setGlobalOptions({region: "europe-west1"});

initializeApp();
const app = express();
app.use(cors({origin: "*"}));

app.get("/api", (_, response) => {
  response.json({error: "Kalendernavn mangler"});
  return;
});

app.get("/api/:name", async (request, response) => {
  const {name} = request.params;
  const {apiKey} = request.query;

  const calendarReference = getFirestore()
      .collection("calendars")
      .doc(name.toLocaleLowerCase());

  const calendar = (await calendarReference.get()).data();
  if (!calendar) {
    response.json({error: "Kalender ikke funnet"});
    return;
  }
  if (calendar.public === false && calendar.owner !== apiKey) {
    response.json({error: "Mangler tilgang til kalender"});
    return;
  }

  getFirestore()
      .collection("users")
      .where("calendar", "==", calendarReference)
      .get()
      .then((users) => {
        if (users.empty) {
          response.json({error: "Ingen brukere funnet"});
          return;
        }

        const today = new Date().getDate();
        const winner = users.docs
            .map((doc) => {
              return doc.data();
            })
            .find((user) => {
              return user.won.indexOf(today.toString()) !== -1;
            });

        if (!winner) {
          response.json({});
          return;
        }

        response.json({
          name: winner.name,
          image: winner.image,
        });
      })
      .catch(() => {
        response.json({
          error: "En feil skjedde",
        });
      });
});

exports.api = onRequest(app);
