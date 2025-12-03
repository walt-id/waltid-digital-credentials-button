import { useEffect, useMemo, useRef, useState } from 'react';

const REQUEST_ENDPOINT = '/api/dc/request';
const RESPONSE_ENDPOINT = '/api/dc/response';
const REQUEST_CONFIG_ENDPOINT = '/api/dc/request-config';
const SIGNED_REQUEST_KEY = 'dc-signed-request';
const ENCRYPTED_RESPONSE_KEY = 'dc-encrypted-response';

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
  const [signedEnabled, setSignedEnabled] = useState(resolveSignedEnabled());
  const [encryptedEnabled, setEncryptedEnabled] = useState(resolveEncryptedEnabled());
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

  useEffect(() => {
    let cancelled = false;

    const syncRequestPayload = async () => {
      const btn = btnRef.current;
      if (!btn) return;
      const activeRequestId = requestId;
      const baseConfig = await fetchRequestConfig(activeRequestId);
      if (cancelled || activeRequestId !== requestId) return;
      if (!baseConfig || typeof baseConfig !== 'object') {
        btn.removeAttribute('request-payload');
        return;
      }
      const patched = applySigningOptions(baseConfig, signedEnabled, encryptedEnabled);
      if (!patched || typeof patched !== 'object') {
        btn.removeAttribute('request-payload');
        return;
      }
      try {
        btn.setAttribute('request-payload', JSON.stringify(patched));
      } catch (error) {
        console.error('Failed to serialize request payload', error);
        btn.removeAttribute('request-payload');
      }
    };

    void syncRequestPayload();
    return () => {
      cancelled = true;
    };
  }, [requestId, signedEnabled, encryptedEnabled]);

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
    writeBooleanSetting('dc-show-credential', next);
    setShowCredential(next);
  };

  const toggleSigned = () => {
    const next = !signedEnabled;
    writeBooleanSetting(SIGNED_REQUEST_KEY, next);
    setSignedEnabled(next);
  };

  const toggleEncrypted = () => {
    const next = !encryptedEnabled;
    writeBooleanSetting(ENCRYPTED_RESPONSE_KEY, next);
    setEncryptedEnabled(next);
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
          <div
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap'
            }}
          >
            <ToggleControl
              label="Signed"
              ariaLabel="Toggle signed request"
              checked={signedEnabled}
              onChange={toggleSigned}
            />
            <ToggleControl
              label="Encrypted"
              ariaLabel="Toggle encrypted response"
              checked={encryptedEnabled}
              onChange={toggleEncrypted}
            />
            <ToggleControl
              label="Show Credential"
              ariaLabel="Toggle credential visibility"
              checked={showCredential}
              onChange={toggleShowCredential}
            />
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

function ToggleControl({
  label,
  ariaLabel,
  checked,
  onChange
}: {
  label: string;
  ariaLabel: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <strong>{label}</strong>
      <label className="toggle" aria-label={ariaLabel}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="toggle-slider"></span>
      </label>
    </div>
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
  return readBooleanSetting('dc-show-credential', true);
}

function resolveSignedEnabled(): boolean {
  return readBooleanSetting(SIGNED_REQUEST_KEY, false);
}

function resolveEncryptedEnabled(): boolean {
  return readBooleanSetting(ENCRYPTED_RESPONSE_KEY, false);
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

function primeButton(btn: HTMLElement, requestId: string): void {
  btn.setAttribute('request-id', requestId);
  btn.setAttribute('request-endpoint', REQUEST_ENDPOINT);
  btn.setAttribute('response-endpoint', RESPONSE_ENDPOINT);
}

async function fetchRequestConfig(requestId: string): Promise<unknown> {
  const url = `${REQUEST_CONFIG_ENDPOINT}/${encodeURIComponent(requestId)}`;
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) {
      console.error(`Failed to fetch request config for ${requestId}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to read request config', error);
    return null;
  }
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
