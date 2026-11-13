# AGENTS.md

Julekalender as a Service — React Router v7 (SSR) app on Firebase App Hosting, plus a separate Firebase Functions API codebase.

## Commands

Root (the web app):

- `npm run dev` — React Router dev server
- `npm run build` — SSR + client build into `build/`
- `npm run typecheck` — **runs `react-router typegen` first, then `tsc`**. Always use this instead of bare `tsc`; route types in `.react-router/types` are generated and `./+types/*` imports won't resolve otherwise.
- `npm start` — serve the built SSR output
- `npm run lint` / `lint:fix` — oxlint across **both** packages (config: `.oxlintrc.json`)
- `npm run format` / `format:check` — oxfmt (config: `.oxfmtrc.json`)

Functions (`functions/`, separate package, Node 22, own `node_modules`):

- `npm --prefix functions run build` (tsc → `functions/lib`)
- `npm --prefix functions run serve` — build + firebase emulators for functions
- `firebase deploy --only functions` — predeploy runs the **root** lint, then the functions build
- `functions/` has no linter of its own; the root oxlint covers it.

Security rules tests (root package):

- `npm run test:rules` — boots the Firestore + Storage emulators and runs Vitest against `tests/`
- Requires a Java runtime. `openjdk` is installed via Homebrew but is **keg-only**, so prefix the call:
  `PATH="/opt/homebrew/opt/openjdk/bin:$PATH" npm run test:rules`

Verification = `npm run lint` + `npm run format:check` + `npm run typecheck` +
`npm run test:rules` (+ `npm run build` for anything SSR-related). CI
(`.github/workflows/ci.yml`) runs exactly these.

## Layout

- `app/` — the only app source. Routes are declared explicitly in `app/routes.ts` (config-based routing, not file-based). Each route lives in `app/routes/<Name>/` with a CSS module and `index.ts` barrel.
- `app/root.tsx` — HTML document, error boundary, global `app.css`.
- `app/routes/App/App.tsx` — layout route that initializes Firebase client SDKs in an effect and renders nothing until done.
- `app/StateProvider.tsx` — hand-rolled reducer/context (`useState()` export returns `[state, dispatch]`). No external state library.
- `functions/src/index.ts` — the `api` Express function (region `europe-west1`) plus the `drawWinner`, `resetWinner` and `deleteCalendar` callables. Firebase Hosting rewrites `**` to `api`.
- `app/helpers.ts` — `toCalendarId`, `isValidCalendarId`, `expiresAt`. Use these instead of inlining `.toLocaleLowerCase()`.
- `app/components/IconButton/` — keyboard-accessible wrapper for the icon actions. Prefer it over `onClick` on an icon.
- `tests/` — Firestore and Storage security rules tests (Vitest + `@firebase/rules-unit-testing`).
- `build/`, `.react-router/`, `functions/lib/` are generated; never edit.

## Gotchas

- `initializeApp()` is called with no config in production — Firebase App Hosting injects the web app config. Local dev needs `VITE_FIREBASE_*` vars in `.env.local` (see `app/routes/App/App.tsx`), otherwise Firebase init fails.
- **Every visitor is signed in anonymously** on first load so that each calendar has an `owner` uid. Google sign-in is an _upgrade_ via `linkWithPopup`, not a fresh `signInWithPopup` — don't change this or users lose their calendars. Signing out re-signs in anonymously.
- **`users.won` is server-only.** `firestore.rules` rejects any client write to it; the `drawWinner` / `resetWinner` callables are the only writers. Never write `won` from the app.
- New `users` documents must carry `calendarId` and `owner` or the rules reject the create.
- `app/routes/api.ts` is a proxy loader to `https://api.kalender.christmas`; it is not the Functions API.
- `vite.config.mts` has a hand-maintained `ssr.noExternal: true` with an explicit `external` allowlist. If a new dependency breaks the SSR build, add it there rather than changing `noExternal`.
- Two deploy targets coexist: App Hosting serves the web app (`apphosting` in `firebase.json`, ignores `functions/`), while `firebase.json` hosting rewrites go to the `api` function.
- Husky pre-commit runs `lint-staged`, which now runs oxfmt and `oxlint --fix` on staged files. Both packages share one style — the old eslint-config-google "no spaces inside braces" convention in `functions/` is gone.
- oxfmt is beta. It keeps Prettier's defaults here, so output should match what Prettier produced.
