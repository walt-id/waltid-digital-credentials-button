import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const dcConfigPath = resolve(
  repoRoot,
  'unsigned-mdl-request.json'
);
const dcBackendResponsePath = resolve(
  repoRoot,
  'attr-response.json'
);

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
      allow: [__dirname, repoRoot]
    }
  },
  plugins: [
    {
      name: 'dc-config-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/dc/config', (req, res, next) => {
          if (req.method === 'GET') {
            fs.readFile(dcConfigPath, 'utf8', (err, data) => {
              if (err) {
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end(`Failed to read config fixture: ${err.message}`);
                return;
              }
              res.setHeader('content-type', 'application/json');
              res.end(data);
            });
            return;
          }

          if (req.method === 'POST') {
            fs.readFile(dcBackendResponsePath, 'utf8', (err, data) => {
              if (err) {
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end(`Failed to read backend fixture: ${err.message}`);
                return;
              }
              res.setHeader('content-type', 'application/json');
              res.end(data);
            });
            return;
          }

          next();
        });
      }
    }
  ]
});
