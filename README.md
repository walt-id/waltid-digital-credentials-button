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

# Digital Credentials Button Monorepo

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
- `apps/web-demo` — vanilla TS with request selector, show-credential toggle, event log, and modal showing verified data.
- `apps/react-demo` — same UX in React.
- `apps/vue-demo` — same UX in Vue.

All demos talk to `/api/dc/request` and `/api/dc/response` served by the demo backend (Vite plugin).

## Endpoints & configs
- Request endpoint: `/api/dc/request/:requestId` (also accepts `?request-id=`). Uses `packages/dc-backend-demo/config/<id>-conf.json` to create a verifier session and return the DC API payload.
- Verification endpoint: `/api/dc/response` forwards the credential response to the verifier session and returns verifier info.
- Default verifier base: `https://verifier2.portal.test.waltid.cloud` (override with `VERIFIER_BASE` or `dcDemoBackend({ verifierBase })`).
- Request IDs available out of the box: `unsigned-mdl`, `signed-mdl`, `encrypted-mdl`, `unsigned-encrypted-mdl`, `signed-encrypted-mdl`, `unsigned-photoid`, `signed-photoid`.

## Quick start
```bash
npm install
npm run build              # builds demo backend, core client, and web component

npm run dev:web            # vanilla demo
npm run dev:react          # React demo
npm run dev:vue            # Vue demo
```
Open the served URL (Vite defaults to 5173). Pick a request ID and click the button; the verified credential details appear in the modal if the browser supports the DC API.

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
<img src="../../assets/walt-banner.png" alt="walt.id banner" />
</div>

