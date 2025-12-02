## @waltid/dc-client

Barebones Digital Credentials client for loading a request payload, invoking `navigator.credentials.get`, and posting the verification response.

### API

```ts
import { requestCredential } from '@waltid/dc-client';

const result = await requestCredential({
  requestId: 'unsigned-mdl',
  requestEndpoint: '/api/dc/request',
  responseEndpoint: '/api/dc/response',
  // requestPayload: { ... } // optional: bypass fetching and use this payload directly
});

console.log(result.request, result.dcResponse, result.verification);
```

Options:
- `requestId` (string, optional; defaults to `request-id` query param or `unsigned-mdl`)
- `requestPayload` (object, optional; if provided, skips fetching from `request-endpoint`)
- `requestEndpoint` (default `/api/dc/request`)
- `responseEndpoint` (default `/api/dc/response`)
- `headers` (object) – merged into fetch headers
- `fetchImpl` – custom fetch (for SSR/tests)

Errors throw `CredentialFlowError` with `stage: 'request' | 'dc-api' | 'verification' | 'network' | 'unexpected'`.
