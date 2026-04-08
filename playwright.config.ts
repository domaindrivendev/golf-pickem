import { defineConfig, devices } from '@playwright/test'
import { execSync } from 'child_process'

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/golf_pickem_test'

console.log('[playwright-config] Pushing schema to test DB...')
execSync('npx prisma db push --force-reset --skip-generate --accept-data-loss', {
  env: { ...process.env, DATABASE_URL },
  stdio: 'inherit',
})

console.log('[playwright-config] Seeding test DB...')
execSync('npx tsx scripts/admin.ts "admin@example.com" "admin"', {
  env: { ...process.env, DATABASE_URL },
  stdio: 'inherit',
})

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
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/golf_pickem_test',
      JWT_SECRET: 'test-secret',
    }
  },
})
