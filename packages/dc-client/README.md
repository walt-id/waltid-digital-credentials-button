## @waltid/dc-client

Barebones Digital Credentials client for loading a request payload, invoking `navigator.credentials.get`, and posting the verification response.

### API

```ts
import { requestCredential } from '@waltid/dc-client';

const result = await requestCredential({
  requestId: 'unsigned-mdl',
  requestEndpoint: '/api/dc/request',
  responseEndpoint: '/api/dc/response',
  mock: true
});

console.log(result.request, result.dcResponse, result.verification);
```

Options:
- `requestId` (string, required)
- `requestEndpoint` (default `/api/dc/request`)
- `responseEndpoint` (default `/api/dc/response`)
- `mock` (boolean) – forwarded as `dc-mock`/`x-dc-mock`
- `headers` (object) – merged into fetch headers
- `fetchImpl` – custom fetch (for SSR/tests)

Errors throw `CredentialFlowError` with `stage: 'request' | 'dc-api' | 'verification' | 'network' | 'unexpected'`.
