import '@waltid/digital-credentials';
import './style.css';

const REQUEST_LIST_ENDPOINT = '/api/dc/requests';
const REQUEST_ENDPOINT = '/api/dc/request';
const RESPONSE_ENDPOINT = '/api/dc/response';
const DEFAULT_REQUEST_ID = 'unsigned-mdl';

type MinimalCredential = {
  givenName?: string;
  familyName?: string;
  ageOver21?: boolean;
  issuer?: string;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void init().catch(handleInitError));
} else {
  void init().catch(handleInitError);
}

async function init(): Promise<void> {
  const logEntries: string[] = [];
  const logEl = document.getElementById('log') as HTMLPreElement | null;
  const dcButton = document.getElementById('demo-btn') as HTMLElement | null;
  const requestSelect = document.getElementById('request-select') as HTMLSelectElement | null;
  const clearLogBtn = document.getElementById('clear-log') as HTMLButtonElement | null;
  const customizeBtn = document.getElementById('customize-request') as HTMLButtonElement | null;
  const customizeModal = document.getElementById('customize-modal-backdrop') as HTMLElement | null;
  const customizeClose = document.getElementById('customize-modal-close') as HTMLButtonElement | null;
  const customizeSave = document.getElementById('customize-save') as HTMLButtonElement | null;
  const customizeTextarea = document.getElementById('customize-textarea') as HTMLTextAreaElement | null;
  const customizeSubtitle = document.getElementById('customize-modal-subtitle') as HTMLDivElement | null;
  const showCredentialToggle = document.getElementById('show-credential-toggle') as HTMLInputElement | null;
  const modalBackdrop = document.getElementById('credential-modal-backdrop') as HTMLElement | null;
  const modalClose = document.getElementById('modal-close') as HTMLButtonElement | null;
  const dlFirst = document.getElementById('dl-first-name');
  const dlFamily = document.getElementById('dl-family-name');
  const dlAge = document.getElementById('dl-age-over-21');
  const dlIssuer = document.getElementById('dl-issuer');

  const urlState = new URL(window.location.href);
  let requestId = urlState.searchParams.get('request-id') || DEFAULT_REQUEST_ID;
  let customPayload: unknown = readCustomPayload(requestId);
  const fallbackRequestIds = getRequestIdsFromSelect();

  await loadRequestOptions(fallbackRequestIds);
  primeButton();
  renderLog();
  wireEvents();
  applyCustomPayload();

  function wireEvents(): void {
    if (dcButton) {
      dcButton.addEventListener('credential-request-started', () => {
        hideCredentialModal();
        logLine(`[${requestId}] credential request started`);
        maybeWarnUnsupported();
      });
      dcButton.addEventListener('credential-request-loaded', (event) =>
        logJson('Digital Credentials API request', (event as CustomEvent).detail?.payload)
      );
      dcButton.addEventListener('credential-dcapi-success', () =>
        logLine('Digital Credentials API returned a credential response')
      );
      dcButton.addEventListener('credential-dcapi-error', (event) =>
        logJson('Digital Credentials API error', (event as CustomEvent).detail?.error)
      );
      dcButton.addEventListener('credential-verification-success', (event) =>
        handleVerificationSuccess((event as CustomEvent).detail?.response)
      );
      dcButton.addEventListener('credential-verification-error', (event) =>
        logJson('Verification error', (event as CustomEvent).detail?.error)
      );
      dcButton.addEventListener('credential-error', (event) =>
        logJson('Flow error', (event as CustomEvent).detail)
      );
    }

    if (requestSelect) {
      requestSelect.value = requestId;
      requestSelect.addEventListener('change', () => {
        requestId = requestSelect.value;
        syncRequestIdToUrl(requestId);
        customPayload = readCustomPayload(requestId);
        applyCustomPayload();
        primeButton();
        logLine(`request-id set to ${requestId}`);
      });
    }

    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', () => {
        logEntries.length = 0;
        renderLog();
      });
    }

    if (customizeBtn) {
      customizeBtn.addEventListener('click', () => void openCustomizeModal());
    }

    if (customizeSave && customizeTextarea) {
      customizeSave.addEventListener('click', () => {
        const nextValue = customizeTextarea.value.trim();
        let parsed: unknown;
        try {
          parsed = nextValue ? JSON.parse(nextValue) : null;
        } catch (error) {
          alert('Invalid JSON. Please fix and try again.');
          console.error('Invalid custom request JSON', error);
          return;
        }

        if (parsed === null) {
          clearCustomPayload(requestId);
          customPayload = undefined;
          applyCustomPayload();
          closeCustomizeModal();
          logLine(`Custom payload cleared for ${requestId}`);
          return;
        }

        writeCustomPayload(requestId, parsed);
        customPayload = parsed;
        applyCustomPayload();
        closeCustomizeModal();
        logLine(`Custom payload saved for ${requestId}`);
      });
    }

    if (customizeClose) {
      customizeClose.addEventListener('click', () => closeCustomizeModal());
    }

    if (showCredentialToggle) {
      showCredentialToggle.checked = getShowCredentialEnabled();
      showCredentialToggle.addEventListener('change', () => {
        setShowCredentialEnabled(showCredentialToggle.checked);
      });
    }

    if (modalClose && modalBackdrop) {
      const close = () => hideCredentialModal();
      modalClose.addEventListener('click', close);
      modalBackdrop.addEventListener('click', (event) => {
        if (event.target === modalBackdrop) close();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
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

  function applyCustomPayload(): void {
    if (!dcButton) return;
    if (customPayload !== undefined) {
      dcButton.setAttribute('request-payload', JSON.stringify(customPayload));
      dcButton.setAttribute('data-has-custom-payload', 'true');
    } else {
      dcButton.removeAttribute('request-payload');
      dcButton.removeAttribute('data-has-custom-payload');
    }
  }

  async function loadRequestOptions(fallbackIds: string[]): Promise<void> {
    if (!requestSelect) return;

    const requestIds = await fetchRequestIds().catch((error) => {
      console.error('Failed to load request list; using fallback options', error);
      return [];
    });

    const idsToRender = requestIds.length ? requestIds : fallbackIds;
    if (!idsToRender.length) return;

    renderRequestOptions(idsToRender);

    if (!idsToRender.includes(requestId)) {
      requestId = idsToRender[0];
      syncRequestIdToUrl(requestId);
    }

    requestSelect.value = requestId;
    customPayload = readCustomPayload(requestId);
    applyCustomPayload();
  }

  async function fetchRequestIds(): Promise<string[]> {
    const response = await fetch(REQUEST_LIST_ENDPOINT, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Failed to load request list (${response.status})`);
    }

    const data = await response.json();
    const candidates = Array.isArray(data)
      ? data
      : Array.isArray((data as { requests?: unknown }).requests)
        ? (data as { requests: unknown[] }).requests
        : [];

    const normalized = candidates
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);

    return Array.from(new Set(normalized));
  }

  function renderRequestOptions(ids: string[]): void {
    if (!requestSelect) return;
    requestSelect.innerHTML = '';
    ids.forEach((id) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = id;
      requestSelect.appendChild(option);
    });
  }

  function getRequestIdsFromSelect(): string[] {
    if (!requestSelect) return [];
    return Array.from(requestSelect.options)
      .map((option) => option.value)
      .filter(Boolean);
  }

  function syncRequestIdToUrl(next: string): void {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('request-id', next);
    window.history.replaceState({}, '', nextUrl.toString());
  }

  async function openCustomizeModal(): Promise<void> {
    if (!customizeModal || !customizeTextarea || !customizeSubtitle) return;
    const basePayload = customPayload ?? (await fetchRequestPayload(requestId));
    customizeSubtitle.textContent = `Request: ${requestId}`;
    customizeTextarea.value = basePayload ? JSON.stringify(basePayload, null, 2) : '';
    customizeModal.hidden = false;
  }

  function closeCustomizeModal(): void {
    if (!customizeModal) return;
    customizeModal.hidden = true;
  }

  async function fetchRequestPayload(id: string): Promise<unknown> {
    const url = `${REQUEST_ENDPOINT}/${encodeURIComponent(id)}`;
    const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) {
      console.error(`Failed to fetch request payload for ${id}: ${response.status}`);
      return null;
    }
    try {
      return await response.json();
    } catch (error) {
      console.error('Failed to parse request payload JSON', error);
      return null;
    }
  }

  function writeCustomPayload(id: string, payload: unknown): void {
    try {
      localStorage.setItem(customPayloadKey(id), JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to save custom payload', error);
    }
  }

  function readCustomPayload(id: string): unknown {
    try {
      const raw = localStorage.getItem(customPayloadKey(id));
      if (!raw) return undefined;
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to read custom payload', error);
      return undefined;
    }
  }

  function clearCustomPayload(id: string): void {
    try {
      localStorage.removeItem(customPayloadKey(id));
    } catch (error) {
      console.error('Failed to clear custom payload', error);
    }
  }

  function customPayloadKey(id: string): string {
    return `dc-custom-payload:${id}`;
  }

  function primeButton(): void {
    if (!dcButton) return;
    dcButton.setAttribute('request-id', requestId);
    dcButton.setAttribute('request-endpoint', REQUEST_ENDPOINT);
    dcButton.setAttribute('response-endpoint', RESPONSE_ENDPOINT);
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

  function maybeWarnUnsupported(): void {
    console.log('Checking for Digital Credentials API support...');
    if (!hasDcApiSupport()) {
       console.log('no support');
      logLine(
        'Digital Credentials API is not available in this browser. Please switch to a compatible browser.'
      );
    }
  }

  function hasDcApiSupport(): boolean {
    const navHasGet =
      typeof (navigator as { credentials?: { get?: unknown } }).credentials?.get === 'function';
    console.log('- navigator.credentials.get():', navHasGet);
    const globalDigitalCredential =
      typeof (window as { DigitalCredential?: unknown }).DigitalCredential !== 'undefined';
    console.log('- window.DigitalCredential:', globalDigitalCredential);
    return navHasGet && globalDigitalCredential;
  }

  function handleVerificationSuccess(response: unknown): void {
    logJson('Credential verification response', response);
    if (getShowCredentialEnabled()) {
      showCredentialModal(response);
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

function handleInitError(error: unknown): void {
  console.error('Failed to initialize web demo', error);
}
