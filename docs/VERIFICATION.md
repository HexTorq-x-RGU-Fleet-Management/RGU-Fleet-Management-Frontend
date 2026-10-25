# Frontend verification — authenticated API integration

Node 24.x, Next 16.4.3. TypeScript and production build pass, along with 14 unit
tests and all 9 authenticated browser tests. The Windows backend separately
passes 84 API/PostgreSQL checks and 10 native audio/video tests.
The old demo-only browser cases were replaced by actual API integration cases.

Browser tests connect to the separate Windows acceptance API and real isolated
PostgreSQL, with backend-only synthetic devices, H264/JPEG/PCM media and map tiles.
There are no frontend API mocks or runtime sample datasets. Normal API port 8101
never imports the acceptance fixture. Browser test API is 8109; Next test UI 3117
uses its own .next-e2e directory and refuses to reuse a running unrelated server.

Coverage: login/approval rejection, persisted bus creation/refresh, tenant switch
isolation, member channel restrictions and denied direct API access, no role switch,
H264 decoding, SSE reconnection, selection/focus/zoom, unmute and actual received
frame capture, server clip upload/refresh/playback/delete, backend telemetry history,
bus camera stars, signup/approval/temporary password change, member grants/suspension,
server preferences, audit/health, sidebar persistence/scroll isolation and mobile fit.

Unit policies prevent seeded sample recorder/member/bus/telemetry functions in src,
browser-native dialogs and stock/generated photo assets. Public API configuration
is required; transport retains credentials, identity and backend error codes.

The normal local API was started and its auth status checked separately. No real
operator, Hik-Connect grant or sample camera was seeded in its application DB.
Real cameras were not exercised because the user confirmed all are offline.
See REAL-CAMERA-ACCEPTANCE.md for the remaining hardware/reliability checks.
No Linux changes, VPS deployment or provider GPS/fuel vendor integration occurred.
