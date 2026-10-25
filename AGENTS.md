# Frontend development rules

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
