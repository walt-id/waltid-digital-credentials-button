import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dcMockPlugin } from '@waltid/dc-mock-utils';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = resolve(__dirname, '..', '..');
const dcClientDist = resolve(workspaceRoot, 'packages', 'dc-client', 'dist', 'index.js');

export default defineConfig({
  plugins: [vue(), dcMockPlugin()],
  server: {
    fs: {
      allow: [__dirname, workspaceRoot]
    }
  },
  resolve: {
    alias: {
      '@waltid/dc-client': dcClientDist
    }
  }
});
