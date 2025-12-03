<div align="center">
 <h1>Digital Credentials Button</h1>
 <span>by </span><a href="https://walt.id">walt.id</a>
 <p>A web component that fetches a digital credentials request, calls the digital credentials API, and posts the response to your backend.</p>

  <a href="https://walt.id/community">
  <img src="https://img.shields.io/badge/Join-The Community-blue.svg?style=flat" alt="Join community!" />
  </a>
  <a href="https://www.linkedin.com/company/walt-id/">
  <img src="https://img.shields.io/badge/-LinkedIn-0072b1?style=flat&logo=linkedin" alt="Follow walt_id" />
  </a>
  
  <h2>Status</h2>
  <p align="center">
    <img src="https://img.shields.io/badge/🟢%20Actively%20Maintained-success?style=for-the-badge&logo=check-circle" alt="Status: Actively Maintained" />
    <br/>
    <em>This project is being actively maintained by the development team at walt.id.<br />Regular updates, bug fixes, and new features are being added.</em>
  </p>
</div>

## Digital Credentials Button Monorepo

Reusable Digital Credentials API web component plus a minimal demo backend. Includes vanilla, React, and Vue demos that hit real verifier endpoints through the in-repo backend middleware.

**NOTE**: This project is still in development and is not yet ready for production use. It is still an experimental standard.

Learn more about the Digital Credentials API:
- [W3C Standard](https://www.w3.org/TR/digital-credentials/)
- [Ecosystem Support](https://digitalcredentials.dev/ecosystem-support?support-matrix=dc-api)

This project has been tested specifically with the following wallets:
- [CM Wallet](https://github.com/digitalcredentialsdev/CMWallet)

## Packages
- `@waltid/digital-credentials` — Web Component. `<digital-credentials-button>` fetches a DC request, calls `navigator.credentials.get`, and posts the response to your backend.
- `@waltid/dc-client` — Core logic (no UI) to load a request, invoke the DC API, and post verification.
- `@waltid/dc-backend-demo` — Lightweight dev-server middleware that creates verifier sessions from `packages/dc-backend-demo/config/*-conf.json` and exposes `/api/dc/request/:id` and `/api/dc/response`.

## Demos
- `apps/web-demo` — vanilla TS with request selector, toggles, event log, and modal showing verified data.
- `apps/react-demo` — minimal React starter that only embeds `<digital-credentials-button>` to show integration.
- `apps/vue-demo` — minimal Vue starter that only embeds `<digital-credentials-button>` to show integration.

All demos talk to `/api/dc/request` and `/api/dc/response` served by the demo backend (Vite plugin).

## Endpoints & configs
- Request endpoint: `/api/dc/request/:requestId` (also accepts `?request-id=`). Uses `packages/dc-backend-demo/config/<id>-conf.json` to create a verifier session and return the DC API payload.
- Verification endpoint: `/api/dc/response` forwards the credential response to the verifier session and returns verifier info.
- Default verifier base: `https://verifier2.portal.test.waltid.cloud` (override with `VERIFIER_BASE` or `dcDemoBackend({ verifierBase })`).
- Request IDs available out of the box: `unsigned-mdl`, `signed-mdl`, `encrypted-mdl`, `unsigned-encrypted-mdl`, `signed-encrypted-mdl`, `unsigned-photoid`, `signed-photoid`.

## Step-by-Step Flow

The Digital Credentials flow involves three main components working together: the **web component** (client), the **middleware backend**, and the **verifier service**. Here's how they interact:

### 1. User Initiates Request
When a user clicks the `<digital-credentials-button>`, the web component begins the credential request flow.

### 2. Fetch Request Payload (Client → Middleware → Verifier)
```
Client                    Middleware                    Verifier Service
  |                            |                              |
  |-- GET /api/dc/request/:id->|                              |
  |                            |-- Read config file           |
  |                            |   (config/{id}-conf.json)    |
  |                            |                              |
  |                            |-- POST /verification-session |
  |                            |   /create                    |
  |                            |   (with config JSON) ------->|
  |                            |                              |
  |                            |<-- sessionId ----------------|
  |                            |                              |
  |                            |-- GET /verification-session/  |
  |                            |   {sessionId}/request ------>|
  |                            |                              |
  |                            |<-- DC API request payload ---|
  |                            |                              |
  |<-- DC API request payload--|                              |
```

**Details:**
- The client sends a `GET` request to `/api/dc/request/:requestId`
- The middleware reads the corresponding config file from `packages/dc-backend-demo/config/{requestId}-conf.json`
- The middleware creates a verification session by posting the config to `{VERIFIER_BASE}/verification-session/create`
- The verifier returns a `sessionId` which the middleware stores
- The middleware fetches the DC API request payload from `{VERIFIER_BASE}/verification-session/{sessionId}/request`
- The middleware returns this payload to the client

### 3. Invoke Digital Credentials API (Client → Browser)
```
Client                    Browser/Wallet
  |                            |
  |-- navigator.credentials.get|
  |   (with request payload) ->|
  |                            |
  |                            |-- User selects credential    |
  |                            |   and approves request       |
  |                            |                              |
  |<-- Credential response ----|
```

**Details:**
- The client calls `navigator.credentials.get()` with the request payload
- If the browser supports the DC API, it opens the wallet interface
- The user selects and approves the credential request
- The browser/wallet returns the credential response

### 4. Post Verification (Client → Middleware → Verifier)
```
Client                    Middleware                    Verifier Service
  |                            |                              |
  |-- POST /api/dc/response   |                              |
  |   (with credential) ------>|                              |
  |                            |-- Lookup sessionId           |
  |                            |   (from stored sessions)     |
  |                            |                              |
  |                            |-- POST /verification-session |
  |                            |   /{sessionId}/response     |
  |                            |   (with credential) ------->|
  |                            |                              |
  |                            |-- Poll GET /verification-    |
  |                            |   session/{sessionId}/info ->|
  |                            |   (until status !=          |
  |                            |    "processing")             |
  |                            |                              |
  |                            |<-- Verification result ------|
  |                            |                              |
  |<-- Verification result ----|                              |
```

**Details:**
- The client sends a `POST` request to `/api/dc/response` with the credential response
- The middleware retrieves the stored `sessionId` for the request
- The middleware forwards the credential to `{VERIFIER_BASE}/verification-session/{sessionId}/response`
- The middleware polls `{VERIFIER_BASE}/verification-session/{sessionId}/info` until verification completes (status is no longer "processing" or "received")
- The middleware returns the verification result to the client
- The web component emits events (`credential-verification-success` or `credential-verification-error`) with the result

### Flow Summary
1. **Request Phase**: Client requests → Middleware creates verifier session → Verifier returns DC API payload → Client receives payload
2. **DC API Phase**: Client invokes `navigator.credentials.get()` → User approves in wallet → Browser returns credential
3. **Verification Phase**: Client posts credential → Middleware forwards to verifier → Verifier processes → Middleware polls for result → Client receives verification

### Error Handling
At each stage, errors are caught and emitted as events:
- `credential-request-loaded` - Request payload successfully fetched
- `credential-dcapi-error` - DC API call failed (e.g., user cancelled, unsupported browser)
- `credential-verification-error` - Verification failed (e.g., invalid credential, verifier error)
- `credential-error` - Generic error at any stage

## Quick start
```bash
npm install
npm run build              # builds demo backend, core client, and web component

npm run dev:web            # vanilla demo
npm run dev:react          # React demo
npm run dev:vue            # Vue demo
```
Open the served URL (Vite defaults to 5173). The web demo includes request selection, toggles, and logging; the React/Vue demos are minimal starters that simply render the web component pointed at the demo backend.

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

Optionally skip fetching by passing a payload directly via `request-payload` (JSON string) or the `requestPayload` property.

### Styling
Target parts: `::part(button)` and `::part(status)`. The demos include an icon/gradient example in their CSS.

### Events
```js
el.addEventListener('credential-request-loaded', (e) => console.log(e.detail.payload));
el.addEventListener('credential-verification-success', (e) => console.log(e.detail.response));
el.addEventListener('credential-error', (e) => console.error(e.detail));
```

## Demo backend in your app
```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { dcDemoBackend } from '@waltid/dc-backend-demo';

export default defineConfig({
  plugins: [dcDemoBackend({ verifierBase: 'https://verifier.example.com' })]
});
```

## Production integration
- Point `<digital-credentials-button>` at your backend with `request-endpoint` and `response-endpoint`; keep `request-id` to pick the verifier config you want.
- Backend flow: (1) `POST ${VERIFIER_BASE}/verification-session/create` with the config JSON you want (see `packages/dc-backend-demo/config/*-conf.json` as templates) and store `sessionId`; (2) `GET ${VERIFIER_BASE}/verification-session/{sessionId}/request` and return that JSON to the web component; (3) when the component POSTs the DC API result to your `response-endpoint`, forward it to `POST ${VERIFIER_BASE}/verification-session/{sessionId}/response` and return the verifier reply (poll `/info` until it’s ready).
- Keep `VERIFIER_BASE` as an environment variable so you can swap verifier deployments without code changes.

## Scripts
- `npm run build` — builds demo backend, core client, and web component.
- `npm run build:backend` — demo backend only.
- `npm run build:client` — core client only.
- `npm run build:wc` — web component only.
- `npm run dev:web|react|vue` — run the respective demo with the demo backend middleware.

## Join the community

* Connect and get the latest updates: [Discord](https://discord.gg/AW8AgqJthZ) | [Newsletter](https://walt.id/newsletter) | [YouTube](https://www.youtube.com/channel/UCXfOzrv3PIvmur_CmwwmdLA) | [LinkedIn](https://www.linkedin.com/company/walt-id/)
* Get help, request features and report bugs: [GitHub Issues ](https://github.com/walt-id/waltid-identity/issues)
* Find more indepth documentation on our [docs site](https://docs.walt.id)


## License

Licensed under the [Apache License, Version 2.0](https://github.com/walt-id/waltid-identity/blob/main/LICENSE)

<div align="center">
<img src="./assets/walt-banner.png" alt="walt.id banner" />
</div>
