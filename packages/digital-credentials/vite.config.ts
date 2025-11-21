import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dcMockPlugin } from '@waltid/dc-mock-utils';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = resolve(__dirname, '..', '..');

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DigitalCredentialWebComponent',
      fileName: 'index',
      formats: ['es']
    },
    sourcemap: true,
    rollupOptions: {
      external: []
    }
  },
  server: {
    fs: {
      allow: [__dirname, workspaceRoot]
    }
  },
  plugins: [dcMockPlugin()]
});
