# Web Demo

Simple Vite demo for `<digital-credentials-button>`. Builds to static assets and can be served via the provided Dockerfile.

## Local development
- From repo root: `npm ci`
- Build shared packages (once): `npm run build`
- Run the demo: `npm run dev --workspace apps/web-demo` (defaults to port 5173)
- Toggle mocks by visiting with `?dc-mock=1` or using the UI mock switch.

## Production/static build
- From repo root: `npm run build` (builds shared packages)
- Build the demo bundle: `npm run build --workspace apps/web-demo`
- Output lands in `apps/web-demo/dist`; serve it with any static server (e.g., `npm run preview --workspace apps/web-demo`).

## Docker image
- Build (from repo root): `docker build -t waltid/digital-credentias -f apps/web-demo/Dockerfile .`
- Run: `docker run --rm -p 8080:80 waltid/digital-credentias`
- Access at `http://localhost:8080`. Use `?dc-mock=1` to run entirely with mocked endpoints/DC API.

### Backend connectivity
- The demo expects `/api/dc/request` and `/api/dc/response` on the same origin. When running the container, proxy or expose your backend at those paths (or adjust the attributes in `src/main.ts` if you need different endpoints).
- For real verifier traffic, your backend should forward to your configured verifier base; for local testing you can stay on mocks with `?dc-mock=1`.
