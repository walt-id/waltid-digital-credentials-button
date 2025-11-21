import { useEffect, useRef, useState } from 'react';
import { REQUEST_ENDPOINT, MOCK_FLAG_KEY } from '@waltid/dc-mock-utils/install-mocks';

export default function App() {
  const btnRef = useRef<HTMLElement | null>(null);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [mockEnabled, setMockEnabled] = useState<boolean>(getMockEnabled());
  const requestId = new URL(window.location.href).searchParams.get('request-id') || 'unsigned-mdl';

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const handleStarted = () => logLine('[started] credential-request-started');
    const handleReceived = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      logJson('Digital Credentials API response', detail?.credential);
      logJson('Backend response', detail?.backendResponse);
    };
    const handleError = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      logJson(`[error:${detail?.stage ?? 'unknown'}]`, detail?.error ?? detail);
    };

    btn.addEventListener('credential-request-started', handleStarted);
    btn.addEventListener('credential-received', handleReceived);
    btn.addEventListener('credential-error', handleError);

    return () => {
      btn.removeEventListener('credential-request-started', handleStarted);
      btn.removeEventListener('credential-received', handleReceived);
      btn.removeEventListener('credential-error', handleError);
    };
  }, []);

  const logLine = (message: string) => {
    setLogEntries((prev) => [...prev, message]);
  };

  const logJson = (label: string, data: unknown) => {
    const pretty = JSON.stringify(data, null, 2);
    setLogEntries((prev) => [...prev, `${label}:\n${pretty}`]);
  };

  const toggleMock = () => {
    const next = !mockEnabled;
    localStorage.setItem(MOCK_FLAG_KEY, String(next));
    setMockEnabled(next);
    const url = new URL(window.location.href);
    url.searchParams.set('dc-mock', next ? '1' : '0');
    window.location.assign(url.toString());
  };

  return (
    <main>
      <h1>Digital Credentials Button</h1>
      <p className="lead">
        React example of the web component that fetches a Digital Credentials API request from a
        backend, calls <code>navigator.credentials.get</code>, and posts the result back.
      </p>

      <section className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <strong>Mock mode</strong>
          <span style={{ color: mockEnabled ? '#16a34a' : '#dc2626' }}>
            {mockEnabled ? 'ON' : 'OFF'}
          </span>
          <button onClick={toggleMock}>Toggle mock</button>
        </div>
      </section>

      <section className="card">
        <digital-credentials-button
          ref={btnRef}
          config-endpoint={`${REQUEST_ENDPOINT}/${requestId}`}
          label="Request credentials"
        ></digital-credentials-button>

        <h3>Event log</h3>
        <pre>{logEntries.length ? logEntries.join('\n\n') : '(click the button to start)'}</pre>
      </section>
    </main>
  );
}

function getMockEnabled(): boolean {
  return localStorage.getItem(MOCK_FLAG_KEY) === 'true';
}
