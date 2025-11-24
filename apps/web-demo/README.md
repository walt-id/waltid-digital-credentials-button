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

## Docker images

### Production (static, no mock server)
- Build (from repo root): `docker build -t waltid/digital-credentials -f apps/web-demo/Dockerfile .`
- Run: `docker run --rm -p 8080:80 waltid/digital-credentials`
- Access at `http://localhost:8080`. This serves the built static assets via nginx; you must provide real `/api/dc/request` and `/api/dc/response` endpoints (same origin or adjust component attributes).

### Mock/dev (includes mock backend)
- Build (from repo root): `docker build -t waltid/digital-credentias -f apps/web-demo/Dockerfile-mock .`
- Run: `docker run --rm -p 8080:80 waltid/digital-credentias`
- Access at `http://localhost:8080`. Runs the Vite dev server (0.0.0.0:80) with `dcMockPlugin`, so `/api/dc/request` and `/api/dc/response` are served from the container.
- Use `?dc-mock=1` (or the UI toggle) to force fixture responses and stubbed DC API; leave it off to call a real verifier.
- Optional: set `VERIFIER_BASE=https://verifier.example.com` to point the mock middleware at your verifier.
- If you serve this under a custom hostname, set `ALLOWED_HOSTS=<host1,host2>` when running the container; `digital-credentials.walt.id` is allowed by default.

### Backend connectivity
- Production image: provide `/api/dc/request` and `/api/dc/response` yourself (same origin or update `request-endpoint`/`response-endpoint` attributes).
- Mock image: endpoints are provided in-container. For real verifier traffic with the mock image, set `VERIFIER_BASE` and leave `dc-mock` off; the middleware will create sessions and forward responses.
- To use an external backend with either image, adjust the component attributes in `src/main.ts` or at runtime.
