import '@waltid/digital-credentials';
import './style.css';

const REQUEST_LIST_ENDPOINT = '/api/dc/requests';
const REQUEST_ENDPOINT = '/api/dc/request';
const REQUEST_CONFIG_ENDPOINT = '/api/dc/request-config';
const RESPONSE_ENDPOINT = '/api/dc/response';
const DEFAULT_REQUEST_ID = 'unsigned-mdl';
const SIGNED_REQUEST_KEY = 'dc-signed-request';
const ENCRYPTED_RESPONSE_KEY = 'dc-encrypted-response';

type ClaimField = {
  key: string;
  namespace: string;
  value: string;
};

type CredentialDisplay = {
  fields: ClaimField[];
  issuer?: string;
  docType?: string;
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
  const signedToggle = document.getElementById('signed-toggle') as HTMLInputElement | null;
  const encryptedToggle = document.getElementById('encrypted-toggle') as HTMLInputElement | null;
  const showCredentialToggle = document.getElementById('show-credential-toggle') as HTMLInputElement | null;
  const modalBackdrop = document.getElementById('credential-modal-backdrop') as HTMLElement | null;
  const modalClose = document.getElementById('modal-close') as HTMLButtonElement | null;
  const credentialFields = document.getElementById('credential-fields');
  const credentialTitle = document.getElementById('credential-title');
  const dlIssuer = document.getElementById('dl-issuer');

  const urlState = new URL(window.location.href);
  let requestId = urlState.searchParams.get('request-id') || DEFAULT_REQUEST_ID;
  let customPayload: unknown = readCustomPayload(requestId);
  let signedEnabled = getSignedEnabled();
  let encryptedEnabled = getEncryptedEnabled();
  let payloadSyncToken = 0;
  const fallbackRequestIds = getRequestIdsFromSelect();

  await loadRequestOptions(fallbackRequestIds);
  primeButton();
  renderLog();
  wireEvents();
  await refreshRequestPayload();

  function wireEvents(): void {
    if (dcButton) {
      dcButton.addEventListener('credential-request-started', () => {
        hideCredentialModal();
        logLine(`credential request started`);
        maybeWarnUnsupported();
      });
      dcButton.addEventListener('credential-request-loaded', (event) =>
        logJson('Digital Credentials API request', (event as CustomEvent).detail?.payload)
      );
      dcButton.addEventListener('credential-dcapi-success', (event) =>
        logJson(
          'Digital Credentials API returned a credential response',
          (event as CustomEvent).detail?.response
        )
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
        void refreshRequestPayload();
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
          void refreshRequestPayload();
          closeCustomizeModal();
          logLine(`Custom payload cleared for ${requestId}`);
          return;
        }

        writeCustomPayload(requestId, parsed);
        customPayload = parsed;
        void refreshRequestPayload();
        closeCustomizeModal();
        logLine(`Custom payload saved for ${requestId}`);
      });
    }

    if (customizeClose) {
      customizeClose.addEventListener('click', () => closeCustomizeModal());
    }

    if (signedToggle) {
      signedToggle.checked = signedEnabled;
      signedToggle.addEventListener('change', () => {
        signedEnabled = signedToggle.checked;
        setSignedEnabled(signedEnabled);
        void refreshRequestPayload();
      });
    }

    if (encryptedToggle) {
      encryptedToggle.checked = encryptedEnabled;
      encryptedToggle.addEventListener('change', () => {
        encryptedEnabled = encryptedToggle.checked;
        setEncryptedEnabled(encryptedEnabled);
        void refreshRequestPayload();
      });
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
    console.log(message);
    logEntries.push(message);
    renderLog();
  }

  function logJson(label: string, payload: unknown): void {
    const pretty = JSON.stringify(payload, null, 2);
    logEntries.push(`${label}:\n${pretty}`);
    renderLog();
  }

  async function refreshRequestPayload(): Promise<void> {
    if (!dcButton) return;

    console.log('Refreshing request payload...');
    console.log('- requestId:', requestId);
    console.log('- signedEnabled:', signedEnabled);
    console.log('- encryptedEnabled:', encryptedEnabled);
    console.log('- customPayload:', customPayload);
    console.log(dcButton.getAttribute('request-payload'));

    const activeRequestId = requestId;
    const activeSigned = signedEnabled;
    const activeEncrypted = encryptedEnabled;
    const currentSync = ++payloadSyncToken;
    const storedPayload = isVerifierConfigPayload(customPayload) ? customPayload : undefined;
    if (customPayload !== undefined && !storedPayload) {
      clearCustomPayload(activeRequestId);
    }
    const basePayload = storedPayload ?? (await fetchRequestConfig(activeRequestId));
    if (
      activeRequestId !== requestId ||
      activeSigned !== signedEnabled ||
      activeEncrypted !== encryptedEnabled ||
      currentSync !== payloadSyncToken
    ) {
      return;
    }
    if (!basePayload || typeof basePayload !== 'object') {
      dcButton.removeAttribute('request-payload');
      dcButton.removeAttribute('data-has-custom-payload');
      return;
    }

    const patched = applySigningOptions(basePayload, activeSigned, activeEncrypted);
    if (!patched || typeof patched !== 'object') {
      dcButton.removeAttribute('request-payload');
      dcButton.removeAttribute('data-has-custom-payload');
      return;
    }

    if (currentSync !== payloadSyncToken) return;

    try {
      dcButton.setAttribute('request-payload', JSON.stringify(patched));
      dcButton.setAttribute('data-has-custom-payload', 'true');
    } catch (error) {
      console.error('Failed to serialize request payload', error);
      dcButton.removeAttribute('request-payload');
      dcButton.removeAttribute('data-has-custom-payload');
    }

    console.log('Updated request payload:');
    console.log(dcButton.getAttribute('request-payload'));
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
    await refreshRequestPayload();
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
    const storedPayload = isVerifierConfigPayload(customPayload) ? customPayload : undefined;
    const basePayload = storedPayload ?? (await fetchRequestConfig(requestId));
    if (customPayload !== undefined && !storedPayload) {
      clearCustomPayload(requestId);
    }
    customizeSubtitle.textContent = `Request: ${requestId}`;
    customizeTextarea.value = basePayload ? JSON.stringify(basePayload, null, 2) : '';
    customizeModal.hidden = false;
  }

  function closeCustomizeModal(): void {
    if (!customizeModal) return;
    customizeModal.hidden = true;
  }

  async function fetchRequestConfig(id: string): Promise<unknown> {
    const url = `${REQUEST_CONFIG_ENDPOINT}/${encodeURIComponent(id)}`;
    const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) {
      console.error(`Failed to fetch request config for ${id}: ${response.status}`);
      return null;
    }
    try {
      return await response.json();
    } catch (error) {
      console.error('Failed to parse request config JSON', error);
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
      const parsed = JSON.parse(raw);
      if (!isVerifierConfigPayload(parsed)) {
        return undefined;
      }
      return parsed;
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

  function applySigningOptions(payload: unknown, signed: boolean, encrypted: boolean): unknown {
    const clone = cloneJson(payload);
    if (!clone || typeof clone !== 'object') return payload;
    const core = (clone as { core?: unknown }).core;
    if (core && typeof core === 'object') {
      (core as Record<string, unknown>).signed_request = signed;
      (core as Record<string, unknown>).encrypted_response = encrypted;
    }
    return clone;
  }

  function cloneJson<T>(value: T): T | null {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch (error) {
      console.error('Failed to clone JSON payload', error);
      return null;
    }
  }

  function isVerifierConfigPayload(input: unknown): input is Record<string, unknown> {
    if (!input || typeof input !== 'object') return false;
    const obj = input as Record<string, unknown>;
    if (typeof obj.flow_type === 'string') return true;
    if (obj.core && typeof obj.core === 'object') return true;
    return false;
  }

  function primeButton(): void {
    if (!dcButton) return;
    dcButton.setAttribute('request-id', requestId);
    dcButton.setAttribute('request-endpoint', REQUEST_ENDPOINT);
    dcButton.setAttribute('response-endpoint', RESPONSE_ENDPOINT);
  }

  function getSignedEnabled(): boolean {
    return readBooleanSetting(SIGNED_REQUEST_KEY, false);
  }

  function setSignedEnabled(next: boolean): void {
    writeBooleanSetting(SIGNED_REQUEST_KEY, next);
  }

  function getEncryptedEnabled(): boolean {
    return readBooleanSetting(ENCRYPTED_RESPONSE_KEY, false);
  }

  function setEncryptedEnabled(next: boolean): void {
    writeBooleanSetting(ENCRYPTED_RESPONSE_KEY, next);
  }

  function getShowCredentialEnabled(): boolean {
    return readBooleanSetting('dc-show-credential', true);
  }

  function setShowCredentialEnabled(next: boolean): void {
    writeBooleanSetting('dc-show-credential', next);
  }

  function readBooleanSetting(key: string, defaultValue: boolean): boolean {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) {
        localStorage.setItem(key, String(defaultValue));
        return defaultValue;
      }
      return stored === 'true';
    } catch (error) {
      console.error(`Failed to read ${key} from localStorage`, error);
      return defaultValue;
    }
  }

  function writeBooleanSetting(key: string, next: boolean): void {
    try {
      localStorage.setItem(key, String(next));
    } catch (error) {
      console.error(`Failed to store ${key} in localStorage`, error);
    }
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
    if (!modalBackdrop || !credentialFields || !dlIssuer || !credentialTitle) return;
    const display = extractCredentialDisplay(data);
    renderClaimFields(credentialFields, display?.fields ?? []);
    credentialTitle.textContent = display?.docType || 'Credential Details';
    dlIssuer.textContent = `Issuer: ${display?.issuer || '—'}`;
    modalBackdrop.hidden = false;
    modalBackdrop.style.display = 'flex';
  }

  function hideCredentialModal(): void {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
    modalBackdrop.style.display = 'none';
  }
}

function handleInitError(error: unknown): void {
  console.error('Failed to initialize web demo', error);
}

const NAMESPACE_WHITELIST = ['org.iso.18013.5.1', 'org.iso.23220.1'];

function extractCredentialDisplay(input: unknown): CredentialDisplay | null {
  const presented = (input as {
    presentedCredentials?: Record<string, Array<{ credentialData?: Record<string, unknown> }>>;
  }).presentedCredentials;
  if (!presented || typeof presented !== 'object') return null;

  for (const list of Object.values(presented)) {
    if (!Array.isArray(list)) continue;
    for (const cred of list) {
      const credentialData = (cred as { credentialData?: unknown }).credentialData;
      const fields = flattenCredentialClaims(credentialData);
      if (fields.length) {
        return {
          fields,
          docType: typeof (credentialData as { docType?: unknown })?.docType === 'string'
            ? (credentialData as { docType?: unknown }).docType
            : undefined,
          issuer: readIssuer(cred)
        };
      }
    }
  }

  return null;
}

function flattenCredentialClaims(credentialData: unknown): ClaimField[] {
  if (!credentialData || typeof credentialData !== 'object') return [];
  const fields: ClaimField[] = [];
  const asObj = credentialData as Record<string, unknown>;

  for (const [namespace, claims] of Object.entries(asObj)) {
    if (namespace === 'docType') continue;
    if (!NAMESPACE_WHITELIST.some((allowed) => namespace.includes(allowed))) continue;
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) continue;

    for (const [key, value] of Object.entries(claims as Record<string, unknown>)) {
      fields.push({
        namespace,
        key,
        value: formatClaimValue(value)
      });
    }
  }

  return fields;
}

function renderClaimFields(container: HTMLElement, fields: ClaimField[]): void {
  container.innerHTML = '';
  if (!fields.length) {
    const empty = document.createElement('div');
    empty.className = 'field muted';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = 'No claims found';
    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = '—';
    empty.appendChild(label);
    empty.appendChild(value);
    container.appendChild(empty);
    return;
  }

  fields.forEach((field) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = field.key;

    const namespace = document.createElement('span');
    namespace.className = 'namespace';
    namespace.textContent = field.namespace;

    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = field.value;

    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.flexDirection = 'column';
    labelRow.appendChild(label);
    labelRow.appendChild(namespace);

    wrapper.appendChild(labelRow);
    wrapper.appendChild(value);
    container.appendChild(wrapper);
  });
}

function formatClaimValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function readIssuer(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const asObj = input as Record<string, unknown>;
  const issuerInfo = asObj['issuerInfo'] as { commonName?: string } | undefined;
  return issuerInfo?.commonName || (typeof asObj['issuer'] === 'string' ? asObj['issuer'] : undefined);
}
