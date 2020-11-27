import React from "react";
import { SET_NOTIFICATION, useState } from "../../StateProvider";
import styles from "./Notification.module.scss";

const Notification: React.FC = () => {
  const [{ notification }, dispatch] = useState();

  React.useEffect(() => {
    if (notification) {
      setTimeout(() => {
        dispatch({ type: SET_NOTIFICATION });
      }, 5000);
    }
  }, [notification]);

  if (!notification) return null;

  return <div className={styles.notification}>{notification}</div>;
};

export default Notification;
