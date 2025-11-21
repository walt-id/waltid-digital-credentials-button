import {
  installMocks,
  CONFIG_ENDPOINT,
  RESPONSE_ENDPOINT,
  MOCK_FLAG_KEY
} from '@waltid/dc-mock-utils/install-mocks';
import dcApiMockResponse from '../../../fixtures/unsigned-mdl-response.json' assert { type: 'json' };
import './style.css';

const CONFIGURATION_ID = 'unsigned-mdl';
const logEl = document.getElementById('log') as HTMLPreElement | null;
const btn = document.getElementById('demo-btn') as HTMLButtonElement | null;
const mockStatus = document.getElementById('mock-status');
const mockToggle = document.getElementById('mock-toggle');
const logEntries: string[] = [];

installMocks();

btn?.addEventListener('click', async () => {
  const mockEnabled = getMockEnabled();
  setLoading(true);
  logLine('[started] credential-request-started');

  try {
    const dcRequest = await fetchDcRequest(CONFIGURATION_ID, mockEnabled);
    logJson('Digital Credentials API request', dcRequest);

    const dcResponse = mockEnabled ? clone(dcApiMockResponse) : await requestCredential(dcRequest);
    logJson('Digital Credentials API response', dcResponse);

    const verification = await postCredential(dcResponse, mockEnabled);
    logJson('Credential Verification response', verification);
  } catch (error) {
    if (!getMockEnabled()) {
      console.error('[dc][error]', error);
    }
    logJson('[error]', normalizeError(error));
  } finally {
    setLoading(false);
  }
});

function setLoading(next: boolean): void {
  if (!btn) return;
  btn.disabled = next;
  btn.textContent = next ? 'Requesting…' : 'Request credentials';
}

async function fetchDcRequest(configId: string, mockEnabled: boolean): Promise<unknown> {
  const url = withMockFlag(new URL(`${CONFIG_ENDPOINT}/${configId}`, window.location.origin), mockEnabled);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-dc-mock': mockEnabled ? '1' : '0'
    }
  });

  const text = await response.text();
  if (!mockEnabled) {
    console.info('[dc][request] GET config', { url: url.toString() });
    console.info('[dc][response] GET config', safeParse(text));
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch DC request (${response.status})`);
  }
  return text ? safeParse(text) : null;
}

async function requestCredential(dcRequest: unknown): Promise<unknown> {
  const nav = navigator as unknown as { credentials?: { get?: (opts: unknown) => Promise<unknown> } };
  if (!nav.credentials?.get) {
    throw new Error('Digital Credentials API is unavailable in this browser.');
  }
  return nav.credentials.get(dcRequest as any);
}

async function postCredential(dcResponse: unknown, mockEnabled: boolean): Promise<unknown> {
  const url = withMockFlag(new URL(RESPONSE_ENDPOINT, window.location.origin), mockEnabled);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-dc-mock': mockEnabled ? '1' : '0'
    },
    body: JSON.stringify({ credential: dcResponse })
  });

  const text = await response.text();
  if (!mockEnabled) {
    console.info('[dc][request] POST verification', {
      url: url.toString(),
      body: { credential: dcResponse }
    });
    console.info('[dc][response] POST verification', safeParse(text));
  }

  if (!response.ok) {
    throw new Error(text || `Backend verification failed (${response.status})`);
  }

  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function withMockFlag(url: URL, mockEnabled: boolean): string {
  if (mockEnabled) {
    url.searchParams.set('dc-mock', '1');
  }
  return url.toString();
}

const renderLog = () => {
  if (!logEl) return;
  logEl.textContent = logEntries.length ? logEntries.join('\n\n') : '(click the button to start)';
};

const logLine = (message: string) => {
  logEntries.push(message);
  renderLog();
};

const logJson = (label: string, payload: unknown) => {
  const pretty = JSON.stringify(payload, null, 2);
  logEntries.push(`${label}:\n${pretty}`);
  renderLog();
};

function getMockEnabled(): boolean {
  return localStorage.getItem(MOCK_FLAG_KEY) === 'true';
}

function setMockEnabled(next: boolean): void {
  localStorage.setItem(MOCK_FLAG_KEY, String(next));
  const url = new URL(window.location.href);
  url.searchParams.set('dc-mock', next ? '1' : '0');
  window.location.assign(url.toString());
}

function renderMockStatus(): void {
  if (!mockStatus || !mockToggle) return;
  const enabled = getMockEnabled();
  mockStatus.textContent = enabled ? 'ON' : 'OFF';
  mockStatus.style.color = enabled ? '#16a34a' : '#dc2626';
  mockToggle.textContent = enabled ? 'Disable' : 'Enable';
}

if (mockToggle) {
  mockToggle.addEventListener('click', () => {
    setMockEnabled(!getMockEnabled());
  });
}

renderLog();
renderMockStatus();

function normalizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { error };
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // fall through
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
