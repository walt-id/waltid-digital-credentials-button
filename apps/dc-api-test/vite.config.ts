import { defineConfig } from 'vite';

const allowedHosts = (process.env.ALLOWED_HOSTS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export default defineConfig({
  server: {
    allowedHosts: [...allowedHosts, 'digital-credentials.walt.id']
  }
});
