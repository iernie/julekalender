import React from "react";
import { useParams, useNavigate } from "react-router";
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
import styles from "./Admin.module.css";
import { compareAsc } from "date-fns";
import { Tooltip as ReactTooltip } from "react-tooltip";
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";

const Admin: React.FC = () => {
  const [confirm, setConfirm] = React.useState(true);
  const [{ calendar, users, user }, dispatch] = useState();
  const { name } = useParams() as { name: string };
  const navigate = useNavigate();
  const db = getFirestore();
  const storage = getStorage();

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
      const userReference = doc(db, "users", id);
      const userSnap = await getDoc(userReference);
      if (userSnap.exists()) {
        const storageRef = ref(storage, `${name.toLocaleLowerCase()}/${id}`);
        if (userSnap.data().image.includes(storageRef.name)) {
          await deleteObject(storageRef);
        }
        await deleteDoc(userReference);
      }
    });
    const calendarReference = doc(db, "calendars", name.toLocaleLowerCase());
    await deleteDoc(calendarReference);
    navigate("/");
  };

  const login = () => {
    signInWithPopup(getAuth(), new GoogleAuthProvider())
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

  const logout = async () => {
    await getAuth().signOut();
  };

  const setPublic = async (isPublic: boolean) => {
    if (user) {
      const uid = calendar.owner ?? user.uid;
      const calendarReference = doc(db, "calendars", name.toLocaleLowerCase());
      await updateDoc(calendarReference, {
        owner: uid,
        public: isPublic,
      });
    }
  };

  return (
    <div>
      <Title>Innstillinger</Title>
      <ReactTooltip id="login" place="bottom">
        {!user ? "Logg inn" : "Logg ut"}
      </ReactTooltip>
      <ReactTooltip id="home" place="bottom">
        Hjem
      </ReactTooltip>
      <ReactTooltip id="lock" place="bottom">
        {user && calendar.public === false ? "Åpne" : "Skjul"}
      </ReactTooltip>
      <ReactTooltip id="delete" place="right">
        Slett kalender
      </ReactTooltip>
      {!calendar.owner || calendar.owner === user?.uid ? (
        <FiTrash
          data-tooltip-id="delete"
          size="1.5rem"
          className={styles.delete}
          onClick={deleteCalendar}
        />
      ) : null}
      <FiHome
        data-tooltip-id="home"
        size="1.5rem"
        className={styles.settings}
        onClick={() => {
          navigate(`/${name.toLocaleLowerCase()}`);
        }}
      />
      {!user ? (
        <FiLogIn
          data-tooltip-id="login"
          size="1.5rem"
          className={styles.login}
          onClick={login}
        />
      ) : (
        <FiLogOut
          data-tooltip-id="login"
          size="1.5rem"
          className={styles.login}
          onClick={logout}
        />
      )}
      {user && (
        <>
          {calendar.public === false ? (
            <FiLock
              data-tooltip-id="lock"
              size="1.5rem"
              className={styles.lock}
              onClick={() => setPublic(true)}
            />
          ) : (
            <FiUnlock
              data-tooltip-id="lock"
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
            href={`/api/${name.toLocaleLowerCase()}${
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
            onChange={async (e) => {
              const calendarReference = doc(
                db,
                "calendars",
                name.toLocaleLowerCase(),
              );
              await updateDoc(calendarReference, {
                "settings.giftsPerUser": e.target.value
                  ? parseInt(e.target.value, 10)
                  : "",
              });
            }}
          />
        </div>

        <div className={styles.form}>
          <input
            id="fair"
            type="checkbox"
            className={styles.checkbox}
            checked={calendar.settings.fair}
            onChange={async (e) => {
              const calendarReference = doc(
                db,
                "calendars",
                name.toLocaleLowerCase(),
              );
              await updateDoc(calendarReference, {
                "settings.fair": e.target.checked,
              });
            }}
          />
          <label htmlFor="fair" className={styles.label}>
            Jevn gavefordeling (alle får gave før neste runde starter)
          </label>
        </div>

        <div className={styles.form}>
          <input
            id="weekends"
            type="checkbox"
            className={styles.checkbox}
            checked={calendar.settings.ignoreWeekends}
            onChange={async (e) => {
              const calendarReference = doc(
                db,
                "calendars",
                name.toLocaleLowerCase(),
              );
              await updateDoc(calendarReference, {
                "settings.ignoreWeekends": e.target.checked,
              });
            }}
          />
          <label htmlFor="weekends" className={styles.label}>
            Ignorer helgene
          </label>
        </div>

        <p>
          Din julekalender og alt tilhørende data slettes automatisk:{" "}
          {calendar.deleteBy.toDate().toLocaleDateString("nb-no")} :)
        </p>

        <h2>Brukere</h2>

        <div className={styles.users}>
          {users &&
            users
              .sort((a, b) =>
                compareAsc(a.createdAt.seconds, b.createdAt.seconds),
              )
              .map((user, i) => {
                const storageRef = ref(
                  storage,
                  `${name.toLocaleLowerCase()}/${user.id}`,
                );
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
                        onChange={async (e) => {
                          if (e.target.files?.length === 1) {
                            const uploadResult = await uploadBytes(
                              storageRef,
                              e.target.files[0],
                            );
                            const userReference = doc(db, "users", user.id);
                            await updateDoc(userReference, {
                              image: await getDownloadURL(uploadResult.ref),
                            });
                          }
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      className={styles.username}
                      value={user.name}
                      placeholder="Navn..."
                      autoFocus={user.name === ""}
                      onChange={async (e) => {
                        const userReference = doc(db, "users", user.id);
                        await updateDoc(userReference, {
                          name: e.target.value,
                        });
                      }}
                    />
                    <FiX
                      size="1.5rem"
                      className={styles.deleteuser}
                      onClick={async () => {
                        const userReference = doc(db, "users", user.id);
                        const userSnap = await getDoc(userReference);
                        if (userSnap.exists()) {
                          if (userSnap.data().image.includes(storageRef.name)) {
                            await deleteObject(storageRef);
                          }
                          await deleteDoc(userReference);
                        }
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
            const calendarReference = doc(
              db,
              "calendars",
              name.toLocaleLowerCase(),
            );
            const id = uuidv4();
            const storageRef = ref(storage, `avatars/${getAvatar()}.png`);
            const downloadUrl = await getDownloadURL(storageRef);

            const userReference = doc(db, "users", id);
            await setDoc(userReference, {
              id,
              name: "",
              createdAt: Timestamp.fromDate(new Date()),
              deleteBy: Timestamp.fromDate(
                new Date(new Date().getFullYear() + 1, 1, 1),
              ),
              won: [],
              calendar: calendarReference,
              image: downloadUrl,
            } as UserType);
          }}
        >
          Legg til ny bruker
        </button>
      </div>
    </div>
  );
};

export default Admin;
