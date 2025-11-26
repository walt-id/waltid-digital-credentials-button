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

const DEFAULT_VERIFIER_BASE = 'https://verifier2.portal.test.waltid.cloud';
const RESPONSE_ENDPOINT = '/api/dc/response';
const REQUEST_ENDPOINT = '/api/dc/request';

export interface DcMockPluginOptions {
  configPath?: string;
  dcApiResponsePath?: string;
  backendResponsePath?: string;
  verifierBase?: string;
}

export function dcMockPlugin(options: DcMockPluginOptions = {}): Plugin {
  const configPath = options.configPath ?? requestFixturePath;
  const dcApiResponsePath = options.dcApiResponsePath ?? dcApiFixturePath;
  const backendResponsePath = options.backendResponsePath ?? verificationFixturePath;
  const sessionStore = new Map<string, string>();
  const verifierBase = resolveVerifierBase(options.verifierBase);

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
          const fixtures = resolveFixturePaths(configId, {
            request: configPath,
            dcApiResponse: dcApiResponsePath,
            verified: backendResponsePath
          });

          if (req.method?.toUpperCase() === 'GET' && isRequest) {
            if (mock) {
              return sendJsonFile(fixtures.request, res);
            }
            const dcRequest = await fetchDcRequestFromBackend(configId, sessionStore, verifierBase);
            return sendJson(res, dcRequest);
          }

          if (req.method?.toUpperCase() === 'POST' && (isRequest || isResponse)) {
            const payload = await readJsonBody(req);

            if (mock) {
              return sendJsonFile(isRequest ? fixtures.dcApiResponse : fixtures.verified, res);
            }

            const sessionId = getSessionId(configId, sessionStore);
            if (!sessionId) {
              res.statusCode = 400;
              res.end('No active session. Fetch a DC request first.');
              return;
            }

            const verification = await postCredentialResponse(sessionId, payload, verifierBase);
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

type FixturePaths = {
  request: string;
  dcApiResponse: string;
  verified: string;
};

function resolveFixturePaths(configId: string, defaults: FixturePaths): FixturePaths {
  return {
    request: resolveFixturePath(`${configId}-request.json`, defaults.request),
    dcApiResponse: resolveFixturePath(`${configId}-response.json`, defaults.dcApiResponse),
    verified: resolveFixturePath(`${configId}-verified.json`, defaults.verified)
  };
}

function resolveFixturePath(filename: string, fallback: string): string {
  const candidate = resolve(fixturesDir, filename);
  return fs.existsSync(candidate) ? candidate : fallback;
}


async function fetchDcRequestFromBackend(
  configurationId: string,
  sessionStore: Map<string, string>,
  verifierBase: string
): Promise<unknown> {
  console.log(`Fetching DC request for configurationId: ${configurationId}`);
  const sessionId = await createSession(configurationId, verifierBase);
  sessionStore.set(configurationId, sessionId);
  return requestSessionPayload(sessionId, verifierBase);
}

async function createSession(configurationId: string, verifierBase: string): Promise<string> {
  const sessionRequest = buildSessionCreatePayload(configurationId);
  const response = await fetch(`${verifierBase}/verification-session/create`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(sessionRequest)
  });


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
    const sessionCreateConfig = JSON.parse(raw)
    return sessionCreateConfig;
}

async function requestSessionPayload(sessionId: string, verifierBase: string): Promise<unknown> {
  console.log(`Requesting session payload for sessionId: ${sessionId}`);
  const response = await fetch(`${verifierBase}/verification-session/${sessionId}/request`, {
    method: 'GET',
    headers: { 'content-type': 'application/json' }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch DC request (${response.status}): ${text || 'Unknown error'}`);
  }

  return await response.json();
}

async function postCredentialResponse(
  sessionId: string,
  payload: unknown,
  verifierBase: string
): Promise<unknown> {
  const response = await fetch(`${verifierBase}/verification-session/${sessionId}/response`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {})
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Verification failed (${response.status}): ${text || 'Unknown error'}`);
  }

  // Even when the response call succeeds, the verification payload must be fetched via /info.
  const infoResponse = await fetch(`${verifierBase}/verification-session/${sessionId}/info`, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });

  if (!infoResponse.ok) {
    const text = await infoResponse.text();
    throw new Error(`Failed to fetch verification info (${infoResponse.status}): ${text || 'Unknown error'}`);
  }

  if (infoResponse.headers.get('content-type')?.includes('application/json')) {
    return await infoResponse.json();
  }
  return await infoResponse.text();
}

function getSessionId(configId: string, sessionStore: Map<string, string>): string | undefined {
  if (sessionStore.has(configId)) {
    return sessionStore.get(configId);
  }
  const [, lastSessionId] = [...sessionStore].at(-1) ?? [];
  return lastSessionId;
}

function resolveVerifierBase(optionVerifierBase?: string): string {
  return optionVerifierBase ?? process.env.VERIFIER_BASE ?? DEFAULT_VERIFIER_BASE;
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
