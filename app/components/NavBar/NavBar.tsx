import React from "react";
import styles from "./NavBar.module.css";

type NavBarProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
};

const NavBar: React.FC<NavBarProps> = ({ left, right }) => (
  <nav className={styles.navbar}>
    <div className={styles.left}>{left}</div>
    <div className={styles.right}>{right}</div>
  </nav>
);

export default NavBar;
