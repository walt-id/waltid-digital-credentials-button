export type RequestCredentialOptions = {
  requestId: string;
  requestEndpoint?: string;
  responseEndpoint?: string;
  mock?: boolean;
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

/**
 * End-to-end Digital Credentials flow: fetch request, call DC API, post verification.
 */
export async function requestCredential(options: RequestCredentialOptions): Promise<CredentialFlowResult> {
  const requestEndpoint = (options.requestEndpoint ?? '/api/dc/request').replace(/\/$/, '');
  const responseEndpoint = options.responseEndpoint ?? '/api/dc/response';
  const mock = Boolean(options.mock);
  const fetchFn = options.fetchImpl ?? fetch;

  const requestPayload = await fetchRequestPayload(
    fetchFn,
    requestEndpoint,
    options.requestId,
    options.headers,
    mock
  );
  const dcResponse = await invokeDigitalCredentialsApi(requestPayload);
  const verification = await postVerification(
    fetchFn,
    responseEndpoint,
    options.requestId,
    dcResponse,
    options.headers,
    mock
  );

  return { request: requestPayload, dcResponse, verification };
}

async function fetchRequestPayload(
  fetchFn: typeof fetch,
  endpoint: string,
  requestId: string,
  headers: Record<string, string> = {},
  mock: boolean
): Promise<unknown> {
  const url = new URL(endpoint, window.location.origin);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${encodeURIComponent(requestId)}`;
  url.searchParams.set('request-id', requestId);
  if (mock) url.searchParams.set('dc-mock', '1');

  let response: Response;
  try {
    response = await fetchFn(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json', ...headers, 'x-dc-mock': mock ? '1' : '0' },
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
  headers: Record<string, string> = {},
  mock: boolean
): Promise<unknown> {
  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set('request-id', requestId);
  if (mock) url.searchParams.set('dc-mock', '1');

  let response: Response;
  try {
    response = await fetchFn(url.toString(), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...headers,
        'x-dc-mock': mock ? '1' : '0'
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
