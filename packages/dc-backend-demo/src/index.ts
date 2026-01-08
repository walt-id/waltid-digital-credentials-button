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
  const log = (message: string, payload?: unknown) => {
    if (payload === undefined) {
      logger.info?.(message);
      return;
    }
    logger.info?.(`${message} ${safeJson(payload)}`);
  };

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
          log('[dc-demo-backend] incoming request', {
            method: req.method,
            path: pathname,
            query: Object.fromEntries(url.searchParams.entries())
          });
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
            log('[dc-demo-backend] session created', { requestId, sessionId, protocol: 'openid4vp' });

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
            log('[dc-demo-backend] session created (custom config)', {
              requestId,
              sessionId,
              protocol: 'openid4vp'
            });
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
            log('[dc-demo-backend] verification returned', {
              requestId,
              sessionId,
              protocol: 'openid4vp'
            });
            return sendJson(res, verification);
          }

          if (req.method === 'GET' && pathname.startsWith(ANNEX_C_REQUEST_PATH)) {
            const requestId = getRequestId(url, pathname, ANNEX_C_REQUEST_PATH);
            const origin = getRequestOrigin(req);
            const sessionId = await createAnnexCSession(requestId, verifierBase, origin);
            setSessionId('annex-c', requestId, sessionId);
            log('[dc-demo-backend] annex-c session created', {
              requestId,
              sessionId,
              origin
            });
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
            log('[dc-demo-backend] annex-c override config', {
              requestId,
              origin,
              keys: Object.keys(overrideConfig)
            });
            const sessionId = await createAnnexCSession(requestId, verifierBase, origin, overrideConfig);
            setSessionId('annex-c', requestId, sessionId);
            log('[dc-demo-backend] annex-c session created (custom config)', {
              requestId,
              sessionId,
              origin
            });
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
            log('[dc-demo-backend] annex-c verification returned', {
              requestId,
              sessionId
            });
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
  flow_type: 'dc_api-annex-c';
  docType: string;
  requestedElements: Record<string, string[]>;
  policies?: Record<string, unknown>;
  origin: string;
  ttlSeconds?: number;
};

async function createAnnexCSession(
  requestId: string,
  verifierBase: string,
  origin: string,
  overrideConfig?: unknown
): Promise<string> {
  const config = overrideConfig ?? (await readConfig(requestId));
  const createPayload = toAnnexCCreateRequest(config, origin);
  console.info('[dc-demo-backend] annex-c create payload', summarizeAnnexCPayload(createPayload));
  const response = await fetch(`${verifierBase}/verification-session/create`, {
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
  const url = new URL(`${verifierBase}/verification-session/${sessionId}/request`);
  url.searchParams.set('intentToRetain', 'false');
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json'
    }
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
  const response = await fetch(`${verifierBase}/verification-session/${sessionId}/response`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ response: responseB64 })
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
    last = await getInfo(sessionId, verifierBase);
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
    const policies = isPolicyObject(obj.policies) ? obj.policies : undefined;
    const ttlSeconds = typeof obj.ttlSeconds === 'number' ? obj.ttlSeconds : undefined;
    return {
      flow_type: 'dc_api-annex-c',
      docType: String(obj.docType),
      requestedElements: obj.requestedElements as Record<string, string[]>,
      origin,
      ...(policies ? { policies } : {}),
      ...(ttlSeconds ? { ttlSeconds } : {})
    };
  }

  const legacy = input && typeof input === 'object' ? (input as Record<string, unknown>) : null;
  const core = legacy && legacy.core && typeof legacy.core === 'object' ? (legacy.core as Record<string, unknown>) : null;
  const dcqlCandidate =
    core && typeof core === 'object'
      ? ((core.dcql_query ?? core.dcqlQuery) as Record<string, unknown> | undefined)
      : undefined;
  const dcql = dcqlCandidate && typeof dcqlCandidate === 'object' ? (dcqlCandidate as any) : null;
  const credentials = dcql && Array.isArray(dcql.credentials) ? (dcql.credentials as unknown[]) : [];
  const firstCred = credentials.find((entry) => entry && typeof entry === 'object') as any;
  const meta = firstCred?.meta && typeof firstCred.meta === 'object' ? (firstCred.meta as any) : null;
  const docType = meta ? meta.doctype_value ?? meta.doctypeValue ?? meta.docType : undefined;

  const requestedElements: Record<string, string[]> = {};
  const claims = Array.isArray(firstCred?.claims)
    ? firstCred.claims
    : Array.isArray(firstCred?.claims_query)
      ? firstCred.claims_query
      : [];
  for (const claim of claims) {
    const path = (claim as any)?.path ?? (claim as any)?.claim_path;
    let namespace = '';
    let element = '';
    if (Array.isArray(path) && path.length >= 2) {
      namespace = String(path[0] ?? '').trim();
      element = String(path[1] ?? '').trim();
    } else if (typeof path === 'string') {
      const parts = path.split('.').map((part: string) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        namespace = parts[0] ?? '';
        element = parts[1] ?? '';
      }
    }
    if (!namespace || !element) continue;
    requestedElements[namespace] ??= [];
    if (!requestedElements[namespace].includes(element)) requestedElements[namespace].push(element);
  }

  if (!docType || typeof docType !== 'string') {
    throw new HttpError(
      400,
      'Annex C create requires a docType (expected core.dcql_query/core.dcqlQuery.credentials[0].meta.doctype_value).'
    );
  }
  if (!Object.keys(requestedElements).length) {
    throw new HttpError(
      400,
      'Annex C create requires requestedElements (expected core.dcql_query/core.dcqlQuery.credentials[0].claims[].path).'
    );
  }

  const policies = Array.isArray(legacy?.policies)
    ? undefined
    : isPolicyObject(legacy?.policies)
      ? legacy?.policies
      : isPolicyObject(core?.policies)
        ? core?.policies
        : undefined;
  const ttlSeconds = typeof legacy?.ttlSeconds === 'number' ? (legacy?.ttlSeconds as number) : undefined;

  return {
    flow_type: 'dc_api-annex-c',
    docType,
    requestedElements,
    origin,
    ...(policies ? { policies } : {}),
    ...(ttlSeconds ? { ttlSeconds } : {})
  };
}

function isAnnexCCreateRequest(input: unknown): input is AnnexCCreateRequest {
  if (!input || typeof input !== 'object') return false;
  const obj = input as Record<string, unknown>;
  if (typeof obj.docType !== 'string') return false;
  if (!obj.requestedElements || typeof obj.requestedElements !== 'object') return false;
  return true;
}

function isPolicyObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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

function summarizeAnnexCPayload(payload: AnnexCCreateRequest): Record<string, unknown> {
  const requestedNamespaces = Object.keys(payload.requestedElements || {});
  return {
    flow_type: payload.flow_type,
    docType: payload.docType,
    namespaces: requestedNamespaces.length,
    origin: payload.origin,
    ttlSeconds: payload.ttlSeconds ?? null,
    policyKeys: payload.policies ? Object.keys(payload.policies) : []
  };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
