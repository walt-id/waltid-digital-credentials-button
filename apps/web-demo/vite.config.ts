import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dcMockPlugin } from '@waltid/dc-mock-utils';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = resolve(__dirname, '..', '..');

export default defineConfig({
  server: {
    fs: {
      allow: [__dirname, workspaceRoot]
    }
  },
  plugins: [dcMockPlugin()]
});
