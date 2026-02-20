<div align="center">
 <h1>Digital Credentials Button</h1>
 <span>by </span><a href="https://walt.id">walt.id</a>
 <p>A web component that fetches a digital credentials request, calls the Digital Credentials API, and posts the response to your backend.</p>

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
    <em>This project is actively maintained by the development team at walt.id.</em>
  </p>
</div>

## Digital Credentials Button Monorepo

Reusable Digital Credentials API web component plus a minimal demo backend. Includes vanilla, React, and Vue demos, plus a dedicated `dc-api-test` app for direct verifier testing.

Use our deployed demo here: https://digital-credentials.walt.id

Learn more about the Digital Credentials API:
- [W3C Standard](https://www.w3.org/TR/digital-credentials/)
- [Ecosystem Support](https://digitalcredentials.dev/ecosystem-support?support-matrix=dc-api)

Tested wallets:
- [CM Wallet](https://github.com/digitalcredentialsdev/CMWallet)

## Packages
- `@waltid/digital-credentials` — web component (`<digital-credentials-button>`).
- `@waltid/dc-client` — core flow logic (request/load DC API/post verification).
- `@waltid/dc-backend-demo` — Vite middleware exposing `/api/dc/*` demo endpoints backed by verifier sessions.

## Apps
- `apps/web-demo` — full vanilla demo (request selector, protocol selector, toggles, logs, credential modal).
- `apps/dc-api-test` — direct verifier test app using Swagger examples from `/verification-session/create`.
- `apps/react-demo` — minimal React integration example.
- `apps/vue-demo` — minimal Vue integration example.

## Quick Start
```bash
npm install
npm run build

npm run dev:web
npm run dev:dc-api-test
npm run dev:react
npm run dev:vue
```

## Common Endpoints (demo backend)
- `GET /api/dc/requests`
- `GET /api/dc/request-config/:requestId`
- `GET /api/dc/request/:requestId`
- `POST /api/dc/request/:requestId`
- `POST /api/dc/response`
- `GET /api/dc/annex-c/request/:requestId`
- `POST /api/dc/annex-c/request/:requestId`
- `POST /api/dc/annex-c/response`

Default verifier base is `https://verifier2.portal.test.waltid.cloud` (override via `VERIFIER_BASE` or plugin options).

## Using the Web Component
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

`request-payload` can be supplied for custom request setup. In this implementation it is posted to `request-endpoint` (as custom config), not sent directly to `navigator.credentials.get` without backend interaction.

## Scripts
- `npm run build`
- `npm run build:backend`
- `npm run build:client`
- `npm run build:wc`
- `npm run dev:web`
- `npm run dev:dc-api-test`
- `npm run dev:react`
- `npm run dev:vue`

## Join the Community
- [Discord](https://discord.gg/AW8AgqJthZ)
- [Newsletter](https://walt.id/newsletter)
- [YouTube](https://www.youtube.com/channel/UCXfOzrv3PIvmur_CmwwmdLA)
- [LinkedIn](https://www.linkedin.com/company/walt-id/)
- [Issues](https://github.com/walt-id/waltid-digital-credentials-button/issues)
- [Docs](https://docs.walt.id)

## License
Licensed under the [Apache License, Version 2.0](https://github.com/walt-id/waltid-identity/blob/main/LICENSE)

<div align="center">
<img src="./assets/walt-banner.png" alt="walt.id banner" />
</div>
