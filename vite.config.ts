import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx, defineManifest } from '@crxjs/vite-plugin';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'metamo',
  description: 'Monitor browser performance and errors on MetaLife',
  version: '0.1.0',
  permissions: ['storage', 'scripting', 'activeTab', 'downloads'],
  host_permissions: ['https://*.metalife.co.jp/*'],
  action: {},
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://*.metalife.co.jp/*'],
      js: ['src/content/index.tsx'],
      css: ['src/content/style.css'],
      run_at: 'document_start',
    },
  ],
});

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
