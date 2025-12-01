import { useEffect, useMemo, useRef, useState } from 'react';

const REQUEST_ENDPOINT = '/api/dc/request';
const RESPONSE_ENDPOINT = '/api/dc/response';

type MinimalCredential = {
  givenName?: string;
  familyName?: string;
  ageOver21?: boolean;
  date?: string;
  issuer?: string;
};

export default function App() {
  const urlState = useMemo(() => new URL(window.location.href), []);
  const initialRequestId = urlState.searchParams.get('request-id') || 'unsigned-mdl';
  const [requestId, setRequestId] = useState(initialRequestId);
  const [showCredential, setShowCredential] = useState(resolveShowCredential());
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [credential, setCredential] = useState<MinimalCredential>({});
  const btnRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    primeButton(btn, requestId);

    const handleStarted = () => {
      hideModal();
      logLine(`[${requestId}] credential request started`);
      if (!hasDcApiSupport()) {
        logLine('Digital Credentials API is not available in this browser. Try a compatible browser.');
      }
    };
    const handleRequestLoaded = (event: Event) =>
      logJson('Digital Credentials API request', (event as CustomEvent).detail?.payload);
    const handleDcSuccess = () =>
      logLine('Digital Credentials API returned a credential response');
    const handleDcError = (event: Event) =>
      logJson('Digital Credentials API error', (event as CustomEvent).detail?.error);
    const handleVerSuccess = (event: Event) => {
      const payload = (event as CustomEvent).detail?.response;
      logJson('Credential verification response', payload);
      if (showCredential) {
        setCredential(extractFirstCredential(payload));
        setModalVisible(true);
      }
    };
    const handleVerError = (event: Event) =>
      logJson('Verification error', (event as CustomEvent).detail?.error);
    const handleError = (event: Event) => logJson('Flow error', (event as CustomEvent).detail);

    btn.addEventListener('credential-request-started', handleStarted);
    btn.addEventListener('credential-request-loaded', handleRequestLoaded);
    btn.addEventListener('credential-dcapi-success', handleDcSuccess);
    btn.addEventListener('credential-dcapi-error', handleDcError);
    btn.addEventListener('credential-verification-success', handleVerSuccess);
    btn.addEventListener('credential-verification-error', handleVerError);
    btn.addEventListener('credential-error', handleError);

    return () => {
      btn.removeEventListener('credential-request-started', handleStarted);
      btn.removeEventListener('credential-request-loaded', handleRequestLoaded);
      btn.removeEventListener('credential-dcapi-success', handleDcSuccess);
      btn.removeEventListener('credential-dcapi-error', handleDcError);
      btn.removeEventListener('credential-verification-success', handleVerSuccess);
      btn.removeEventListener('credential-verification-error', handleVerError);
      btn.removeEventListener('credential-error', handleError);
    };
  }, [requestId, showCredential]);

  const logLine = (message: string) => setLogEntries((prev) => [...prev, message]);

  const logJson = (label: string, payload: unknown) => {
    const pretty = JSON.stringify(payload, null, 2);
    setLogEntries((prev) => [...prev, `${label}:\n${pretty}`]);
  };

  const handleRequestChange = (value: string) => {
    setRequestId(value);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('request-id', value);
    window.history.replaceState({}, '', nextUrl.toString());
    const btn = btnRef.current;
    if (btn) primeButton(btn, value);
    logLine(`request-id set to ${value}`);
  };

  const toggleShowCredential = () => {
    const next = !showCredential;
    localStorage.setItem('dc-show-credential', String(next));
    setShowCredential(next);
  };

  const clearLog = () => setLogEntries([]);
  const hideModal = () => setModalVisible(false);

  return (
    <main>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <img src="/waltid-logo.svg" alt="walt.id logo" style={{ height: 48, width: 'auto' }} />
        <h1 style={{ margin: 0 }}>Digital Credentials Button</h1>
      </div>
      <p className="lead">
        React example of the web component backed by the demo backend. It fetches a Digital Credentials API
        request, calls <code>navigator.credentials.get</code>, and sends the result back for verification.
      </p>

      <section className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label htmlFor="request-select">
            <strong>Request</strong>
          </label>
          <select
            id="request-select"
            value={requestId}
            onChange={(e) => handleRequestChange(e.target.value)}
            style={{
              minWidth: 200,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}
          >
            <option value="unsigned-mdl">unsigned-mdl</option>
            <option value="signed-mdl">signed-mdl</option>
            <option value="encrypted-mdl">encrypted-mdl</option>
            <option value="unsigned-encrypted-mdl">unsigned-encrypted-mdl</option>
            <option value="signed-encrypted-mdl">signed-encrypted-mdl</option>
            <option value="unsigned-photoid">unsigned-photoid</option>
            <option value="signed-photoid">signed-photoid</option>
          </select>
          <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <strong>Show Credential</strong>
            <label className="toggle" aria-label="Toggle credential visibility">
              <input type="checkbox" checked={showCredential} onChange={toggleShowCredential} />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <digital-credentials-button
            ref={btnRef as any}
            request-endpoint={REQUEST_ENDPOINT}
            response-endpoint={RESPONSE_ENDPOINT}
            label="Request Digital Credentials"
          />
          <button id="clear-log" type="button" className="dc-btn dc-btn-secondary" onClick={clearLog}>
            Clear log
          </button>
        </div>

        <h3>Event log</h3>
        <pre>{logEntries.length ? logEntries.join('\n\n') : '(click the button to start)'}</pre>
      </section>

      {modalVisible && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && hideModal()}>
          <div className="modal license-card">
            <div className="license-header">
              <div className="license-title">Driving License</div>
              <button type="button" aria-label="Close credential modal" onClick={hideModal}>
                ×
              </button>
            </div>
            <div className="license-body">
              <div className="license-photo">PHOTO</div>
              <div className="license-fields">
                <Field label="First Name" value={credential.givenName} />
                <Field label="Family Name" value={credential.familyName} />
                <Field
                  label="Age over 21"
                  value={
                    credential.ageOver21 === undefined ? undefined : credential.ageOver21 ? 'Yes' : 'No'
                  }
                />
                <Field label="Date" value={credential.date} />
              </div>
            </div>
            <div className="license-footer">
              <span className="issuer">Issuer: {credential.issuer || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <span className="value">{value || '—'}</span>
    </div>
  );
}

function resolveShowCredential(): boolean {
  const stored = localStorage.getItem('dc-show-credential');
  if (stored === null) {
    localStorage.setItem('dc-show-credential', 'true');
    return true;
  }
  return stored === 'true';
}

function primeButton(btn: HTMLElement, requestId: string): void {
  btn.setAttribute('request-id', requestId);
  btn.setAttribute('request-endpoint', REQUEST_ENDPOINT);
  btn.setAttribute('response-endpoint', RESPONSE_ENDPOINT);
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
    date: claims['date_of_birth']?.value ?? claims['date_of_birth'] ?? undefined,
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

function hasDcApiSupport(): boolean {
  const navHasGet =
    typeof (navigator as { credentials?: { get?: unknown } }).credentials?.get === 'function';
  const globalDigitalCredential =
    typeof (window as { DigitalCredential?: unknown }).DigitalCredential !== 'undefined';
  return navHasGet || globalDigitalCredential;
}
