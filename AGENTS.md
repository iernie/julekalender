# AGENTS.md

Julekalender as a Service — React Router v8 (SSR) app on Firebase App Hosting, plus a separate Firebase Functions codebase for the callables.

## Commands

Root (the web app):

- `pnpm dev` — React Router dev server
- `pnpm build` — SSR + client build into `build/`
- `pnpm typecheck` — **runs `react-router typegen` first, then `tsc`**. Always use this instead of bare `tsc`; route types in `.react-router/types` are generated and `./+types/*` imports won't resolve otherwise.
- `pnpm start` — serve the built SSR output
- `pnpm lint` / `lint:fix` — oxlint across **both** packages (config: `.oxlintrc.json`)
- `pnpm format` / `format:check` — oxfmt (config: `.oxfmtrc.json`)

Functions (`functions/`, separate package, Node 24, own `node_modules` and `pnpm-lock.yaml`):

- `pnpm --dir functions run build` (tsc → `functions/lib`)
- `pnpm --dir functions run serve` — build + firebase emulators for functions
- `firebase deploy --only functions` — predeploy runs the **root** lint, then the functions build
- `functions/` has no linter of its own; the root oxlint covers it.

Local development (emulator suite, fully offline):

- `cp .env.local.example .env.local` — fake config; the `demo-` project id keeps the emulators offline.
- `nvm use` — Node 24; see the gotcha below.
- `pnpm emulators` — builds functions, starts auth/firestore/storage/functions, persists to `.emulator-data`
- `pnpm seed` — once per fresh emulator, loads the default avatars
- `pnpm dev` — in a second terminal

Security rules tests (root package):

- `pnpm test:rules` — boots the Firestore + Storage emulators and runs Vitest against `tests/`
- Requires a Java runtime. `openjdk` is installed via Homebrew but is **keg-only**, so prefix the call:
  `PATH="/opt/homebrew/opt/openjdk/bin:$PATH" pnpm test:rules`

Verification = `pnpm lint` + `pnpm format:check` + `pnpm typecheck` +
`pnpm test:rules` (+ `pnpm build` for anything SSR-related). CI
(`.github/workflows/ci.yml`) runs exactly these.

## Layout

- `app/` — the only app source. Routes are declared explicitly in `app/routes.ts` (config-based routing, not file-based). Each route lives in `app/routes/<Name>/` with a CSS module and `index.ts` barrel.
- `app/root.tsx` — HTML document, error boundary, global `app.css`.
- `app/routes/App/App.tsx` — root layout. Firebase is initialised at module scope in `app/firebase.ts`, **not** in an effect, so the server render and first client render match.
- `app/StateProvider.tsx` — hand-rolled reducer/context. `useAppState()` returns `[state, dispatch]`; `useCalendar()` returns the non-null calendar and is only valid under the `:name` layout. No external state library.
- `functions/src/index.ts` — the public `api` Express function (region `europe-west1`, `maxInstances: 10`) plus the `drawWinner`, `resetWinner` and `deleteCalendar` callables. Firebase Hosting rewrites `**` to `api`, which is what `api.kalender.christmas` serves.
- `app/helpers.ts` — `toCalendarId`, `isValidCalendarId`, `expiresAt`, `FUNCTIONS_REGION`.
- `app/firebase.ts` — client SDK singleton + emulator wiring. `app/firebase.server.ts` — Admin SDK for route loaders; never import it from a component.
- `app/serialize.ts` — `toCalendar` / `toUser`. Every path into app state goes through these.
- `app/hooks.ts` — `useMounted`, `useWindowSize`, `usePrefersReducedMotion`, all built on `useSyncExternalStore` so they are SSR-safe. Gate browser-dependent output behind `useMounted` to avoid hydration mismatches.
- `app/components/IconButton/` — keyboard-accessible wrapper for the icon actions. Prefer it over `onClick` on an icon.
- `app/meta.ts` — `socialMeta`/`genericMeta` helpers plus accessors for root and calendar loader data.
- `app/og.server.tsx` + `app/og.templates.tsx` + `app/routes/og.*.ts` — dynamic OG images at `/og/:name/og.png` and `/og/:name/:day/og.png`.
- `app/assets/fonts/` — static TTFs for satori, matching the UI: Roboto Regular for body text and Playfair Display Bold for headings (both OFL-1.1, licenses included). The UI itself loads its webfonts from Google Fonts. Imported with `?inline` so they are embedded in the server bundle; reading them from disk fails in production because the build does not copy them. satori cannot use variable fonts or woff2.
- `tests/` — Firestore and Storage security rules tests (Vitest + `@firebase/rules-unit-testing`).
- `scripts/seed-emulators.mjs` — uploads `static/*.png` to `avatars/` in the Storage emulator; the app needs them when adding a user.
- `build/`, `.react-router/`, `functions/lib/` are generated; never edit.

## Gotchas

- `initializeApp()` is called with no config in production — Firebase App Hosting injects the web app config. Local dev needs `VITE_FIREBASE_*` vars in `.env.local` (see `app/routes/App/App.tsx`), otherwise Firebase init fails.
- **Every visitor is signed in anonymously** on first load so that each calendar has an `owner` uid. Google sign-in is an _upgrade_ via `linkWithPopup`, not a fresh `signInWithPopup` — don't change this or users lose their calendars. Signing out re-signs in anonymously.
- **Rules are not filters.** For a Firestore _query_, every field the rule reads must be constrained by the query itself, or it fails with an empty `resource` ("Property X is undefined on object. for 'list'"). `firestore.rules` therefore splits `get` from `list` for calendars, which are listed with `where("owner", "==", uid)`. If you change that query, change the matching `list` rule — and cover it with a `getDocs` test, since a `getDoc` test will not catch it. Users avoid the problem: their rules read only the parent calendar, so a plain listing of the subcollection passes.
- **`users.won` is server-only.** `firestore.rules` rejects any client write to it; the `drawWinner` / `resetWinner` callables are the only writers. Never write `won` from the app.
- **Users are a subcollection, `calendars/{calendarId}/users/{userId}`.** The calendar and its owner come from the path, so user documents carry no `calendarId`, `calendar` or `owner` field, and the rules reject those keys. Always reach users through their calendar; a `collectionGroup("users")` query is rejected by the rules, because it would span private calendars. The TTL field override on `users` is per collection group, so it covers the subcollection. Deleting a calendar document does not delete its users: `deleteCalendar` removes them explicitly, and TTL catches the rest.
- **`avatars` is a reserved calendar id.** `storage.rules` keys write access off the calendar id and Storage grants access if _any_ matching rule allows, so the per-calendar block also matches `avatars/<file>`. A calendar by that name would hand its owner write access to the seeded default avatars. Reserved in `firestore.rules`, `storage.rules` and `isValidCalendarId`; change all three together.
- **Neither collection may be written without a timestamp `deleteBy`.** The TTL policy silently skips documents whose `deleteBy` is any other type, so those would live forever. The rules also pin `deleteBy`, `createdAt` and `id` across updates so expiry cannot be pushed back.
- **Composite indexes: the emulator does not enforce them.** A query combining two field conditions (`==` plus `array-contains`, or `where` plus `orderBy` on another field) passes locally and fails only in production. Every query in `app/` and `functions/` is deliberately single-field, which is why `firestore.indexes.json` declares no composite indexes. If you add a multi-condition query, declare the index there and deploy it _before_ the code.
- **Storage has no TTL.** The Firestore TTL sweeps calendars and users, but nothing removes their uploaded avatars. `cleanUpCalendarAvatars` (an `onDocumentDeleted` trigger, which TTL deletions do fire) is the primary cleanup, and `sweepOrphanedAvatars` reconciles monthly for invocations that failed. Do not add a bucket lifecycle rule as a backstop: lifecycle conditions cannot exclude a prefix, so an age rule would eventually delete the seeded `avatars/` defaults too.
- `vite.config.mts` has a hand-maintained `ssr.noExternal: true` with an explicit `external` allowlist. If a new dependency breaks the SSR build, add it there rather than changing `noExternal`. **`firebase-admin` and its deps must stay listed** — bundling them quadruples the server bundle. Vite 8 only accepts strings there, not RegExp.
- **Timestamps never reach app state.** Loaders return ISO strings and `onSnapshot` data is normalised the same way, so `CalendarType`/`UserType` describe the _serialized_ shape. Firestore still stores real Timestamps, so write payloads do not match those types.
- **Only public calendars are server-rendered.** The server has no user session, so the loader returns an empty shell for private ones and the client listeners fill it in.
- There is exactly **one** `onAuthStateChanged` listener, in `routes/App/App.tsx`, because it wraps every route. Read the user from `useAppState()` rather than adding another listener.
- `state.calendar` is `null` until loaded. The calendar layout renders its outlet only once it is set, so routes under it should use `useCalendar()` instead of null-checking.
- Client Firestore listeners wait for `onAuthStateChanged` to fire before subscribing. A listener rejected for lack of auth is never retried, which would break private calendars.
- Run `pnpm test:rules` on its own emulator instance. Against a dev emulator started for another project, `storage.rules`' `firestore.get` resolves to that project's data and the ownership tests fail spuriously.
- Two deploy targets coexist: App Hosting serves the web app (`apphosting` in `firebase.json`, ignores `functions/`), while `firebase.json` hosting rewrites go to the `api` function.
- `sweepOrphanedAvatars` is the first scheduled function here, so the first deploy needs the Cloud Scheduler API enabled on the project and takes longer than usual while the job is created.
- **The public API lives only in `functions/`**, deliberately. It is unauthenticated, so keeping it off the web app's Cloud Run service preserves its own `maxInstances` cost cap and keeps scraper traffic from scaling the site. The app must not grow a competing `/api` route.
- Husky pre-commit runs `lint-staged`, which now runs oxfmt and `oxlint --fix` on staged files. Both packages share one style — the old eslint-config-google "no spaces inside braces" convention in `functions/` is gone.
- oxfmt is beta. It keeps Prettier's defaults here, so output should match what Prettier produced.
- Decorative motion (snowfall, confetti) must stay behind `usePrefersReducedMotion`.
- **Never import `node:*` from client code.** `import/no-nodejs-modules` enforces this for `app/`, with `*.server.ts(x)`, `functions/`, `tests/` and `scripts/` exempted. It builds and typechecks fine but throws in the browser. Use web globals — e.g. `crypto.randomUUID()`, not `node:crypto`.
- **A route's `meta` replaces its parent's, it does not merge.** Site-wide tags are repeated in `socialMeta`, and routes must return `genericMeta()` rather than `[]` or the page ends up with no title.
- `og:image` must be absolute, so the root loader publishes the origin for `meta` functions to read. In production that is `PUBLIC_ORIGIN` from `apphosting.yaml`: behind App Hosting, `request.url` is the internal `http://*.run.app` Cloud Run URL, which returns 403 to scrapers. Don't derive it from `X-Forwarded-Host` either, because clients control that header and the cached HTML could be poisoned. Update `PUBLIC_ORIGIN` if the custom domain changes.
- OG images are PNG because scrapers reject SVG. satori + resvg are in `ssr.external` (resvg ships a native `.node`). Avatars are inlined as data URLs by `toDataUrl` rather than letting satori fetch them — satori blocks private addresses, so the Storage emulator never works locally.
- OG routes 404 for private calendars so previews cannot leak them.
- The `ssr.external` allowlist is minimal: `react-fast-compare` and `fast-deep-equal` come from react-tooltip, `tween-functions` from react-confetti. They are CommonJS and break the **dev** SSR runtime when inlined, even though the production build tolerates it — so test `pnpm dev`, not just `pnpm build`, after touching that list.
- **Keep `nodeLinker: hoisted` in `pnpm-workspace.yaml`.** Every package in `ssr.external` (firebase-admin and its native/dynamic deps, plus the three CJS packages above) is imported by name from the built `build/server/index.js` and must be resolvable at the top level of `node_modules`. pnpm's default isolated layout hides transitive packages, so App Hosting's runtime crashes on startup with `Cannot find package 'react-fast-compare'` (or `@grpc/grpc-js`, etc.) and the Cloud Run revision never passes its health check. Do not remove this or switch to the isolated linker; `pnpm start` locally is the quick smoke test that catches it.
- The root package is **ESM** (`"type": "module"`) and needs Node >=22.22, both required by React Router 8.
- `functions/` targets the **Node 24** Cloud Functions runtime (GA, 2nd-gen only; all our functions are v2). Node 26 cannot be deployed — the Firebase CLI only accepts 20, 22 and 24. `@types/node` in `functions/` is pinned to 24 to match; do not bump it to match the root package.
- **Run the emulators on Node 24** (`.nvmrc`, so `nvm use`). On Node 26 the functions emulator fails to load the codebase: `firebase-admin` → `jsonwebtoken` → `jwa` → `buffer-equal-constant-time` reads `SlowBuffer.prototype`, and `SlowBuffer` still exists in Node 24 but was removed in Node 26.
- TypeScript 7 ships **no programmatic compiler API**. Tooling that imports `typescript` (rather than shelling out to `tsc`) needs the `@typescript/typescript6` package. It also defaults `rootDir` to `./` and `types` to `[]`, which is why `functions/tsconfig.json` sets both explicitly — without `rootDir` it emits to `lib/src/` and breaks the function entrypoint.
- **pnpm, but two separate installs.** Root and `functions/` each have their own `pnpm-lock.yaml`; `functions/` is deliberately _not_ a pnpm workspace member — Cloud Build picks the installer from the lockfile in the functions source dir and can't handle workspace links. Use `pnpm --dir functions …` in place of the old `npm --prefix functions …`. Don't add a `packages:` list to `pnpm-workspace.yaml` (it only holds `allowBuilds`), and don't add `packageManager` (or `devEngines.packageManager`) to `package.json` without `pmOnFail: ignore` in both `pnpm-workspace.yaml` files: otherwise pnpm 12 writes a two-document lockfile that breaks Dependabot alerts. CI pins the version in `pnpm/action-setup` instead. Because the installs are separate, `functions/pnpm-workspace.yaml` repeats the `allowBuilds` denials and `pmOnFail` — pnpm settings are not inherited from the root.
