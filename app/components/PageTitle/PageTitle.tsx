import React from "react";
import styles from "./PageTitle.module.css";

const PageTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <h1 className={styles.title}>{children}</h1>;
};

export default PageTitle;
