import React from "react";

const subscribe = () => () => {};

/**
 * False during server render and the first client render, true afterwards.
 *
 * Use it to gate anything whose output depends on the browser (window size,
 * randomness), which would otherwise differ between the server HTML and
 * hydration.
 */
export const useMounted = () =>
  React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
