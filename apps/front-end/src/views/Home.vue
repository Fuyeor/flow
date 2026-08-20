<!-- @/views/Home.vue -->
<template>
  <div class="flow-page">
    <header class="flow-page-header">
      <div>
        <p class="flow-eyebrow">{{ t('home.eyebrow') }}</p>
        <h1>{{ t('site.title') }}</h1>
      </div>
      <router-link class="flow-text-link" to="/data"
        >{{ t('nav.data') }} →</router-link
      >
    </header>

    <section class="flow-time-card" :class="{ 'is-sleeping': !activeSession }">
      <div class="flow-time-card-topline">
        <span>{{ t('home.personalTime') }}</span>
        <span v-if="activeSession" class="flow-live-dot"
          ><i></i>{{ t('home.awakeFor') }}
          {{ formatDuration(elapsedMinutes) }}</span
        >
      </div>
      <p class="personal-clock" aria-live="polite">
        {{ personalTime ?? '—:——' }}
      </p>
      <p class="local-clock">{{ t('home.localTime') }} · {{ localTime }}</p>
      <p class="flow-time-copy">
        {{
          activeSession
            ? `${t('home.awakeFor')} ${formatDuration(elapsedMinutes)}`
            : t('home.wakePrompt')
        }}
      </p>
      <div class="flow-time-actions">
        <button
          v-if="!activeSession"
          class="flow-button primary large"
          type="button"
          @click="wake"
        >
          <span aria-hidden="true">◒</span>{{ t('home.woke') }}
        </button>
        <button
          v-else
          class="flow-button secondary large"
          type="button"
          @click="sleep"
        >
          <span aria-hidden="true">◐</span>{{ t('home.sleep') }}
        </button>
      </div>
    </section>

    <section class="flow-stat-grid" aria-label="Rhythm summary">
      <article class="flow-stat-card">
        <p>{{ t('home.averageCycle') }}</p>
        <strong v-if="averageCycle">{{ formatDuration(averageCycle) }}</strong>
        <strong v-else>—</strong>
        <span>{{ averageCycle ? t('common.local') : t('home.noCycle') }}</span>
      </article>
      <article class="flow-stat-card">
        <p>{{ t('data.ratio') }}</p>
        <strong v-if="wakeSleepRatio">{{ wakeSleepRatio }}</strong>
        <strong v-else>—</strong>
        <span>{{ t('home.events') }} · {{ pendingOccurrences.length }}</span>
      </article>
    </section>

    <section class="flow-section-card">
      <div class="flow-section-heading">
        <div>
          <p class="flow-eyebrow">{{ t('home.events') }}</p>
          <h2>{{ t('home.events') }}</h2>
        </div>
        <button
          class="flow-button small primary"
          type="button"
          @click="openCreate"
        >
          + {{ t('home.addEvent') }}
        </button>
      </div>

      <div v-if="eventCards.length" class="capsule-list">
        <article
          v-for="card in eventCards"
          :key="card.occurrence.id"
          class="event-capsule"
          :class="{ overdue: card.isDue }"
        >
          <button
            class="capsule-main"
            type="button"
            @click="complete(card.occurrence.id)"
          >
            <span class="capsule-check" aria-hidden="true">{{
              card.occurrence.status === 'completed' ? '✓' : ''
            }}</span>
            <span class="capsule-copy">
              <strong>{{ card.event.title }}</strong>
              <small>{{ card.event.tag || card.whenLabel }}</small>
            </span>
            <time>{{ card.whenLabel }}</time>
          </button>
          <div class="capsule-actions">
            <button type="button" @click="snooze(card.occurrence.id)">
              {{ t('event.snooze') }}
            </button>
            <button type="button" @click="skip(card.occurrence.id)">
              {{ t('event.skip') }}
            </button>
            <button type="button" @click="openEdit(card.event)">
              {{ t('data.edit') }}
            </button>
          </div>
        </article>
      </div>
      <div v-else class="flow-empty-state">
        <span class="flow-empty-mark" aria-hidden="true">+</span>
        <p>{{ t('home.emptyEvents') }}</p>
        <button class="flow-text-link" type="button" @click="openCreate">
          {{ t('home.addEvent') }} →
        </button>
      </div>
    </section>

    <section v-if="backupDue" class="flow-backup-banner">
      <div>
        <strong>{{ t('settings.backup') }}</strong>
        <p>{{ t('settings.backupHint') }}</p>
      </div>
      <router-link class="flow-button secondary small" to="/settings">{{
        t('settings.export')
      }}</router-link>
    </section>

    <EventForm
      v-if="formOpen"
      :initial="editingEvent"
      @cancel="closeForm"
      @save="saveEvent"
    />

    <div v-if="toast" class="flow-toast" role="status">
      <span>{{ toast.message }}</span>
      <button type="button" @click="undoToast">{{ t('event.undo') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useLocale } from '@fuyeor/locale';
import EventForm from '@/components/EventForm.vue';
import { useN24 } from '@/composables/useN24';
import type { EventDefinition } from '@/types';
import {
  formatClock,
  formatDuration,
  formatPersonalTime,
  getAverageCycleMinutes,
  getElapsedMinutes,
  getPersonalMinutes,
  getSleepMinutes,
} from '@/utils/time';

const { t, locale } = useLocale();
const {
  state,
  now,
  activeSession,
  recordWake,
  recordSleep,
  createEvent,
  updateEvent,
  setOccurrenceStatus,
  snoozeOccurrence,
} = useN24();

const formOpen = ref(false);
const editingEvent = ref<EventDefinition>();
const toast = ref<{ message: string; occurrenceId: string; timeout: number }>();

const averageCycle = computed(() =>
  getAverageCycleMinutes(state.value.sessions),
);
const localTime = computed(() => formatClock(now.value, locale.value));
const elapsedMinutes = computed(() =>
  activeSession.value
    ? getElapsedMinutes(activeSession.value.wokeAt, now.value)
    : 0,
);
const personalTime = computed(() => {
  if (!activeSession.value || !averageCycle.value) return undefined;
  const minutes = getPersonalMinutes(
    activeSession.value.wokeAt,
    now.value,
    averageCycle.value,
  );
  return minutes === undefined
    ? undefined
    : formatPersonalTime(minutes, locale.value);
});

const wakeSleepRatio = computed(() => {
  const orderedSessions = [...state.value.sessions].sort(
    (first, second) => Date.parse(first.wokeAt) - Date.parse(second.wokeAt),
  );
  const completed = orderedSessions
    .map((session, index) =>
      getSleepMinutes(session, orderedSessions[index + 1]),
    )
    .filter(
      (minutes): minutes is number => minutes !== undefined && minutes > 0,
    );
  if (!completed.length) return undefined;
  const averageSleep =
    completed.reduce((sum, value) => sum + value, 0) / completed.length;
  const averageWake = averageCycle.value
    ? averageCycle.value - averageSleep
    : undefined;
  if (!averageWake || averageWake <= 0) return undefined;
  return `${(averageWake / averageSleep).toFixed(1)} : 1`;
});

const pendingOccurrences = computed(() =>
  state.value.occurrences
    .filter((occurrence) => occurrence.status === 'pending')
    .sort(
      (first, second) =>
        Date.parse(first.snoozedUntil ?? first.dueAt) -
        Date.parse(second.snoozedUntil ?? second.dueAt),
    ),
);

const eventCards = computed(() =>
  pendingOccurrences.value.slice(0, 8).flatMap((occurrence) => {
    const event = state.value.events.find(
      (item) => item.id === occurrence.eventId,
    );
    if (!event) return [];
    const dueAt = new Date(occurrence.snoozedUntil ?? occurrence.dueAt);
    const isDue = dueAt.getTime() <= now.value.getTime();
    const whenLabel =
      event.schedule === 'wakeAfter'
        ? `${t('event.afterWake')} · ${formatDuration(event.offsetMinutes ?? 0)}`
        : formatClock(dueAt, locale.value);
    return [{ occurrence, event, isDue, whenLabel }];
  }),
);

const backupDue = computed(() => {
  const first = state.value.sessions
    .map((session) => Date.parse(session.wokeAt))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  return (
    first !== undefined &&
    now.value.getTime() - first > 21 * 24 * 60 * 60 * 1_000 &&
    (!state.value.lastBackupAt || Date.parse(state.value.lastBackupAt) < first)
  );
});

const wake = () => recordWake();
const sleep = () => recordSleep();

const openCreate = () => {
  editingEvent.value = undefined;
  formOpen.value = true;
};

const openEdit = (event: EventDefinition) => {
  editingEvent.value = event;
  formOpen.value = true;
};

const closeForm = () => {
  formOpen.value = false;
  editingEvent.value = undefined;
};

const saveEvent = (
  value: Omit<EventDefinition, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  if (editingEvent.value) updateEvent(editingEvent.value.id, value);
  else createEvent(value);
  closeForm();
};

const complete = (occurrenceId: string) => {
  setOccurrenceStatus(occurrenceId, 'completed');
  const timeout = window.setTimeout(() => {
    if (toast.value?.occurrenceId === occurrenceId) toast.value = undefined;
  }, 3_000);
  toast.value = { message: t('event.doneToast'), occurrenceId, timeout };
};

const undoToast = () => {
  if (!toast.value) return;
  window.clearTimeout(toast.value.timeout);
  setOccurrenceStatus(toast.value.occurrenceId, 'pending');
  toast.value = undefined;
};

const snooze = (occurrenceId: string) => snoozeOccurrence(occurrenceId, 15);
const skip = (occurrenceId: string) =>
  setOccurrenceStatus(occurrenceId, 'skipped');

onBeforeUnmount(() => {
  if (toast.value) window.clearTimeout(toast.value.timeout);
});
</script>
