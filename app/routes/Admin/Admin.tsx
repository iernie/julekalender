import React from "react";
import { useParams, useNavigate } from "react-router";
import { SET_NOTIFICATION, useAppState, useCalendar } from "../../StateProvider";
import { v4 as uuidv4 } from "uuid";
import { FiHome, FiLock, FiX, FiLogIn, FiUnlock, FiLogOut, FiTrash } from "react-icons/fi";
import styles from "./Admin.module.css";
import { compareAsc } from "date-fns";
import { Tooltip as ReactTooltip } from "react-tooltip";
import {
  Timestamp,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import {
  GoogleAuthProvider,
  getAuth,
  linkWithPopup,
  signInAnonymously,
  signInWithPopup,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import PageTitle from "../../components/PageTitle";
import IconButton from "../../components/IconButton";
import { expiresAt, FUNCTIONS_REGION, toCalendarId } from "../../helpers";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const AVATAR_COUNT = 20;

/** Cycles through the seeded avatars before repeating any of them. */
const nextAvatar = (used: Array<number>): number => {
  if (used.length === AVATAR_COUNT) used.length = 0;
  const remaining = Array.from({ length: AVATAR_COUNT }, (_, index) => index + 1).filter(
    (candidate) => !used.includes(candidate),
  );
  const picked = remaining[Math.floor(Math.random() * remaining.length)];
  used.push(picked);
  return picked;
};

const logout = async () => {
  const auth = getAuth();
  await auth.signOut();
  await signInAnonymously(auth);
};

export default function Admin() {
  const [confirm, setConfirm] = React.useState(true);
  const [{ users, user }, dispatch] = useAppState();
  const calendar = useCalendar();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const db = getFirestore();
  const storage = getStorage();

  const usedAvatars = React.useRef<Array<number>>([]);
  const nameTimers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [draftNames, setDraftNames] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const timers = nameTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  if (!name) return null;

  const calendarId = toCalendarId(name);
  const isAnonymous = user?.isAnonymous ?? true;
  const isOwner = Boolean(user && calendar.owner === user.uid);

  const notify = (payload: string) => dispatch({ type: SET_NOTIFICATION, payload });

  const deleteCalendar = async () => {
    if (confirm) {
      setConfirm(false);
      notify("Er du sikker på at du vil slette kalenderen og alle brukerene? Trykk en gang til.");
      return;
    }
    try {
      const remove = httpsCallable<{ calendarId: string }, unknown>(
        getFunctions(undefined, FUNCTIONS_REGION),
        "deleteCalendar",
      );
      await remove({ calendarId });
      navigate("/");
    } catch {
      setConfirm(true);
      notify("Klarte ikke slette kalenderen");
    }
  };

  const login = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      if (auth.currentUser?.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user") return;
      if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
        try {
          await signInWithPopup(auth, provider);
          return;
        } catch {
          // fall through
        }
      }
      notify("Klarte ikke logge inn.");
    }
  };

  const setPublic = async (isPublic: boolean) => {
    if (!isOwner) return;
    await updateDoc(doc(db, "calendars", calendarId), { public: isPublic });
  };

  const updateSettings = async (patch: Record<string, unknown>) => {
    await updateDoc(doc(db, "calendars", calendarId), patch);
  };

  const renameUser = (id: string, value: string) => {
    setDraftNames((current) => ({ ...current, [id]: value }));
    const timers = nameTimers.current;
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        updateDoc(doc(db, "users", id), { name: value }).catch(() =>
          notify("Klarte ikke lagre navnet"),
        );
      }, 500),
    );
  };

  return (
    <div>
      <PageTitle>Innstillinger</PageTitle>
      <ReactTooltip id="login" place="bottom">
        {isAnonymous ? "Logg inn" : "Logg ut"}
      </ReactTooltip>
      <ReactTooltip id="home" place="bottom">
        Hjem
      </ReactTooltip>
      <ReactTooltip id="lock" place="bottom">
        {calendar.public === false ? "Åpne" : "Skjul"}
      </ReactTooltip>
      <ReactTooltip id="delete" place="right">
        Slett kalender
      </ReactTooltip>
      {isOwner && (
        <IconButton
          data-tooltip-id="delete"
          className={styles.delete}
          label="Slett kalender"
          onClick={deleteCalendar}
        >
          <FiTrash size="1.5rem" />
        </IconButton>
      )}
      <IconButton
        data-tooltip-id="home"
        className={styles.settings}
        label="Hjem"
        onClick={() => navigate(`/${calendarId}`)}
      >
        <FiHome size="1.5rem" />
      </IconButton>
      <IconButton
        data-tooltip-id="login"
        className={styles.login}
        label={isAnonymous ? "Logg inn" : "Logg ut"}
        onClick={isAnonymous ? login : logout}
      >
        {isAnonymous ? <FiLogIn size="1.5rem" /> : <FiLogOut size="1.5rem" />}
      </IconButton>
      {isOwner && (
        <IconButton
          data-tooltip-id="lock"
          className={styles.lock}
          label={calendar.public === false ? "Åpne kalender" : "Skjul kalender"}
          onClick={() => setPublic(calendar.public === false)}
        >
          {calendar.public === false ? <FiLock size="1.5rem" /> : <FiUnlock size="1.5rem" />}
        </IconButton>
      )}
      <div className={styles.admin}>
        <div className={styles.Form}>
          <a
            target="_blank"
            rel="noopener noreferrer"
            className={styles.url}
            href={`https://api.kalender.christmas/api/${calendarId}${
              calendar.public === false && user ? `?apiKey=${user.uid}` : ""
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
            disabled={!isOwner}
            value={calendar.settings.giftsPerUser ?? ""}
            placeholder="∞"
            onChange={(e) =>
              updateSettings({
                "settings.giftsPerUser": e.target.value
                  ? parseInt(e.target.value, 10)
                  : deleteField(),
              })
            }
          />
        </div>

        <div className={styles.form}>
          <input
            id="fair"
            type="checkbox"
            className={styles.checkbox}
            disabled={!isOwner}
            checked={calendar.settings.fair ?? false}
            onChange={(e) => updateSettings({ "settings.fair": e.target.checked })}
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
            disabled={!isOwner}
            checked={calendar.settings.ignoreWeekends ?? false}
            onChange={(e) => updateSettings({ "settings.ignoreWeekends": e.target.checked })}
          />
          <label htmlFor="weekends" className={styles.label}>
            Ignorer helgene
          </label>
        </div>

        <p>
          Din julekalender og alt tilhørende data slettes automatisk:{" "}
          {new Date(calendar.deleteBy).toLocaleDateString("nb-no")} :)
        </p>

        {isAnonymous && (
          <p className={styles.hint}>
            Du er ikke innlogget. Logg inn med Google for å beholde tilgangen til kalenderen på
            andre enheter.
          </p>
        )}

        <h2>Brukere</h2>

        <div className={styles.users}>
          {users &&
            users
              .toSorted((a, b) => compareAsc(new Date(a.createdAt), new Date(b.createdAt)))
              .map((listed) => {
                const storageRef = ref(storage, `${calendarId}/${listed.id}`);
                return (
                  <div className={styles.user} key={listed.id}>
                    <div className={styles.avatar}>
                      <img className={styles.image} src={listed.image} alt={listed.name} />
                      <input
                        className={styles.upload}
                        type="file"
                        accept={ALLOWED_AVATAR_TYPES.join(",")}
                        disabled={!isOwner}
                        aria-label={`Last opp bilde for ${listed.name || "bruker"}`}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
                            notify("Bildet må være PNG, JPEG, WEBP eller GIF");
                            return;
                          }
                          if (file.size > MAX_AVATAR_BYTES) {
                            notify("Bildet kan maks være 2 MB");
                            return;
                          }
                          try {
                            const uploadResult = await uploadBytes(storageRef, file);
                            await updateDoc(doc(db, "users", listed.id), {
                              image: await getDownloadURL(uploadResult.ref),
                            });
                          } catch {
                            notify("Klarte ikke laste opp bildet");
                          }
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      className={styles.username}
                      value={draftNames[listed.id] ?? listed.name}
                      placeholder="Navn..."
                      disabled={!isOwner}
                      aria-label="Navn"
                      onChange={(e) => renameUser(listed.id, e.target.value)}
                    />
                    <IconButton
                      className={styles.deleteuser}
                      label={`Slett ${listed.name || "bruker"}`}
                      disabled={!isOwner}
                      onClick={async () => {
                        const userReference = doc(db, "users", listed.id);
                        const userSnap = await getDoc(userReference);
                        if (!userSnap.exists()) return;
                        if (userSnap.data().image.includes(storageRef.name)) {
                          await deleteObject(storageRef).catch(() => undefined);
                        }
                        await deleteDoc(userReference);
                      }}
                    >
                      <FiX size="1.5rem" />
                    </IconButton>
                  </div>
                );
              })}
        </div>
        <button
          className={styles.button}
          type="button"
          disabled={!isOwner}
          onClick={async () => {
            const calendarReference = doc(db, "calendars", calendarId);
            const id = uuidv4();
            const downloadUrl = await getDownloadURL(
              ref(storage, `avatars/${nextAvatar(usedAvatars.current)}.png`),
            );

            // Stored shape, not UserType: Firestore holds real Timestamps and
            // a `calendar` reference that the callables query by.
            await setDoc(doc(db, "users", id), {
              id,
              name: "",
              createdAt: Timestamp.fromDate(new Date()),
              deleteBy: expiresAt(),
              won: [],
              calendar: calendarReference,
              calendarId,
              owner: calendar.owner,
              image: downloadUrl,
            });
          }}
        >
          Legg til ny bruker
        </button>
      </div>
    </div>
  );
}
