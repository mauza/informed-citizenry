import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock functions that will be shared
const mockSelectFn = vi.fn();

// Mock database with factory that doesn't use external variables
vi.mock('@/db', () => ({
  db: {
    select: () => mockSelectFn(),
  },
}));

// Import after mock
const {
  getBills,
  getBillById,
  getLegislators,
  getLegislatorById,
  getUserSubscription,
  isPremiumUser,
  getUserVotes,
  getStates,
  getBillsWithoutSummary,
} = await import('../queries');

describe('getBills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return bills with default pagination', async () => {
    const mockBills = [
      { id: '1', title: 'Bill 1', billType: 'HB', billNumber: '100', status: 'introduced', stateId: 'CA', sessionYear: 2024, lastActionDate: new Date(), lastActionDescription: null },
      { id: '2', title: 'Bill 2', billType: 'SB', billNumber: '200', status: 'passed', stateId: 'CA', sessionYear: 2024, lastActionDate: new Date(), lastActionDescription: null },
    ];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockBills),
            }),
          }),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getBills();

    expect(result).toEqual(mockBills);
    expect(result).toHaveLength(2);
  });

  it('should filter by stateId', async () => {
    const mockBills = [{ id: '1', title: 'Bill 1', billType: 'HB', billNumber: '100', status: 'introduced', stateId: 'TX', sessionYear: 2024, lastActionDate: new Date(), lastActionDescription: null }];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockBills),
            }),
          }),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getBills({ stateId: 'TX' });

    expect(result).toEqual(mockBills);
  });

  it('should filter by status', async () => {
    const mockBills = [{ id: '1', title: 'Bill 1', billType: 'HB', billNumber: '100', status: 'passed', stateId: 'CA', sessionYear: 2024, lastActionDate: new Date(), lastActionDescription: null }];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockBills),
            }),
          }),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getBills({ status: 'passed' });

    expect(result).toEqual(mockBills);
  });

  it('should filter by search term', async () => {
    const mockBills = [{ id: '1', title: 'Healthcare Bill', billType: 'HB', billNumber: '100', status: 'introduced', stateId: 'CA', sessionYear: 2024, lastActionDate: new Date(), lastActionDescription: null }];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockBills),
            }),
          }),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getBills({ search: 'Healthcare' });

    expect(result).toEqual(mockBills);
  });

  it('should handle pagination', async () => {
    const mockBills = [{ id: '1', title: 'Bill 1', billType: 'HB', billNumber: '100', status: 'introduced', stateId: 'CA', sessionYear: 2024, lastActionDate: new Date(), lastActionDescription: null }];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockBills),
            }),
          }),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getBills({ page: 2, limit: 10 });

    expect(result).toEqual(mockBills);
  });
});

describe('getBillById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when bill not found', async () => {
    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getBillById('non-existent');

    expect(result).toBeNull();
  });

  it.skip('should return bill with summary and sentiment counts', async () => {
    const mockBill = { id: '1', title: 'Bill 1', billType: 'HB', billNumber: '100', status: 'introduced', stateId: 'CA', sessionYear: 2024, primarySponsorId: null, fullTextUrl: null, description: null, lastActionDate: new Date(), lastActionDescription: null, createdAt: new Date(), updatedAt: new Date(), legiscanId: null, legiscanChangeHash: null };

    let callCount = 0;
    mockSelectFn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Bill query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockBill]),
            }),
          }),
        };
      } else if (callCount === 2) {
        // Summary query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ summary: 'Test summary' }]),
            }),
          }),
        };
      } else if (callCount === 3) {
        // Sentiment counts query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                { sentiment: 'support', total: 10 },
                { sentiment: 'oppose', total: 5 },
              ]),
            }),
          }),
        };
      } else if (callCount === 4) {
        // User sentiment query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      } else {
        // Votes query with join - return object that has innerJoin directly after from
        const mockInnerJoin = vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        });
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: mockInnerJoin,
          }),
        };
      }
    });

    const result = await getBillById('1');

    expect(result).not.toBeNull();
    expect(result?.aiSummary).toBe('Test summary');
    expect(result?.supportCount).toBe(10);
    expect(result?.opposeCount).toBe(5);
  });
});

describe('getLegislators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return active legislators', async () => {
    const mockLegislators = [
      { id: '1', firstName: 'John', lastName: 'Doe', party: 'D', chamber: 'H', stateId: 'CA', role: 'Representative', photoUrl: null, score: null, billsAnalyzed: null },
    ];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockLegislators),
              }),
            }),
          }),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getLegislators();

    expect(result).toEqual(mockLegislators);
  });

  it('should filter by chamber', async () => {
    const mockLegislators = [
      { id: '1', firstName: 'John', lastName: 'Doe', party: 'D', chamber: 'S', stateId: 'CA', role: 'Senator', photoUrl: null, score: null, billsAnalyzed: null },
    ];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockLegislators),
              }),
            }),
          }),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getLegislators({ chamber: 'S' });

    expect(result).toEqual(mockLegislators);
  });
});

describe('getUserSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return subscription when found', async () => {
    const mockSubscription = {
      id: '1',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      tier: 'premium',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodEnd: new Date('2025-12-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSubscription]),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getUserSubscription('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toEqual(mockSubscription);
  });

  it('should return null when subscription not found', async () => {
    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getUserSubscription('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toBeNull();
  });
});

describe('isPremiumUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for active premium user', async () => {
    const mockSubscription = {
      id: '1',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      tier: 'premium',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodEnd: new Date(Date.now() + 86400000), // tomorrow
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSubscription]),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await isPremiumUser('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toBe(true);
  });

  it('should return false for expired premium subscription', async () => {
    const mockSubscription = {
      id: '1',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      tier: 'premium',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodEnd: new Date(Date.now() - 86400000), // yesterday
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSubscription]),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await isPremiumUser('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toBe(false);
  });

  it('should return false for free tier user', async () => {
    const mockSubscription = {
      id: '1',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      tier: 'free',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSubscription]),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await isPremiumUser('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toBe(false);
  });

  it('should return false when no subscription exists', async () => {
    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await isPremiumUser('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toBe(false);
  });
});

describe('getUserVotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user votes with bill details', async () => {
    const mockVotes = [
      {
        id: '1',
        billId: '550e8400-e29b-41d4-a716-446655440003',
        billType: 'HB',
        billNumber: '100',
        title: 'Test Bill',
        status: 'introduced',
        sentiment: 'support',
        createdAt: new Date(),
      },
    ];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockVotes),
          }),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getUserVotes('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toEqual(mockVotes);
    expect(result).toHaveLength(1);
  });
});

describe('getStates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all states ordered by name', async () => {
    const mockStates = [
      { id: 'CA', name: 'California', legiscanId: 5 },
      { id: 'TX', name: 'Texas', legiscanId: 43 },
    ];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockStates),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getStates();

    expect(result).toEqual(mockStates);
  });
});

describe('getBillsWithoutSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return bills without summaries', async () => {
    const mockBills = [
      { id: '1', title: 'Bill 1', description: 'Description 1' },
      { id: '2', title: 'Bill 2', description: 'Description 2' },
    ];

    const mockQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockBills),
        }),
      }),
    };

    mockSelectFn.mockReturnValue(mockQuery);

    const result = await getBillsWithoutSummary(50);

    expect(result).toEqual(mockBills);
    expect(result).toHaveLength(2);
  });
});
