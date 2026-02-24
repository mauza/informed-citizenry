# Testing Guide

This document explains how to run both unit tests and end-to-end (E2E) tests for the Informed Citizenry application.

## Overview

We use two testing frameworks:

| Type | Framework | Purpose |
|------|-----------|---------|
| **Unit Tests** | Vitest + Testing Library | Test individual functions, components, and logic |
| **E2E Tests** | Playwright | Test complete user flows in a real browser |

## Unit Tests (Vitest)

### Running Unit Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Configuration

Tests are configured in `vitest.config.ts`:

- **Environment**: jsdom (browser-like environment)
- **Setup**: `src/test/setup.ts` initializes test environment
- **Pattern**: `src/**/*.test.ts` and `src/**/*.test.tsx`
- **Aliases**: `@/` maps to `src/` for imports

### Test File Locations

```
src/
├── lib/__tests__/              # Library function tests
│   ├── legiscan.test.ts        # LegiScan API integration
│   ├── utils.test.ts           # Utility functions
│   ├── ai-summary.test.ts      # AI summarization
│   ├── queries.test.ts         # Database queries
│   └── representation-score.test.ts  # Scoring logic
├── lib/actions/__tests__/      # Server action tests
│   ├── ai-summary.test.ts
│   ├── profile.test.ts
│   └── sentiment.test.ts
└── app/api/test/session/__tests__/  # API route tests
    └── route.test.ts
```

### Writing Unit Tests

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/my-module';

describe('myFunction', () => {
  it('should do something expected', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Test Utilities

The `src/test/` directory contains:

- `setup.ts` - Global test setup (mocks, environment)
- `db-mock.ts` - Database mocking utilities

## E2E Tests (Playwright)

### Prerequisites

Before running E2E tests, ensure you have:

1. All environment variables configured (`.env.local`)
2. Database pushed and accessible
3. Dependencies installed: `npm install`

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive debugging)
npm run test:e2e:ui

# Run tests in debug mode (step through)
npm run test:e2e:debug
```

### E2E Test Configuration

Configured in `playwright.config.ts`:

- **Test Directory**: `tests/e2e/`
- **Base URL**: `http://localhost:3000` (or `E2E_BASE_URL` env var)
- **Browsers**: Desktop Chrome
- **Parallel**: Yes (1 worker in CI, unlimited locally)
- **Retries**: 2 retries in CI, 0 locally

### Test Projects

Tests are split into two projects:

1. **Public** - Tests that don't require authentication
2. **Authenticated** - Tests requiring a logged-in user

### E2E Test Files

```
tests/
├── e2e/
│   ├── 01-public-pages.spec.ts    # Homepage, bills list, legislators list
│   ├── 02-bills.spec.ts           # Bill detail pages, AI summaries
│   ├── 03-legislators.spec.ts     # Legislator profiles, voting records
│   ├── 04-authenticated.spec.ts   # Dashboard, settings, login flows
│   └── 05-sentiment-voting.spec.ts # Support/oppose bill voting
├── helpers/
│   └── auth.ts                    # Authentication helpers
├── .auth/
│   └── user.json                  # Stored auth state (generated)
└── global-setup.ts                # Global test setup
```

### Authentication in E2E Tests

The test suite creates a test user automatically:

1. **Global Setup** (`tests/global-setup.ts`):
   - Creates test session via API endpoint
   - Saves auth state to `tests/.auth/user.json`
   - Reused across authenticated tests

2. **Test Helpers** (`tests/helpers/auth.ts`):
   - `createTestSession()` - Creates authenticated session
   - `clearTestSession()` - Cleans up test data

### Running E2E Tests with Docker

For consistent environments, you can run E2E tests in Docker:

```bash
# Set environment variable to use Docker
export E2E_USE_DOCKER=true

# Run tests (builds and starts container automatically)
npm run test:e2e
```

Docker Compose file: `docker-compose.e2e.yml`

### E2E Test Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Avoid testing implementation details** - test user outcomes
3. **Clean up test data** in `afterEach` or `afterAll`
4. **Use API for setup** - create test data via API, not UI clicks
5. **Independent tests** - each test should stand alone

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test';

test('user can view bill details', async ({ page }) => {
  // Navigate to bills page
  await page.goto('/bills');
  
  // Click first bill
  await page.click('[data-testid="bill-card"]:first-child');
  
  // Verify bill detail page loads
  await expect(page).toHaveURL(/\/bills\/\d+/);
  await expect(page.locator('h1')).toContainText('Bill');
});
```

## Environment Variables for Testing

### Required for All Tests

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
AUTH_SECRET="test-secret"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Required for E2E Only

```env
# Optional: Override base URL
E2E_BASE_URL="http://localhost:3000"

# Optional: Use Docker for E2E
E2E_USE_DOCKER="true"

# Required for test session creation
E2E_TESTING="true"
```

### Required for Integration Tests

```env
# External APIs (mocked in unit tests)
LEGISCAN_API_KEY="test-key"
ANTHROPIC_API_KEY="test-key"
STRIPE_SECRET_KEY="sk_test_..."

# OAuth (for E2E login flows)
GITHUB_CLIENT_ID="test-id"
GITHUB_CLIENT_SECRET="test-secret"
```

## CI/CD Testing

In CI environments (GitHub Actions, etc.):

1. Unit tests run on every PR
2. E2E tests run on PRs and main branch
3. Tests must pass before merge
4. Coverage reports generated

Example CI configuration (`.github/workflows/test.yml`):

```yaml
name: Tests
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
  
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:e2e
```

## Troubleshooting

### Unit Tests

**Issue**: Tests fail with module not found
- **Solution**: Check import paths use `@/` alias correctly

**Issue**: Database errors in tests
- **Solution**: Ensure `src/test/db-mock.ts` properly mocks database

**Issue**: Tests timeout
- **Solution**: Check for infinite loops or missing mocks

### E2E Tests

**Issue**: Browser doesn't launch
- **Solution**: Install Playwright browsers: `npx playwright install`

**Issue**: Tests fail with "page not found"
- **Solution**: Ensure dev server is running or `webServer` config is correct

**Issue**: Authentication fails
- **Solution**: Check `E2E_TESTING=true` is set and test session endpoint works

**Issue**: Flaky tests
- **Solution**: Add retries, use proper wait conditions, avoid race conditions

## Coverage Reports

After running `npm run test:coverage`:

- HTML report: `coverage/index.html`
- Coverage thresholds configured in `vitest.config.ts`

Aim for:
- **Unit tests**: 80%+ coverage for business logic
- **E2E tests**: Cover all critical user flows

---

*See [Architecture](./architecture.md) for understanding the system you're testing.*
