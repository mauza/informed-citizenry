import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility function', () => {
  it('should merge tailwind classes', () => {
    const result = cn('bg-red-500', 'text-white');
    expect(result).toBe('bg-red-500 text-white');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('should handle false conditional classes', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class');
  });

  it('should merge conflicting tailwind classes', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('should handle empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle null and undefined values', () => {
    const result = cn('class-1', null, undefined, 'class-2');
    expect(result).toBe('class-1 class-2');
  });

  it('should handle array of classes', () => {
    const result = cn(['class-1', 'class-2'], 'class-3');
    expect(result).toBe('class-1 class-2 class-3');
  });

  it('should handle nested arrays', () => {
    const result = cn(['class-1', ['class-2', 'class-3']]);
    expect(result).toBe('class-1 class-2 class-3');
  });
});
