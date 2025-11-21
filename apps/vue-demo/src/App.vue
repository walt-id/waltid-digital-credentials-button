<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { CONFIG_ENDPOINT, MOCK_FLAG_KEY } from '@waltid/dc-mock-utils/install-mocks';

const configEndpoint = CONFIG_ENDPOINT;
const btnRef = ref<HTMLElement | null>(null);
const logEntries = ref<string[]>([]);
const mockEnabled = ref(getMockEnabled());

const logContent = computed(() =>
  logEntries.value.length ? logEntries.value.join('\n\n') : '(click the button to start)'
);

const logLine = (message: string) => {
  logEntries.value = [...logEntries.value, message];
};

const logJson = (label: string, data: unknown) => {
  const pretty = JSON.stringify(data, null, 2);
  logEntries.value = [...logEntries.value, `${label}:\n${pretty}`];
};

const toggleMock = () => {
  const next = !mockEnabled.value;
  localStorage.setItem(MOCK_FLAG_KEY, String(next));
  mockEnabled.value = next;
  const url = new URL(window.location.href);
  url.searchParams.set('dc-mock', next ? '1' : '0');
  window.location.assign(url.toString());
};

onMounted(() => {
  const el = btnRef.value;
  if (!el) return;

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

  el.addEventListener('credential-request-started', handleStarted);
  el.addEventListener('credential-received', handleReceived);
  el.addEventListener('credential-error', handleError);

  onBeforeUnmount(() => {
    el.removeEventListener('credential-request-started', handleStarted);
    el.removeEventListener('credential-received', handleReceived);
    el.removeEventListener('credential-error', handleError);
  });
});

function getMockEnabled(): boolean {
  return localStorage.getItem(MOCK_FLAG_KEY) === 'true';
}
</script>

<template>
  <main>
    <h1>Digital Credentials Button</h1>
    <p class="lead">
      Vue example of the web component that fetches a Digital Credentials API request from a backend,
      calls <code>navigator.credentials.get</code>, and posts the result back.
    </p>

    <section class="card" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <strong>Mock mode</strong>
        <span :style="{ color: mockEnabled ? '#16a34a' : '#dc2626' }">
          {{ mockEnabled ? 'ON' : 'OFF' }}
        </span>
        <button @click="toggleMock">Toggle mock</button>
        <small style="color: #475569">Uses builtin JSON fixtures when enabled.</small>
      </div>
    </section>

    <section class="card">
      <digital-credentials-button
        ref="btnRef"
        :config-endpoint="configEndpoint"
        label="Request credentials"
      ></digital-credentials-button>

      <h3>Event log</h3>
      <pre>{{ logContent }}</pre>
    </section>
  </main>
</template>
