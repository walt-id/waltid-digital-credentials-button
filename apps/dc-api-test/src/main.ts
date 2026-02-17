import './style.css';

const VERIFIER_BASE = 'https://verifier2.portal.test.waltid.cloud';
const OPENAPI_URL = `${VERIFIER_BASE}/api.json`;
const CREATE_URL = `${VERIFIER_BASE}/verification-session/create`;
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 60;
const SESSION_STORAGE_KEY = 'dc-api-test.sessionId';

type ExampleEntry = {
  title: string;
  payload: unknown;
};

type CreateResponse = {
  sessionId?: string;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void init().catch(handleInitError));
} else {
  void init().catch(handleInitError);
}

async function init(): Promise<void> {
  const select = document.getElementById('example-select') as HTMLSelectElement | null;
  const payloadInput = document.getElementById('payload-input') as HTMLTextAreaElement | null;
  const callButton = document.getElementById('call-dc-api') as HTMLButtonElement | null;
  const statusEl = document.getElementById('status') as HTMLSpanElement | null;

  if (!select || !payloadInput || !callButton || !statusEl) {
    throw new Error('Missing required DOM elements');
  }

  setStatus(statusEl, 'Loading Swagger examples...');
  const examples = await loadDcApiExamples();

  if (!examples.length) {
    setStatus(statusEl, 'No dc_api examples found in Swagger');
    callButton.disabled = true;
    return;
  }

  populateExampleSelect(select, examples);
  payloadInput.value = stringifyJson(examples[0].payload);
  setStatus(statusEl, `Ready (${examples.length} examples loaded)`);

  select.addEventListener('change', () => {
    const selected = examples[select.selectedIndex];
    if (!selected) return;
    payloadInput.value = stringifyJson(selected.payload);
  });

  callButton.addEventListener('click', async () => {
    callButton.disabled = true;
    try {
      await runDcApiFlow(payloadInput.value, statusEl);
      setStatus(statusEl, 'Completed. Check console for full logs.');
    } catch (error) {
      console.error('[dc-api-test] flow failed', error);
      setStatus(statusEl, `Failed: ${toErrorMessage(error)}`);
    } finally {
      callButton.disabled = false;
    }
  });
}

async function loadDcApiExamples(): Promise<ExampleEntry[]> {
  const api = await fetchJson(OPENAPI_URL, { method: 'GET' }, 'openapi.load');
  const examplesObj = getCreateExamples(api);

  if (!examplesObj || typeof examplesObj !== 'object') {
    return [];
  }

  const examples: ExampleEntry[] = [];

  Object.entries(examplesObj).forEach(([title, raw]) => {
    if (!title.toLowerCase().includes('dc_api')) return;
    if (!raw || typeof raw !== 'object') return;
    const payload = (raw as { value?: unknown }).value;
    if (payload === undefined) return;
    examples.push({ title, payload });
  });

  return examples;
}

function getCreateExamples(api: unknown): Record<string, unknown> | null {
  const root = asRecord(api);
  const paths = asRecord(root?.paths);
  const createPath = asRecord(paths?.['/verification-session/create']);
  const post = asRecord(createPath?.post);
  const requestBody = asRecord(post?.requestBody);
  const content = asRecord(requestBody?.content);
  const jsonContent = asRecord(content?.['application/json']);
  const examples = asRecord(jsonContent?.examples);
  return examples;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function populateExampleSelect(select: HTMLSelectElement, examples: ExampleEntry[]): void {
  select.innerHTML = '';

  examples.forEach((example) => {
    const option = document.createElement('option');
    option.value = example.title;
    option.textContent = example.title;
    select.appendChild(option);
  });

  select.selectedIndex = 0;
}

async function runDcApiFlow(payloadJson: string, statusEl: HTMLSpanElement): Promise<void> {
  setStatus(statusEl, 'Parsing payload...');
  const createPayload = parseJson(payloadJson, 'payload-input');
  console.log('[dc-api-test] create payload', createPayload);

  setStatus(statusEl, 'Creating verification session...');
  const createResponse = await fetchJson(
    CREATE_URL,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    },
    'session.create'
  );

  const sessionId = getSessionId(createResponse as CreateResponse);
  if (!sessionId) {
    throw new Error('No sessionId returned from create endpoint');
  }

  sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  console.log('[dc-api-test] sessionId stored in sessionStorage', {
    key: SESSION_STORAGE_KEY,
    sessionId
  });

  const requestUrl = `${VERIFIER_BASE}/verification-session/${encodeURIComponent(sessionId)}/request`;
  setStatus(statusEl, 'Fetching DC API request...');
  const dcApiRequest = await fetchJson(
    requestUrl,
    {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    },
    'session.request'
  );

  setStatus(statusEl, 'Calling navigator.credentials.get...');
  const dcApiResponse = await invokeDigitalCredentialsApi(dcApiRequest);

  const responseUrl = `${VERIFIER_BASE}/verification-session/${encodeURIComponent(sessionId)}/response`;
  setStatus(statusEl, 'Posting wallet response...');
  await fetchAny(
    responseUrl,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify(dcApiResponse)
    },
    'session.response'
  );

  setStatus(statusEl, 'Polling verification-session info every 10 seconds...');
  const finalInfo = await pollInfo(sessionId);
  console.log('[dc-api-test] final verification result', finalInfo);
}

async function pollInfo(sessionId: string): Promise<unknown> {
  const infoUrl = `${VERIFIER_BASE}/verification-session/${encodeURIComponent(sessionId)}/info`;

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
    const info = await fetchJson(
      infoUrl,
      {
        method: 'GET',
        headers: {
          accept: 'application/json'
        }
      },
      `session.info#${attempt}`
    );

    if (isResultAvailable(info)) {
      return info;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Result not available after ${MAX_POLL_ATTEMPTS} polling attempts`);
}

function isResultAvailable(info: unknown): boolean {
  if (!info || typeof info !== 'object') {
    return true;
  }

  const status = (info as { status?: unknown }).status;
  if (typeof status !== 'string') {
    return true;
  }

  const normalized = status.toLowerCase();
  return !['created', 'received', 'pending', 'processing'].includes(normalized);
}

async function invokeDigitalCredentialsApi(requestPayload: unknown): Promise<unknown> {
  const nav = navigator as Navigator & {
    credentials?: {
      get?: (options: unknown) => Promise<unknown>;
    };
  };

  if (typeof nav.credentials?.get !== 'function') {
    throw new Error('Digital Credentials API is unavailable in this browser (navigator.credentials.get missing).');
  }

  const dcRequestPayload =
    requestPayload != null &&
    typeof requestPayload === 'object' &&
    Object.prototype.hasOwnProperty.call(requestPayload, 'digital')
      ? requestPayload
      : {
          digital: {
            requests: [requestPayload]
          }
        };

  console.log('[dc-api-test] dc api request payload', dcRequestPayload);
  const result = await nav.credentials.get(dcRequestPayload);
  console.log('[dc-api-test] dc api response', result);

  if (result == null) {
    throw new Error('Digital Credentials API returned empty response');
  }

  return result;
}

async function fetchJson(url: string, init: RequestInit, label: string): Promise<unknown> {
  const response = await fetchAny(url, init, label);

  const text = await response.text();
  console.log(`[dc-api-test] ${label} raw response body`, text);

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function fetchAny(url: string, init: RequestInit, label: string): Promise<Response> {
  console.log(`[dc-api-test] ${label} request`, {
    url,
    method: init.method || 'GET',
    headers: init.headers,
    body: init.body
  });

  const response = await fetch(url, init);

  console.log(`[dc-api-test] ${label} response`, {
    url,
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error(`[dc-api-test] ${label} error body`, errorText);
    throw new Error(`${label} failed (${response.status})`);
  }

  return response;
}

function parseJson(input: string, source: string): unknown {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid JSON in ${source}: ${toErrorMessage(error)}`);
  }
}

function getSessionId(payload: CreateResponse): string | null {
  if (typeof payload?.sessionId === 'string' && payload.sessionId.trim()) {
    return payload.sessionId;
  }
  return null;
}

function setStatus(el: HTMLElement, text: string): void {
  el.textContent = text;
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function handleInitError(error: unknown): void {
  console.error('[dc-api-test] init failed', error);
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = `Initialization failed: ${toErrorMessage(error)}`;
  }
}
