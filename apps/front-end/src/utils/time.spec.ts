// apps/front-end/src/utils/time.spec.ts

import { describe, expect, it } from 'vitest';
import type { WakeSession } from '@/types';
import { getAverageCycleMinutes, getPersonalMinutes, getSleepMinutes } from '@/utils/time';

const session = (wokeAt: string, sleptAt?: string): WakeSession => ({
  id: wokeAt,
  wokeAt,
  sleptAt,
  createdAt: wokeAt,
  updatedAt: wokeAt,
});

describe('n24 time model', () => {
  it('estimates the average cycle from wake intervals and ignores implausible intervals', () => {
    const sessions = [
      session('2026-01-01T00:00:00.000Z'),
      session('2026-01-02T00:30:00.000Z'),
      session('2026-01-03T01:00:00.000Z'),
      session('2026-01-10T01:00:00.000Z'),
    ];
    expect(getAverageCycleMinutes(sessions)).toBe(1_470);
  });

  it('maps elapsed time into personal time only when an average exists', () => {
    const wokeAt = '2026-01-01T00:00:00.000Z';
    expect(getPersonalMinutes(wokeAt, new Date('2026-01-01T02:30:00.000Z'))).toBeUndefined();
    expect(getPersonalMinutes(wokeAt, new Date('2026-01-01T02:30:00.000Z'), 1_470)).toBe(147);
  });

  it('pairs sleep start with the following wake record', () => {
    const first = session('2026-01-01T00:00:00.000Z', '2026-01-01T10:00:00.000Z');
    const second = session('2026-01-01T18:00:00.000Z');
    expect(getSleepMinutes(first, second)).toBe(480);
    expect(getSleepMinutes(second)).toBeUndefined();
  });
});
