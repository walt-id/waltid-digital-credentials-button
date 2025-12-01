import '@waltid/digital-credentials';
import './style.css';

const REQUEST_ENDPOINT = '/api/dc/request';
const RESPONSE_ENDPOINT = '/api/dc/response';

type MinimalCredential = {
  givenName?: string;
  familyName?: string;
  ageOver21?: boolean;
  issuer?: string;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init(): void {
  const logEntries: string[] = [];
  const logEl = document.getElementById('log') as HTMLPreElement | null;
  const dcButton = document.getElementById('demo-btn') as HTMLElement | null;
  const requestSelect = document.getElementById('request-select') as HTMLSelectElement | null;
  const clearLogBtn = document.getElementById('clear-log') as HTMLButtonElement | null;
  const showCredentialToggle = document.getElementById('show-credential-toggle') as HTMLInputElement | null;
  const modalBackdrop = document.getElementById('credential-modal-backdrop') as HTMLElement | null;
  const modalClose = document.getElementById('modal-close') as HTMLButtonElement | null;
  const dlFirst = document.getElementById('dl-first-name');
  const dlFamily = document.getElementById('dl-family-name');
  const dlAge = document.getElementById('dl-age-over-21');
  const dlIssuer = document.getElementById('dl-issuer');

  const urlState = new URL(window.location.href);
  let requestId = urlState.searchParams.get('request-id') || 'unsigned-mdl';

  primeButton();
  renderLog();
  wireEvents();

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
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('request-id', requestId);
        window.history.replaceState({}, '', nextUrl.toString());
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
    if (!hasDcApiSupport()) {
      logLine(
        'Digital Credentials API is not available in this browser. Please switch to a compatible browser.'
      );
    }
  }

  function hasDcApiSupport(): boolean {
    const navHasGet =
      typeof (navigator as { credentials?: { get?: unknown } }).credentials?.get === 'function';
    const globalDigitalCredential =
      typeof (window as { DigitalCredential?: unknown }).DigitalCredential !== 'undefined';
    return navHasGet || globalDigitalCredential;
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
