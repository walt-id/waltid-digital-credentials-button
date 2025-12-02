export type RequestCredentialOptions = {
  requestId?: string;
  requestPayload?: unknown;
  requestEndpoint?: string;
  responseEndpoint?: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
};

export type CredentialFlowResult = {
  request: unknown;
  dcResponse: unknown;
  verification: unknown;
};

export type CredentialFlowErrorStage = 'request' | 'dc-api' | 'verification' | 'network' | 'unexpected';

export class CredentialFlowError extends Error {
  stage: CredentialFlowErrorStage;
  cause?: unknown;

  constructor(stage: CredentialFlowErrorStage, message: string, cause?: unknown) {
    super(message);
    this.stage = stage;
    this.cause = cause;
  }
}

const DEFAULT_REQUEST_ID = 'unsigned-mdl';

/**
 * End-to-end Digital Credentials flow: fetch request, call DC API, post verification.
 */
export async function requestCredential(options: RequestCredentialOptions): Promise<CredentialFlowResult> {
  const requestId = resolveRequestId(options.requestId);
  const requestEndpoint = options.requestEndpoint ? options.requestEndpoint.replace(/\/$/, '') : '/api/dc/request';
  const responseEndpoint = options.responseEndpoint ?? '/api/dc/response';
  const fetchFn = options.fetchImpl ?? fetch;

  const requestPayload = await resolveRequestPayload({
    fetchFn,
    requestEndpoint,
    requestId,
    headers: options.headers,
    providedPayload: options.requestPayload
  });
  const dcResponse = await invokeDigitalCredentialsApi(requestPayload);
  const verification = await postVerification(
    fetchFn,
    responseEndpoint,
    requestId,
    dcResponse,
    options.headers
  );

  return { request: requestPayload, dcResponse, verification };
}

async function resolveRequestPayload(options: {
  fetchFn: typeof fetch;
  requestEndpoint: string;
  requestId: string;
  headers?: Record<string, string>;
  providedPayload?: unknown;
}): Promise<unknown> {
  const { fetchFn, requestEndpoint, requestId, headers = {}, providedPayload } = options;

  if (providedPayload !== undefined) {
    if (providedPayload === null) {
      throw new CredentialFlowError('request', 'Request payload is required but was null.');
    }
    if (typeof providedPayload !== 'object') {
      throw new CredentialFlowError('request', 'Request payload must be an object.');
    }
    return providedPayload;
  }

  if (!requestEndpoint) {
    throw new CredentialFlowError('request', 'request-endpoint is required when no request-payload is provided.');
  }

  const payload = await fetchRequestPayload(fetchFn, requestEndpoint, requestId, headers);
  if (payload === null || payload === undefined) {
    throw new CredentialFlowError('request', 'Received empty DC request payload.');
  }
  if (typeof payload !== 'object') {
    throw new CredentialFlowError('request', 'DC request payload must be an object.');
  }
  return payload;
}

async function fetchRequestPayload(
  fetchFn: typeof fetch,
  endpoint: string,
  requestId: string,
  headers: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(endpoint, window.location.origin);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${encodeURIComponent(requestId)}`;
  url.searchParams.set('request-id', requestId);

  let response: Response;
  try {
    response = await fetchFn(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json', ...headers },
      cache: 'no-store'
    });
  } catch (error) {
    throw new CredentialFlowError('network', 'Failed to fetch DC request', error);
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw new CredentialFlowError('request', 'Failed to read DC request response', error);
  }

  if (!response.ok) {
    throw new CredentialFlowError('request', `Failed to fetch DC request (${response.status})`, text);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    throw new CredentialFlowError('request', 'Failed to parse DC request JSON', error);
  }
}

async function invokeDigitalCredentialsApi(requestPayload: unknown): Promise<unknown> {
  const nav = navigator as unknown as { credentials?: { get?: (opts: unknown) => Promise<unknown> } };
  if (!nav.credentials?.get) {
    throw new CredentialFlowError('dc-api', 'Digital Credentials API is unavailable in this browser.');
  }

  try {
    const result = await nav.credentials.get(requestPayload as any);
    if (result == null) {
      throw new CredentialFlowError('dc-api', 'Digital Credentials API returned empty response.');
    }
    return result;
  } catch (error) {
    if (error instanceof CredentialFlowError) {
      throw error;
    }
    throw new CredentialFlowError('dc-api', 'Digital Credentials API call failed.', error);
  }
}

async function postVerification(
  fetchFn: typeof fetch,
  endpoint: string,
  requestId: string,
  dcResponse: unknown,
  headers: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set('request-id', requestId);

  let response: Response;
  try {
    response = await fetchFn(url.toString(), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ credential: dcResponse, requestId })
    });
  } catch (error) {
    throw new CredentialFlowError('network', 'Verification request failed to send', error);
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw new CredentialFlowError('verification', 'Failed to read verification response', error);
  }

  if (!response.ok) {
    throw new CredentialFlowError('verification', text || `Verification failed (${response.status})`);
  }

  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function resolveRequestId(explicit?: string): string {
  if (explicit && explicit.trim()) return explicit;
  if (typeof window !== 'undefined' && window.location?.href) {
    try {
      const fromUrl = new URL(window.location.href).searchParams.get('request-id');
      if (fromUrl && fromUrl.trim()) return fromUrl;
    } catch {
      // ignore URL parsing errors
    }
  }
  return DEFAULT_REQUEST_ID;
}
