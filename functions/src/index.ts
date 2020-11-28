import * as functions from "firebase-functions";

import * as admin from "firebase-admin";
admin.initializeApp();

export const api = functions.https.onRequest(async (request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");

  const name = request.query.name;
  if (!name) {
    response.json({ error: "Kalendernavn mangler" });
    return;
  }

  const calendarReference = admin
    .firestore()
    .collection("calendars")
    .doc((name as string).toLocaleLowerCase());

  const users = await admin
    .firestore()
    .collection("users")
    .where("calendar", "==", calendarReference)
    .get();

  if (users.empty) {
    response.json({ error: "Ingen brukere funnet" });
    return;
  }

  var today = new Date().getDate();
  const winner = users.docs
    .map((doc) => doc.data())
    .find((user) => user.won.indexOf(today) !== -1);

  if (!winner) {
    response.json({});
    return;
  }

  response.json({
    name: winner.name,
    image: winner.image,
  });
});
