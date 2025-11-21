import type React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'digital-credentials-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
