# NeoTrack → RGU Fleet Management migration map

## Purpose

The local NeoTrack export is the functional and interaction reference for the RGU
Fleet Management product. This document is the Phase 0 baseline. It prevents the
project from shipping look-alike placeholder pages: each reference feature is either
mapped to an existing RGU capability or recorded as a required API and PostgreSQL
change before its RGU UI is implemented.

The reference is local-only:

```text
K:\2026-SHOP\HexTorq\November\0 - Playground\NeoTrack\neotrack_offline\neotrack_offline
```

RGU branding, tenants, roles, camera security and real data contracts remain RGU's.
No NeoTrack demo data, credentials or API fixtures may be used in RGU screens.

## Frozen baseline — 26 November 2026

| Repository | Branch | Commit | Purpose |
| --- | --- | --- | --- |
| `RGU-Fleet-Management-Frontend` | `main` | `8c0fdf5` | Current RGU web app and Phase 1 foundation commit |
| `RGU-Fleet-Management-Backend-Windows` | `main` | `8419073` | Windows camera receiver/API |
| `RGU-Fleet-Management-Backend-Linux` | `main` | `b625dd1` | Linux production camera receiver/API |

The working trees were clean when this baseline was recorded.

### Baseline verification

| Check | Result |
| --- | --- |
| Frontend unit tests | 20 passed |
| Frontend TypeScript check | passed |
| Windows backend unit tests | 12 passed |
| Windows backend source check | passed (61 modules) |
| Linux backend source check | passed (63 modules) |
| Linux backend integration tests | blocked locally: private `.local/test-database.json` is absent |

The Linux failures are fixture-configuration failures, not asserted product failures.
That private test database configuration must be restored before Phase 16 acceptance.

## Existing RGU foundations

### Existing frontend routes

`/`, `/buses`, `/cameras`, `/recordings`, `/team`, `/activity`, `/settings`,
`/tracking`, `/drivers`, `/route-planning`, `/reports`, plus superadmin `/platform`
and `/health`.

### Existing RGU APIs

| Area | Available now |
| --- | --- |
| Authentication/workspace | setup, signup, login, Google link/login, password change, session status |
| Team/SaaS | approval, roles, members, recorder grants, audit history |
| Cameras | provider connection, recorder inventory, availability, live streams, recordings, DVR search/playback |
| Buses | list, create/update, delete, camera/telemetry mappings, speed limit |
| Telemetry | latest envelope, persisted history, WheelsEye source/device diagnostics, notifications, polling |
| Monitoring | health/storage/alert data for superadmin |

### Existing PostgreSQL domains

| Domain | Current tables / capability |
| --- | --- |
| SaaS tenancy | `cam.tenants`, `cam.users`, `cam.sessions`, `cam.audit` |
| Camera access | `cam.devices`, `cam.grants`, `cam.providers`, `cam.preferences` |
| Buses | `cam.buses` with recorder, telemetry-device and speed-limit mapping |
| GPS | `cam.telemetry`, WheelsEye sources/devices/raw logs/normalized location segments |
| Alerts | `cam.speed_violations`, `cam.health_alerts` |
| Recording storage | tenant-scoped recording metadata/storage support |

All new tables must use `tenant_id`, row-level security, an explicit app role policy,
indexes for tenant/date reads, and audit events. They must be added identically to
the Windows and Linux backend schema/migration paths.

## Reference-to-RGU feature map

| NeoTrack reference screen / interaction | RGU location | Status today | Required work before it is complete |
| --- | --- | --- | --- |
| `dashboard.html` | Fleet overview | Partial: real fleet, GPS, camera and speed metrics | Dashboard layout/data-contract parity, date filters, aggregates, report widgets |
| `live.html` | Live tracking | Partial: persisted RGU map and telemetry | Live map workspace, map list/selection, tracking controls, stale/offline treatment |
| `fleet.html` | Fleet directory | Partial: bus cards/table | NeoTrack list controls, saved filters, bulk-safe actions, richer status columns |
| `vehicles.html` | Buses | Partial: RGU buses | Vehicle metadata, detailed table actions, vehicle profile navigation |
| vehicle detail export | Bus detail | Partial: telemetry/camera journey view | Full vehicle profile, assignments, history/summary panels, export contract |
| `drivers.html` | Drivers | Incomplete: driver data is currently fields on a bus | `drivers`, assignments and history tables/APIs |
| `users.html` | Team & access | Partial: RGU SaaS users/roles | NeoTrack-style directory/detail UX mapped to RGU roles and grants |
| `routeplan.html` | Route planning | Incomplete: route name is currently a bus field | routes, stops, route assignments and CRUD APIs |
| `routeplan-viewmap.html` | Route map | Not implemented | persisted route geometry/stops and map endpoint |
| `reports.html` | Reports | Incomplete | report catalogue, parameterized aggregates, export jobs/files |
| `operations.html` | Operations centre | Not implemented | operation events, state changes, history and approval rules |
| temporary vehicle assignment | Operations | Not implemented | temporary assignments, time range, conflict validation, audit |
| disable tracking | Operations | Not implemented | per-bus tracking state, reason, actor, expiry and poller enforcement |
| announcements | Operations | Not implemented | tenant announcements, recipients, read state, audit |
| `deviationsettings.html` | Deviation settings | Not implemented | geofences, route-deviation rules, thresholds, detector and alerts |
| `expensereports.html` | Expense reports | Not implemented | expenses, categories, receipts, review/approval and exports |

## Incremental delivery order

1. **Phase 0** — this baseline and migration map.
2. **Phase 1** — shared visual system, application shell, loading/error/empty/table/modal/mobile patterns.
3. **Phase 2** — dashboard shell using only existing RGU read data.
4. **Phase 3** — dashboard aggregates and chart/report contracts.
5. **Phase 4** — vehicle directory.
6. **Phase 5** — vehicle profile and telemetry/camera journey presentation.
7. **Phase 6** — live tracking workspace.
8. **Phase 7** — driver data model, APIs and UI.
9. **Phase 8** — team/user directory parity.
10. **Phase 9** — route schema, APIs, editor and route map.
11. **Phase 10** — operations schema, APIs and workflows.
12. **Phase 11** — deviations/geofence schema, detector and UI.
13. **Phase 12** — reports/export backend and UI.
14. **Phase 13** — expense schema, workflow and UI.
15. **Phase 14** — camera workspace integration throughout vehicle/live operations views.
16. **Phase 15** — full role, tenant isolation, mobile and accessibility verification.
17. **Phase 16** — production readiness, load/recovery checks and release runbook.

## Phase gate rules

Each phase must:

1. use real RGU data and authorization only;
2. include focused unit tests and affected integration tests;
3. include browser verification in the connected Chrome session after deployment;
4. be committed and pushed in every affected repository before it is reported complete;
5. not deploy a database migration until its Windows/Linux counterpart and rollback plan are reviewed.

## Explicit non-goals during Phase 0

- No deployment or VPS change.
- No database migration.
- No new visible application feature.
- No change to the existing RGU camera or telemetry connection.
