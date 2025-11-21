import { requestCredential, CredentialFlowError, CredentialFlowResult } from '@waltid/dc-client';

type DcButtonEventMap = {
  'credential-request-started': CustomEvent<{ requestId: string }>;
  'credential-request-loaded': CustomEvent<{ requestId: string; payload: unknown }>;
  'credential-dcapi-success': CustomEvent<{ requestId: string; response: unknown }>;
  'credential-dcapi-error': CustomEvent<{ requestId: string; error: unknown }>;
  'credential-verification-success': CustomEvent<{ requestId: string; response: unknown }>;
  'credential-verification-error': CustomEvent<{ requestId: string; error: unknown }>;
  'credential-finished': CustomEvent<{ requestId: string; result?: CredentialFlowResult; error?: unknown }>;
  'credential-error': CustomEvent<{ stage: string; error: unknown; requestId: string }>;
};

type ObservedAttr =
  | 'request-id'
  | 'request-endpoint'
  | 'response-endpoint'
  | 'mock'
  | 'label'
  | 'disabled';

const DEFAULT_LABEL = 'Request Digital Credentials';
const DEFAULT_REQUEST_ENDPOINT = '/api/dc/request';
const DEFAULT_RESPONSE_ENDPOINT = '/api/dc/response';

export class DigitalCredentialButton extends HTMLElement {
  static get observedAttributes(): ObservedAttr[] {
    return ['request-id', 'request-endpoint', 'response-endpoint', 'mock', 'label', 'disabled'];
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

  get requestId(): string {
    return this.getAttribute('request-id') || 'unsigned-mdl';
  }
  set requestId(value: string) {
    this.setAttribute('request-id', value);
  }

  get requestEndpoint(): string {
    return this.getAttribute('request-endpoint') || DEFAULT_REQUEST_ENDPOINT;
  }
  set requestEndpoint(value: string) {
    this.setAttribute('request-endpoint', value);
  }

  get responseEndpoint(): string {
    return this.getAttribute('response-endpoint') || DEFAULT_RESPONSE_ENDPOINT;
  }
  set responseEndpoint(value: string) {
    this.setAttribute('response-endpoint', value);
  }

  get mock(): boolean {
    return this.getAttribute('mock') === 'true';
  }
  set mock(value: boolean) {
    if (value) {
      this.setAttribute('mock', 'true');
    } else {
      this.removeAttribute('mock');
    }
  }

  get label(): string {
    return this.getAttribute('label') || DEFAULT_LABEL;
  }
  set label(value: string) {
    this.setAttribute('label', value);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  #render(): void {
    this.#button.textContent = this.#loading ? 'Requesting…' : this.label;
    this.#button.disabled = this.#loading || this.disabled;
    if (!this.requestEndpoint || !this.responseEndpoint || !this.requestId) {
      this.#setStatus('Set request-id, request-endpoint, and response-endpoint to begin.');
    } else {
      this.#setStatus('');
    }
  }

  #setStatus(message: string): void {
    this.#status.textContent = message;
  }

  async #handleClick(): Promise<void> {
    if (this.#loading || this.disabled) {
      return;
    }

    const requestId = this.requestId;
    if (!requestId) {
      this.#emitError('request', 'request-id is required');
      return;
    }

    this.dispatchEvent(
      new CustomEvent('credential-request-started', {
        detail: { requestId },
        bubbles: true,
        composed: true
      })
    );

    this.#setLoading(true);

    try {
      const result = await requestCredential({
        requestId,
        requestEndpoint: this.requestEndpoint,
        responseEndpoint: this.responseEndpoint,
        mock: this.mock
      });

      this.dispatchEvent(
        new CustomEvent('credential-request-loaded', {
          detail: { requestId, payload: result.request },
          bubbles: true,
          composed: true
        })
      );

      this.dispatchEvent(
        new CustomEvent('credential-dcapi-success', {
          detail: { requestId, response: result.dcResponse },
          bubbles: true,
          composed: true
        })
      );

      this.dispatchEvent(
        new CustomEvent('credential-verification-success', {
          detail: { requestId, response: result.verification },
          bubbles: true,
          composed: true
        })
      );

      this.dispatchEvent(
        new CustomEvent('credential-finished', {
          detail: { requestId, result },
          bubbles: true,
          composed: true
        })
      );
    } catch (error: unknown) {
      this.#handleFlowError(error, requestId);
    } finally {
      this.#setLoading(false);
    }
  }

  #handleFlowError(error: unknown, requestId: string): void {
    if (error instanceof CredentialFlowError) {
      const stage =
        error.stage === 'request'
          ? 'credential-request-loaded'
          : error.stage === 'dc-api'
            ? 'credential-dcapi-error'
            : error.stage === 'verification'
              ? 'credential-verification-error'
              : 'credential-error';

      if (stage === 'credential-dcapi-error' || stage === 'credential-verification-error') {
        this.dispatchEvent(
          new CustomEvent(stage, {
            detail: { requestId, error },
            bubbles: true,
            composed: true
          })
        );
      }
      this.#emitError(error.stage, error, requestId);
    } else {
      this.#emitError('unexpected', error, requestId);
    }

    this.dispatchEvent(
      new CustomEvent('credential-finished', {
        detail: { requestId, error },
        bubbles: true,
        composed: true
      })
    );
  }

  #emitError(stage: string, reason: unknown, requestId?: string): void {
    this.dispatchEvent(
      new CustomEvent('credential-error', {
        detail: { stage, error: reason, requestId },
        bubbles: true,
        composed: true
      })
    );
    this.#setStatus('Credential flow failed.');
  }

  #setLoading(next: boolean): void {
    this.#loading = next;
    this.#render();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'digital-credentials-button': DigitalCredentialButton;
  }
  interface HTMLElementEventMap extends DcButtonEventMap {}
}
