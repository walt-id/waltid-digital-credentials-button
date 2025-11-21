import '@waltid/digital-credentials';
import { installMocks, REQUEST_ENDPOINT, RESPONSE_ENDPOINT, MOCK_FLAG_KEY } from '@waltid/dc-mock-utils/install-mocks';
import './style.css';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init(): void {
  const urlState = new URL(window.location.href);
  let REQUEST_ID = urlState.searchParams.get('request-id') || 'unsigned-mdl';
  resolveInitialMock();

  const logEntries: string[] = [];
  const logEl = document.getElementById('log') as HTMLPreElement | null;
  const dcButton = document.getElementById('demo-btn') as HTMLElement | null;
  const mockToggle = document.getElementById('mock-toggle') as HTMLInputElement | null;
  const requestSelect = document.getElementById('request-select') as HTMLSelectElement | null;
  const clearLogBtn = document.getElementById('clear-log') as HTMLButtonElement | null;
  const showCredentialToggle = document.getElementById('show-credential-toggle') as HTMLInputElement | null;
  const modalBackdrop = document.getElementById('credential-modal-backdrop') as HTMLElement | null;
  const modalClose = document.getElementById('modal-close') as HTMLButtonElement | null;
  const dlFirst = document.getElementById('dl-first-name');
  const dlFamily = document.getElementById('dl-family-name');
  const dlDate = document.getElementById('dl-date');
  const dlIssuer = document.getElementById('dl-issuer');

  installMocks();
  primeButton();
  renderLog();
  wireEvents();

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
      dcButton.addEventListener('credential-request-started', (event) => {
        hideCredentialModal();
        logLine(
          `[started] credential-request-started (${(event as CustomEvent).detail?.requestId ?? REQUEST_ID})`
        );
      });
      dcButton.addEventListener('credential-request-loaded', (event) =>
        logJson('Digital Credentials API request', (event as CustomEvent).detail?.payload)
      );
      dcButton.addEventListener('credential-dcapi-success', (event) =>
        logDcResponse((event as CustomEvent).detail?.response)
      );
      dcButton.addEventListener('credential-dcapi-error', (event) =>
        logJson('[error:dc-api]', (event as CustomEvent).detail?.error)
      );
      dcButton.addEventListener('credential-verification-success', (event) =>
        handleVerificationSuccess((event as CustomEvent).detail?.response)
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

    if (showCredentialToggle) {
      showCredentialToggle.checked = getShowCredentialEnabled();
      showCredentialToggle.addEventListener('change', () => {
        setShowCredentialEnabled(showCredentialToggle.checked);
        logLine(`[info] credential visibility ${showCredentialToggle.checked ? 'enabled' : 'disabled'}`);
      });
    }

    if (modalClose && modalBackdrop) {
      const closeModal = () => hideCredentialModal();
      modalClose.addEventListener('click', closeModal);
      modalBackdrop.addEventListener('click', (event) => {
        if (event.target === modalBackdrop) {
          closeModal();
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeModal();
        }
      });
    }
  }

  function renderLog(): void {
    if (!logEl) return;
    logEl.textContent = logEntries.length ? logEntries.join('\n\n') : '(click the button to start)';
  }

  function logLine(message: string): void {
    logEntries.push(message);
    renderLog();
  }

  function logJson(label: string, payload: unknown): void {
    const pretty = JSON.stringify(payload, null, 2);
    logEntries.push(`${label}:\n${pretty}`);
    renderLog();
  }

  function getMockEnabled(): boolean {
    return localStorage.getItem(MOCK_FLAG_KEY) === 'true';
  }

  function setMockEnabled(next: boolean): void {
    localStorage.setItem(MOCK_FLAG_KEY, String(next));
    syncMockParam(next);
    window.location.reload();
  }

  function getShowCredentialEnabled(): boolean {
    const stored = localStorage.getItem('dc-show-credential');
    if (stored === null) {
      localStorage.setItem('dc-show-credential', 'true');
      return true;
    }
    return stored === 'true';
  }

  function setShowCredentialEnabled(next: boolean): void {
    localStorage.setItem('dc-show-credential', String(next));
  }

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

  function logDcResponse(response: unknown): void {
    if (getShowCredentialEnabled()) {
      logJson('Digital Credentials API response', response);
    } else {
      logJson('Digital Credentials API response', { hidden: true });
    }
  }

  function handleVerificationSuccess(response: unknown): void {
    logJson('Credential Verification response', response);
    if (getShowCredentialEnabled()) {
      showCredentialModal(response);
    }
  }

  function showCredentialModal(data: unknown): void {
    if (!modalBackdrop || !dlFirst || !dlFamily || !dlDate || !dlIssuer) return;
    const cred = extractFirstCredential(data);
    dlFirst.textContent = cred.givenName || '—';
    dlFamily.textContent = cred.familyName || '—';
    dlDate.textContent = cred.date || '—';
    dlIssuer.textContent = `Issuer: ${cred.issuer || '—'}`;
    modalBackdrop.hidden = false;
    modalBackdrop.style.display = 'flex';
  }

  function hideCredentialModal(): void {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
    modalBackdrop.style.display = 'none';
  }

  type MinimalCredential = {
    givenName?: string;
    familyName?: string;
    date?: string;
    issuer?: string;
  };

  function extractFirstCredential(input: unknown): MinimalCredential {
    if (!input || typeof input !== 'object') return {};
    const asObj = input as { credentials?: unknown };
    const cred = Array.isArray(asObj.credentials) ? asObj.credentials[0] : (input as any);
    if (!cred || typeof cred !== 'object') return {};
    const claims = (cred as any).claims || {};
    return {
      givenName: claims['given_name']?.value ?? claims['given_name'] ?? undefined,
      familyName: claims['family_name']?.value ?? claims['family_name'] ?? undefined,
      date: claims['date_of_birth']?.value ?? claims['date_of_birth'] ?? undefined,
      issuer: (cred as any).issuerInfo?.commonName || (cred as any).issuer || undefined
    };
  }
}
