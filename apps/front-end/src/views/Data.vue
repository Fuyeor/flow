<!-- apps/front-end/src/views/Data.vue -->
<template>
  <div class="flow-page">
    <header class="flow-page-header">
      <div>
        <p class="flow-eyebrow">{{ t('nav.data') }}</p>
        <h1>{{ t('data.title') }}</h1>
        <p class="flow-page-subtitle">{{ t('data.subtitle') }}</p>
      </div>
      <router-link class="flow-text-link" to="/">← {{ t('nav.home') }}</router-link>
    </header>

    <section class="flow-section-card chart-card">
      <div class="flow-section-heading">
        <div>
          <p class="flow-eyebrow">{{ t('data.wakeSleepCurve') }}</p>
          <h2>{{ t('data.wakeSleepCurve') }}</h2>
        </div>
        <span class="chart-legend"><i class="wake-dot"></i>{{ t('data.wake') }} <i class="sleep-dot"></i>{{ t('data.sleep') }}</span>
      </div>
      <div v-if="chartRows.length" class="chart-scroll">
        <svg class="flow-chart" :viewBox="`0 0 ${chartWidth} 260`" role="img" :aria-label="t('data.wakeSleepCurve')">
          <line v-for="tick in chartTicks" :key="tick.label" x1="28" :x2="chartWidth - 12" :y1="tick.y" :y2="tick.y" class="chart-grid-line" />
          <text v-for="tick in chartTicks" :key="`${tick.label}-text`" x="0" :y="tick.y + 4" class="chart-axis-label">{{ tick.label }}</text>
          <polyline :points="wakeLine" class="chart-line wake-line" />
          <polyline :points="sleepLine" class="chart-line sleep-line" />
          <g v-for="point in chartPoints" :key="point.id">
            <circle :cx="point.x" :cy="point.wakeY" r="5" class="chart-point wake-point" />
            <circle v-if="point.sleepY !== undefined" :cx="point.x" :cy="point.sleepY" r="5" class="chart-point sleep-point" />
            <text :x="point.x" y="252" text-anchor="middle" class="chart-date-label">{{ point.dateLabel }}</text>
          </g>
        </svg>
      </div>
      <div v-else class="flow-empty-state compact"><p>{{ t('data.noData') }}</p></div>
    </section>

    <section class="flow-data-grid">
      <article class="flow-section-card ratio-card">
        <div class="flow-section-heading">
          <div>
            <p class="flow-eyebrow">{{ t('data.ratio') }}</p>
            <h2>{{ averageRatio ?? '—' }}</h2>
          </div>
          <span class="metric-caption">{{ t('home.averageCycle') }} · {{ averageCycle ? formatDuration(averageCycle) : '—' }}</span>
        </div>
        <div v-if="ratioRows.length" class="ratio-bars">
          <div v-for="row in ratioRows" :key="row.id" class="ratio-row">
            <div class="ratio-row-label"><span>{{ row.label }}</span><strong>{{ row.ratio }}</strong></div>
            <div class="ratio-track"><span :style="{ width: `${row.percent}%` }"></span></div>
          </div>
        </div>
        <p v-else class="flow-muted">{{ t('data.noData') }}</p>
      </article>
      <article class="flow-section-card">
        <div class="flow-section-heading">
          <div>
            <p class="flow-eyebrow">{{ t('data.eventsCompleted') }}</p>
            <h2>{{ completedEvents }}</h2>
          </div>
          <span class="metric-caption">{{ t('data.records') }}</span>
        </div>
        <div class="completion-ring" :style="{ '--completion': `${completionPercent}%` }"><span>{{ completionPercent }}%</span></div>
      </article>
    </section>

    <section class="flow-section-card records-card">
      <div class="flow-section-heading"><div><p class="flow-eyebrow">{{ t('data.records') }}</p><h2>{{ t('data.records') }}</h2></div></div>
      <div v-if="records.length" class="record-list">
        <article v-for="record in records" :key="record.id" class="record-row">
          <div class="record-main">
            <strong>{{ record.dateLabel }}</strong>
            <span>{{ t('data.wake') }} {{ record.wakeLabel }} <span v-if="record.sleepLabel">· {{ t('data.sleep') }} {{ record.sleepLabel }}</span></span>
          </div>
          <div class="record-meta"><span v-if="record.sleepMinutes">{{ formatDuration(record.sleepMinutes) }}</span><button class="flow-text-link" type="button" @click="openEdit(record.id)">{{ t('data.edit') }}</button></div>
        </article>
      </div>
      <div v-else class="flow-empty-state compact"><p>{{ t('data.noData') }}</p></div>
    </section>

    <section v-if="editingRecord" class="flow-modal" role="dialog" aria-modal="true" :aria-label="t('data.edit')">
      <div class="flow-modal-panel">
        <div class="flow-modal-header"><div><p class="flow-eyebrow">{{ t('data.edit') }}</p><h2>{{ editingRecord.dateLabel }}</h2></div><button class="flow-icon-button" type="button" @click="editingRecord = undefined">×</button></div>
        <form class="flow-form" @submit.prevent="saveRecord">
          <label><span>{{ t('data.wake') }}</span><input v-model="editWake" type="datetime-local" required /></label>
          <label><span>{{ t('data.sleep') }}</span><input v-model="editSleep" type="datetime-local" /></label>
          <div class="flow-modal-actions"><button class="flow-button secondary" type="button" @click="editingRecord = undefined">{{ t('event.cancel') }}</button><button class="flow-button primary" type="submit">{{ t('event.save') }}</button></div>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useLocale } from '@fuyeor/locale';
import { useN24 } from '@/composables/useN24';
import { formatClock, formatDuration, formatShortDate, getAverageCycleMinutes, getSleepMinutes } from '@/utils/time';
import type { WakeSession } from '@/types';

const { t, locale } = useLocale();
const { state, updateSession } = useN24();

const chartHeight = 220;
const chartWidth = computed(() => Math.max(540, chartRows.value.length * 72));
const chartRows = computed(() => [...state.value.sessions].sort((first, second) => Date.parse(first.wokeAt) - Date.parse(second.wokeAt)).slice(-14));
const averageCycle = computed(() => getAverageCycleMinutes(state.value.sessions));

const chartTicks = [
  { label: '00', y: 32 },
  { label: '06', y: 81 },
  { label: '12', y: 130 },
  { label: '18', y: 179 },
  { label: '24', y: 228 },
];

const getY = (iso: string) => {
  const date = new Date(iso);
  const minutes = date.getHours() * 60 + date.getMinutes();
  return 32 + (minutes / 1440) * chartHeight;
};

const chartPoints = computed(() => chartRows.value.map((session, index) => ({
  id: session.id,
  x: 48 + index * 72,
  wakeY: getY(session.wokeAt),
  sleepY: session.sleptAt ? getY(session.sleptAt) : undefined,
  dateLabel: formatShortDate(new Date(session.wokeAt), locale.value),
})));
const wakeLine = computed(() => chartPoints.value.map((point) => `${point.x},${point.wakeY}`).join(' '));
const sleepLine = computed(() => chartPoints.value.filter((point) => point.sleepY !== undefined).map((point) => `${point.x},${point.sleepY}`).join(' '));

const orderedSessions = computed(() => [...state.value.sessions].sort((first, second) => Date.parse(first.wokeAt) - Date.parse(second.wokeAt)));
const records = computed(() => [...orderedSessions.value]
  .reverse()
  .map((session) => ({
    ...session,
    dateLabel: formatShortDate(new Date(session.wokeAt), locale.value),
    wakeLabel: formatClock(new Date(session.wokeAt), locale.value),
    sleepLabel: session.sleptAt ? formatClock(new Date(session.sleptAt), locale.value) : undefined,
    sleepMinutes: getSleepMinutes(session, orderedSessions.value[orderedSessions.value.indexOf(session) + 1]),
  })));

const ratioRows = computed(() => records.value.filter((record) => record.sleepMinutes && averageCycle.value).slice(0, 8).map((record) => {
  const sleepMinutes = record.sleepMinutes ?? 0;
  const wakeMinutes = Math.max(0, (averageCycle.value ?? 0) - sleepMinutes);
  return {
    id: record.id,
    label: record.dateLabel,
    ratio: `${(wakeMinutes / Math.max(1, sleepMinutes)).toFixed(1)} : 1`,
    percent: Math.min(100, Math.round((sleepMinutes / Math.max(1, averageCycle.value ?? 1)) * 100)),
  };
}));
const averageRatio = computed(() => {
  if (!ratioRows.value.length) return undefined;
  const total = ratioRows.value.reduce((sum, row) => sum + Number(row.ratio.split(' ')[0]), 0);
  return `${(total / ratioRows.value.length).toFixed(1)} : 1`;
});

const completedEvents = computed(() => state.value.occurrences.filter((occurrence) => occurrence.status === 'completed').length);
const allTrackedEvents = computed(() => state.value.occurrences.filter((occurrence) => occurrence.status !== 'cancelled').length);
const completionPercent = computed(() => allTrackedEvents.value ? Math.round((completedEvents.value / allTrackedEvents.value) * 100) : 0);

const editingRecord = ref<(typeof records.value)[number]>();
const editWake = ref('');
const editSleep = ref('');

const toInput = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const openEdit = (sessionId: string) => {
  const record = records.value.find((item) => item.id === sessionId);
  if (!record) return;
  editingRecord.value = record;
  editWake.value = toInput(record.wokeAt);
  editSleep.value = toInput(record.sleptAt);
};

const saveRecord = () => {
  if (!editingRecord.value) return;
  updateSession(editingRecord.value.id, {
    wokeAt: new Date(editWake.value).toISOString(),
    sleptAt: editSleep.value ? new Date(editSleep.value).toISOString() : undefined,
  });
  editingRecord.value = undefined;
};
</script>
