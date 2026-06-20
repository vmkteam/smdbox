import { defineConfig } from '@playwright/test';

// Serves the repo root so the demo page can load the built dist/app.{js,css}.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    headless: false,
    viewport: { width: 1280, height: 800 },
    video: 'on',
    actionTimeout: 15_000,
  },
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://localhost:4173/e2e/demo.html',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
