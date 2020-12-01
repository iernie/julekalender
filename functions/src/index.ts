import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";

admin.initializeApp();
const app = express();
app.use(cors({ origin: true }));

app.get("/api", (_, response) => {
  response.json({ error: "Kalendernavn mangler" });
  return;
});

app.get("/api/:name", async (request, response) => {
  const { name } = request.params;
  const { apiKey } = request.query;

  const calendarReference = admin
    .firestore()
    .collection("calendars")
    .doc(name.toLocaleLowerCase());

  const calendar = (await calendarReference.get()).data();
  if (!calendar) {
    response.json({ error: "Kalender ikke funnet" });
    return;
  }
  if (calendar.public === false && calendar.owner !== apiKey) {
    response.json({ error: "Mangler tilgang til kalender" });
    return;
  }

  admin
    .firestore()
    .collection("users")
    .where("calendar", "==", calendarReference)
    .get()
    .then((users) => {
      if (users.empty) {
        response.json({ error: "Ingen brukere funnet" });
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

exports.api = functions.https.onRequest(app);
