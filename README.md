# Digital Credentials Button Monorepo

This repo packages a reusable web component for the Digital Credentials API and three demos (vanilla, React, Vue) that showcase mocked and real flows, plus shared mock utilities and fixtures.

## Packages

- `@waltid/digital-credentials` — Web Component
  - `<digital-credentials-button>` that fetches a DC request, calls `navigator.credentials.get`, and posts the response to your backend.
  - Props/attrs: `request-id` (e.g., `unsigned-mdl`), `request-endpoint` (default `/api/dc/request`), `response-endpoint` (default `/api/dc/response`), `mock` (`true|false`), `label`.
  - Events: `credential-request-started`, `credential-request-loaded`, `credential-dcapi-success`, `credential-dcapi-error`, `credential-verification-success`, `credential-verification-error`, `credential-error`, `credential-finished`.
- `@waltid/dc-client` — core logic (no UI) to load a request, invoke DC API, and post verification.
- `@waltid/dc-mock-utils` — dev server plugin + browser mock helper; serves fixtures from `fixtures/` and stubs `navigator.credentials.get` when `dc-mock=1`.

## Demos

- `apps/web-demo` — vanilla HTML/TS demo with UI controls:
  - Request selector (`request-id`), mock toggle (`dc-mock` persisted), show-credential toggle, clear log.
  - Uses `<digital-credentials-button>` wired to `/api/dc/request` and `/api/dc/response`.
  - Renders a driving-license-styled modal on verification success (mock or real) with key fields.
  - Logs request/response/error events; logs a clear error if DC API is unsupported while mock is off.
- `apps/react-demo` — same UX in React.
- `apps/vue-demo` — same UX in Vue.

Mock mode defaults to off unless `?dc-mock=1` or `localStorage: dc-mock-enabled` is set. Toggling mock updates the URL and reloads so mocks take effect.

## Endpoints & fixtures

- Request endpoint: `/api/dc/request/:requestId` (also accepts `?request-id=`). Fixtures live in `fixtures/` as `<id>-request.json`.
- Verification endpoint: `/api/dc/response` (uses `<id>-verified.json` in mock mode).
- DC API mock response: `<id>-response.json`.
- Additional configs for real verifier sessions reside in `apps/config/*-conf.json` (used by the dev server plugin when mock is off).

Available `request-id`s (fixtures included):
- `unsigned-mdl`
- `signed-mdl`
- `unsigned-photoid`
- `signed-photoid`

## Quick start

```bash
npm install
npm run build              # builds mocks, core, component

# run a demo (one at a time)
npm run dev:web
npm run dev:react
npm run dev:vue
```

Then open the served URL (Vite defaults to port 5173). Use the UI toggles to switch request-id, mock mode, and credential display.

## Using the component

```html
<script type="module">
  import '@waltid/digital-credentials';
</script>

<digital-credentials-button
  request-id="unsigned-mdl"
  request-endpoint="/api/dc/request"
  response-endpoint="/api/dc/response"
  label="Request credentials"
></digital-credentials-button>
```

### Styling
Target parts: `::part(button)` and `::part(status)`. The demos include an icon/gradient example in their CSS.

### Events
Listen for lifecycle events to integrate with your app:

```js
el.addEventListener('credential-request-loaded', (e) => console.log(e.detail.payload));
el.addEventListener('credential-verification-success', (e) => console.log(e.detail.response));
el.addEventListener('credential-error', (e) => console.error(e.detail));
```

## Mock helpers

To enable mocks in your own app:
```js
import { installMocks } from '@waltid/dc-mock-utils/install-mocks';
installMocks(); // respects ?dc-mock=1 and localStorage: dc-mock-enabled
```

Or use the Vite plugin `dcMockPlugin` from `@waltid/dc-mock-utils` to serve fixtures on `/api/dc/request` and `/api/dc/response` in dev.

## Running with mocks

- Demos honor `?dc-mock=1` (or `localStorage: dc-mock-enabled=true`); the demo UI toggles it for you and reloads so the mock fetch/DC API stubs take effect.
- In your own app call `installMocks()` and visit with `?dc-mock=1`; it stubs both endpoints and `navigator.credentials.get` while keeping the same request/response URLs.
- Vite dev server: include `dcMockPlugin` so `/api/dc/request` and `/api/dc/response` serve fixtures when mock is on.

## Configuring the verifier base

- Default base is `https://verifier2.portal.test.waltid.cloud`. Override with `VERIFIER_BASE` env when running Vite (`VERIFIER_BASE=https://verifier.yourdomain npm run dev:web`) or pass `verifierBase` to `dcMockPlugin`.
- Example Vite usage:

```ts
// vite.config.ts
import { dcMockPlugin } from '@waltid/dc-mock-utils';

export default defineConfig({
  plugins: [dcMockPlugin({ verifierBase: 'https://verifier.yourdomain' })]
});
```

## Production integration

- Point `<digital-credentials-button>` at your backend: set `request-endpoint` and `response-endpoint` to URLs you control; keep `request-id` to select which verifier config to use.
- Backend flow: (1) `POST ${VERIFIER_BASE}/verification-session/create` with the config JSON you want (see `apps/config/*-conf.json` as templates), store `sessionId`; (2) `GET ${VERIFIER_BASE}/verification-session/{sessionId}/request` and return that JSON to the web component; (3) when the component POSTs the DC API result to your `response-endpoint`, forward it to `POST ${VERIFIER_BASE}/verification-session/{sessionId}/response` and return the verifier’s reply.
- Keep `VERIFIER_BASE` (or your own config name) as an environment variable in production so you can point at different verifier deployments without code changes.
- Use mocks only for local testing; leave `mock`/`dc-mock` off in production so real verifier traffic flows through your backend.

## Notes on real vs mock

- Mock on (`dc-mock=1`): all network calls are stubbed with fixtures; DC API is stubbed too.
- Mock off: dev server proxies to real verifier endpoints using configs in `apps/config`; DC API must be available in the browser. The demos log a clear error if it’s not.

## Scripts

- `npm run build` — builds mock utils, core client, and web component.
- `npm run build:mocks` — mock utils only.
- `npm run build:client` — core client only.
- `npm run build:wc` — web component only.
- `npm run dev:web|react|vue` — run respective demo.

## License

Apache-2.0.
