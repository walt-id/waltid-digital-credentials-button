export type ErrorStage =
  | 'config-fetch'
  | 'dc-api'
  | 'backend'
  | 'unsupported'
  | 'unknown';

export type DcRequestConfig = {
  digital?: {
    requests?: Array<{ protocol: string; data: unknown }>;
    mediation?: string;
    [key: string]: unknown;
  };
  protocol?: string;
  data?: unknown;
  mediation?: string;
  [key: string]: unknown;
};

export type BackendVerificationResponse = {
  success: boolean;
  [key: string]: unknown;
};

export interface DigitalCredentialReceivedDetail {
  credential: unknown;
  backendResponse: BackendVerificationResponse;
}

export interface DigitalCredentialErrorDetail {
  stage: ErrorStage;
  error: unknown;
}

type DigitalRequestPayload = {
  digital: {
    requests: Array<{ protocol: string; data: unknown }>;
    mediation?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const DEFAULT_LABEL = 'Request credentials';
const DEFAULT_METHOD = 'POST';

export class DigitalCredentialButton extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['config-endpoint', 'label', 'method'];
  }

  #shadow: ShadowRoot;
  #button: HTMLButtonElement;
  #status: HTMLDivElement;
  #loading = false;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#button = document.createElement('button');
    this.#status = document.createElement('div');
    this.#status.setAttribute('part', 'status');
    this.#status.className = 'dc-status';
    this.#status.textContent = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-block;
        font-family: inherit;
      }
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        padding: 0.65rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid #0f172a;
        background: #111827;
        color: #f8fafc;
        font-weight: 600;
        cursor: pointer;
        transition: background 120ms ease, transform 120ms ease, box-shadow 120ms ease;
      }
      button:hover:not(:disabled) {
        background: #0b1220;
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(15, 23, 42, 0.2);
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.7;
        box-shadow: none;
      }
      .dc-status {
        margin-top: 0.35rem;
        color: #475569;
        font-size: 0.85rem;
      }
    `;

    this.#button.type = 'button';
    this.#button.setAttribute('part', 'button');
    this.#button.addEventListener('click', () => this.#handleClick());

    const wrapper = document.createElement('div');
    wrapper.append(this.#button, this.#status);

    this.#shadow.append(style, wrapper);
    this.#render();
  }

  connectedCallback(): void {
    this.#render();
  }

  attributeChangedCallback(): void {
    this.#render();
  }

  get configEndpoint(): string {
    return this.getAttribute('config-endpoint') ?? '';
  }

  set configEndpoint(value: string) {
    if (value == null) {
      this.removeAttribute('config-endpoint');
      return;
    }
    this.setAttribute('config-endpoint', value);
  }

  get label(): string {
    return this.getAttribute('label') ?? DEFAULT_LABEL;
  }

  set label(value: string) {
    if (value == null) {
      this.removeAttribute('label');
      return;
    }
    this.setAttribute('label', value);
  }

  get method(): string {
    return this.getAttribute('method') ?? DEFAULT_METHOD;
  }

  set method(value: string) {
    if (value == null) {
      this.removeAttribute('method');
      return;
    }
    this.setAttribute('method', value);
  }

  #render(): void {
    this.#button.textContent = this.#loading ? 'Requesting...' : this.label;
    this.#button.disabled = this.#loading || !this.configEndpoint || !this.#hasDcApi();

    if (!this.configEndpoint) {
      this.#setStatus('Set the config-endpoint attribute to start the flow.');
      return;
    }

    if (!this.#hasDcApi()) {
      this.#setStatus('Digital Credentials API is not supported in this browser yet.');
      return;
    }

    this.#setStatus('');
  }

  #setStatus(message: string): void {
    this.#status.textContent = message;
  }

  #setLoading(next: boolean): void {
    this.#loading = next;
    this.#render();
  }

  #hasDcApi(): boolean {
    const nav = globalThis.navigator as unknown as {
      credentials?: { get?: (...args: unknown[]) => Promise<unknown> };
    };
    return Boolean(nav && nav.credentials && typeof nav.credentials.get === 'function');
  }

  async #handleClick(): Promise<void> {
    if (this.#loading) {
      return;
    }

    if (!this.configEndpoint) {
      this.#emitError('config-fetch', 'config-endpoint is required.');
      return;
    }

    if (!this.#hasDcApi()) {
      this.#emitError('unsupported', 'Digital Credentials API is not available in this browser.');
      return;
    }

    this.dispatchEvent(
      new CustomEvent('credential-request-started', {
        bubbles: true,
        composed: true
      })
    );

    this.#setLoading(true);

    try {
      const config = await this.#fetchConfig();
      const requestPayload = this.#normalizeRequest(config);

      if (!requestPayload) {
        this.#emitError('config-fetch', 'Config payload is missing a digital credential request.');
        return;
      }

      const credential = await this.#invokeDigitalCredentialApi(requestPayload);
      const backendResponse = await this.#sendToBackend(credential);

      this.dispatchEvent(
        new CustomEvent<DigitalCredentialReceivedDetail>('credential-received', {
          detail: { credential, backendResponse },
          bubbles: true,
          composed: true
        })
      );
    } catch (error) {
      if (error instanceof StageError) {
        this.#emitError(error.stage, error.cause ?? error.message);
      } else {
        this.#emitError('unknown', error);
      }
    } finally {
      this.#setLoading(false);
    }
  }

  async #fetchConfig(): Promise<DcRequestConfig> {
    try {
      const response = await fetch(this.configEndpoint, {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new StageError('config-fetch', `Config request failed (${response.status})`);
      }

      const payload = await response.json();
      return payload as DcRequestConfig;
    } catch (error) {
      if (error instanceof StageError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unable to fetch DC config.';
      throw new StageError('config-fetch', message);
    }
  }

  #normalizeRequest(config: DcRequestConfig): DigitalRequestPayload | null {
    if (!config || typeof config !== 'object') {
      return null;
    }

    if (config.digital && Array.isArray(config.digital.requests) && config.digital.requests.length) {
      return {
        ...config,
        digital: {
          ...config.digital,
          requests: [...config.digital.requests]
        }
      };
    }

    if (config.protocol && config.data) {
      return {
        digital: {
          requests: [
            {
              protocol: String(config.protocol),
              data: config.data
            }
          ],
          mediation: config.mediation
        }
      };
    }

    return null;
  }

  async #invokeDigitalCredentialApi(requestPayload: DigitalRequestPayload): Promise<unknown> {
    try {
      const nav = navigator as unknown as {
        credentials: { get: (opts: unknown) => Promise<unknown> };
      };

      const credential = await nav.credentials.get(requestPayload as unknown);
      if (credential == null) {
        throw new StageError('dc-api', 'Digital Credentials API did not return a credential.');
      }
      return credential;
    } catch (error) {
      if (error instanceof StageError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Digital Credentials API call failed.';
      throw new StageError('dc-api', message);
    }
  }

  async #sendToBackend(credential: unknown): Promise<BackendVerificationResponse> {
    const method = (this.method || DEFAULT_METHOD).toUpperCase();
    const preparedCredential = this.#prepareCredentialForBackend(credential);

    if (preparedCredential == null) {
      throw new StageError('backend', 'Credential payload is empty.');
    }

    let body: string;
    try {
      body = JSON.stringify({ credential: preparedCredential });
    } catch (error) {
      throw new StageError('backend', `Failed to serialise credential: ${String(error)}`);
    }

    try {
      const response = await fetch(this.configEndpoint, {
        method,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body
      });

      const text = await response.text();
      let parsed: BackendVerificationResponse | null = null;
      if (text) {
        try {
          parsed = JSON.parse(text) as BackendVerificationResponse;
        } catch (error) {
          throw new StageError('backend', `Failed to parse backend response: ${String(error)}`);
        }
      }

      if (!response.ok) {
        const message =
          (parsed && typeof parsed === 'object' && 'message' in parsed && (parsed as any).message) ||
          text ||
          'Backend request failed.';
        throw new StageError('backend', String(message));
      }

      return parsed ?? { success: true };
    } catch (error) {
      if (error instanceof StageError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Backend request failed.';
      throw new StageError('backend', message);
    }
  }

  #emitError(stage: ErrorStage, reason: unknown): void {
    const detail: DigitalCredentialErrorDetail = {
      stage,
      error: reason
    };

    this.dispatchEvent(
      new CustomEvent<DigitalCredentialErrorDetail>('credential-error', {
        detail,
        bubbles: true,
        composed: true
      })
    );

    if (stage === 'unsupported') {
      this.#setStatus('Digital Credentials API is not supported in this browser yet.');
    } else if (stage === 'config-fetch') {
      this.#setStatus('Unable to load credential request configuration.');
    } else if (stage === 'dc-api') {
      this.#setStatus('Digital Credentials API returned an error.');
    } else if (stage === 'backend') {
      this.#setStatus('Backend verification failed.');
    } else {
      this.#setStatus('Credential flow failed.');
    }
  }

  #prepareCredentialForBackend(credential: unknown): unknown {
    if (credential == null) {
      return null;
    }

    if (typeof credential === 'object') {
      const asObject = credential as { toJSON?: () => unknown };
      if (typeof asObject.toJSON === 'function') {
        try {
          return asObject.toJSON();
        } catch (_) {
          // Continue to other strategies.
        }
      }

      if (typeof structuredClone === 'function') {
        try {
          return structuredClone(credential);
        } catch (_) {
          // Continue to JSON fallback.
        }
      }
    }

    try {
      return JSON.parse(JSON.stringify(credential));
    } catch (_) {
      return credential;
    }
  }
}

class StageError extends Error {
  stage: ErrorStage;
  cause?: unknown;

  constructor(stage: ErrorStage, message: string, cause?: unknown) {
    super(message);
    this.stage = stage;
    this.cause = cause;
  }
}
