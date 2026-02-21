import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

vi.mock('@/db', () => ({
  db: mockDb,
}));

// Import after mock
const { calculateRepresentationScore, updateRepresentationScore } = await import('../representation-score');

describe('calculateRepresentationScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 0 score when legislator has no votes', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await calculateRepresentationScore('leg-1');

    expect(result).toEqual({ score: 0, billsAnalyzed: 0 });
  });

  it('should calculate 100% score when all votes align with constituent sentiment', async () => {
    // Legislator votes
    const legislatorVotes = [
      { billId: 'bill-1', vote: 'yea' },
      { billId: 'bill-2', vote: 'yea' },
    ];

    // Constituent sentiments (majority support on both bills)
    const sentimentAggs = [
      { billId: 'bill-1', sentiment: 'support', total: 10 },
      { billId: 'bill-1', sentiment: 'oppose', total: 2 },
      { billId: 'bill-2', sentiment: 'support', total: 8 },
      { billId: 'bill-2', sentiment: 'oppose', total: 3 },
    ];

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(legislatorVotes),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(sentimentAggs),
            }),
          }),
        };
      }
    });

    const result = await calculateRepresentationScore('leg-1');

    expect(result.score).toBe(100);
    expect(result.billsAnalyzed).toBe(2);
  });

  it('should calculate 0% score when no votes align with constituent sentiment', async () => {
    const legislatorVotes = [
      { billId: 'bill-1', vote: 'yea' },
      { billId: 'bill-2', vote: 'yea' },
    ];

    // Constituent sentiments (majority oppose on both bills)
    const sentimentAggs = [
      { billId: 'bill-1', sentiment: 'support', total: 2 },
      { billId: 'bill-1', sentiment: 'oppose', total: 10 },
      { billId: 'bill-2', sentiment: 'support', total: 3 },
      { billId: 'bill-2', sentiment: 'oppose', total: 8 },
    ];

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(legislatorVotes),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(sentimentAggs),
            }),
          }),
        };
      }
    });

    const result = await calculateRepresentationScore('leg-1');

    expect(result.score).toBe(0);
    expect(result.billsAnalyzed).toBe(2);
  });

  it('should calculate 50% score when half of votes align', async () => {
    const legislatorVotes = [
      { billId: 'bill-1', vote: 'yea' },
      { billId: 'bill-2', vote: 'yea' },
    ];

    // First bill: constituent oppose (no alignment)
    // Second bill: constituent support (alignment)
    const sentimentAggs = [
      { billId: 'bill-1', sentiment: 'support', total: 2 },
      { billId: 'bill-1', sentiment: 'oppose', total: 10 },
      { billId: 'bill-2', sentiment: 'support', total: 10 },
      { billId: 'bill-2', sentiment: 'oppose', total: 2 },
    ];

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(legislatorVotes),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(sentimentAggs),
            }),
          }),
        };
      }
    });

    const result = await calculateRepresentationScore('leg-1');

    expect(result.score).toBe(50);
    expect(result.billsAnalyzed).toBe(2);
  });

  it('should skip bills with less than 5 constituent votes', async () => {
    const legislatorVotes = [
      { billId: 'bill-1', vote: 'yea' },
      { billId: 'bill-2', vote: 'yea' },
    ];

    // First bill: only 4 total votes (should be skipped)
    // Second bill: 10 total votes (should be included)
    const sentimentAggs = [
      { billId: 'bill-1', sentiment: 'support', total: 2 },
      { billId: 'bill-1', sentiment: 'oppose', total: 2 },
      { billId: 'bill-2', sentiment: 'support', total: 8 },
      { billId: 'bill-2', sentiment: 'oppose', total: 2 },
    ];

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(legislatorVotes),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(sentimentAggs),
            }),
          }),
        };
      }
    });

    const result = await calculateRepresentationScore('leg-1');

    expect(result.score).toBe(100);
    expect(result.billsAnalyzed).toBe(1);
  });

  it('should handle "nay" votes correctly', async () => {
    const legislatorVotes = [
      { billId: 'bill-1', vote: 'nay' },
    ];

    // Constituent oppose (nay aligns with oppose)
    const sentimentAggs = [
      { billId: 'bill-1', sentiment: 'support', total: 2 },
      { billId: 'bill-1', sentiment: 'oppose', total: 10 },
    ];

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(legislatorVotes),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(sentimentAggs),
            }),
          }),
        };
      }
    });

    const result = await calculateRepresentationScore('leg-1');

    expect(result.score).toBe(100);
    expect(result.billsAnalyzed).toBe(1);
  });

  it('should handle absent/present votes as non-aligning', async () => {
    const legislatorVotes = [
      { billId: 'bill-1', vote: 'absent' },
      { billId: 'bill-2', vote: 'present' },
    ];

    const sentimentAggs = [
      { billId: 'bill-1', sentiment: 'support', total: 10 },
      { billId: 'bill-1', sentiment: 'oppose', total: 2 },
      { billId: 'bill-2', sentiment: 'support', total: 10 },
      { billId: 'bill-2', sentiment: 'oppose', total: 2 },
    ];

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(legislatorVotes),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(sentimentAggs),
            }),
          }),
        };
      }
    });

    const result = await calculateRepresentationScore('leg-1');

    // absent/present votes don't align with either support or oppose
    expect(result.score).toBe(0);
    expect(result.billsAnalyzed).toBe(2);
  });

  it('should handle bills with no constituent sentiment', async () => {
    const legislatorVotes = [
      { billId: 'bill-1', vote: 'yea' },
      { billId: 'bill-2', vote: 'yea' },
    ];

    // Only sentiment for bill-1
    const sentimentAggs = [
      { billId: 'bill-1', sentiment: 'support', total: 10 },
      { billId: 'bill-1', sentiment: 'oppose', total: 2 },
    ];

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(legislatorVotes),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(sentimentAggs),
            }),
          }),
        };
      }
    });

    const result = await calculateRepresentationScore('leg-1');

    expect(result.score).toBe(100);
    expect(result.billsAnalyzed).toBe(1);
  });
});

describe('updateRepresentationScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert score into database', async () => {
    const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate,
    });
    mockDb.insert.mockReturnValue({
      values: mockValues,
    });

    // Mock calculateRepresentationScore to return a fixed value
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    mockDb.select = mockSelect;

    await updateRepresentationScore('leg-1');

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalled();
  });
});
