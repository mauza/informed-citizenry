import { vi } from 'vitest';

// Mock database query results
export const mockDb = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  innerJoin: vi.fn(),
  leftJoin: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  offset: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  groupBy: vi.fn(),
};

// Helper to create chainable mock
export function createChainableMock(returnValue: any) {
  const chain = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    then: vi.fn((callback: (val: any) => any) => Promise.resolve(callback(returnValue))),
  };
  return chain;
}

// Mock data factories
export const createMockLegislatorVote = (overrides = {}) => ({
  billId: 'bill-1',
  vote: 'yea',
  ...overrides,
});

export const createMockSentimentAgg = (overrides = {}) => ({
  billId: 'bill-1',
  sentiment: 'support',
  total: 10,
  ...overrides,
});

export const createMockBill = (overrides = {}) => ({
  id: 'bill-1',
  billType: 'HB',
  billNumber: '1234',
  title: 'Test Bill',
  status: 'introduced',
  stateId: 'CA',
  sessionYear: 2024,
  ...overrides,
});

export const createMockLegislator = (overrides = {}) => ({
  id: 'leg-1',
  firstName: 'John',
  lastName: 'Doe',
  party: 'D',
  chamber: 'H',
  stateId: 'CA',
  ...overrides,
});
