# Local application flow

Start the Windows API on 8101 and this frontend on 3107. Use 127.0.0.1 for both.
If setup is required, create the one platform owner. Request a workspace admin
account and approve it as the owner. Sign in as that approved admin.

Connect Hik-Connect from Settings. Device access and SDK playback authorization
are separate states; use the installed iVMS sign-in when playback needs it.
Refresh real recorder inventory, add a bus and map its recorder. No mock bus or
camera is seeded into this application. An unmapped bus is valid during setup.

When online, check camera availability, star working channels, and open the bus
camera view. Camera frames/audio must come from the backend SDK. Offline or
unchecked channels must never show generated footage. See REAL-CAMERA-ACCEPTANCE.md.

If optional mock GPS/fuel is needed before vendor phase 2, assign a telemetry
device ID and use the admin backend simulator action in Settings. It stores
observations in PostgreSQL. The browser reads history through the API.
Without observations the UI shows no stored data, not zero fuel or fake motion.
