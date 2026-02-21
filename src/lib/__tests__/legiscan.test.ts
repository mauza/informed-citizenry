import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapLegiscanStatus } from '../legiscan';

describe('mapLegiscanStatus', () => {
  it('should map status code 1 to "introduced"', () => {
    expect(mapLegiscanStatus(1)).toBe('introduced');
  });

  it('should map status code 2 to "in_committee"', () => {
    expect(mapLegiscanStatus(2)).toBe('in_committee');
  });

  it('should map status code 3 to "passed"', () => {
    expect(mapLegiscanStatus(3)).toBe('passed');
  });

  it('should map status code 4 to "signed"', () => {
    expect(mapLegiscanStatus(4)).toBe('signed');
  });

  it('should map status code 5 to "vetoed"', () => {
    expect(mapLegiscanStatus(5)).toBe('vetoed');
  });

  it('should map status code 6 to "failed"', () => {
    expect(mapLegiscanStatus(6)).toBe('failed');
  });

  it('should default unknown status codes to "introduced"', () => {
    expect(mapLegiscanStatus(99)).toBe('introduced');
    expect(mapLegiscanStatus(0)).toBe('introduced');
    expect(mapLegiscanStatus(-1)).toBe('introduced');
  });

  it('should handle all defined status codes', () => {
    const statusCodes = [1, 2, 3, 4, 5, 6];
    const expectedStatuses = ['introduced', 'in_committee', 'passed', 'signed', 'vetoed', 'failed'];

    statusCodes.forEach((code, index) => {
      expect(mapLegiscanStatus(code)).toBe(expectedStatuses[index]);
    });
  });
});
