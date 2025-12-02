import fs from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packageRoot = resolve(__dirname, '..');
const configDir = resolve(packageRoot, 'config');

const REQUEST_LIST_PATH = '/api/dc/requests';
const REQUEST_PATH = '/api/dc/request';
const REQUEST_CONFIG_PATH = '/api/dc/request-config';
const RESPONSE_PATH = '/api/dc/response';
const DEFAULT_VERIFIER_BASE = 'https://verifier2.portal.test.waltid.cloud';

type Logger = Pick<typeof console, 'info' | 'error'>;

export type DcDemoBackendOptions = {
  verifierBase?: string;
  logger?: Logger;
};

const normalizePath = (pathname: string): string => {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
};

/**
 * Vite dev-server plugin that exposes a tiny demo backend:
 * - GET /api/dc/request/:requestId -> creates a verification session using config/*-conf.json and returns the DC API payload
 * - POST /api/dc/response -> forwards the credential to the verifier and returns verification info
 */
export function dcDemoBackend(options: DcDemoBackendOptions = {}): Plugin {
  const verifierBase = options.verifierBase ?? process.env.VERIFIER_BASE ?? DEFAULT_VERIFIER_BASE;
  const logger = options.logger ?? console;
  const sessions = new Map<string, string>();

  return {
    name: 'dc-demo-backend',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, 'http://localhost');
        const pathname = normalizePath(url.pathname);

        try {
          if (req.method === 'GET' && pathname === REQUEST_LIST_PATH) {
            const requestIds = await listRequestIds();
            return sendJson(res, requestIds);
          }

          if (req.method === 'GET' && pathname.startsWith(REQUEST_CONFIG_PATH)) {
            const requestId = getRequestId(url, pathname, REQUEST_CONFIG_PATH);
            const config = await readConfig(requestId);
            return sendJson(res, config);
          }

          if (req.method === 'GET' && pathname.startsWith(REQUEST_PATH)) {
            if (pathname === REQUEST_LIST_PATH) return next();
            const requestId = getRequestId(url, pathname);
            const sessionId = await createSession(requestId, verifierBase);
            sessions.set(requestId, sessionId);
            logger.info?.(`[dc-demo-backend] session ${sessionId} created for ${requestId}`);

            const payload = await fetchRequestPayload(sessionId, verifierBase);
            return sendJson(res, payload);
          }

          if (req.method === 'POST' && pathname.startsWith(RESPONSE_PATH)) {
            const requestId = getRequestId(url, pathname);
            const sessionId = sessions.get(requestId) ?? [...sessions.values()].at(-1);
            if (!sessionId) {
              throw new HttpError(400, 'No active session. Fetch the request first.');
            }
            const body = await readJsonBody(req);
            const verification = await postCredentialResponse(sessionId, body, verifierBase);
            logger.info?.(`[dc-demo-backend] verification returned for ${requestId} (session ${sessionId})`);
            return sendJson(res, verification);
          }
        } catch (error) {
          logger.error?.('[dc-demo-backend] request failed', error);
          return sendError(res, error);
        }

        return next();
      });
    }
  };
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getRequestId(url: URL, pathname = url.pathname, basePath = REQUEST_PATH): string {
  const normalized = normalizePath(pathname);
  const fromQuery = url.searchParams.get('request-id') || url.searchParams.get('requestId');
  if (fromQuery) return fromQuery;

  const suffix = normalized.replace(basePath, '');
  const parts = suffix.split('/').filter(Boolean);
  return parts[0] ?? 'unsigned-mdl';
}

async function createSession(requestId: string, verifierBase: string): Promise<string> {
  const config = await readConfig(requestId);
  const response = await fetch(`${verifierBase}/verification-session/create`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(config)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(
      response.status || 500,
      text || `Failed to create verification session (${response.status})`
    );
  }

  const payload = (await response.json()) as { sessionId?: string };
  if (!payload.sessionId) {
    throw new HttpError(500, 'Verifier did not return a sessionId');
  }
  return payload.sessionId;
}

async function fetchRequestPayload(sessionId: string, verifierBase: string): Promise<unknown> {
  const response = await fetch(`${verifierBase}/verification-session/${sessionId}/request`, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status || 500, text || 'Failed to fetch DC request');
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
    throw new HttpError(response.status || 500, text || 'Verification failed');
  }

  return await pollInfo(sessionId, verifierBase);
}

async function pollInfo(sessionId: string, verifierBase: string): Promise<unknown> {
  const maxAttempts = 5;
  let last: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) await sleep(800);
    last = await getInfo(sessionId, verifierBase);
    if (!isProcessing(last)) return last;
  }

  return last;
}

async function getInfo(sessionId: string, verifierBase: string): Promise<unknown> {
  const response = await fetch(`${verifierBase}/verification-session/${sessionId}/info`, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status || 500, text || 'Failed to fetch verification info');
  }

  if (response.headers.get('content-type')?.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
}

async function readConfig(requestId: string): Promise<unknown> {
  const path = resolve(configDir, `${requestId}-conf.json`);

  if (!fs.existsSync(path)) {
    const available = await listRequestIds();
    const hint = available.length ? `Available: ${available.join(', ')}` : 'No configs found in config/.';
    throw new HttpError(404, `No configuration found for "${requestId}". ${hint}`);
  }

  try {
    const raw = await fs.promises.readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Unknown error reading config';
    throw new HttpError(500, `Failed to read config for "${requestId}": ${message}`);
  }
}

async function listRequestIds(): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(configDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('-conf.json'))
      .map((entry) => entry.name.replace(/-conf\.json$/, ''))
      .sort();
  } catch {
    return [];
  }
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

function isProcessing(info: unknown): boolean {
  if (info && typeof info === 'object') {
    const status = (info as { status?: unknown }).status;
    if (typeof status === 'string') {
      const normalized = status.toLowerCase();
      return normalized === 'received' || normalized === 'processing';
    }
  }
  return false;
}

function sendJson(res: ServerResponse, payload: unknown): void {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

function sendError(res: ServerResponse, error: unknown): void {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Unexpected error';
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ message }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
