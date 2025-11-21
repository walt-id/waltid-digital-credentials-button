<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { REQUEST_ENDPOINT, RESPONSE_ENDPOINT, MOCK_FLAG_KEY } from '@waltid/dc-mock-utils/install-mocks';

type MinimalCredential = {
  givenName?: string;
  familyName?: string;
  date?: string;
  issuer?: string;
};

const urlState = new URL(window.location.href);
const requestId = ref(urlState.searchParams.get('request-id') || 'unsigned-mdl');
const mockEnabled = ref(resolveInitialMock());
const showCredential = ref(resolveShowCredential());
const logEntries = ref<string[]>([]);
const logContent = computed(() =>
  logEntries.value.length ? logEntries.value.join('\n\n') : '(click the button to start)'
);

const modalVisible = ref(false);
const credential = ref<MinimalCredential>({});
const btnRef = ref<HTMLElement | null>(null);

const logLine = (message: string) => {
  logEntries.value = [...logEntries.value, message];
};

const logJson = (label: string, payload: unknown) => {
  const pretty = JSON.stringify(payload, null, 2);
  logEntries.value = [...logEntries.value, `${label}:\n${pretty}`];
};

const logDcResponse = (response: unknown) => {
  if (showCredential.value) {
    logJson('Digital Credentials API response', response);
  } else {
    logJson('Digital Credentials API response', { hidden: true });
  }
};

const handleVerificationSuccess = (response: unknown) => {
  logJson('Credential Verification response', response);
  if (showCredential.value) {
    credential.value = extractFirstCredential(response);
    modalVisible.value = true;
  }
};

const clearLog = () => {
  logEntries.value = [];
};

const hideModal = () => {
  modalVisible.value = false;
};

const toggleMock = () => {
  const next = !mockEnabled.value;
  localStorage.setItem(MOCK_FLAG_KEY, String(next));
  mockEnabled.value = next;
  const url = new URL(window.location.href);
  url.searchParams.set('dc-mock', next ? '1' : '0');
  window.history.replaceState({}, '', url.toString());
  primeButton();
};

const toggleShowCredential = () => {
  const next = !showCredential.value;
  showCredential.value = next;
  localStorage.setItem('dc-show-credential', String(next));
};

const handleRequestChange = (value: string) => {
  requestId.value = value;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('request-id', value);
  window.history.replaceState({}, '', nextUrl.toString());
  primeButton();
  logLine(`[info] switched request-id to ${value}`);
};

onMounted(() => {
  const el = btnRef.value;
  if (!el) return;
  primeButton();

  const handleStarted = (event: Event) => {
    hideModal();
    logLine(
      `[started] credential-request-started (${(event as CustomEvent).detail?.requestId ?? requestId.value})`
    );
  };
  const handleRequestLoaded = (event: Event) =>
    logJson('Digital Credentials API request', (event as CustomEvent).detail?.payload);
  const handleDcSuccess = (event: Event) =>
    logDcResponse((event as CustomEvent).detail?.response);
  const handleDcError = (event: Event) =>
    logJson('[error:dc-api]', (event as CustomEvent).detail?.error);
  const handleVerSuccess = (event: Event) =>
    handleVerificationSuccess((event as CustomEvent).detail?.response);
  const handleVerError = (event: Event) =>
    logJson('[error:verification]', (event as CustomEvent).detail?.error);
  const handleError = (event: Event) => logJson('[error]', (event as CustomEvent).detail);

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
  if (mockEnabled.value) {
    el.setAttribute('mock', 'true');
  } else {
    el.removeAttribute('mock');
  }
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
</script>

<template>
  <main>
    <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:12px;">
      <img src="/waltid-logo.svg" alt="walt.id logo" style="height:48px; width:auto;" />
      <h1 style="margin:0;">Digital Credentials Button</h1>
    </div>
    <p class="lead">
      Vue example of the web component that fetches a Digital Credentials API request from a backend,
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
          <option value="unsigned-photoid">unsigned-photoid</option>
          <option value="signed-photoid">signed-photoid</option>
        </select>
        <div style="margin-left: auto; display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            <strong>Show Credential</strong>
            <label class="toggle" aria-label="Toggle credential visibility">
              <input type="checkbox" :checked="showCredential" @change="toggleShowCredential" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <strong>Mock mode</strong>
            <label class="toggle" aria-label="Toggle mock mode">
              <input type="checkbox" :checked="mockEnabled" @change="toggleMock" />
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
              <span class="label">Date</span>
              <span class="value">{{ credential.date || '—' }}</span>
            </div>
            <div class="field muted">
              <span class="label">Additional fields</span>
              <span class="value">Coming soon</span>
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
