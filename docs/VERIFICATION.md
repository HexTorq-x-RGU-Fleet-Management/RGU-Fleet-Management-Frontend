# Frontend verification — 25 October 2026

Node 24.21.0, locked dependencies. TypeScript and Next production build pass.
15 unit tests and 12 actual Chrome browser tests pass.

Fleet coverage: bus create/edit mapping fields, browser persistence and confirmed
deletion; synchronized GPS/fuel timeline and location cursor; star filtering in
the bus camera grid; offline/unmapped states; exact provider-format data and
device-ID correlation; stale samples and unavailable channel exclusion.

Retained coverage: camera grid/focus/zoom/layouts, React team/approval dialogs,
role navigation, login error feedback, theme/reduced motion, real labelled
Canvas/MediaRecorder preview capture with IndexedDB/download/deletion, mobile
390px viewport fit, and standard-motion rendering.

Browser tests own a production server on 3117 and refuse to reuse an unrelated
server. The developer preview remains on 3107. No image generation was used.
No JavaScript-native dialogs or stock photo dependencies are introduced.

This verifies the frontend mock preview. It does not verify actual GPS/fuel,
road map data, real camera video/audio, backend-authenticated bus operations,
production monitoring, Linux or deployment. Windows API behavior is tested in
its own repository; typed adapter methods are ready but not wired into the
preview screens. See FLEET-PRODUCT.md for boundaries and future integration.
