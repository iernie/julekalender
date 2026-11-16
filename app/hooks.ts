import React from "react";

const noop = () => () => {};

/**
 * False during server render and the first client render, true afterwards.
 *
 * Use it to gate anything whose output depends on the browser (window size,
 * randomness), which would otherwise differ between the server HTML and
 * hydration.
 */
export const useMounted = () =>
  React.useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};

// A string keeps the snapshot referentially stable; returning a fresh object
// from getSnapshot would re-render forever.
const sizeSnapshot = () => `${window.innerWidth}x${window.innerHeight}`;

/** Replaces react-use's useWindowSize, which was the last thing we used it for. */
export const useWindowSize = () => {
  const snapshot = React.useSyncExternalStore(subscribeResize, sizeSnapshot, () => "0x0");

  return React.useMemo(() => {
    const [width, height] = snapshot.split("x").map(Number);
    return { width, height };
  }, [snapshot]);
};

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeMotion = (onChange: () => void) => {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

/** Snowfall and confetti are decorative; respect the user's motion preference. */
export const usePrefersReducedMotion = () =>
  React.useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
