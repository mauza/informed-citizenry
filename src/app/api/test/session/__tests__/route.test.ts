import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-id-123'),
}));

// Mock database
const mockInsertFn = vi.fn();
const mockValuesFn = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: () => mockInsertFn(),
  },
}));

vi.mock('@/db/schema', () => ({
  users: 'users_table',
  sessions: 'sessions_table',
}));

describe('Test Session API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertFn.mockReturnValue({ values: mockValuesFn });
    mockValuesFn.mockResolvedValue(undefined);
    delete process.env.E2E_TESTING;
  });

  it('should reject request when E2E_TESTING is not set', async () => {
    process.env.E2E_TESTING = 'false';

    const request = new NextRequest('http://localhost:3000/api/test/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test User' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Test endpoints are only available in E2E testing mode');
    expect(mockInsertFn).not.toHaveBeenCalled();
  });

  it('should reject request when E2E_TESTING is undefined', async () => {
    const request = new NextRequest('http://localhost:3000/api/test/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test User' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Test endpoints are only available in E2E testing mode');
  });

  it('should create test session when E2E_TESTING is true', async () => {
    process.env.E2E_TESTING = 'true';

    const request = new NextRequest('http://localhost:3000/api/test/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test User' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.userId).toBe('mock-id-123');
    expect(data.sessionToken).toBe('mock-id-123');
    expect(mockInsertFn).toHaveBeenCalledTimes(2);
    expect(mockValuesFn).toHaveBeenCalledWith(expect.objectContaining({
      id: 'mock-id-123',
      email: 'test@example.com',
      name: 'Test User',
    }));
  });

  it('should use default values when email and name are not provided', async () => {
    process.env.E2E_TESTING = 'true';

    const request = new NextRequest('http://localhost:3000/api/test/session', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockValuesFn).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      name: 'Test User',
    }));
  });

  it('should set auth session cookie on successful creation', async () => {
    process.env.E2E_TESTING = 'true';

    const request = new NextRequest('http://localhost:3000/api/test/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'e2e@test.com', name: 'E2E Test' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    const cookies = response.cookies.get('authjs.session-token');
    expect(cookies).toBeDefined();
    expect(cookies?.value).toBe('mock-id-123');
    expect(cookies?.httpOnly).toBe(true);
    expect(cookies?.sameSite).toBe('lax');
    expect(cookies?.path).toBe('/');
  });

  it('should handle database errors gracefully', async () => {
    process.env.E2E_TESTING = 'true';
    mockInsertFn.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const request = new NextRequest('http://localhost:3000/api/test/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test User' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create test session');
  });
});
