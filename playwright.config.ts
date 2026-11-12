import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'node apps/api/dist/src/main.js',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
      env: {
        PORT: '4000',
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://brewlite:brewlite@127.0.0.1:5432/brewlite?schema=public',
        JWT_SECRET: 'super-secret-key-at-least-32-characters-for-jwt-auth',
      },
    },
    {
      command: 'npm run start --workspace=@brewlite/web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
      env: {
        PORT: '3000',
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'http://localhost:4000/api',
      },
    },
  ],
});
