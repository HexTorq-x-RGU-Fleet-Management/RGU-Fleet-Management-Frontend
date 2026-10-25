# Backend extraction handoff

This document describes integration work still required. It is not a statement
that the new Windows/Linux repositories already implement these endpoints.

| Existing V3 route          | Frontend purpose          |
| -------------------------- | ------------------------- |
| GET /api/auth/status       | Session/setup status      |
| POST /api/auth/login       | Viewer login              |
| POST /api/auth/signup      | Pending workspace request |
| POST /api/auth/logout      | Session revocation        |
| POST /api/auth/password    | Viewer password change    |
| POST /api/connect/personal | Admin provider login      |

The current client uses include credentials, JSON, no-store and X-Hik-Local: 1.
It validates the /api prefix, applies a timeout, preserves safe backend error
codes and does not expose malformed response bodies. Real credentials are not
saved or sent when NEXT_PUBLIC_API_BASE_URL is empty.

Both extracted backends must agree on principal/tenant scope, session lifetime,
forced password changes, auth error codes, provider reconnection, device/channel
schemas, recording ownership, role permissions, audit/health and live media.
The frontend preview currently uses only local sample state for these screens.

For a Vercel frontend on a different origin, explicitly design allowlisted CORS
and preflight, cookie domain/SameSite/Secure, CSRF protection, user binding for
media subscriptions and authorization on every stream/download. Do not enable a
wildcard origin with credentials. A same-site reverse-proxy setup is another
integration option, but none is configured by this frontend-only delivery.

Keep frame/audio delivery outside Vercel functions until the media contract and
capacity are tested. The old SSE/WebCodecs/JPEG/PCM paths are migration references,
not embedded legacy UI scripts in this React implementation. Browser microphone
forwarding and historical DVR playback remain deferred, matching prior scope.

A preview-role menu must never appear as a production privilege selector.
When real session/device wiring is added, replace the sample source with a tenant-
authorized provider and retain explicit loading/empty/offline/expired/error states.
