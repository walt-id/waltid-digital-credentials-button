# @waltid/dc-backend-demo

Vite middleware that acts as a demo backend for Digital Credentials flows. It manages verifier sessions in-memory by `request-id`.

## Endpoints
- `GET /api/dc/requests`
  - Lists available request IDs from `config/*-conf.json`.
- `GET /api/dc/request-config/:requestId`
  - Returns the raw config JSON.
- `GET /api/dc/request/:requestId`
  - Reads config, creates verifier session, stores `sessionId`, fetches verifier `/request` payload.
- `POST /api/dc/request/:requestId`
  - Same as above, but uses posted JSON instead of file config.
- `POST /api/dc/response`
  - Forwards wallet response to verifier `/response`, then polls `/info`.

Annex C variants:
- `GET /api/dc/annex-c/request/:requestId`
- `POST /api/dc/annex-c/request/:requestId`
- `POST /api/dc/annex-c/response`

## Defaults
- Verifier base: `https://verifier2.portal.test.waltid.cloud`
- Override via env `VERIFIER_BASE` or plugin option `dcDemoBackend({ verifierBase })`
- Config source: `packages/dc-backend-demo/config/*-conf.json`

## Usage (Vite)
```ts
import { defineConfig } from 'vite';
import { dcDemoBackend } from '@waltid/dc-backend-demo';

export default defineConfig({
  plugins: [dcDemoBackend({ verifierBase: 'https://verifier.example.com' })]
});
```

## Runtime behavior
1. Create verifier session from config/custom payload.
2. Cache `sessionId` by `request-id` in process memory.
3. Return verifier request payload to client.
4. Accept wallet response, forward to verifier, poll verifier info, return final info.

## Notes
- In-memory state only (restart clears session mapping).
- Intended for local demos, not production.
- Upstream HTTP/network errors are surfaced as JSON error responses.

## Production guidance
Use this flow as reference only. For production, implement equivalent endpoints in your backend with persistence, authz/authn, validation, observability, and hardened network/retry controls.
