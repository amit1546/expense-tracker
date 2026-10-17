import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // the browser scenarios in e2e/ run with Playwright (`npm run test:e2e`), not Vitest
  test: { include: ['src/**/*.test.js'] },
});
