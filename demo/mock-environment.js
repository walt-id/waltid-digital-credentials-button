import configPayload from '../direct-unsigned-mdl-request.json';
import dcApiResponse from '../mdl-unsigned-response.json';
import backendResponse from '../mattr-response.json';

const CONFIG_ENDPOINT = '/api/dc/config';
const MOCK_FLAG_KEY = 'dc-mock-enabled';

const mockEnabled = getMockEnabled();

if (!mockEnabled) {
  console.info('[dc-mock] Disabled. Use ?dc-mock=1 or set localStorage dc-mock-enabled=true to enable.');
} else {
  console.info('[dc-mock] Enabled. Backend + DC API calls are mocked.');
  installMocks();
}

function installMocks() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const target = resolveUrl(input);

    if (target.pathname === CONFIG_ENDPOINT && method === 'GET') {
      return jsonResponse(configPayload);
    }

    if (target.pathname === CONFIG_ENDPOINT && method !== 'GET') {
      const bodyText = await readBody(init.body);
      const body = bodyText ? safeParse(bodyText) : null;
      return jsonResponse({
        ...backendResponse,
        success: backendResponse?.success ?? true,
        echo: body
      });
    }

    return originalFetch(input, init);
  };

  ensureMockedCredentialsGet();
}

function getMockEnabled() {
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

function isTruthy(value) {
  if (value === null) return true;
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on' || normalized === '';
}

function resolveUrl(input) {
  if (typeof input === 'string') {
    return new URL(input, window.location.href);
  }
  if (input && typeof input === 'object' && 'url' in input) {
    return new URL(input.url, window.location.href);
  }
  return new URL(window.location.href);
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function readBody(body) {
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
    const payload = {};
    for (const [key, value] of body.entries()) {
      payload[key] = value;
    }
    return JSON.stringify(payload);
  }
  return '';
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function structuredCloneOrDefault(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (_) {
      // Fall through.
    }
  }
  return JSON.parse(JSON.stringify(value));
}

function ensureMockedCredentialsGet() {
  const mockGet = async (options) => {
    console.info('[dc-mock] Using stubbed navigator.credentials.get with payload from mdl-unsigned-response.json', options);
    await wait(200);
    return structuredCloneOrDefault(dcApiResponse);
  };

  try {
    const creds = navigator.credentials;
    if (creds && typeof creds === 'object') {
      try {
        // Direct assignment (works in many browsers)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        creds.get = mockGet;
        return;
      } catch (_) {
        // Try defineProperty if assignment is disallowed.
      }
      try {
        Object.defineProperty(creds, 'get', {
          value: mockGet,
          writable: true,
          configurable: true
        });
        return;
      } catch (_) {
        // Fall through to defining the credentials object itself.
      }
    }

    Object.defineProperty(navigator, 'credentials', {
      value: { get: mockGet },
      configurable: true
    });
  } catch (error) {
    console.warn('[dc-mock] Unable to stub navigator.credentials.get; Digital Credentials API may still be required.', error);
  }
}
