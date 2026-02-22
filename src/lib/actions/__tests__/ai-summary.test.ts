import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestBillSummary } from '../ai-summary';

// Mock AI summary generator
vi.mock('@/lib/ai-summary', () => ({
  generateBillSummary: vi.fn(),
}));

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { generateBillSummary } from '@/lib/ai-summary';
import { db } from '@/db';
import { revalidatePath } from 'next/cache';

describe('requestBillSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing summary if already exists', async () => {
    const existingSummary = 'This is an existing summary';
    let callCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ summary: existingSummary }]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
    });
    vi.mocked(db).select = mockSelect;

    const result = await requestBillSummary('550e8400-e29b-41d4-a716-446655440003');

    expect(result).toEqual({ summary: existingSummary });
    expect(generateBillSummary).not.toHaveBeenCalled();
  });

  it('should return error when bill not found', async () => {
    let callCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // No existing summary
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      } else {
        // No bill found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      }
    });
    vi.mocked(db).select = mockSelect;

    const result = await requestBillSummary('550e8400-e29b-41d4-a716-446655440003');

    expect(result).toEqual({ error: 'Bill not found' });
  });

  it('should generate and return new summary', async () => {
    const generatedSummary = 'This is a generated summary';
    vi.mocked(generateBillSummary).mockResolvedValue(generatedSummary);

    let callCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // No existing summary
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      } else {
        // Bill found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                title: 'Test Bill',
                description: 'This is a test bill',
              }]),
            }),
          }),
        };
      }
    });
    vi.mocked(db).select = mockSelect;

    const result = await requestBillSummary('550e8400-e29b-41d4-a716-446655440003');

    expect(result).toEqual({ summary: generatedSummary });
    expect(generateBillSummary).toHaveBeenCalledWith({
      billId: '550e8400-e29b-41d4-a716-446655440003',
      title: 'Test Bill',
      description: 'This is a test bill',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/bills/550e8400-e29b-41d4-a716-446655440003');
  });

  it('should handle AI summary generation error', async () => {
    vi.mocked(generateBillSummary).mockRejectedValue(new Error('AI service error'));

    let callCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                title: 'Test Bill',
                description: 'This is a test bill',
              }]),
            }),
          }),
        };
      }
    });
    vi.mocked(db).select = mockSelect;

    const result = await requestBillSummary('550e8400-e29b-41d4-a716-446655440003');

    expect(result).toEqual({ error: 'Failed to generate summary.' });
  });
});
