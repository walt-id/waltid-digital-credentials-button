# @waltid/digital-credentials

Web component that runs the Digital Credentials flow and emits lifecycle events.

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
  label="Request Digital Credentials"
></digital-credentials-button>
```

## Attributes / properties
- `request-id` (default: `?request-id` or `unsigned-mdl`)
- `request-payload` (optional JSON/object custom config)
- `request-endpoint` (default: `/api/dc/request`)
- `response-endpoint` (default: `/api/dc/response`)
- `label` (default: `Request Digital Credentials`)
- `disabled`

Attributes are reflected as properties (`requestId`, `requestPayload`, `requestEndpoint`, `responseEndpoint`, `label`, `disabled`).

## Important request-payload behavior
When `request-payload` is provided, the component delegates to `@waltid/dc-client`, which POSTs that payload to `request-endpoint/{request-id}` (custom backend-config mode). It does not bypass the backend request step entirely.

## Events
- `credential-request-started`
- `credential-request-loaded`
- `credential-dcapi-success`
- `credential-dcapi-error`
- `credential-verification-success`
- `credential-verification-error`
- `credential-error`
- `credential-finished`

All events bubble and are composed.

## Styling
Target component parts:
- `::part(button)`
- `::part(status)`

## Internals
The component is a thin UI wrapper around `@waltid/dc-client`.
