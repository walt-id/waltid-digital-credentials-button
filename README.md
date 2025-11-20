# Digital Credential Web Component

A tiny Web Component that fetches a Digital Credential API request from your backend, calls `navigator.credentials.get`, and posts the credential back for verification.

## Usage

Install (after publishing):

```bash
npm install @waltid/digital-credentials-wc
```

Register the component and drop it into your page:

```html
<script type="module">
  import '@waltid/digital-credentials-wc';
</script>

<digital-credentials-button
  config-endpoint="/api/dc/config"
  label="Request credentials"
></digital-credentials-button>
```

Listen for lifecycle events:

```js
const el = document.querySelector('digital-credentials-button');
el.addEventListener('credential-request-started', () => console.log('started'));
el.addEventListener('credential-received', (event) => console.log('success', event.detail));
el.addEventListener('credential-error', (event) => console.error('error', event.detail));
```

### Attributes / properties

- `config-endpoint` (**required**): backend endpoint that returns the DC API request and accepts the credential response.
- `label` (optional): button text, defaults to `Request credentials`.
- `method` (optional): HTTP verb used when posting the credential, defaults to `POST`.

### Events

- `credential-request-started`: fired when the flow begins.
- `credential-received`: fired after `navigator.credentials.get` succeeds and the backend accepts the credential. `detail` includes `{ credential, backendResponse }`.
- `credential-error`: fired on any failure with `{ stage, error }`.

### Backend expectations

- `GET config-endpoint` should return JSON that can be passed into `navigator.credentials.get`. If your backend returns `{ protocol, data }`, the component wraps it into `digital.requests` automatically.
- A subsequent request to the same endpoint (using `method`) should accept `{ credential }` as JSON and respond with `{ success: boolean, ... }`.

## Local development

```
cd digital-credentials-button
npm install
npm run build
npm run dev
```

Open `http://localhost:5173/demo/` for the mocked demo. `demo/mock-environment.js` stubs both the backend endpoint and `navigator.credentials.get` when the API is unavailable.

### Mock toggle

The demo ships with a manual mock for both the backend and the Digital Credentials API:

- Toggle via query param: append `?dc-mock=1` to the demo URL to enable, `?dc-mock=0` to disable (the UI toggle uses the same values).
- Or toggle from the demo UI (mock control above the card) which persists to `localStorage (dc-mock-enabled)`.
- When enabled:
  - `GET /api/dc/config` returns `src/main/resources/static/direct-unsigned-mdl-request.json`.
  - `navigator.credentials.get` resolves with `src/main/resources/static/mdl-unsigned-response.json`.
  - The credential submission returns `src/main/resources/static/mattr-response.json` (and is echoed in the log).

### Dev server config endpoint

While running `npm run dev`, the Vite dev server also serves `GET /api/dc/config` from `src/main/resources/static/direct-unsigned-mdl-request.json` so the demo button points at a valid configuration out of the box.
`POST /api/dc/config` returns `src/main/resources/static/mattr-response.json` for local testing.
