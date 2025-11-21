import { useEffect, useMemo, useRef, useState } from 'react';
import {
  REQUEST_ENDPOINT,
  RESPONSE_ENDPOINT,
  MOCK_FLAG_KEY
} from '@waltid/dc-mock-utils/install-mocks';

type MinimalCredential = {
  givenName?: string;
  familyName?: string;
  date?: string;
  issuer?: string;
};

export default function App() {
  const urlState = useMemo(() => new URL(window.location.href), []);
  const initialRequestId = urlState.searchParams.get('request-id') || 'unsigned-mdl';
  const [requestId, setRequestId] = useState(initialRequestId);
  const [mockEnabled, setMockEnabled] = useState(resolveInitialMock());
  const [showCredential, setShowCredential] = useState(resolveShowCredential());
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [credential, setCredential] = useState<MinimalCredential>({});
  const btnRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    primeButton(btn, requestId, mockEnabled);

    const handleStarted = (event: Event) => {
      hideModal();
      logLine(`[started] credential-request-started (${(event as CustomEvent).detail?.requestId ?? requestId})`);
    };
    const handleRequestLoaded = (event: Event) =>
      logJson('Digital Credentials API request', (event as CustomEvent).detail?.payload);
    const handleDcSuccess = (event: Event) =>
      logDcResponse((event as CustomEvent).detail?.response);
    const handleDcError = (event: Event) =>
      logJson('[error:dc-api]', (event as CustomEvent).detail?.error);
    const handleVerSuccess = (event: Event) => handleVerificationSuccess((event as CustomEvent).detail?.response);
    const handleVerError = (event: Event) =>
      logJson('[error:verification]', (event as CustomEvent).detail?.error);
    const handleError = (event: Event) => logJson('[error]', (event as CustomEvent).detail);

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
  }, [requestId, mockEnabled]);

  const logLine = (message: string) => {
    setLogEntries((prev) => [...prev, message]);
  };

  const logJson = (label: string, payload: unknown) => {
    const pretty = JSON.stringify(payload, null, 2);
    setLogEntries((prev) => [...prev, `${label}:\n${pretty}`]);
  };

  const logDcResponse = (response: unknown) => {
    if (showCredential) {
      logJson('Digital Credentials API response', response);
    } else {
      logJson('Digital Credentials API response', { hidden: true });
    }
  };

  const handleVerificationSuccess = (response: unknown) => {
    logJson('Credential Verification response', response);
    if (showCredential) {
      const cred = extractFirstCredential(response);
      setCredential(cred);
      setModalVisible(true);
    }
  };

  const handleRequestChange = (value: string) => {
    setRequestId(value);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('request-id', value);
    window.history.replaceState({}, '', nextUrl.toString());
    const btn = btnRef.current;
    if (btn) primeButton(btn, value, mockEnabled);
    logLine(`[info] switched request-id to ${value}`);
  };

  const toggleMock = () => {
    const next = !mockEnabled;
    localStorage.setItem(MOCK_FLAG_KEY, String(next));
    setMockEnabled(next);
    const url = new URL(window.location.href);
    url.searchParams.set('dc-mock', next ? '1' : '0');
    window.history.replaceState({}, '', url.toString());
    const btn = btnRef.current;
    if (btn) primeButton(btn, requestId, next);
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
      <h1>Digital Credentials Button</h1>
      <p className="lead">
        React example of the web component that fetches a Digital Credentials API request from a backend,
        calls <code>navigator.credentials.get</code>, and posts the result back.
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
            <option value="unsigned-photoid">unsigned-photoid</option>
            <option value="signed-photoid">signed-photoid</option>
          </select>
          <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <strong>Show Credential</strong>
              <label className="toggle" aria-label="Toggle credential visibility">
                <input type="checkbox" checked={showCredential} onChange={toggleShowCredential} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <strong>Mock mode</strong>
              <label className="toggle" aria-label="Toggle mock mode">
                <input type="checkbox" checked={mockEnabled} onChange={toggleMock} />
                <span className="toggle-slider"></span>
              </label>
            </div>
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
                <Field label="Date" value={credential.date} />
                <div className="field muted">
                  <span className="label">Additional fields</span>
                  <span className="value">Coming soon</span>
                </div>
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

function resolveShowCredential(): boolean {
  const stored = localStorage.getItem('dc-show-credential');
  if (stored === null) {
    localStorage.setItem('dc-show-credential', 'true');
    return true;
  }
  return stored === 'true';
}

function primeButton(btn: HTMLElement, requestId: string, mock: boolean): void {
  btn.setAttribute('request-id', requestId);
  btn.setAttribute('request-endpoint', REQUEST_ENDPOINT);
  btn.setAttribute('response-endpoint', RESPONSE_ENDPOINT);
  if (mock) {
    btn.setAttribute('mock', 'true');
  } else {
    btn.removeAttribute('mock');
  }
}

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
