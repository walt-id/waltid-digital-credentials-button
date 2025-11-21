import configPayload from '../../../fixtures/unsigned-mdl-request.json' assert { type: 'json' };
import dcApiResponse from '../../../fixtures/unsigned-mdl-response.json' assert { type: 'json' };
import backendResponse from '../../../fixtures/unsigned-mdl-verified.json' assert { type: 'json' };

export const REQUEST_ENDPOINT = '/api/dc/request';
export const RESPONSE_ENDPOINT = '/api/dc/response';
export const MOCK_FLAG_KEY = 'dc-mock-enabled';

type FetchInput = RequestInfo | URL;

export function installMocks(): void {
  const mockEnabled = getMockEnabled();

  if (!mockEnabled) {
    console.info(
      '[dc-mock] Disabled. Use ?dc-mock=1 or set localStorage dc-mock-enabled=true to enable.'
    );
    return;
  }

  console.info('[dc-mock] Enabled. Backend + DC API calls are mocked.');
  patchFetch();
  ensureMockedCredentialsGet();
}

function patchFetch(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: FetchInput, init: RequestInit = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const target = resolveUrl(input);
    const mockResponse = method === 'GET' && target.pathname.startsWith(REQUEST_ENDPOINT);
    if (mockResponse) {
      return jsonResponse(configPayload);
    }
    const isResponseEndpoint =
      target.pathname.startsWith(RESPONSE_ENDPOINT) || target.pathname.startsWith(REQUEST_ENDPOINT);
    if (isResponseEndpoint && method !== 'GET') {
      const bodyText = await readBody(init.body);
      const body = bodyText ? safeParse(bodyText) : null;
      return jsonResponse({
        ...(backendResponse as Record<string, unknown>),
        success: (backendResponse as Record<string, unknown>)?.success ?? true,
        echo: body
      });
    }

    return originalFetch(input, init);
  };
}

function getMockEnabled(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.has('dc-mock')) {
    const raw = params.get('dc-mock');
    const enabled = isTruthy(raw);
    localStorage.setItem(MOCK_FLAG_KEY, String(enabled));
    return enabled;
  }
  const stored = localStorage.getItem(MOCK_FLAG_KEY);
  return stored === 'true';
}

function isTruthy(value: string | null): boolean {
  if (value === null) return true;
  const normalized = String(value).toLowerCase();
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on' ||
    normalized === ''
  );
}

function resolveUrl(input: FetchInput): URL {
  if (typeof input === 'string') {
    return new URL(input, window.location.href);
  }
  if (input && typeof input === 'object' && 'url' in input) {
    return new URL((input as Request).url, window.location.href);
  }
  return new URL(window.location.href);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function readBody(body: BodyInit | null | undefined): Promise<string> {
  if (!body) {
    return '';
  }
  if (typeof body === 'string') {
    return body;
  }
  if (body instanceof Blob) {
    return await body.text();
  }
  if (body instanceof FormData) {
    const payload: Record<string, unknown> = {};
    for (const [key, value] of body.entries()) {
      payload[key] = value;
    }
    return JSON.stringify(payload);
  }
  return '';
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function structuredCloneOrDefault<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureMockedCredentialsGet(): void {
  const mockGet = async (options: CredentialRequestOptions | undefined) => {
    console.info(
      '[dc-mock] Using stubbed navigator.credentials.get with payload from unsigned-mdl-response.json',
      options
    );
    await wait(200);
    return structuredCloneOrDefault(dcApiResponse);
  };

  try {
    const creds = navigator.credentials as CredentialsContainer & {
      get?: (options?: CredentialRequestOptions) => Promise<unknown>;
    };

    if (creds && typeof creds === 'object') {
      try {
        // Direct assignment (works in many browsers)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        creds.get = mockGet;
        return;
      } catch {
        // Try defineProperty if assignment is disallowed.
      }
      try {
        Object.defineProperty(creds, 'get', {
          value: mockGet,
          writable: true,
          configurable: true
        });
        return;
      } catch {
        // Fall through to defining the credentials object itself.
      }
    }

    Object.defineProperty(navigator, 'credentials', {
      value: { get: mockGet },
      configurable: true
    });
  } catch (error) {
    console.warn(
      '[dc-mock] Unable to stub navigator.credentials.get; Digital Credentials API may still be required.',
      error
    );
  }
}
