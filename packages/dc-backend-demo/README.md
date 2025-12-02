# @waltid/dc-backend-demo

Tiny Vite middleware that stands in for a backend during development. It exposes three endpoints, creates verification sessions against a verifier, and keeps a short-lived in-memory map of `request-id` to `sessionId`.

- `GET /api/dc/requests` — lists available request IDs by reading `config/*-conf.json`.
- `GET /api/dc/request-config/:requestId` — returns the raw config JSON for a request.
- `GET /api/dc/request/:requestId` — reads `config/<requestId>-conf.json`, POSTs it to `${VERIFIER_BASE}/verification-session/create`, stores the returned `sessionId`, then fetches the DC API request from `/verification-session/{sessionId}/request`.
- `POST /api/dc/request/:requestId` — same as above but uses the provided JSON body as the config instead of `config/*-conf.json`.
- `POST /api/dc/response` — looks up the last `sessionId` for the given `request-id`, forwards the payload to `/verification-session/{sessionId}/response`, then polls `/verification-session/{sessionId}/info` and returns that result.

Defaults:
- `VERIFIER_BASE` env (or `verifierBase` option) sets the verifier base URL. Fallback: `https://verifier2.portal.test.waltid.cloud`.
- Configs live in `config/*-conf.json` (e.g., `unsigned-mdl-conf.json`). Add your own to support new `request-id`s.

## Usage (Vite)
```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { dcDemoBackend } from '@waltid/dc-backend-demo';

export default defineConfig({
  plugins: [dcDemoBackend({ verifierBase: 'https://verifier.example.com' })],
  server: { fs: { allow: ['.'] } }
});
```

Start Vite; the endpoints above will be available on the dev server origin. Point `<digital-credentials-button>` at `/api/dc/request` and `/api/dc/response`.

## How it works
1) On the first request for a `request-id`, the middleware reads the matching config JSON and calls the verifier’s `verification-session/create`.
2) It caches the returned `sessionId` in memory (per `request-id`), fetches the DC API request, and returns it to the client.
3) When the client POSTs to `/api/dc/response`, the middleware forwards the payload to the verifier’s `.../response`, then polls `.../info` up to 5 times before returning that result.

## Notes
- State is in-memory and process-local; restart Vite and you lose `sessionId`s.
- Error handling is best-effort: network/HTTP failures surface as JSON `{ message }` with the upstream status code when available.
- Content types are assumed JSON for configs, requests, and responses.

## Moving to production
The demo middleware is intentionally minimal. For a real backend or API gateway:
- Replace the Vite middleware with your runtime stack (e.g., Express/Fastify/Go/Ktor) and implement the same flow on your server.
- Persist sessions per user/request (DB or cache) instead of an in-memory Map; clean up expired sessions.
- Add authentication/authorization (cookies, OAuth, API keys, mTLS) before issuing verifier calls.
- Validate inputs and enforce schemas for both `/request` and `/response`; reject unexpected shapes.
- Harden networking: timeouts, retries with backoff, circuit breakers, structured logging, metrics.
- Honor privacy/security: HTTPS everywhere, CORS rules for your frontend origin, avoid logging credentials, secure any secrets/keys.

Use this package only for local demos; lift the flow into your production backend with the safeguards above.
