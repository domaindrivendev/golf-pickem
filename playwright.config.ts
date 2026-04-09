import { defineConfig, devices } from '@playwright/test'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/golf_pickem_test'

// Make available to global-setup (same process, before webServer starts)
process.env.DATABASE_URL = DATABASE_URL

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3001',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'next dev -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: false,
    env: {
      DATABASE_URL,
      JWT_SECRET: 'test-secret',
    },
  },
})
