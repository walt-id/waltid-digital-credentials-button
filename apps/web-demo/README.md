# Web Demo

Vite demo for `<digital-credentials-button>` backed by the in-repo middleware (`@waltid/dc-backend-demo`).

## Features
- Request selector loaded from backend config IDs
- Retrieval protocol switch:
  - OpenID4VP (`/api/dc/request` + `/api/dc/response`)
  - ISO 18013-7 Annex C (`/api/dc/annex-c/request` + `/api/dc/annex-c/response`)
- Signed/encrypted toggles for OpenID4VP requests
- Request customization modal (saved in localStorage)
- Event log and credential/policy result modal

## Local development
From repository root:

```bash
npm install
npm run build
npm run dev:web
```

## Docker
Build from repository root:

```bash
docker build --no-cache -f apps/web-demo/Dockerfile -t waltid/digital-credentials .
```

Run:

```bash
docker run --rm -p 8080:80 waltid/digital-credentials
```

Optional runtime env for verifier backend target:
- `VERIFIER_BASE=https://verifier.example.com`

Use a browser with Digital Credentials API support.
