import React from "react";
import firebase from "firebase/app";
import { useParams, useHistory } from "react-router-dom";
import { UserType } from "../../types";
import { SET_NOTIFICATION, useState } from "../../StateProvider";
import { v4 as uuidv4 } from "uuid";
import {
  FiHome,
  FiLock,
  FiX,
  FiLogIn,
  FiUnlock,
  FiLogOut,
  FiTrash,
} from "react-icons/fi";
import Title from "../../components/Title";
import styles from "./Admin.module.scss";
import { compareAsc } from "date-fns";

const Admin: React.FC = () => {
  const [confirm, setConfirm] = React.useState(true);
  const [{ calendar, users, user }, dispatch] = useState();
  const { name } = useParams<{ name: string }>();
  const history = useHistory();

  const usedAvatars = React.useRef<Array<number>>([]);

  const getAvatar = (): number => {
    if (usedAvatars.current.length === 20) {
      usedAvatars.current = [];
    }
    const random = Math.floor(Math.random() * 20) + 1;
    if (usedAvatars.current.indexOf(random) === -1) {
      usedAvatars.current.push(random);
      return random;
    }
    return getAvatar();
  };

  const db = firebase.firestore();

  const deleteCalendar = async () => {
    if (confirm) {
      setConfirm(false);
      dispatch({
        type: SET_NOTIFICATION,
        payload:
          "Er du sikker på at du vil slette kalenderen og alle brukerene? Trykk en gang til.",
      });
      return;
    }
    const ids = users?.map((user) => user.id) ?? [];
    ids.forEach(async (id) => {
      try {
        await db.collection("users").doc(id).delete();
        await firebase
          .storage()
          .ref()
          .child(`${name.toLowerCase()}/${id}`)
          .delete();
      } catch (e) {}
    });
    await db.collection("calendars").doc(name.toLowerCase()).delete();
    history.push("/");
  };

  const login = () => {
    firebase
      .auth()
      .signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then((result) => {
        if (result.user) {
          setPublic(true);
        } else {
          dispatch({
            type: SET_NOTIFICATION,
            payload: "Klarte ikke logge inn.",
          });
        }
      })
      .catch(() => {
        dispatch({ type: SET_NOTIFICATION, payload: "Klarte ikke logge inn." });
      });
  };

  const logout = () => {
    firebase
      .auth()
      .signOut()
      .then(() => {})
      .catch(() => {});
  };

  const setPublic = (isPublic: boolean) => {
    if (user) {
      const uid = calendar.owner ?? user.uid;
      db.collection("calendars")
        .doc(name.toLocaleLowerCase())
        .update({
          owner: uid,
          public: isPublic,
        })
        .then(() => {})
        .catch(() => {});
    }
  };

  return (
    <div>
      <Title>Innstillinger</Title>
      {!calendar.owner || calendar.owner === user?.uid ? (
        <FiTrash
          size="1.5rem"
          className={styles.delete}
          onClick={deleteCalendar}
        />
      ) : null}
      <FiHome
        size="1.5rem"
        className={styles.settings}
        onClick={() => {
          history.push(`/${name}`);
        }}
      />
      {!user ? (
        <FiLogIn size="1.5rem" className={styles.login} onClick={login} />
      ) : (
        <FiLogOut size="1.5rem" className={styles.login} onClick={logout} />
      )}
      {user && (
        <>
          {calendar.public === false ? (
            <FiLock
              size="1.5rem"
              className={styles.lock}
              onClick={() => setPublic(true)}
            />
          ) : (
            <FiUnlock
              size="1.5rem"
              className={styles.lock}
              onClick={() => setPublic(false)}
            />
          )}
        </>
      )}
      <div className={styles.admin}>
        <div className={styles.Form}>
          <a
            target="_blank"
            rel="noopener noreferrer"
            className={styles.url}
            href={`/api/${name.toLowerCase()}${
              user ? `?apiKey=${user.uid}` : ""
            }`}
          >
            API
          </a>
        </div>
        <div className={styles.form}>
          <label htmlFor="gifts" className={styles.label}>
            Antall gaver per person (tom = uendelig)
          </label>
          <input
            id="gifts"
            className={styles.input}
            type="number"
            min={1}
            value={calendar.settings.giftsPerUser}
            placeholder="∞"
            onChange={(e) => {
              db.collection("calendars")
                .doc(name.toLocaleLowerCase())
                .update({
                  "settings.giftsPerUser": e.target.value
                    ? parseInt(e.target.value, 10)
                    : "",
                })
                .then(() => {});
            }}
          />
        </div>

        <div className={styles.form}>
          <input
            id="fair"
            type="checkbox"
            className={styles.checkbox}
            checked={calendar.settings.fair}
            onChange={(e) => {
              db.collection("calendars")
                .doc(name.toLocaleLowerCase())
                .update({
                  "settings.fair": e.target.checked,
                })
                .then(() => {})
                .catch(() => {});
            }}
          />
          <label htmlFor="fair" className={styles.label}>
            Jevn gavefordeling (alle får gave før neste runde starter)
          </label>
        </div>

        <h2>Brukere</h2>

        <div className={styles.users}>
          {users &&
            users
              .sort((a, b) =>
                compareAsc(a.createdAt.seconds, b.createdAt.seconds)
              )
              .map((user) => {
                const ref = firebase
                  .storage()
                  .ref()
                  .child(`${name.toLowerCase()}/${user.id}`);
                return (
                  <div className={styles.user} key={user.id}>
                    <div className={styles.avatar}>
                      <img
                        className={styles.image}
                        src={user.image}
                        alt={user.name}
                      />
                      <input
                        className={styles.upload}
                        type="file"
                        onChange={(e) => {
                          if (e.target.files?.length === 1) {
                            ref
                              .put(e.target.files[0])
                              .then(async () => {
                                db.collection("users")
                                  .doc(user.id)
                                  .update({
                                    image: await ref.getDownloadURL(),
                                  })
                                  .then(() => {})
                                  .catch(() => {});
                              })
                              .catch(() => {});
                          }
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      className={styles.username}
                      value={user.name}
                      placeholder="Navn..."
                      onChange={(e) => {
                        db.collection("users")
                          .doc(user.id)
                          .update({
                            name: e.target.value,
                          })
                          .then(() => {})
                          .catch(() => {});
                      }}
                    />
                    <FiX
                      size="1.5rem"
                      className={styles.deleteuser}
                      onClick={() => {
                        db.collection("users")
                          .doc(user.id)
                          .delete()
                          .then(() => {
                            ref
                              .delete()
                              .then(() => {})
                              .catch(() => {});
                          })
                          .catch(() => {});
                      }}
                    />
                  </div>
                );
              })}
        </div>
        <button
          className={styles.button}
          type="button"
          onClick={async () => {
            const id = uuidv4();
            db.collection("users")
              .doc(id)
              .set({
                id,
                name: "",
                createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
                won: [],
                calendar: db
                  .collection("calendars")
                  .doc(name.toLocaleLowerCase()),
                image: await firebase
                  .storage()
                  .ref()
                  .child(`avatars/${getAvatar()}.png`)
                  .getDownloadURL(),
              } as UserType)
              .then(() => {})
              .catch(() => {});
          }}
        >
          Legg til ny bruker
        </button>
      </div>
    </div>
  );
};

export default Admin;
