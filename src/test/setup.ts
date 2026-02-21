import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock environment variables
vi.stubGlobal('process', {
  ...process,
  env: {
    ...process.env,
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  },
});
