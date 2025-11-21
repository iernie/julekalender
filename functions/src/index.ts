/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.

setGlobalOptions({maxInstances: 10, region: "europe-west1"});

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
