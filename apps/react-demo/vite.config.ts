import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dcDemoBackend } from '@waltid/dc-backend-demo';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = resolve(__dirname, '..', '..');
const dcClientDist = resolve(workspaceRoot, 'packages', 'dc-client', 'dist', 'index.js');

export default defineConfig({
  plugins: [react(), dcDemoBackend()],
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
