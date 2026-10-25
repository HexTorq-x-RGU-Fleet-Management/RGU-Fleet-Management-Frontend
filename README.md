# RGU Fleet Management Frontend

React/Next.js frontend for the separate RGU Windows and Linux backends.
Repository: https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Frontend

## Current delivery

Product direction: [bus-first fleet model](docs/FLEET-PRODUCT.md).
New routes: / (fleet overview), /buses?bus=ID (vehicle), /tracking (GPS/fuel),
and /recorders (separate hardware library). The mock follows the supplied
vendor envelope; the SVG route is a coordinate schematic without road tiles.
Fleet preview settings stay in this browser. Windows fleet API methods exist
in src/lib/api.ts; authenticated application wiring is still pending.

A complete navigable frontend **preview**, independently buildable for Vercel.
Windows API extraction and fleet persistence exist separately. No real camera account, live video, tenant
session or production monitoring is connected by this change. The UI permanently
labels sample recorder panels/statuses and browser-local changes as preview data.
It does not load the old vanilla application or import sibling source folders.

## Stack

- Next.js App Router, React and TypeScript; exact versions are locked in package-lock.json.
- Tailwind CSS 4 plus modular application CSS and dark/light theme tokens.
- Framer Motion for component/reveal animation, GSAP/useGSAP for dashboard entry,
  ScrollTrigger/Lenis for coordinated smooth scrolling, with reduced-motion support.
- Lucide React icons throughout; no emoji UI icons.
- Radix React dialogs, alert dialogs and dropdowns; Sonner custom React toasts.
- IndexedDB for browser-local clip blobs and localStorage for non-secret preview preferences.

## Run locally

Node.js **24.x** and npm are required. Run from this repository root:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3107. This dedicated port avoids other local development apps.
To test a production build: `npm run build`, then `npm start`.
No database, Python, SDK DLL or sibling repository is required for the frontend preview.

## Screens and working interactions

- Fleet overview: bus setup, registration/driver/route, separate recorder and telemetry mappings, filters and mock readings.
- Bus details: synchronized GPS/fuel/speed timeline, replay and history windows, working sample cameras and starred default grids.
- GPS & fuel: mock route exploration; recorder library is a separate hardware screen.
- Camera workspace: automatic recorder grids, 1/4/9/16 tiles, paging/rotation,
  single-click selection, explicit/double-click focus, zoom/pan/reset, picture fit/fill,
  fullscreen, named persistent layouts and sample quality preferences.
- Preview snapshots download watermarked JPEGs. Preview recording creates real,
  labelled WebM files from the code-rendered frame/clock, capped at 15 minutes or 128 MB.
  These are not live camera recordings and contain no camera audio.
- Recordings: persistent browser-local video files, local MP4/WebM upload (128 MB
  per file), playback, download, search/sort and React-confirmed deletion.
- Team: local sample member creation/editing, recorder permissions and suspend/restore.
- Settings: persisted appearance, reduced motion, viewing/rotation/retention preferences,
  provider connection dialog, account password dialog and confirmed preference reset.
- Activity: searchable/filterable browser-preview events and JSON export.
- Platform approvals and health: role-gated preview screens, sample request decisions
  and acknowledgement of integration notices. No fake server-health measurements.
- Login/signup: React forms and safe API error feedback; no simulated real sign-in.
- Responsive navigation, keyboard search (Ctrl/Cmd+K), focus-managed dialogs,
  mobile controls, loading/error/404 states and Lucide icon buttons.

Role switching in the profile menu is **preview only**, not authentication or a
security boundary. The future backend must enforce tenant isolation and permissions.

## Vercel

Import this frontend repository into Vercel. Use the Next.js framework preset,
repository root as Root Directory, `npm ci` for installation and `npm run build`
for building. Keep the default Next.js output directory; do not set it to dist/out.
vercel.json and package.json provide the framework/build commands and Node 24.x.
No local absolute paths or native SDK dependencies are used by the build.

Leave NEXT_PUBLIC_API_BASE_URL blank for this clearly labelled preview. Later,
set it to the HTTPS backend origin and redeploy. Values prefixed NEXT_PUBLIC_
are public build-time configuration: never put provider passwords, grants or keys there.
No Vercel project/deployment was created by this change; Git push may trigger your
own preconfigured Vercel integration if one exists.

## Backend boundary

src/lib/api.ts provides typed, credentialed JSON requests and fixed error handling
for auth status/login/signup/logout, viewer password change and provider connection.
It uses the V3 /api routes and X-Hik-Local header. Without a configured backend,
requests fail visibly instead of manufacturing a successful login or connection.
No provider/viewer password is written to browser storage or URL query strings.

Cross-origin deployment still needs explicit backend CORS/preflight, cookie/CSRF,
session and media contracts. The original V3 server blocks unrelated origins;
setting an environment variable alone does not complete that integration. Device
transport, streaming/audio, provider renewal, server recordings/storage, real
member management/audit/health and historical DVR playback are not implemented
against the new separate backends in this frontend phase. See docs/BACKEND-CONTRACT.md.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The browser suite owns a production server on port 3107 and refuses to reuse an
unrelated app. Windows uses installed Chrome; Linux CI can provision Chromium with
`npx playwright install --with-deps chromium`. Browser artifacts are ignored.
The suite exercises core flows, a 390px viewport and standard/reduced-motion behavior.
`npm run format` formats maintained source/configuration. Dependencies have no
reported audit vulnerabilities at implementation time; retain the lockfile.

## Project layout

```text
src/app/              App Router pages, layouts and modular CSS
src/components/       React shell, screens, accessible UI and animation providers
src/lib/              API boundary, typed preview model and clip persistence
public/               Code-native product icon; no stock/generated photos
tests/unit/           Policies/display helpers and API error behavior
tests/e2e/            Actual Chrome UI and recording workflows
docs/                 Backend contract and asset references
```

Reference implementation: https://github.com/HexTorq-CCTV-Camera-Web/Hik-Vision/tree/standalone-baseline-2026-10-25/v3
Related backends remain separate repositories and were not modified.

Official implementation references: [Next.js](https://nextjs.org/docs/app/getting-started/installation),
[Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nextjs),
[GSAP React](https://gsap.com/resources/React/), [Lenis](https://github.com/darkroomengineering/lenis),
[Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

No AI image generation, image-search integration or stock-photo assets are used. All decorative preview panels are CSS and Lucide icons.
