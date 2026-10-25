# Frontend development rules

- All fleet/recorder/member/audit/health data must come from authenticated backend
  APIs. Never restore browser-local demo business data, sample recorders, telemetry
  generators or a role-switching preview. Only the backend may supply mock GPS/fuel;
  real camera APIs must never fall back to sample devices or generated frames.

- This is a bus-first fleet product: read docs/FLEET-PRODUCT.md for its core model.
  Each recorder belongs to one bus; one vendor device supplies GPS and fuel.
  Preserve source/freshness labels and distinguish mock data from live integration.

- This is the independent RGU React/Next.js frontend. Work inside this repository
  unless the user explicitly includes other projects. Never import sibling source.
- Use React, Next.js, Tailwind, Framer Motion, GSAP, Lenis and Lucide React as the
  established stack. Use Lucide icons instead of emoji UI icons.
- Use React components for dialogs, confirmations, popups and notifications.
  Do not use window.alert, window.confirm, window.prompt or their bare equivalents.
- Preserve responsive layouts, keyboard access, labelled controls, focus management
  and reduced-motion support. Keep image samples and preview actions clearly labelled.
- Never store passwords/provider grants/tokens in localStorage or public config.
  Preview role changes are not a substitute for backend authorization.
- Keep SDK, provider credentials, database, authorization and production media logic
  on the separate backends. Do not claim backend operations succeed without a response.
- Use package-lock.json and Node 24.x. Before reporting implementation completion,
  run appropriate type/unit/build/browser checks. Browser tests must own their server;
  do not reuse a port which may serve another project.
- The user requires each affected repository's changes to be committed with a clear
  message, pushed and synchronization verified before the final report. If blocked,
  state the blocker; never claim a push/deployment succeeded when it did not.
- Git publishing is authorized; changing/deploying the VPS is not authorized by
  frontend work. Leave the reference Camera archives and backend repos untouched.

- Do not generate/search/download stock or AI imagery unless the user explicitly asks. Use CSS and Lucide icons; avoid spending image credits.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
