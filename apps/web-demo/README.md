# Web Demo

Vite demo for `<digital-credentials-button>` backed by the in-repo demo backend (`@waltid/dc-backend-demo`). It fetches a Digital Credentials API request, calls `navigator.credentials.get`, and sends the response for verification.

## Local development
- From repo root: `npm install`
- Build shared packages once: `npm run build`
- Run the demo: `npm run dev --workspace apps/web-demo` (defaults to port 5173)

## Docker
- Build: `docker build -t waltid/digital-credentials -f apps/web-demo/Dockerfile .`
- Run: `docker run --rm -p 8080:80 waltid/digital-credentials`
- Optional: `VERIFIER_BASE=https://verifier.example.com` to point the demo backend at a different verifier.

The demo supports two retrieval protocols:
- OpenID4VP (dc_api): `/api/dc/request` + `/api/dc/response`
- ISO 18013-7 Annex C (org.iso.mdoc): `/api/dc/annex-c/request` + `/api/dc/annex-c/response` (backed by verifier `/verification-session/*` with `flow_type: "dc_api-annex-c"`)

Use a browser with Digital Credentials API support.
