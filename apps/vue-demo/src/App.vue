<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const REQUEST_ENDPOINT = '/api/dc/request';
const RESPONSE_ENDPOINT = '/api/dc/response';

const btnRef = ref<HTMLElement | null>(null);
const dcResponse = ref<unknown>(null);
const logEntries = ref<string[]>([]);

onMounted(() => {
  const btn = btnRef.value;
  if (!btn) return;
  const handleDcSuccess = (event: Event) => {
    dcResponse.value = (event as CustomEvent).detail?.response ?? null;
    pushLog('credential-dcapi-success', dcResponse.value);
  };
  const handleStarted = () => pushLog('credential-request-started');
  const handleLoaded = (event: Event) =>
    pushLog('credential-request-loaded', (event as CustomEvent).detail?.payload);
  const handleDcError = (event: Event) =>
    pushLog('credential-dcapi-error', (event as CustomEvent).detail?.error);
  const handleVerSuccess = (event: Event) =>
    pushLog('credential-verification-success', (event as CustomEvent).detail?.response);
  const handleVerError = (event: Event) =>
    pushLog('credential-verification-error', (event as CustomEvent).detail?.error);
  const handleFinished = (event: Event) =>
    pushLog('credential-finished', (event as CustomEvent).detail);
  const handleError = (event: Event) => pushLog('credential-error', (event as CustomEvent).detail);

  btn.addEventListener('credential-request-started', handleStarted);
  btn.addEventListener('credential-request-loaded', handleLoaded);
  btn.addEventListener('credential-dcapi-success', handleDcSuccess);
  btn.addEventListener('credential-dcapi-error', handleDcError);
  btn.addEventListener('credential-verification-success', handleVerSuccess);
  btn.addEventListener('credential-verification-error', handleVerError);
  btn.addEventListener('credential-finished', handleFinished);
  btn.addEventListener('credential-error', handleError);

  onBeforeUnmount(() => {
    btn.removeEventListener('credential-request-started', handleStarted);
    btn.removeEventListener('credential-request-loaded', handleLoaded);
    btn.removeEventListener('credential-dcapi-success', handleDcSuccess);
    btn.removeEventListener('credential-dcapi-error', handleDcError);
    btn.removeEventListener('credential-verification-success', handleVerSuccess);
    btn.removeEventListener('credential-verification-error', handleVerError);
    btn.removeEventListener('credential-finished', handleFinished);
    btn.removeEventListener('credential-error', handleError);
  });
});

const formatResponse = (value: unknown): string => {
  try {
    return value ? JSON.stringify(value, null, 2) : '(no response yet)';
  } catch {
    return String(value);
  }
};

const pushLog = (label: string, payload?: unknown) => {
  logEntries.value = [
    ...logEntries.value,
    payload !== undefined ? `${label}:\n${formatResponse(payload)}` : label
  ];
};
</script>

<template>
  <main class="container">
    <h1>Digital Credentials Button (Vue)</h1>
    <p class="lead">
      Minimal Vue starter showing how to include <code>&lt;digital-credentials-button&gt;</code>.
    </p>

    <section class="card" style="margin-bottom: 12px;">
      <p class="muted">
        Point the component at your backend endpoints and it will fetch the request and post the response.
      </p>
      <digital-credentials-button
        ref="btnRef"
        request-id="mdl-age-over-21"
        :request-endpoint="REQUEST_ENDPOINT"
        :response-endpoint="RESPONSE_ENDPOINT"
        label="Request Digital Credentials"
      />
    </section>

    <section class="card">
      <h3 style="margin: 0 0 8px;">Event log</h3>
      <pre>{{ logEntries.length ? logEntries.join('\n\n') : '(no events yet)' }}</pre>
    </section>
  </main>
</template>
