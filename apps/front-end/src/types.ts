// apps/front-end/src/types.ts

export type EventSchedule = 'wakeAfter' | 'calendar';
export type EventRepeat = 'once' | 'daily' | 'everyDays' | 'everyCycles';
export type EventStatus = 'pending' | 'completed' | 'skipped' | 'cancelled';

export interface WakeSession {
  id: string;
  wokeAt: string;
  sleptAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventDefinition {
  id: string;
  title: string;
  tag?: string;
  schedule: EventSchedule;
  offsetMinutes?: number;
  firstDueAt?: string;
  repeat: EventRepeat;
  interval: number;
  reminderMinutes: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventOccurrence {
  id: string;
  eventId: string;
  sessionId?: string;
  dueAt: string;
  status: EventStatus;
  completedAt?: string;
  snoozedUntil?: string;
  notifiedAt?: string;
}

export interface AppSettings {
  locale: string;
  weekStartsOn: 0 | 1;
  notificationPermission: NotificationPermission | 'unsupported' | 'unknown';
}

export interface AppState {
  schemaVersion: 1;
  settings: AppSettings;
  sessions: WakeSession[];
  events: EventDefinition[];
  occurrences: EventOccurrence[];
  lastBackupAt?: string;
}

export interface BackupFile {
  app: 'n24-clock';
  exportedAt: string;
  schemaVersion: 1;
  state: AppState;
}
