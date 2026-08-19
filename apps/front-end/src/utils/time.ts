// apps/front-end/src/utils/time.ts

import type { WakeSession } from '@/types';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const minutesToMs = (minutes: number) => minutes * MINUTE_MS;

export const minutesBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / MINUTE_MS);

export const addMinutes = (iso: string, minutes: number) =>
  new Date(Date.parse(iso) + minutesToMs(minutes)).toISOString();

export const clampPositiveMinutes = (minutes: number) =>
  Math.max(1, Math.round(minutes));

export const formatClock = (date: Date, locale = 'zh-Hant') =>
  new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

export const formatShortDate = (date: Date, locale = 'zh-Hant') =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);

export const formatDuration = (minutes: number, locale = 'zh-Hant') => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (hours === 0) return `${remainder} ${locale.startsWith('zh') ? '分鐘' : 'min'}`;
  if (remainder === 0) return `${hours} ${locale.startsWith('zh') ? '小時' : 'h'}`;
  return `${hours}${locale.startsWith('zh') ? '小時' : 'h'} ${remainder}${locale.startsWith('zh') ? '分鐘' : 'm'}`;
};

export const getElapsedMinutes = (wokeAt: string, now = new Date()) =>
  Math.max(0, Math.round((now.getTime() - Date.parse(wokeAt)) / MINUTE_MS));

export const getAverageCycleMinutes = (sessions: WakeSession[]) => {
  const sorted = [...sessions]
    .filter((session) => Number.isFinite(Date.parse(session.wokeAt)))
    .sort((a, b) => Date.parse(a.wokeAt) - Date.parse(b.wokeAt));
  const intervals: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const interval = minutesBetween(sorted[index - 1].wokeAt, sorted[index].wokeAt);
    if (interval >= 12 * 60 && interval <= 72 * 60) intervals.push(interval);
  }
  if (!intervals.length) return undefined;
  return Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length);
};

export const getPersonalMinutes = (
  wokeAt: string,
  now: Date,
  averageCycleMinutes?: number,
) => {
  const elapsedMinutes = getElapsedMinutes(wokeAt, now);
  if (!averageCycleMinutes) return undefined;
  return Math.round((elapsedMinutes / averageCycleMinutes) * DAY_MS / MINUTE_MS) % (24 * 60);
};

export const formatPersonalTime = (personalMinutes: number, locale = 'zh-Hant') => {
  const safeMinutes = ((Math.round(personalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(safeMinutes / 60).toString().padStart(2, '0');
  const minutes = (safeMinutes % 60).toString().padStart(2, '0');
  return locale.startsWith('zh') ? `${hours}:${minutes}` : `${hours}:${minutes}`;
};

export const getSleepMinutes = (session: WakeSession, nextSession?: WakeSession) => {
  if (!session.sleptAt || !nextSession?.wokeAt) return undefined;
  const duration = minutesBetween(session.sleptAt, nextSession.wokeAt);
  return duration >= 0 ? duration : undefined;
};

export const getWakeRelativeLabel = (minutes: number, locale = 'zh-Hant') =>
  locale.startsWith('zh') ? `醒來後 ${formatDuration(minutes, locale)}` : `${formatDuration(minutes, locale)} after waking`;

export const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isSameCalendarDay = (first: Date, second: Date) =>
  getDateKey(first) === getDateKey(second);

export const getCycleProgress = (wokeAt: string, now: Date, averageCycleMinutes?: number) => {
  if (!averageCycleMinutes) return undefined;
  return Math.min(1, getElapsedMinutes(wokeAt, now) / averageCycleMinutes);
};
