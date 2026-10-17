import { defineConfig, devices } from '@playwright/test';

// Runs the real app (production build served by `vite preview`) in a desktop and a phone-sized browser.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', locale: 'he-IL', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 900 } } },
    // chromium with an iPhone-sized, touch-enabled, dark-mode viewport
    { name: 'phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', colorScheme: 'dark' } },
  ],
});
