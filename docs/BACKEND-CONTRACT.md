# Authenticated frontend / Windows API

Normal local origins: UI http://127.0.0.1:3107, API http://127.0.0.1:8101.
Requests include credentials. No password, SDK grant or viewer token is stored
in localStorage. Backend HttpOnly sessions and PostgreSQL RLS are authoritative.

| Area | Endpoints |
| --- | --- |
| Viewer | /api/auth/status, setup, signup, login, logout, password |
| Bootstrap | GET /api/workspace |
| Preferences | GET/POST /api/ui/preferences |
| Provider | /api/status, /api/connect/personal, /api/connect/desktop, /api/disconnect |
| Recovery | /api/provider/recovery/retry, /api/provider/recovery/disable |
| Real inventory | GET /api/devices |
| Verified snapshots | GET /api/previews/frame?deviceId=ID&channel=N |
| Media | /api/live/start, stop, stop-all, status, events, audio-events, audio-focus |
| Fleet | /api/fleet/buses, buses/remove, telemetry, history |
| Backend simulator | Admin POST /api/fleet/mock/poll (stored JSONB, never camera fixtures) |
| Members | /api/team and /api/team/ID |
| Approvals | /api/platform/workspaces, /api/platform/requests/ID/ACTION |
| Password support | /api/platform/workspaces/ID/users, /api/platform/users/ID/password |
| Clips | /api/recordings, recordings/ID/video, recordings/ID/delete, recordings/settings |
| Audit/health | /api/audit, /api/platform/health and alert acknowledge/resolve |

Bootstrap returns the authenticated principal, private UI preferences, permitted
real devices/channels, buses, provider status and stored telemetry. Superadmin
receives no tenant camera/fleet data. Members receive only granted resources.
No frontend fallback dataset is used when requests fail.

Device channels retain their actual numbers/names and record/download flags.
Health starts unknown. SDK preview success or received live frames mark working;
stale observations expire and known recorder offline is unavailable. Authentication
or network failure is not proof a camera channel is offline.

Writes are JSON POST with X-Hik-Local:1 and X-Saas-User. Media requests also carry
the public provider connection fingerprint. EventSource URLs carry expected user
and connection identity and use withCredentials. They do not contain login tokens.

Smooth frames carry H264 Annex-B chunks and timestamps through SSE. React uses
the retained baseline WebCodecs presentation queue. Compatibility draws received
JPEGs. A separate selected-camera PCM stream feeds Web Audio after explicit unmute.
Snapshot/recording capture actual decoded frames, not generated mock canvases.
Clips are uploaded as WebM with validated metadata; server storage checks grants.
HTML video requests also carry expected viewer identity.

Forced password changes block the workspace. Account/logout/session changes clear
private state, old streams and audio. Cross-tab events trigger session revalidation.
Server approval, suspension, grant revocation and tenant isolation remain necessary
even when frontend controls are hidden.

Live camera testing remains pending while recorders are offline. Browser acceptance
uses only a separate backend fixture API on 8109 with a temporary test database.
The normal service has no test-device or synthetic-media fallback.
