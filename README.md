# Digital Credentials Button

A web component that asks your backend for a Digital Credentials API request, calls `navigator.credentials.get`, and posts the returned credential back for verification.

## Package usage

```bash
npm install @waltid/digital-credentials
```

```html
<script type="module">
  import '@waltid/digital-credentials';
</script>

<digital-credentials-button
  config-endpoint="/api/dc/request"
  label="Request credentials"
></digital-credentials-button>
```

Events:

- `credential-request-started`
- `credential-received` (`detail: { credential, backendResponse }`)
- `credential-error` (`detail: { stage, error }`)

Attributes / properties:

- `config-endpoint` (required) — backend endpoint for both the request fetch and credential post
- `label` (optional) — button text (default: `Request credentials`)
- `method` (optional) — HTTP verb used when posting the credential (default: `POST`)

## Repository layout

- `packages/digital-credentials` — the web component source, build config, and types
- `packages/dc-mock-utils` — shared `installMocks()` helper and Vite dev-server plugin
- `fixtures/` — shared JSON files for the mock flows
- `apps/web-demo` — frameworkless demo that mirrors the original sample
- `apps/react-demo` — React demo using the custom element in JSX
- `apps/vue-demo` — Vue demo using the custom element in templates

## Local development

```bash
npm install

# Build the web component
npm run build

# Build demos
npm run build --workspace apps/web-demo
npm run build --workspace apps/react-demo
npm run build --workspace apps/vue-demo

# Run a demo (pick one)
npm run dev:web
npm run dev:react
npm run dev:vue
```

Each dev server exposes `GET/POST /api/dc/request` using the shared fixtures so the button works immediately.

## Mocking

All demos call `installMocks()` from `@waltid/dc-mock-utils/install-mocks`, which:

- stubs `navigator.credentials.get` with `fixtures/unsigned-mdl-response.json`
- mocks `GET /api/dc/request` with `fixtures/unsigned-mdl-request.json`
- echoes credential submissions with `fixtures/credentials-response.json`

Toggle the mock via `?dc-mock=1` / `?dc-mock=0` or the UI toggle (persisted to `localStorage: dc-mock-enabled`).

## App logic

1.) The DC API Request (Credential query) should be loaded when hitting the button from the request endpoint by passing a configurationId: "GET /api/dc/request/${configurationId}" e.g.: "GET /api/dc/request/unsigned-mdl-request". And the response is logged. This should be done when mock mode is enabled or not. If mock mode is enabled then file unsigned-mdl-response.json is returned. If mock mode is enabled, then the real backend at POST https://verifier2.portal.test.waltid.cloud/verification-session/create is called, and the sessionId e.g. "sessionId": "e102ecf7-0ecc-4085-85a7-6690ef1cfb1f" stored in the middleware in memory. Afterwards, another backend endpoint is called at: POST https://verifier2.portal.test.waltid.cloud/verification-session/<sessionId>/request using the sessionId from before. The result is the response from the middleware, the DC API Request, that is then sent to the DC API in the next step

2.) This request is then sent to the DC API, but only if mock mode is disabled. 

3.) In case of success or failure the response from the DC API should be logged. When mock mode is enabled, the response unsigned-mdl-response.json should be logged.

4.) In case of success, as well as when mock mode is enabled, the response is sent to the backend at POST /api/dc/response. This endpoint is currently missing. So please add this one. This is the place where the backend validates the credential. When mock mode is disabled, the application should call the real backend at https://verifier2.portal.test.waltid.cloud/verification-session/<sessionId>/response and return the value to the client, where it is logged. When mock mode is enabled, then the credentials-response.json is returnend.



The implementation of the web-demo is good now. Please apply now all changes, the usage of the new Web Component, as well as the UI/UX changes of the web-demo to the react and the vue demo.