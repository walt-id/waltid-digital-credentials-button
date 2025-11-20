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
  config-endpoint="/api/dc/config"
  label="Request credentials"
></digital-credentials-button>
```

Events:

- `credential-request-started`
- `credential-received` (`detail: { credential, backendResponse }`)
- `credential-error` (`detail: { stage, error }`)

Attributes / properties:

- `config-endpoint` (required) — backend endpoint for both the config fetch and credential post
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

# Run a demo (pick one)
npm run dev:web
npm run dev:react
npm run dev:vue
```

Each dev server exposes `GET/POST /api/dc/config` using the shared fixtures so the button works immediately.

## Mocking

All demos call `installMocks()` from `@waltid/dc-mock-utils/install-mocks`, which:

- stubs `navigator.credentials.get` with `fixtures/unsigned-mdl-response.json`
- mocks `GET /api/dc/config` with `fixtures/unsigned-mdl-request.json`
- echoes credential submissions with `fixtures/credentials-response.json`

Toggle the mock via `?dc-mock=1` / `?dc-mock=0` or the UI toggle (persisted to `localStorage: dc-mock-enabled`).
