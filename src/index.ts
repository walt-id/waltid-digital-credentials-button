import { DigitalCredentialButton } from './digital-credential-button';

export * from './digital-credential-button';

const TAG_NAME = 'digital-credential-button';

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, DigitalCredentialButton);
}
