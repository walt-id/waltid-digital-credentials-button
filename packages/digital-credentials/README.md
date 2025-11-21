# @waltid/digital-credentials

A lightweight web component that fetches a Digital Credentials request from your backend, calls `navigator.credentials.get`, and posts the result back for verification. Built on the shared core client (`@waltid/dc-client`) so you can drop it into any framework or plain HTML.

## Install

```bash
npm install @waltid/digital-credentials
```

## Quick start

```html
<script type="module">
  import '@waltid/digital-credentials';
</script>

<digital-credentials-button
  request-id="unsigned-mdl"
  request-endpoint="/api/dc/request"
  response-endpoint="/api/dc/response"
  mock="true"
  label="Request credentials"
></digital-credentials-button>
```

## Attributes / properties

- `request-id` (string, default: `unsigned-mdl`): Which request to load (also forwarded as `request-id` query param).
- `request-endpoint` (string, default: `/api/dc/request`): Base URL for fetching the DC API request payload. Component calls `${request-endpoint}/${request-id}`.
- `response-endpoint` (string, default: `/api/dc/response`): URL to POST the DC API response for verification.
- `mock` (`"true"`/`"false"`, default: `"false"`): Toggles mock mode; forwarded as `dc-mock`/`x-dc-mock`.
- `label` (string, default: `Request credentials`): Button text.
- `disabled` (boolean attribute): Manually disable interaction.

All attributes are reflected as properties (`requestId`, `requestEndpoint`, `responseEndpoint`, `mock`, `label`, `disabled`).

## Events

Lifecycle events bubble and are composed, so you can listen on ancestors:

- `credential-request-started` — `{ requestId }`
- `credential-request-loaded` — `{ requestId, payload }`
- `credential-dcapi-success` — `{ requestId, response }`
- `credential-dcapi-error` — `{ requestId, error }`
- `credential-verification-success` — `{ requestId, response }`
- `credential-verification-error` — `{ requestId, error }`
- `credential-error` — `{ stage, error, requestId }` (any failure)
- `credential-finished` — `{ requestId, result? , error? }` (always fired last)

Example:

```js
const el = document.querySelector('digital-credentials-button');
el.addEventListener('credential-request-loaded', (e) =>
  console.log('DC request', e.detail.payload)
);
el.addEventListener('credential-verification-success', (e) =>
  console.log('Verified', e.detail.response)
);
el.addEventListener('credential-error', (e) =>
  console.error('Error', e.detail)
);
```

## Styling

The component uses an internal button; target parts:

- `::part(button)` — main button
- `::part(status)` — status text

Example:

```css
digital-credentials-button::part(button) {
  background: #111827;
  color: #f8fafc;
}
```

## How it works

1. GET `${request-endpoint}/${request-id}` (adds `request-id` and `dc-mock` query params) to load the DC API payload.
2. Calls `navigator.credentials.get` with the request payload.
3. POSTs the DC API response to `response-endpoint` (with `request-id` and optional `dc-mock`).
4. Emits lifecycle events for success/error at each stage.

## Core reuse

The component delegates the flow to `@waltid/dc-client`. If you prefer direct control (React hooks, Vue composables, SSR), depend on `@waltid/dc-client` and call `requestCredential` yourself.
