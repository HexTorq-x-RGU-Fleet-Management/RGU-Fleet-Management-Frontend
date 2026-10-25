# RGU Fleet Management Frontend

Repository: https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Frontend

## Status

Initial repository scaffold. React/Next.js implementation has not started.
There is no package.json, application build or runnable development server yet.

## Purpose and target

Build one independently deployable React + Next.js web application with a
redesigned responsive interface. It must work with either the Windows or Linux
backend through the same API contract and a deployment-configured backend URL.
Framework versions, component tooling and build commands will be established
when conversion begins; this scaffold does not claim those dependencies exist.

Preserve the existing role-aware workflows: login, workspace access requests and
approval, camera library/grids, focus/zoom, video and audio, recording management,
settings, layouts, member permissions, audit history and superadmin health screens.
Authorization must remain enforced by the backend as well as reflected in the UI.

## Migration reference

[Existing V3 UI](https://github.com/HexTorq-CCTV-Camera-Web/Hik-Vision/tree/standalone-baseline-2026-10-25/v3/public) is the behavior reference. It remains unchanged.
Local reference on the original workstation: ../../Camera/hikvision/v3/public/.
Do not create runtime imports from that folder or from sibling repositories.
Provider credentials, encryption keys and SDK processing belong on the backend.

## Backend repositories

- [Windows backend](https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Backend-Windows)
- [Linux backend](https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Backend-Linux)

The shared interface must define authentication/cookies, allowed origins, CSRF
protection, safe errors, streaming and recording endpoints before UI extraction.
No new API contract is implemented by this documentation.

## Checkout and repository policy

```sh
git clone https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Frontend.git frontend
cd frontend
```

.gitignore excludes local environment secrets, dependencies, Next.js/build output,
logs, recordings and private state. .env.example may document non-secret options
when runtime configuration is added. Do not put secrets in public browser config.
No automated build or application tests exist in this scaffold yet.
