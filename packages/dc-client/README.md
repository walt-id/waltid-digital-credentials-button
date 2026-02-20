## @waltid/dc-client

Core Digital Credentials flow client for:
- loading a DC request payload
- invoking `navigator.credentials.get`
- posting the wallet response for verification

## API

```ts
import { requestCredential } from '@waltid/dc-client';

const result = await requestCredential({
  requestId: 'unsigned-mdl',
  requestEndpoint: '/api/dc/request',
  responseEndpoint: '/api/dc/response'
});

console.log(result.request, result.dcResponse, result.verification);
```

## Options
- `requestId?: string`
- `requestPayload?: unknown`
- `requestEndpoint?: string` (default: `/api/dc/request`)
- `responseEndpoint?: string` (default: `/api/dc/response`)
- `headers?: Record<string, string>`
- `fetchImpl?: typeof fetch`

## Behavior notes
- If `requestPayload` is **not** provided, the client does `GET {requestEndpoint}/{requestId}`.
- If `requestPayload` **is** provided, the client does `POST {requestEndpoint}/{requestId}` with that payload as JSON (custom request config flow).
- Verification is posted to `responseEndpoint` with `{ credential, requestId }`.

## Errors
Throws `CredentialFlowError` with:
- `stage: 'request' | 'dc-api' | 'verification' | 'network' | 'unexpected'`
- message and optional `cause`
