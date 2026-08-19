// apps/front-end/src/utils/storage.ts

import type {
  AppSettings,
  AppState,
  BackupFile,
  EventDefinition,
  EventOccurrence,
  WakeSession,
} from '@/types';

export const STORAGE_KEY = 'n24Clock.state.v1';
export const SCHEMA_VERSION = 1 as const;

const DEFAULT_SETTINGS: AppSettings = {
  locale: 'zh-hant',
  weekStartsOn: 1,
  notificationPermission: 'unknown',
};

const createDefaultState = (): AppState => ({
  schemaVersion: SCHEMA_VERSION,
  settings: { ...DEFAULT_SETTINGS },
  sessions: [],
  events: [],
  occurrences: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isArrayOfRecords = (value: unknown) =>
  Array.isArray(value) && value.every((item) => isRecord(item));

export const parseState = (value: unknown): AppState => {
  if (!isRecord(value)) throw new TypeError('n24 state must be an object');
  if (value.schemaVersion !== SCHEMA_VERSION) throw new Error('Unsupported n24 state schema');
  if (!isRecord(value.settings)) throw new TypeError('n24 settings are missing');
  if (!isArrayOfRecords(value.sessions)) throw new TypeError('n24 sessions are invalid');
  if (!isArrayOfRecords(value.events)) throw new TypeError('n24 events are invalid');
  if (!isArrayOfRecords(value.occurrences)) throw new TypeError('n24 occurrences are invalid');

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(value.settings as Partial<AppSettings>),
    },
    sessions: value.sessions as unknown as WakeSession[],
    events: value.events as unknown as EventDefinition[],
    occurrences: value.occurrences as unknown as EventOccurrence[],
    lastBackupAt: typeof value.lastBackupAt === 'string' ? value.lastBackupAt : undefined,
  };
};

export const loadState = (): AppState => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();
  try {
    return parseState(JSON.parse(raw));
  } catch (error) {
    console.warn('[n24] Invalid local state; starting with a clean state.', error);
    return createDefaultState();
  }
};

export const saveState = (state: AppState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const createBackup = (state: AppState): BackupFile => ({
  app: 'n24-clock',
  exportedAt: new Date().toISOString(),
  schemaVersion: SCHEMA_VERSION,
  state,
});

export const parseBackup = (value: unknown): AppState => {
  if (!isRecord(value) || value.app !== 'n24-clock') throw new TypeError('This file is not an n24 Clock backup');
  if (value.schemaVersion !== SCHEMA_VERSION) throw new Error('Unsupported n24 backup schema');
  return parseState(value.state);
};

export const downloadBackup = (state: AppState) => {
  const backup = createBackup(state);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `n24-clock-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  return backup.exportedAt;
};

export const readBackupFile = async (file: File) =>
  parseBackup(JSON.parse(await file.text()));
