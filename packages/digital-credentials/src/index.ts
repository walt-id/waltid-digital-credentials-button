import { DigitalCredentialButton } from './digital-credentials-button';

export * from './digital-credentials-button';
export * from '@waltid/dc-client';

const TAG_NAME = 'digital-credentials-button';

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, DigitalCredentialButton);
}
