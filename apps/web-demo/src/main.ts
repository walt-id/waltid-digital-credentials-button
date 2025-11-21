import '@waltid/digital-credentials';
import { installMocks, REQUEST_ENDPOINT, RESPONSE_ENDPOINT, MOCK_FLAG_KEY } from '@waltid/dc-mock-utils/install-mocks';
import './style.css';

const urlState = new URL(window.location.href);
let REQUEST_ID = urlState.searchParams.get('request-id') || 'unsigned-mdl';
const initialMock = resolveInitialMock();

const logEl = document.getElementById('log') as HTMLPreElement | null;
const dcButton = document.getElementById('demo-btn') as HTMLElement | null;
const mockStatus = document.getElementById('mock-status');
const mockToggle = document.getElementById('mock-toggle') as HTMLInputElement | null;
const requestSelect = document.getElementById('request-select') as HTMLSelectElement | null;
const clearLogBtn = document.getElementById('clear-log') as HTMLButtonElement | null;
const logEntries: string[] = [];

function primeButton(): void {
  if (!dcButton) return;
  dcButton.setAttribute('request-id', REQUEST_ID);
  dcButton.setAttribute('request-endpoint', REQUEST_ENDPOINT);
  dcButton.setAttribute('response-endpoint', RESPONSE_ENDPOINT);
  const mockOn = getMockEnabled();
  if (mockOn) {
    dcButton.setAttribute('mock', 'true');
  } else {
    dcButton.removeAttribute('mock');
  }
}

function wireEvents(): void {
  if (dcButton) {
    dcButton.addEventListener('credential-request-started', (event) =>
      logLine(`[started] credential-request-started (${(event as CustomEvent).detail?.requestId ?? REQUEST_ID})`)
    );
    dcButton.addEventListener('credential-request-loaded', (event) =>
      logJson('Digital Credentials API request', (event as CustomEvent).detail?.payload)
    );
    dcButton.addEventListener('credential-dcapi-success', (event) =>
      logJson('Digital Credentials API response', (event as CustomEvent).detail?.response)
    );
    dcButton.addEventListener('credential-dcapi-error', (event) =>
      logJson('[error:dc-api]', (event as CustomEvent).detail?.error)
    );
    dcButton.addEventListener('credential-verification-success', (event) =>
      logJson('Credential Verification response', (event as CustomEvent).detail?.response)
    );
    dcButton.addEventListener('credential-verification-error', (event) =>
      logJson('[error:verification]', (event as CustomEvent).detail?.error)
    );
    dcButton.addEventListener('credential-error', (event) =>
      logJson('[error]', (event as CustomEvent).detail)
    );
  }

  if (mockToggle) {
    mockToggle.checked = getMockEnabled();
    mockToggle.addEventListener('change', () => {
      setMockEnabled(mockToggle.checked);
      primeButton();
      renderMockStatus();
    });
  }

  if (requestSelect) {
    requestSelect.value = REQUEST_ID;
    requestSelect.addEventListener('change', () => {
      REQUEST_ID = requestSelect.value;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('request-id', REQUEST_ID);
      window.history.replaceState({}, '', nextUrl.toString());
      primeButton();
      logLine(`[info] switched request-id to ${REQUEST_ID}`);
    });
  }

  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      logEntries.length = 0;
      renderLog();
    });
  }
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
  syncMockParam(next);
}

function renderMockStatus(): void {
  if (!mockStatus || !mockToggle) return;
  const enabled = getMockEnabled();
  mockStatus.textContent = enabled ? 'ON' : 'OFF';
  mockStatus.style.color = enabled ? '#16a34a' : '#dc2626';
}

installMocks();
primeButton();
renderLog();
renderMockStatus();
wireEvents();

function resolveInitialMock(): boolean {
  const url = new URL(window.location.href);
  const param = url.searchParams.get('dc-mock');
  if (param !== null) {
    const enabled = param === '1' || param.toLowerCase() === 'true';
    localStorage.setItem(MOCK_FLAG_KEY, String(enabled));
    return enabled;
  }
  const stored = localStorage.getItem(MOCK_FLAG_KEY);
  const enabled = stored === 'true';
  localStorage.setItem(MOCK_FLAG_KEY, String(enabled));
  return enabled;
}

function syncMockParam(enabled: boolean): void {
  const url = new URL(window.location.href);
  url.searchParams.set('dc-mock', enabled ? '1' : '0');
  window.history.replaceState({}, '', url.toString());
}
