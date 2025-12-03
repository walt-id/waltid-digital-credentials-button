<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

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

const urlState = new URL(window.location.href);
const requestId = ref(urlState.searchParams.get('request-id') || 'unsigned-mdl');
const showCredential = ref(resolveShowCredential());
const signedEnabled = ref(resolveSignedEnabled());
const encryptedEnabled = ref(resolveEncryptedEnabled());
const logEntries = ref<string[]>([]);
const logContent = computed(() =>
  logEntries.value.length ? logEntries.value.join('\n\n') : '(click the button to start)'
);

const modalVisible = ref(false);
const credential = ref<MinimalCredential>({});
const btnRef = ref<HTMLElement | null>(null);
let payloadSyncToken = 0;

const logLine = (message: string) => {
  logEntries.value = [...logEntries.value, message];
};

const logJson = (label: string, payload: unknown) => {
  const pretty = JSON.stringify(payload, null, 2);
  logEntries.value = [...logEntries.value, `${label}:\n${pretty}`];
};

const clearLog = () => {
  logEntries.value = [];
};

const hideModal = () => {
  modalVisible.value = false;
};

const toggleShowCredential = () => {
  const next = !showCredential.value;
  showCredential.value = next;
  writeBooleanSetting('dc-show-credential', next);
};

const toggleSigned = () => {
  const next = !signedEnabled.value;
  signedEnabled.value = next;
  writeBooleanSetting(SIGNED_REQUEST_KEY, next);
};

const toggleEncrypted = () => {
  const next = !encryptedEnabled.value;
  encryptedEnabled.value = next;
  writeBooleanSetting(ENCRYPTED_RESPONSE_KEY, next);
};

const handleRequestChange = (value: string) => {
  requestId.value = value;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('request-id', value);
  window.history.replaceState({}, '', nextUrl.toString());
  primeButton();
  logLine(`request-id set to ${value}`);
};

const syncRequestPayload = async () => {
  const currentSync = ++payloadSyncToken;
  const el = btnRef.value;
  if (!el) return;
  const activeRequestId = requestId.value;
  const baseConfig = await fetchRequestConfig(activeRequestId);
  if (currentSync !== payloadSyncToken || activeRequestId !== requestId.value) return;
  if (!baseConfig || typeof baseConfig !== 'object') {
    el.removeAttribute('request-payload');
    return;
  }
  const patched = applySigningOptions(baseConfig, signedEnabled.value, encryptedEnabled.value);
  if (!patched || typeof patched !== 'object') {
    el.removeAttribute('request-payload');
    return;
  }
  if (currentSync !== payloadSyncToken) return;
  try {
    el.setAttribute('request-payload', JSON.stringify(patched));
  } catch (error) {
    console.error('Failed to serialize request payload', error);
    el.removeAttribute('request-payload');
  }
};

watch([requestId, signedEnabled, encryptedEnabled], () => {
  void syncRequestPayload();
}, { immediate: true });

onMounted(() => {
  const el = btnRef.value;
  if (!el) return;
  primeButton();
  void syncRequestPayload();

  const handleStarted = () => {
    hideModal();
    logLine(`[${requestId.value}] credential request started`);
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
    if (showCredential.value) {
      credential.value = extractFirstCredential(payload);
      modalVisible.value = true;
    }
  };
  const handleVerError = (event: Event) =>
    logJson('Verification error', (event as CustomEvent).detail?.error);
  const handleError = (event: Event) => logJson('Flow error', (event as CustomEvent).detail);

  el.addEventListener('credential-request-started', handleStarted);
  el.addEventListener('credential-request-loaded', handleRequestLoaded);
  el.addEventListener('credential-dcapi-success', handleDcSuccess);
  el.addEventListener('credential-dcapi-error', handleDcError);
  el.addEventListener('credential-verification-success', handleVerSuccess);
  el.addEventListener('credential-verification-error', handleVerError);
  el.addEventListener('credential-error', handleError);

  const escListener = (event: KeyboardEvent) => {
    if (event.key === 'Escape') hideModal();
  };
  document.addEventListener('keydown', escListener);

  onBeforeUnmount(() => {
    el.removeEventListener('credential-request-started', handleStarted);
    el.removeEventListener('credential-request-loaded', handleRequestLoaded);
    el.removeEventListener('credential-dcapi-success', handleDcSuccess);
    el.removeEventListener('credential-dcapi-error', handleDcError);
    el.removeEventListener('credential-verification-success', handleVerSuccess);
    el.removeEventListener('credential-verification-error', handleVerError);
    el.removeEventListener('credential-error', handleError);
    document.removeEventListener('keydown', escListener);
  });
});

function primeButton(): void {
  const el = btnRef.value;
  if (!el) return;
  el.setAttribute('request-id', requestId.value);
  el.setAttribute('request-endpoint', REQUEST_ENDPOINT);
  el.setAttribute('response-endpoint', RESPONSE_ENDPOINT);
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
</script>

<template>
  <main>
    <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:12px;">
      <img src="/waltid-logo.svg" alt="walt.id logo" style="height:48px; width:auto;" />
      <h1 style="margin:0;">Digital Credentials Button</h1>
    </div>
    <p class="lead">
      Vue example of the web component backed by the demo backend. It fetches a Digital Credentials API request,
      calls <code>navigator.credentials.get</code>, and posts the result back.
    </p>

    <section class="card" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <label for="request-select"><strong>Request</strong></label>
        <select
          id="request-select"
          style="min-width: 200px; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0;"
          :value="requestId"
          @change="handleRequestChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="unsigned-mdl">unsigned-mdl</option>
          <option value="signed-mdl">signed-mdl</option>
          <option value="encrypted-mdl">encrypted-mdl</option>
          <option value="unsigned-encrypted-mdl">unsigned-encrypted-mdl</option>
          <option value="signed-encrypted-mdl">signed-encrypted-mdl</option>
          <option value="unsigned-photoid">unsigned-photoid</option>
          <option value="signed-photoid">signed-photoid</option>
        </select>
        <div style="margin-left: auto; display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            <strong>Signed</strong>
            <label class="toggle" aria-label="Toggle signed request">
              <input type="checkbox" :checked="signedEnabled" @change="toggleSigned" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            <strong>Encrypted</strong>
            <label class="toggle" aria-label="Toggle encrypted response">
              <input type="checkbox" :checked="encryptedEnabled" @change="toggleEncrypted" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            <strong>Show Credential</strong>
            <label class="toggle" aria-label="Toggle credential visibility">
              <input type="checkbox" :checked="showCredential" @change="toggleShowCredential" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;">
        <digital-credentials-button
          ref="btnRef"
          request-endpoint="/api/dc/request"
          response-endpoint="/api/dc/response"
          label="Request Digital Credentials"
        ></digital-credentials-button>
        <button id="clear-log" type="button" class="dc-btn dc-btn-secondary" @click="clearLog">
          Clear log
        </button>
      </div>

      <h3>Event log</h3>
      <pre>{{ logContent }}</pre>
    </section>

    <div
      v-if="modalVisible"
      class="modal-backdrop"
      @click="(e) => e.target === e.currentTarget && hideModal()"
    >
      <div class="modal license-card">
        <div class="license-header">
          <div class="license-title">Driving License</div>
          <button type="button" aria-label="Close credential modal" @click="hideModal">×</button>
        </div>
        <div class="license-body">
          <div class="license-photo">PHOTO</div>
          <div class="license-fields">
            <div class="field">
              <span class="label">First Name</span>
              <span class="value">{{ credential.givenName || '—' }}</span>
            </div>
            <div class="field">
              <span class="label">Family Name</span>
              <span class="value">{{ credential.familyName || '—' }}</span>
            </div>
            <div class="field">
              <span class="label">Age over 21</span>
              <span class="value">
                {{
                  credential.ageOver21 === undefined
                    ? '—'
                    : credential.ageOver21
                      ? 'Yes'
                      : 'No'
                }}
              </span>
            </div>
            <div class="field">
              <span class="label">Date</span>
              <span class="value">{{ credential.date || '—' }}</span>
            </div>
          </div>
        </div>
        <div class="license-footer">
          <span class="issuer">Issuer: {{ credential.issuer || '—' }}</span>
        </div>
      </div>
    </div>
  </main>
</template>
