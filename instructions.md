Here’s a Codex-friendly task you can paste directly into your Coding Agent.

I’ll phrase it as a **single, self-contained prompt** with clear requirements and acceptance criteria.

---

## Codex Task: Implement a “Digital Credential Request” Web Component

### 1. Goal

Implement a reusable **Web Component** (custom element) in **TypeScript** called `<digital-credentials-button>` that:

1. Renders a **“Request credentials”** button (label customizable via attribute).
2. On click:

   * Fetches a **credential request configuration** from our backend.
   * Calls the **Digital Credential API** via `navigator.credentials.get(...)`.
   * Sends the result back to the backend for **verification & processing**.
3. Emits a custom DOM event so host applications can react to success/error.
4. Is published as a small, framework-agnostic **NPM package** that OSS users can drop into any frontend (plain HTML, React, Vue, etc.).

Focus on a clean, minimal implementation that is easy to understand and extend.

---

### 2. Tech Stack & Project Setup

* Language: **TypeScript**
* Target: modern browsers (ES modules)
* Build tool: **Vite** or **Rollup** (pick one and configure a tiny build)
* Output:

  * ESM bundle suitable for import via:

    ```ts
    import '@waltid/digital-credentials-wc';
    ```
  * Also usable directly via `<script type="module" …>` from a CDN.
* Package name (for now): `@waltid/digital-credentials-wc` (configure `package.json` accordingly).

**Tasks:**

1. Create a small library project (can be a standalone repo structure, e.g.):

   ```
   /src
     digital-credentials-button.ts
     index.ts
   package.json
   tsconfig.json
   vite.config.ts (or rollup.config.mjs)
   ```
2. Ensure `npm run build` produces a single ESM bundle that defines the custom element.

---

### 3. Custom Element API

Implement a custom element named: **`digital-credentials-button`**.

#### 3.1. Attributes / Properties

The component must support:

1. `config-endpoint` (string, **required**)

   * URL for the backend endpoint that provides the DC API request configuration and receives the result.
   * Example: `/api/dc/config`
2. `label` (string, optional)

   * Button label text.
   * Default: `"Request credentials"`.
3. `method` (string, optional)

   * HTTP method used to send the result back to backend.
   * Default: `"POST"`.

All attributes should be reflected to internal state and usable as DOM attributes:

```html
<digital-credentials-button
  config-endpoint="/api/dc/config"
  label="Connect my wallet"
></digital-credentials-button>
```

Also support **setting via properties** on the element instance:

```ts
const btn = document.querySelector('digital-credentials-button');
btn.configEndpoint = '/api/dc/config';
btn.label = 'Request credentials';
```

Define appropriate TypeScript types for the element.

#### 3.2. Events

The component must dispatch **CustomEvents** on the element itself:

1. `credential-request-started`

   * Fired when the click is handled and the flow begins (before network/DC API calls).
2. `credential-received`

   * Fired when the DC API returns a credential and the backend accepts it successfully.
   * `event.detail` must contain:

     * `credential`: the credential returned from `navigator.credentials.get`.
     * `backendResponse`: the parsed JSON response from the backend.
3. `credential-error`

   * Fired when something fails (fetch config, DC API error, backend error, unsupported browser, etc.).
   * `event.detail` must contain at least:

     * `stage`: a string indicating where it failed, e.g. `"config-fetch" | "dc-api" | "backend" | "unsupported"`.
     * `error`: a descriptive error message or object.

Example usage:

```js
const el = document.querySelector('digital-credentials-button');

el.addEventListener('credential-received', (e) => {
  console.log('Credential flow success', e.detail);
});

el.addEventListener('credential-error', (e) => {
  console.error('Credential flow error', e.detail);
});
```

---

### 4. Behaviour

Implement the following behavior inside the component:

#### 4.1. Rendering

* Use **Shadow DOM** (`mode: 'open'`).
* Render a simple `<button>` element as the main UI.
* The button:

  * Text = value of `label` attribute, default `"Request credentials"`.
  * Should be disabled while a request is ongoing.
* Optional: Add minimal styling (padding, border radius) but keep it simple and framework-agnostic.

#### 4.2. Support detection

Before starting the flow, detect Digital Credential API support:

```ts
const hasDcApi =
  typeof navigator !== 'undefined' &&
  (navigator as any).credentials &&
  typeof (navigator as any).credentials.get === 'function';
```

* If **unsupported**, do **not** attempt the flow:

  * Dispatch `credential-error` with `stage: 'unsupported'`.
  * Optionally disable the button or show a simple tooltip text inside the shadow DOM (e.g. “Digital Credentials not supported in this browser yet”).

#### 4.3. Click Flow

On button click:

1. **Emit** `credential-request-started`.
2. Set an internal “loading” state:

   * Disable the button.
   * Optionally change text (e.g. `"Requesting..."`).
3. **Fetch configuration** from backend:

   * `GET config-endpoint`
   * Expect JSON response. For now define a generic type:

     ```ts
     type DcRequestConfig = {
       // everything needed to call navigator.credentials.get
       publicKey: any;       // or more precise typing if needed
       mediation?: string;
       // you can extend this as needed; treat it as DC API request options
     };
     ```
   * Handle non-200 responses or JSON parse failures:

     * Dispatch `credential-error` with `stage: 'config-fetch'`.
4. **Call Digital Credential API**:

   * Use:

     ```ts
     const cred = await (navigator as any).credentials.get({
       ...dcConfig,
       // If DC API expects a specific shape, pass it here from dcConfig
     });
     ```
   * If user cancels / operation fails / throws:

     * Dispatch `credential-error` with `stage: 'dc-api'`.
     * Reset loading state.
     * Return early.
5. **Send result to backend**:

   * Use `method` attribute (default `"POST"`).
   * Send to the **same `config-endpoint`** or a second endpoint if defined (keep it simple now and reuse `config-endpoint`):

     ```ts
     await fetch(this.configEndpoint, {
       method: this.method || 'POST',
       headers: { 'content-type': 'application/json' },
       body: JSON.stringify({ credential: cred }),
     });
     ```
   * Expect JSON response; type:

     ```ts
     type BackendVerificationResponse = {
       success: boolean;
       // optionally: issuedCredential, messages, etc.
       [key: string]: any;
     };
     ```
   * If backend returns non-200 or `success === false`, dispatch `credential-error` with `stage: 'backend'`.
6. **On success**:

   * Dispatch `credential-received` with `detail: { credential: cred, backendResponse }`.
7. Finally, reset loading state and button text.

Ensure `try/catch` wrappers around network/DC API calls so we **never** leave the button in a permanently disabled/error state.

---

### 5. Types & Public API

Define and export helpful types from `src/index.ts`, for example:

```ts
export type DcRequestConfig = { /* as above */ };

export type BackendVerificationResponse = {
  success: boolean;
  [key: string]: any;
};

export interface DigitalCredentialReceivedDetail {
  credential: any;
  backendResponse: BackendVerificationResponse;
}

export interface DigitalCredentialErrorDetail {
  stage: 'config-fetch' | 'dc-api' | 'backend' | 'unsupported' | 'unknown';
  error: unknown;
}
```

Also export the element’s class type so TypeScript users can reference it.

---

### 6. Demo Page

Create a tiny **demo HTML** file under `/demo` (or `/public` if using Vite):

* Load the built component bundle from the local build.
* Include a mock backend using a simple local server or stubbed fetch for demo:

  * For Codex you can assume a simple Node/Express dev server or even `json-server`.
* Demonstrate:

  * A working button.
  * Console logs for `credential-received` and `credential-error` events.

Example demo markup:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Digital Credential Button Demo</title>
    <script type="module" src="/dist/index.js"></script>
  </head>
  <body>
    <h1>Digital Credential Button Demo</h1>
    <digital-credentials-button
      id="dc-btn"
      config-endpoint="/api/dc/config"
      label="Request credentials"
    ></digital-credentials-button>

    <script type="module">
      const btn = document.getElementById('dc-btn');

      btn.addEventListener('credential-received', (e) => {
        console.log('Success:', e.detail);
      });

      btn.addEventListener('credential-error', (e) => {
        console.error('Error:', e.detail);
      });
    </script>
  </body>
</html>
```

---

### 7. Acceptance Criteria

The task is complete when:

1. `npm install && npm run build` succeeds.
2. Importing the library via:

   ```ts
   import '@waltid/digital-credentials-wc';
   ```

   registers `<digital-credentials-button>` as a custom element.
3. Using the component in a plain HTML page:

   * Show a visible button.
   * On click, it:

     * Fetches config from backend (can be mocked for demo).
     * Calls `navigator.credentials.get` if available.
     * Sends result to backend endpoint.
4. The component dispatches:

   * `credential-request-started`
   * `credential-received` on success (with correct `detail` payload)
   * `credential-error` on failures (with `stage` and `error`).
5. If the Digital Credential API is **not available**, the component:

   * Does not throw.
   * Dispatches `credential-error` with `stage: 'unsupported'`.
   * Properly resets button state.

Please implement all of the above, with clean, well-typed TypeScript and concise documentation comments where helpful.
