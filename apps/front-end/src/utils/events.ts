// apps/front-end/src/utils/events.ts

import type { EventDefinition, EventOccurrence, EventRepeat, WakeSession } from '@/types';
import { addMinutes, minutesBetween } from '@/utils/time';

const DAY_MINUTES = 24 * 60;

const occurrenceId = (eventId: string, dueAt: string, sessionId?: string) =>
  `${eventId}:${sessionId ?? 'calendar'}:${dueAt}`;

export const createWakeOccurrences = (events: EventDefinition[], session: WakeSession, sessionIndex = 0) =>
  events
    .filter((event) => {
      if (!event.enabled || event.schedule !== 'wakeAfter' || (event.offsetMinutes ?? 0) <= 0) return false;
      if (event.repeat === 'everyCycles' && sessionIndex % Math.max(1, event.interval) !== 0) return false;
      return true;
    })
    .map<EventOccurrence>((event) => {
      const targetMinutes = event.offsetMinutes ?? 0;
      const dueAt = addMinutes(session.wokeAt, Math.max(0, targetMinutes - event.reminderMinutes));
      return {
        id: occurrenceId(event.id, dueAt, session.id),
        eventId: event.id,
        sessionId: session.id,
        dueAt,
        status: 'pending',
      };
    });

const getCalendarDueAt = (event: EventDefinition, index: number) => {
  if (!event.firstDueAt) return undefined;
  if (event.repeat === 'once') return index === 0 ? addMinutes(event.firstDueAt, -event.reminderMinutes) : undefined;
  const intervalDays = event.repeat === 'daily' ? 1 : Math.max(1, event.interval);
  return addMinutes(event.firstDueAt, index * intervalDays * DAY_MINUTES - event.reminderMinutes);
};

export const createCalendarOccurrences = (
  events: EventDefinition[],
  from: Date,
  to: Date,
  averageCycleMinutes?: number,
) => {
  const occurrences: EventOccurrence[] = [];
  for (const event of events) {
    if (!event.enabled || event.schedule !== 'calendar') continue;
    if (event.repeat === 'once' && event.firstDueAt) {
        const dueTime = Date.parse(addMinutes(event.firstDueAt, -event.reminderMinutes));
      if (dueTime >= from.getTime() && dueTime <= to.getTime()) {
        occurrences.push({
          id: occurrenceId(event.id, event.firstDueAt),
          eventId: event.id,
          dueAt: addMinutes(event.firstDueAt, -event.reminderMinutes),
          status: 'pending',
        });
      }
      continue;
    }
    const intervalMinutes = event.repeat === 'everyCycles'
      ? Math.max(1, averageCycleMinutes ?? DAY_MINUTES) * Math.max(1, event.interval)
      : (event.repeat === 'daily' ? DAY_MINUTES : Math.max(1, event.interval) * DAY_MINUTES);
    const start = Date.parse(event.firstDueAt ?? from.toISOString());
    const firstIndex = Math.max(0, Math.floor((from.getTime() - start) / (intervalMinutes * 60_000)) - 1);
    const lastIndex = Math.ceil((to.getTime() - start) / (intervalMinutes * 60_000)) + 1;
    for (let index = firstIndex; index <= lastIndex; index += 1) {
      const dueAt = event.repeat === 'everyCycles'
        ? addMinutes(event.firstDueAt ?? from.toISOString(), index * intervalMinutes - event.reminderMinutes)
        : getCalendarDueAt(event, index);
      if (!dueAt) continue;
      const dueTime = Date.parse(dueAt);
      if (dueTime >= from.getTime() && dueTime <= to.getTime()) {
        occurrences.push({
          id: occurrenceId(event.id, dueAt),
          eventId: event.id,
          dueAt,
          status: 'pending',
        });
      }
    }
  }
  return occurrences;
};

export const mergeOccurrences = (existing: EventOccurrence[], generated: EventOccurrence[]) => {
  const known = new Set(existing.map((occurrence) => occurrence.id));
  return [...existing, ...generated.filter((occurrence) => !known.has(occurrence.id))];
};

export const getDueOccurrences = (occurrences: EventOccurrence[], now = new Date()) =>
  occurrences.filter((occurrence) => {
    if (occurrence.status !== 'pending') return false;
    const dueTime = Date.parse(occurrence.snoozedUntil ?? occurrence.dueAt);
    return dueTime <= now.getTime();
  });

export const getNextOccurrence = (occurrences: EventOccurrence[], now = new Date()) =>
  occurrences
    .filter((occurrence) => occurrence.status === 'pending' && Date.parse(occurrence.snoozedUntil ?? occurrence.dueAt) > now.getTime())
    .sort((first, second) => Date.parse(first.snoozedUntil ?? first.dueAt) - Date.parse(second.snoozedUntil ?? second.dueAt))[0];

export const getOccurrenceRelativeMinutes = (occurrence: EventOccurrence, now = new Date()) =>
  minutesBetween(now.toISOString(), occurrence.snoozedUntil ?? occurrence.dueAt);

export const getRepeatLabelKey = (repeat: EventRepeat) => `event.repeat.${repeat}`;
