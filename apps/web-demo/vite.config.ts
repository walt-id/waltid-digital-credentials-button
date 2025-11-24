import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dcMockPlugin } from '@waltid/dc-mock-utils';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = resolve(__dirname, '..', '..');
const dcClientDist = resolve(workspaceRoot, 'packages', 'dc-client', 'dist', 'index.js');
const allowedHosts = (process.env.ALLOWED_HOSTS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export default defineConfig({
  server: {
    allowedHosts: [...allowedHosts, 'digital-credentials.walt.id'],
    fs: {
      allow: [__dirname, workspaceRoot]
    }
  },
  resolve: {
    alias: {
      '@waltid/dc-client': dcClientDist
    }
  },
  plugins: [dcMockPlugin()]
});
