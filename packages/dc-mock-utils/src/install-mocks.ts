import unsignedMdlRequest from '../../../fixtures/unsigned-mdl-request.json' assert { type: 'json' };
import unsignedMdlResponse from '../../../fixtures/unsigned-mdl-response.json' assert { type: 'json' };
import unsignedMdlVerified from '../../../fixtures/unsigned-mdl-verified.json' assert { type: 'json' };
import signedMdlRequest from '../../../fixtures/signed-mdl-request.json' assert { type: 'json' };
import signedMdlResponse from '../../../fixtures/signed-mdl-response.json' assert { type: 'json' };
import signedMdlVerified from '../../../fixtures/signed-mdl-verified.json' assert { type: 'json' };
import unsignedPhotoRequest from '../../../fixtures/unsigned-photoid-request.json' assert { type: 'json' };
import unsignedPhotoResponse from '../../../fixtures/unsigned-photoid-response.json' assert { type: 'json' };
import unsignedPhotoVerified from '../../../fixtures/unsigned-photoid-verified.json' assert { type: 'json' };
import signedPhotoRequest from '../../../fixtures/signed-photoid-request.json' assert { type: 'json' };
import signedPhotoResponse from '../../../fixtures/signed-photoid-response.json' assert { type: 'json' };
import signedPhotoVerified from '../../../fixtures/signed-photoid-verified.json' assert { type: 'json' };

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
    const requestId = getRequestId(target);
    const fixtures = pickFixtures(requestId);

    const mockResponse = method === 'GET' && target.pathname.startsWith(REQUEST_ENDPOINT);
    if (mockResponse) {
      return jsonResponse(fixtures.request);
    }
    const isResponseEndpoint =
      target.pathname.startsWith(RESPONSE_ENDPOINT) || target.pathname.startsWith(REQUEST_ENDPOINT);
    if (isResponseEndpoint && method !== 'GET') {
      return jsonResponse({
        ...(fixtures.verified as Record<string, unknown>),
        success: (fixtures.verified as Record<string, unknown>)?.success ?? true
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

function getRequestId(url: URL): string {
  const fromQuery = url.searchParams.get('request-id') || url.searchParams.get('requestId');
  if (fromQuery) return fromQuery;

  if (url.pathname.startsWith(REQUEST_ENDPOINT)) {
    const suffix = url.pathname.replace(REQUEST_ENDPOINT, '');
    const parts = suffix.split('/').filter(Boolean);
    if (parts[0]) return parts[0];
  }

  return 'unsigned-mdl';
}

function pickFixtures(requestId: string): {
  request: unknown;
  response: unknown;
  verified: unknown;
} {
  const map: Record<string, { request: unknown; response: unknown; verified: unknown }> = {
    'unsigned-mdl': {
      request: unsignedMdlRequest,
      response: unsignedMdlResponse,
      verified: unsignedMdlVerified
    },
    'signed-mdl': {
      request: signedMdlRequest,
      response: signedMdlResponse,
      verified: signedMdlVerified
    },
    'unsigned-photoid': {
      request: unsignedPhotoRequest,
      response: unsignedPhotoResponse,
      verified: unsignedPhotoVerified
    },
    'signed-photoid': {
      request: signedPhotoRequest,
      response: signedPhotoResponse,
      verified: signedPhotoVerified
    }
  };

  return map[requestId] ?? map['unsigned-mdl'];
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
    const target = new URL(window.location.href);
    const fixtures = pickFixtures(getRequestId(target));
    console.info(
      '[dc-mock] Using stubbed navigator.credentials.get with payload from mock response',
      options
    );
    await wait(200);
    return structuredCloneOrDefault(fixtures.response);
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
