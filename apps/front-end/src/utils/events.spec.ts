// @/utils/events.spec.ts

import { describe, expect, it } from 'vitest';
import type { EventDefinition, WakeSession } from '@/types';
import { createCalendarOccurrences, createWakeOccurrences, getDueOccurrences } from '@/utils/events';

const wake: WakeSession = {
  id: 'wake-1',
  wokeAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const event = (patch: Partial<EventDefinition>): EventDefinition => ({
  id: 'event-1',
  title: 'Meal',
  schedule: 'wakeAfter',
  offsetMinutes: 360,
  repeat: 'once',
  interval: 1,
  reminderMinutes: 15,
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});

describe('n24 event engine', () => {
  it('creates wake-relative occurrences at the configured reminder lead time', () => {
    const [occurrence] = createWakeOccurrences([event({})], wake);
    expect(occurrence.dueAt).toBe('2026-01-01T05:45:00.000Z');
  });

  it('supports every N personal cycles for wake-relative events', () => {
    expect(createWakeOccurrences([event({ repeat: 'everyCycles', interval: 2 })], wake, 0)).toHaveLength(1);
    expect(createWakeOccurrences([event({ repeat: 'everyCycles', interval: 2 })], wake, 1)).toHaveLength(0);
  });

  it('materializes local calendar repeats and returns overdue pending items', () => {
    const calendarEvent = event({
      schedule: 'calendar',
      offsetMinutes: undefined,
      firstDueAt: '2026-01-02T12:00:00.000Z',
      repeat: 'everyDays',
      interval: 2,
    });
    const occurrences = createCalendarOccurrences(
      [calendarEvent],
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-07T00:00:00.000Z'),
    );
    expect(occurrences).toHaveLength(3);
    expect(getDueOccurrences(occurrences, new Date('2026-01-04T00:00:00.000Z'))).toHaveLength(1);
  });
});
