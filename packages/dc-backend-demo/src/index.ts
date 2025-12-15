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
const ANNEX_C_REQUEST_PATH = '/api/dc/annex-c/request';
const REQUEST_CONFIG_PATH = '/api/dc/request-config';
const RESPONSE_PATH = '/api/dc/response';
const ANNEX_C_RESPONSE_PATH = '/api/dc/annex-c/response';
const DEFAULT_VERIFIER_BASE = 'https://verifier2.portal.test.waltid.cloud';

type Logger = Pick<typeof console, 'info' | 'error'>;
type SessionProtocol = 'openid4vp' | 'annex-c';

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

  const sessionKey = (protocol: SessionProtocol, requestId: string) => `${protocol}:${requestId}`;
  const getLatestSessionId = (protocol: SessionProtocol): string | undefined =>
    [...sessions.entries()]
      .reverse()
      .find(([key]) => key.startsWith(`${protocol}:`))
      ?.[1];
  const getSessionId = (protocol: SessionProtocol, requestId: string): string | undefined =>
    sessions.get(sessionKey(protocol, requestId)) ?? getLatestSessionId(protocol);
  const setSessionId = (protocol: SessionProtocol, requestId: string, sessionId: string): void => {
    sessions.set(sessionKey(protocol, requestId), sessionId);
  };

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
            setSessionId('openid4vp', requestId, sessionId);
            logger.info?.(`[dc-demo-backend] session ${sessionId} created for ${requestId}`);

            const payload = await fetchRequestPayload(sessionId, verifierBase);
            return sendJson(res, payload);
          }

          if (req.method === 'POST' && pathname.startsWith(REQUEST_PATH)) {
            const requestId = getRequestId(url, pathname);
            const overrideConfig = await readJsonBody(req);
            if (!overrideConfig || typeof overrideConfig !== 'object') {
              throw new HttpError(400, 'Request payload is required to create a session.');
            }
            const sessionId = await createSession(requestId, verifierBase, overrideConfig);
            setSessionId('openid4vp', requestId, sessionId);
            logger.info?.(
              `[dc-demo-backend] session ${sessionId} created for ${requestId} (custom config)`
            );
            const payload = await fetchRequestPayload(sessionId, verifierBase);
            return sendJson(res, payload);
          }

          if (req.method === 'POST' && pathname.startsWith(RESPONSE_PATH)) {
            const requestId = getRequestId(url, pathname);
            const sessionId = getSessionId('openid4vp', requestId);
            if (!sessionId) {
              throw new HttpError(400, 'No active session. Fetch the request first.');
            }
            const body = await readJsonBody(req);
            const verification = await postCredentialResponse(sessionId, body, verifierBase);
            logger.info?.(`[dc-demo-backend] verification returned for ${requestId} (session ${sessionId})`);
            return sendJson(res, verification);
          }

          if (req.method === 'GET' && pathname.startsWith(ANNEX_C_REQUEST_PATH)) {
            const requestId = getRequestId(url, pathname, ANNEX_C_REQUEST_PATH);
            const origin = getRequestOrigin(req);
            const sessionId = await createAnnexCSession(requestId, verifierBase, origin);
            setSessionId('annex-c', requestId, sessionId);
            logger.info?.(`[dc-demo-backend] annex-c session ${sessionId} created for ${requestId}`);
            const payload = await fetchAnnexCRequestPayload(sessionId, verifierBase);
            return sendJson(res, payload);
          }

          if (req.method === 'POST' && pathname.startsWith(ANNEX_C_REQUEST_PATH)) {
            const requestId = getRequestId(url, pathname, ANNEX_C_REQUEST_PATH);
            const origin = getRequestOrigin(req);
            const overrideConfig = await readJsonBody(req);
            if (!overrideConfig || typeof overrideConfig !== 'object') {
              throw new HttpError(400, 'Request payload is required to create a session.');
            }
            const sessionId = await createAnnexCSession(requestId, verifierBase, origin, overrideConfig);
            setSessionId('annex-c', requestId, sessionId);
            logger.info?.(`[dc-demo-backend] annex-c session ${sessionId} created for ${requestId} (custom config)`);
            const payload = await fetchAnnexCRequestPayload(sessionId, verifierBase);
            return sendJson(res, payload);
          }

          if (req.method === 'POST' && pathname.startsWith(ANNEX_C_RESPONSE_PATH)) {
            const requestId = getRequestId(url, pathname, ANNEX_C_RESPONSE_PATH);
            const sessionId = getSessionId('annex-c', requestId);
            if (!sessionId) {
              throw new HttpError(400, 'No active Annex C session. Fetch the request first.');
            }
            const body = await readJsonBody(req);
            const verification = await postAnnexCResponse(sessionId, body, verifierBase);
            logger.info?.(
              `[dc-demo-backend] annex-c verification returned for ${requestId} (session ${sessionId})`
            );
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

async function createSession(
  requestId: string,
  verifierBase: string,
  overrideConfig?: unknown
): Promise<string> {
  const config = overrideConfig ?? (await readConfig(requestId));
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

type AnnexCCreateRequest = {
  docType: string;
  requestedElements: Record<string, string[]>;
  policies?: string[];
  origin: string;
};

async function createAnnexCSession(
  requestId: string,
  verifierBase: string,
  origin: string,
  overrideConfig?: unknown
): Promise<string> {
  const config = overrideConfig ?? (await readConfig(requestId));
  const createPayload = toAnnexCCreateRequest(config, origin);
  const response = await fetch(`${verifierBase}/annex-c/create`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status || 500, text || `Failed to create Annex C session (${response.status})`);
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

async function fetchAnnexCRequestPayload(sessionId: string, verifierBase: string): Promise<unknown> {
  const response = await fetch(`${verifierBase}/annex-c/request`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ sessionId, intentToRetain: false })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status || 500, text || 'Failed to fetch Annex C DC request');
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

async function postAnnexCResponse(sessionId: string, payload: unknown, verifierBase: string): Promise<unknown> {
  const responseB64 = extractAnnexCResponseB64(payload);
  const response = await fetch(`${verifierBase}/annex-c/response`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sessionId, response: responseB64 })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status || 500, text || 'Annex C verification failed');
  }

  return await pollAnnexCInfo(sessionId, verifierBase);
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

async function pollAnnexCInfo(sessionId: string, verifierBase: string): Promise<unknown> {
  const maxAttempts = 10;
  let last: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) await sleep(500);
    last = await getAnnexCInfo(sessionId, verifierBase);
    if (!isAnnexCProcessing(last)) return last;
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

async function getAnnexCInfo(sessionId: string, verifierBase: string): Promise<unknown> {
  const url = new URL(`${verifierBase}/annex-c/info`);
  url.searchParams.set('sessionId', sessionId);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status || 500, text || 'Failed to fetch Annex C info');
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

function isAnnexCProcessing(info: unknown): boolean {
  if (info && typeof info === 'object') {
    const status = (info as { status?: unknown }).status;
    if (typeof status === 'string') {
      const normalized = status.toLowerCase();
      return (
        normalized === 'created' ||
        normalized === 'received' ||
        normalized === 'pending' ||
        normalized === 'processing'
      );
    }
  }
  return false;
}

function extractAnnexCResponseB64(payload: unknown): string {
  const credential = extractCredentialPayload(payload);
  if (typeof credential === 'string') return credential;

  if (credential && typeof credential === 'object') {
    const obj = credential as Record<string, unknown>;
    const direct = obj.response ?? obj.encryptedResponse;
    if (typeof direct === 'string') return direct;

    const data = obj.data;
    if (data && typeof data === 'object') {
      const nested = (data as Record<string, unknown>).response ?? (data as Record<string, unknown>).encryptedResponse;
      if (typeof nested === 'string') return nested;
    }
  }

  throw new HttpError(
    400,
    'Annex C response must contain a base64url EncryptedResponse string (e.g., credential.data.response).'
  );
}

function extractCredentialPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const obj = payload as Record<string, unknown>;
  return obj.credential ?? payload;
}

function toAnnexCCreateRequest(input: unknown, origin: string): AnnexCCreateRequest {
  if (isAnnexCCreateRequest(input)) {
    const obj = input as Record<string, unknown>;
    const providedPolicies = Array.isArray(obj.policies) ? (obj.policies as unknown[]) : undefined;
    const policies = providedPolicies
      ? providedPolicies
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : ['mdoc-device-auth', 'mdoc-issuer-auth'];

    const ttlSeconds = typeof obj.ttlSeconds === 'number' ? obj.ttlSeconds : undefined;
    return {
      docType: String(obj.docType),
      requestedElements: obj.requestedElements as Record<string, string[]>,
      policies,
      origin,
      ...(ttlSeconds ? { ttlSeconds } : {})
    };
  }

  const legacy = input && typeof input === 'object' ? (input as Record<string, unknown>) : null;
  const core = legacy && legacy.core && typeof legacy.core === 'object' ? (legacy.core as Record<string, unknown>) : null;
  const dcql = core && core.dcql_query && typeof core.dcql_query === 'object' ? (core.dcql_query as any) : null;
  const credentials = dcql && Array.isArray(dcql.credentials) ? (dcql.credentials as unknown[]) : [];
  const firstCred = credentials.find((entry) => entry && typeof entry === 'object') as any;
  const docType =
    firstCred?.meta && typeof firstCred.meta === 'object' ? (firstCred.meta as any).doctype_value : undefined;

  const requestedElements: Record<string, string[]> = {};
  const claims = Array.isArray(firstCred?.claims) ? firstCred.claims : [];
  for (const claim of claims) {
    const path = (claim as any)?.path;
    if (!Array.isArray(path) || path.length < 2) continue;
    const namespace = String(path[0] ?? '').trim();
    const element = String(path[1] ?? '').trim();
    if (!namespace || !element) continue;
    requestedElements[namespace] ??= [];
    if (!requestedElements[namespace].includes(element)) requestedElements[namespace].push(element);
  }

  if (!docType || typeof docType !== 'string') {
    throw new HttpError(400, 'Annex C create requires a docType (expected core.dcql_query.credentials[0].meta.doctype_value).');
  }
  if (!Object.keys(requestedElements).length) {
    throw new HttpError(
      400,
      'Annex C create requires requestedElements (expected core.dcql_query.credentials[0].claims[].path).'
    );
  }

  const policies = Array.isArray(legacy?.policies)
    ? (legacy?.policies as unknown[])
    : Array.isArray(core?.policies)
      ? (core?.policies as unknown[])
      : undefined;

  const normalizedPolicies = policies
    ? policies.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
    : ['mdoc-device-auth', 'mdoc-issuer-auth'];

  return { docType, requestedElements, policies: normalizedPolicies, origin };
}

function isAnnexCCreateRequest(input: unknown): input is AnnexCCreateRequest {
  if (!input || typeof input !== 'object') return false;
  const obj = input as Record<string, unknown>;
  if (typeof obj.docType !== 'string') return false;
  if (!obj.requestedElements || typeof obj.requestedElements !== 'object') return false;
  return true;
}

function getRequestOrigin(req: IncomingMessage): string {
  const headerOrigin = req.headers.origin;
  if (typeof headerOrigin === 'string' && headerOrigin.trim()) return headerOrigin.trim();

  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto =
    typeof forwardedProto === 'string' && forwardedProto.trim()
      ? forwardedProto.split(',')[0].trim()
      : 'http';
  const host = req.headers.host;
  if (typeof host === 'string' && host.trim()) return `${proto}://${host.trim()}`;
  return `${proto}://localhost`;
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
