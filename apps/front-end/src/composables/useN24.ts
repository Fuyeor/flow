// apps/front-end/src/composables/useN24.ts

import { computed, ref, watch } from 'vue';
import type {
  AppState,
  EventDefinition,
  EventOccurrence,
  EventStatus,
  WakeSession,
} from '@/types';
import {
  createCalendarOccurrences,
  createWakeOccurrences,
  getDueOccurrences,
  mergeOccurrences,
} from '@/utils/events';
import { addMinutes, getAverageCycleMinutes } from '@/utils/time';
import { loadState, saveState, downloadBackup, readBackupFile } from '@/utils/storage';

const state = ref<AppState>(loadState());
const now = ref(new Date());
let clockTimer: number | undefined;

const ensureClock = () => {
  if (clockTimer !== undefined) return;
  clockTimer = window.setInterval(() => {
    now.value = new Date();
  }, 1_000);
};

const createId = (prefix: string) => `${prefix}-${window.crypto.randomUUID()}`;

const commit = (mutator: (draft: AppState) => void) => {
  mutator(state.value);
  saveState(state.value);
};

const syncCalendarOccurrences = () => {
  const generated = createCalendarOccurrences(
    state.value.events,
    new Date(Date.now() - 31 * 24 * 60 * 60 * 1_000),
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1_000),
    getAverageCycleMinutes(state.value.sessions),
  );
  state.value.occurrences = mergeOccurrences(state.value.occurrences, generated);
};

const syncWakeOccurrences = (session: WakeSession) => {
  const retained = state.value.occurrences.filter(
    (occurrence) => !(occurrence.sessionId === session.id && occurrence.status === 'pending'),
  );
  state.value.occurrences = [...retained, ...createWakeOccurrences(state.value.events, session)];
};

ensureClock();
syncCalendarOccurrences();
saveState(state.value);

export const useN24 = () => {
  const activeSession = computed(() =>
    [...state.value.sessions]
      .filter((session) => !session.sleptAt)
      .sort((first, second) => Date.parse(second.wokeAt) - Date.parse(first.wokeAt))[0],
  );

  const dueOccurrences = computed(() => getDueOccurrences(state.value.occurrences, now.value));

  const updateSettings = (patch: Partial<AppState['settings']>) => {
    commit((draft) => {
      draft.settings = { ...draft.settings, ...patch };
    });
  };

  const recordWake = (wokeAt = new Date().toISOString()) => {
    if (activeSession.value) return activeSession.value;
    const session: WakeSession = {
      id: createId('wake'),
      wokeAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    commit((draft) => {
      draft.sessions.push(session);
      draft.occurrences = mergeOccurrences(draft.occurrences, createWakeOccurrences(draft.events, session, draft.sessions.indexOf(session)));
    });
    return session;
  };

  const recordSleep = (sleptAt = new Date().toISOString()) => {
    if (!activeSession.value) return undefined;
    const sessionId = activeSession.value.id;
    commit((draft) => {
      const session = draft.sessions.find((item) => item.id === sessionId);
      if (!session) return;
      session.sleptAt = sleptAt;
      session.updatedAt = new Date().toISOString();
    });
    return state.value.sessions.find((session) => session.id === sessionId);
  };

  const updateSession = (sessionId: string, patch: Pick<WakeSession, 'wokeAt' | 'sleptAt'>) => {
    commit((draft) => {
      const session = draft.sessions.find((item) => item.id === sessionId);
      if (!session) throw new Error(`Unknown wake session: ${sessionId}`);
      session.wokeAt = patch.wokeAt;
      session.sleptAt = patch.sleptAt;
      session.updatedAt = new Date().toISOString();
      const retained = draft.occurrences.filter(
        (occurrence) => !(occurrence.sessionId === sessionId && occurrence.status === 'pending'),
      );
      draft.occurrences = [...retained, ...createWakeOccurrences(draft.events, session, draft.sessions.indexOf(session))];
    });
  };

  const createEvent = (input: Omit<EventDefinition, 'id' | 'createdAt' | 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const event: EventDefinition = {
      ...input,
      id: createId('event'),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    commit((draft) => {
      draft.events.push(event);
      if (activeSession.value) draft.occurrences = mergeOccurrences(draft.occurrences, createWakeOccurrences([event], activeSession.value, draft.sessions.indexOf(activeSession.value)));
    });
    syncCalendarOccurrences();
    saveState(state.value);
    return event;
  };

  const updateEvent = (eventId: string, patch: Partial<Omit<EventDefinition, 'id' | 'createdAt'>>) => {
    commit((draft) => {
      const event = draft.events.find((item) => item.id === eventId);
      if (!event) throw new Error(`Unknown event: ${eventId}`);
      Object.assign(event, patch, { updatedAt: new Date().toISOString() });
      draft.occurrences = draft.occurrences.filter(
        (occurrence) => !(occurrence.eventId === eventId && occurrence.status === 'pending'),
      );
      if (activeSession.value) draft.occurrences = mergeOccurrences(draft.occurrences, createWakeOccurrences([event], activeSession.value, draft.sessions.indexOf(activeSession.value)));
    });
    syncCalendarOccurrences();
    saveState(state.value);
  };

  const cancelEvent = (eventId: string) => {
    commit((draft) => {
      const event = draft.events.find((item) => item.id === eventId);
      if (!event) return;
      event.enabled = false;
      event.updatedAt = new Date().toISOString();
      draft.occurrences = draft.occurrences.map((occurrence) =>
        occurrence.eventId === eventId && occurrence.status === 'pending'
          ? { ...occurrence, status: 'cancelled' }
          : occurrence,
      );
    });
  };

  const setOccurrenceStatus = (occurrenceId: string, status: EventStatus) => {
    commit((draft) => {
      const occurrence = draft.occurrences.find((item) => item.id === occurrenceId);
      if (!occurrence) throw new Error(`Unknown event occurrence: ${occurrenceId}`);
      occurrence.status = status;
      occurrence.completedAt = status === 'completed' ? new Date().toISOString() : undefined;
      if (status !== 'pending') occurrence.snoozedUntil = undefined;
    });
  };

  const snoozeOccurrence = (occurrenceId: string, minutes = 15) => {
    commit((draft) => {
      const occurrence = draft.occurrences.find((item) => item.id === occurrenceId);
      if (!occurrence) throw new Error(`Unknown event occurrence: ${occurrenceId}`);
      occurrence.status = 'pending';
      occurrence.snoozedUntil = addMinutes(new Date().toISOString(), minutes);
    });
  };

  const requestNotifications = async () => {
    const permission = await window.Notification.requestPermission();
    updateSettings({ notificationPermission: permission });
    return permission;
  };

  const notifyDueOccurrences = () => {
    if (state.value.settings.notificationPermission !== 'granted') return;
    for (const occurrence of dueOccurrences.value) {
      const event = state.value.events.find((item) => item.id === occurrence.eventId);
      if (!event || occurrence.notifiedAt) continue;
      new window.Notification(event.title, {
        body: event.tag || 'n24 Clock',
        silent: true,
      });
      commit((draft) => {
        const target = draft.occurrences.find((item) => item.id === occurrence.id);
        if (target) target.notifiedAt = new Date().toISOString();
      });
    }
  };

  const exportBackup = () => {
    const exportedAt = downloadBackup(state.value);
    state.value.lastBackupAt = exportedAt;
    saveState(state.value);
    return exportedAt;
  };

  const importBackup = async (file: File) => {
    const imported = await readBackupFile(file);
    state.value = imported;
    syncCalendarOccurrences();
    saveState(state.value);
  };

  const removeSession = (sessionId: string) => {
    commit((draft) => {
      draft.sessions = draft.sessions.filter((session) => session.id !== sessionId);
      draft.occurrences = draft.occurrences.filter((occurrence) => occurrence.sessionId !== sessionId);
    });
  };

  watch(dueOccurrences, notifyDueOccurrences, { deep: true });

  return {
    state,
    now,
    activeSession,
    dueOccurrences,
    updateSettings,
    recordWake,
    recordSleep,
    updateSession,
    createEvent,
    updateEvent,
    cancelEvent,
    setOccurrenceStatus,
    snoozeOccurrence,
    requestNotifications,
    notifyDueOccurrences,
    exportBackup,
    importBackup,
    removeSession,
  };
};
