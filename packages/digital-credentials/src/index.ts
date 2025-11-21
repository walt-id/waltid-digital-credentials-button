import { DigitalCredentialButton } from './digital-credentials-button';

export * from './digital-credentials-button';

const TAG_NAME = 'digital-credentials-button';

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, DigitalCredentialButton);
}
