import React from "react";
import clsx from "clsx";
import styles from "./IconButton.module.css";

type IconButtonProps = {
  label: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Keyboard-accessible wrapper for the icon actions. Tooltips are decorative,
 * so the accessible name comes from `label`.
 */
const IconButton: React.FC<IconButtonProps> = ({
  label,
  className,
  children,
  ...props
}) => (
  <button
    type="button"
    aria-label={label}
    className={clsx(styles.iconButton, className)}
    {...props}
  >
    {children}
  </button>
);

export default IconButton;
