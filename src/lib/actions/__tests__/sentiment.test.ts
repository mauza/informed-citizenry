import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitSentiment, removeSentiment } from '../sentiment';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from '@/auth';
import { db } from '@/db';
import { revalidatePath } from 'next/cache';

describe('submitSentiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const result = await submitSentiment('550e8400-e29b-41d4-a716-446655440003', 'support');

    expect(result).toEqual({ error: 'You must be signed in to vote.' });
  });

  it('should return error for invalid sentiment', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440001' } } as any);

    const result = await submitSentiment('550e8400-e29b-41d4-a716-446655440003', 'invalid' as any);

    expect(result).toEqual({ error: 'Invalid input.' });
  });

  it('should return error for invalid billId', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440001' } } as any);

    const result = await submitSentiment('', 'support');

    expect(result).toEqual({ error: 'Invalid input.' });
  });

  it('should successfully submit sentiment', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440001' } } as any);
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });
    vi.mocked(db).insert = mockInsert;

    const result = await submitSentiment('550e8400-e29b-41d4-a716-446655440003', 'support');

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/bills/550e8400-e29b-41d4-a716-446655440003');
  });

  it('should update existing sentiment on conflict', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440001' } } as any);
    const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      }),
    });
    vi.mocked(db).insert = mockInsert;

    await submitSentiment('550e8400-e29b-41d4-a716-446655440003', 'oppose');

    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
  });
});

describe('removeSentiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const result = await removeSentiment('550e8400-e29b-41d4-a716-446655440003');

    expect(result).toEqual({ error: 'You must be signed in.' });
  });

  it('should successfully remove sentiment', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440001' } } as any);
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockDelete = vi.fn().mockReturnValue({
      where: mockWhere,
    });
    vi.mocked(db).delete = mockDelete;

    const result = await removeSentiment('550e8400-e29b-41d4-a716-446655440003');

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/bills/550e8400-e29b-41d4-a716-446655440003');
  });
});
