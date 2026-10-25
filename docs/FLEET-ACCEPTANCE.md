# Local acceptance

Start npm run dev and open http://127.0.0.1:3107.

1. Fleet overview: inspect each bus's speed, fuel, driver and mapped hardware.
2. Add bus: provide number, registration and driver. An unmapped bus is valid;
   enter a unique mock GPS/fuel device ID to generate simulated telemetry.
3. Open a bus. Move the journey slider: location, speed, ignition and fuel all
   refer to that selected timestamp. Try replay, Latest and the history window.
4. Bus cameras: unavailable channels are excluded. Star/unstar channels, then
   open the bus camera view; only starred working sample channels appear.
5. Refresh the browser: bus configuration and stars remain in this preview.
6. Edit a bus to clear its telemetry mapping: show missing data, never zero fuel.
7. Check the offline recorder's bus: show no available cameras.

Only workspace-admin preview role exposes bus editing. Server authorization is
separate and enforced in the Windows API. No real cameras or vendor credentials
are needed for these steps. Preview persistence is browser-local, not server
storage or a claim of SaaS account isolation.
