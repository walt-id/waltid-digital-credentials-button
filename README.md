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
