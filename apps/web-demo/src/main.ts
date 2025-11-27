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
  const dlAge = document.getElementById('dl-age-over-21');
  const dlIssuer = document.getElementById('dl-issuer');

  installMocks();
  enableFetchLogging();
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
        const requestId = (event as CustomEvent).detail?.requestId ?? REQUEST_ID;
        logLineWithConsole(`[started] credential-request-started (${requestId})`);
        console.log('checking DC API support.digital-credentials ...');
        maybeLogUnsupported();
      });
      dcButton.addEventListener('credential-request-loaded', (event) =>
        logJsonWithConsole('Digital Credentials API request loaded', (event as CustomEvent).detail?.payload)
      );
      dcButton.addEventListener('credential-dcapi-success', (event) => {
        logDcResponse((event as CustomEvent).detail?.response);
        logLineWithConsole('DC API succeeded; sending response for verification...');
      });
      dcButton.addEventListener('credential-dcapi-error', (event) =>
        logJsonWithConsole('[error:dc-api]', (event as CustomEvent).detail?.error)
      );
      dcButton.addEventListener('credential-verification-success', (event) =>
        handleVerificationSuccess((event as CustomEvent).detail?.response)
      );
      dcButton.addEventListener('credential-verification-error', (event) =>
        logJsonWithConsole('[error:verification]', (event as CustomEvent).detail?.error)
      );
      dcButton.addEventListener('credential-error', (event) =>
        logJsonWithConsole('[error]', (event as CustomEvent).detail)
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

  function logLineWithConsole(message: string): void {
    console.log('[dc-demo]', message);
    logLine(message);
  }

  function logJson(label: string, payload: unknown): void {
    const pretty = JSON.stringify(payload, null, 2);
    logEntries.push(`${label}:\n${pretty}`);
    renderLog();
  }

  function logJsonWithConsole(label: string, payload: unknown): void {
    console.log('[dc-demo]', label, payload);
    logJson(label, payload);
  }

  function enableFetchLogging(): void {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const method = (init.method || 'GET').toUpperCase();
      const target = resolveUrl(input);
      const shouldLog =
        target.pathname.startsWith('/api/dc/') || target.pathname.includes('/verification-session/');

      if (shouldLog) {
        logLineWithConsole(`[fetch] ${method} ${target.pathname}${target.search}`);
        if (init.body) {
          const bodyText = await bodyToString(init.body);
          if (bodyText) logLineWithConsole(`[fetch] request body: ${bodyText} at ${input}`);
        }
      }

      try {
        const response = await originalFetch(input as any, init);
        if (shouldLog) {
          let responseText = '';
          try {
            responseText = await response.clone().text();
          } catch {
            // ignore
          }
          logLineWithConsole(
            `[fetch] response ${response.status} ${response.statusText || ''} for ${target.pathname}${target.search}`
          );
          if (responseText) {
            //logJsonWithConsole('[fetch] response body', safeParse(responseText));
          }
        }
        return response;
      } catch (error) {
        if (shouldLog) {
          logJsonWithConsole('[fetch] error', error);
        }
        throw error;
      }
    };

    function resolveUrl(input: RequestInfo | URL): URL {
      if (typeof input === 'string') return new URL(input, window.location.href);
      if (input && typeof input === 'object' && 'url' in input) {
        return new URL((input as Request).url, window.location.href);
      }
      return new URL(window.location.href);
    }

    async function bodyToString(body: BodyInit | null | undefined): Promise<string> {
      if (!body) return '';
      if (typeof body === 'string') return body;
      if (body instanceof Blob) return await body.text();
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
      logJsonWithConsole('Digital Credentials API response', response);
    } else {
      logJsonWithConsole('Digital Credentials API response', { hidden: true });
    }
  }

  function handleVerificationSuccess(response: unknown): void {
    logJsonWithConsole('Credential Verification response', response);
    if (getShowCredentialEnabled()) {
      showCredentialModal(response);
    }
  }

  function hasDcApiSupport(): boolean {
    console.log('[hasDcApiSupport] checking navigator.credentials.get and window.DigitalCredential...');
    const navHasGet =
      typeof (navigator as { credentials?: { get?: unknown } }).credentials?.get === 'function';
    const globalDigitalCredential =
      typeof (window as { DigitalCredential?: unknown }).DigitalCredential !== 'undefined';

    console.log('[hasDcApiSupport] navHasGet:', navHasGet, ', globalDigitalCredential:', globalDigitalCredential);
    return navHasGet || globalDigitalCredential;
  }

  function maybeLogUnsupported(): void {
    if (getMockEnabled()) return;
    if (!hasDcApiSupport()) {
      logLine(
        '[error:dc-api] Digital Credentials API is not available in this browser. Please switch to a compatible browser or enable mock mode.'
      );
    }
  }

  function showCredentialModal(data: unknown): void {
    if (!modalBackdrop || !dlFirst || !dlFamily || !dlAge || !dlIssuer) return;
    const cred = extractFirstCredential(data);
    dlFirst.textContent = cred.givenName || '—';
    dlFamily.textContent = cred.familyName || '—';
    if (typeof cred.ageOver21 === 'boolean') {
      dlAge.textContent = cred.ageOver21 ? 'Yes' : 'No';
    } else {
      dlAge.textContent = '—';
    }
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
    ageOver21?: boolean;
    issuer?: string;
  };

  function extractFirstCredential(input: unknown): MinimalCredential {
    if (!input || typeof input !== 'object') return {};
    const presented = extractFromPresentedCredentials(input);
    if (presented) return presented;

    const asObj = input as { credentials?: unknown };
    const cred = Array.isArray(asObj.credentials) ? asObj.credentials[0] : (input as any);
    if (!cred || typeof cred !== 'object') return {};
    const claims = (cred as any).claims || {};
    return {
      givenName: claims['given_name']?.value ?? claims['given_name'] ?? undefined,
      familyName: claims['family_name']?.value ?? claims['family_name'] ?? undefined,
      issuer: (cred as any).issuerInfo?.commonName || (cred as any).issuer || undefined
    };
  }

  function extractFromPresentedCredentials(input: unknown): MinimalCredential | null {
    const data = input as {
      presentedCredentials?: { my_mdl?: Array<{ credentialData?: Record<string, unknown> }> };
    };
    const first = Array.isArray(data.presentedCredentials?.my_mdl)
      ? data.presentedCredentials?.my_mdl[0]
      : undefined;
    const isoData = first?.credentialData?.['org.iso.18013.5.1'];
    if (!isoData || typeof isoData !== 'object') return null;
    const claims = isoData as Record<string, unknown>;
    const ageRaw = claims['age_over_21'] ?? claims['ageOver21'];

    return {
      givenName: (claims['given_name'] ?? claims['givenName']) as string | undefined,
      familyName: (claims['family_name'] ?? claims['familyName']) as string | undefined,
      ageOver21: typeof ageRaw === 'boolean' ? ageRaw : undefined
    };
  }
}
