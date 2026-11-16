import React from "react";
import { SET_NOTIFICATION, useAppState } from "../../StateProvider";
import styles from "./Notification.module.css";

const Notification: React.FC = () => {
  const [{ notification }, dispatch] = useAppState();

  React.useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      dispatch({ type: SET_NOTIFICATION });
    }, 5000);
    return () => clearTimeout(timer);
  }, [dispatch, notification]);

  if (!notification) return null;

  return <div className={styles.notification}>{notification}</div>;
};

export default Notification;
