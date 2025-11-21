import fs from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = resolve(__dirname, '..', '..', '..');
const fixturesDir = resolve(workspaceRoot, 'fixtures');
const configDir = resolve(workspaceRoot, 'apps', 'config');
const requestFixturePath = resolve(fixturesDir, 'unsigned-mdl-request.json');
const dcApiFixturePath = resolve(fixturesDir, 'unsigned-mdl-response.json');
const verificationFixturePath = resolve(fixturesDir, 'unsigned-mdl-verified.json');

const VERIFIER_BASE = 'https://verifier2.portal.test.waltid.cloud';
const RESPONSE_ENDPOINT = '/api/dc/response';
const REQUEST_ENDPOINT = '/api/dc/request';

export interface DcMockPluginOptions {
  configPath?: string;
  dcApiResponsePath?: string;
  backendResponsePath?: string;
}

export function dcMockPlugin(options: DcMockPluginOptions = {}): Plugin {
  const configPath = options.configPath ?? requestFixturePath;
  const dcApiResponsePath = options.dcApiResponsePath ?? dcApiFixturePath;
  const backendResponsePath = options.backendResponsePath ?? verificationFixturePath;
  const sessionStore = new Map<string, string>();

  return {
    name: 'dc-request-endpoint',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, 'http://localhost');
        const isRequest = url.pathname.startsWith(REQUEST_ENDPOINT);
        const isResponse = url.pathname.startsWith(RESPONSE_ENDPOINT);

        if (!isRequest && !isResponse) {
          return next();
        }

        try {
          const mock = isMockRequest(url, req);
          const configId = getConfigurationId(url);

          if (req.method?.toUpperCase() === 'GET' && isRequest) {
            if (mock) {
              return sendJsonFile(configPath, res);
            }
            const dcRequest = await fetchDcRequestFromBackend(configId, sessionStore);
            return sendJson(res, dcRequest);
          }

          if (req.method?.toUpperCase() === 'POST' && (isRequest || isResponse)) {
            const payload = await readJsonBody(req);

            if (mock) {
              return sendJsonFile(backendResponsePath, res);
            }

            const sessionId = getSessionId(configId, sessionStore);
            if (!sessionId) {
              res.statusCode = 400;
              res.end('No active session. Fetch a DC request first.');
              return;
            }

            const verification = await postCredentialResponse(sessionId, payload);
            return sendJson(res, verification);
          }

          return next();
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ message: (error as Error).message ?? 'Unexpected error' }));
        }
      });
    }
  };
}

function isMockRequest(url: URL, req: IncomingMessage): boolean {
  const mockParam = url.searchParams.get('dc-mock');
  if (mockParam) {
    return mockParam !== '0' && mockParam.toLowerCase() !== 'false';
  }
  const header = req.headers['x-dc-mock'];
  if (Array.isArray(header)) {
    return header.some((value) => isTruthy(value));
  }
  return header ? isTruthy(header) : false;
}

function isTruthy(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function getConfigurationId(url: URL): string {
  const fromQuery = url.searchParams.get('request-id') || url.searchParams.get('requestId');
  if (fromQuery) return fromQuery;
  const pathname = url.pathname.replace(REQUEST_ENDPOINT, '');
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] ?? 'unsigned-mdl';
}


async function fetchDcRequestFromBackend(
  configurationId: string,
  sessionStore: Map<string, string>
): Promise<unknown> {
  console.log(`Fetching DC request for configurationId: ${configurationId}`);
  const sessionId = await createSession(configurationId);
  sessionStore.set(configurationId, sessionId);
  return requestSessionPayload(sessionId);
}

async function createSession(configurationId: string): Promise<string> {
  console.log(`Creating session for configurationId: ${configurationId}`);
  const sessionRequest = buildSessionCreatePayload(configurationId);
  const response = await fetch(`${VERIFIER_BASE}/verification-session/create`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(sessionRequest)
  });

  console.log(`Session create response status: ${response.status}`);
  console.log(`Session create response : ${JSON.stringify(response)}`);


  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to create verification session (${response.status}): ${text || 'Unknown error'}`
    );
  }

  const responsePayload = (await response.json()) as { sessionId?: string };
  const sessionId = responsePayload.sessionId;
  if (!sessionId) {
    throw new Error('verification-session/create did not return a sessionId');
  }
  return sessionId;
}

function buildSessionCreatePayload(configurationId: string): unknown {

    const path = resolve(configDir, `${configurationId}-conf.json`);
    const raw = fs.readFileSync(path, 'utf8');
    console.log(`raw ${raw}`);
    const sessionCreateConfig = JSON.parse(raw)
    console.log(`sessionCreateConfig ${sessionCreateConfig}`);
    return sessionCreateConfig;
}

async function requestSessionPayload(sessionId: string): Promise<unknown> {
  console.log(`Requesting session payload for sessionId: ${sessionId}`);
  const response = await fetch(`${VERIFIER_BASE}/verification-session/${sessionId}/request`, {
    method: 'GET',
    headers: { 'content-type': 'application/json' }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch DC request (${response.status}): ${text || 'Unknown error'}`);
  }

  return await response.json();
}

async function postCredentialResponse(sessionId: string, payload: unknown): Promise<unknown> {
  const response = await fetch(`${VERIFIER_BASE}/verification-session/${sessionId}/response`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {})
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Verification failed (${response.status}): ${text || 'Unknown error'}`);
  }

  if (response.headers.get('content-type')?.includes('application/json')) {
    return await response.json();
  }
  return {};
}

function getSessionId(configId: string, sessionStore: Map<string, string>): string | undefined {
  if (sessionStore.has(configId)) {
    return sessionStore.get(configId);
  }
  const [, lastSessionId] = [...sessionStore].at(-1) ?? [];
  return lastSessionId;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (!chunks.length) return null;
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function sendJson(res: ServerResponse, payload: unknown): void {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

function sendJsonFile(path: string, res: ServerResponse): void {
  fs.readFile(
    path,
    'utf8',
    (err: NodeJS.ErrnoException | null, data: string | undefined) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain');
        res.end(`Failed to read fixture: ${err.message}`);
        return;
      }
      res.setHeader('content-type', 'application/json');
      res.end(data);
    }
  );
}
