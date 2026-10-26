# RGU Fleet Management Frontend

React/Next.js frontend for HexTorq’s RGU bus fleet system. It uses the separate
Windows or Linux API for authentication, fleet configuration, real Hik-Connect cameras,
team permissions, recordings, audit and platform health.

No sample business data or role-switching preview is bundled in the frontend.
GPS/fuel samples, when enabled, are read from the backend PostgreSQL JSONB store.
Real vendor GPS/fuel integration is phase 2. Real camera acceptance is pending
until the recorders are online; isolated backend media fixtures verify the API path.

## Local setup

Node 24.x. Start the configured Windows backend on 127.0.0.1:8101 first.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8101 in ignored .env.local.
Open http://127.0.0.1:3107. Use 127.0.0.1 consistently for frontend/API so local
Strict cookies remain same-site. No database password or SDK token belongs here.

For a fresh database: create the single platform owner, request an admin workspace
from the sign-in screen, approve it as the owner, then sign in as that admin.
Connect Hik-Connect under Settings and authorize playback using the installed
iVMS sign-in when required. Import/refresh recorders, create a bus, and map it.
The Linux backend instead exposes a verified playback-authorization file import
in Settings; it cannot read a Windows iVMS installation. See the Linux repository's
docs/PRODUCTION-MIGRATION.md for moving the database, recordings and encryption key.
Check channel availability when the recorder is online; star the working channels.

## Data and security

- HttpOnly backend viewer sessions; actual server principal controls navigation.
- PostgreSQL stores buses, settings, favourites, layouts, users and permissions.
- Recorder inventory is fetched from real Hik-Connect APIs, with explicit channel
  unknown/working/unavailable observations. No guessed channel numbering.
- Source/availability messages distinguish missing provider/playback authorization
  and offline/unverified cameras. No sample-feed fallback exists.
- EventSource uses credentials and expected user/provider identity. API mutations
  preserve origin checks, X-Hik-Local and expected-user checks.
- Sign-out/account changes clear private React state. Browser-local demo state is
  retired and never restored. No provider secrets are returned to the client.
- Camera recording uses actual received frames, optional selected-camera audio,
  and uploads to authenticated server storage. Wait for save before closing or
  refreshing the browser tab. Completed clips survive frontend refresh.

## Screens

- Fleet overview and compact Buses directory: API-owned vehicle/driver/mappings.
- Bus details: stored GPS/fuel history, real channel verification/previews/stars.
- Camera workspace: recorder library, verified-channel grids, SD/HD/adaptive
  quality, Smooth H264/Compatibility JPEG, focus, fit/fill/original, zoom/pan,
  fullscreen, selected-camera listening, volume, snapshot and server clips.
- Recording storage: permission-checked server playback/download/deletion/retention.
- Team: actual member creation, grants, temporary passwords and suspension.
- Platform: real workspace approvals and direct password support; no email reset.
- Audit and superadmin health: real persisted events/metrics from the API.
- Settings: actual Hik-Connect/iVMS connection, opt-in encrypted account recovery,
  password changes and saved viewing preferences.

Push-to-talk is disabled because the current backend does not forward browser
microphone audio. Camera archive-footage playback remains deferred.
Layouts/preferences are API-backed; rotation uses actual camera connections.
Reconnection is bounded and stops for authorization/offline/permission failures.

## Frontend stack and deployment

Next.js App Router, React, TypeScript, Tailwind, Framer Motion, GSAP, Lenis,
Lucide, Radix dialogs/dropdowns and Sonner toasts. Leaflet renders road maps.
No stock/AI image assets or browser-native alert/confirm/prompt flows.

npm run build creates the Vercel-compatible build. NEXT_PUBLIC_API_BASE_URL is
public and fixed at build time; set the real HTTPS backend URL in Vercel.
The backend must allow the exact frontend origin. Separate-site deployments
need HTTPS and the appropriate Secure/SameSite cookie policy; browser cookie
restrictions still apply. Prefer frontend/API under one site. No VPS deployment
or Linux runtime migration was performed by this change.

## Checks

```powershell
npm run typecheck
npm test
npm run build
```

For browser integration tests, start npm run test:acceptance:serve in the Windows
backend repo, then npm run test:e2e here. The API fixture owns a temporary isolated
PostgreSQL database on port 8109. Next runs independently on 3117 with .next-e2e.
All synthetic vehicles/devices/media/tiles live in that backend tool. No frontend
API stubs are used. Stop the fixture with Ctrl+C so its temporary DB is removed.
Normal development uses API 8101 and contains no seeded fixture account/camera.

See docs/BACKEND-CONTRACT.md, docs/VERIFICATION.md and
docs/REAL-CAMERA-ACCEPTANCE.md.
