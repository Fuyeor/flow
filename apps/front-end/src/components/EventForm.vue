<!-- @/components/EventForm.vue -->
<template>
  <section
    class="flow-modal"
    role="dialog"
    aria-modal="true"
    :aria-label="t('event.new')"
  >
    <div class="flow-modal-panel">
      <div class="flow-modal-header">
        <div>
          <p class="flow-eyebrow">{{ t('event.new') }}</p>
          <h2>{{ initial?.id ? t('data.edit') : t('home.addEvent') }}</h2>
        </div>
        <button
          class="flow-icon-button"
          type="button"
          :aria-label="t('event.cancel')"
          @click="$emit('cancel')"
        >
          ×
        </button>
      </div>

      <form class="flow-form" @submit.prevent="submit">
        <label>
          <span>{{ t('event.title') }}</span>
          <input
            v-model.trim="form.title"
            required
            maxlength="120"
            autocomplete="off"
          />
        </label>
        <label>
          <span>{{ t('event.tag') }}</span>
          <input v-model.trim="form.tag" maxlength="80" autocomplete="off" />
        </label>

        <fieldset>
          <legend>{{ t('event.when') }}</legend>
          <div class="flow-choice-grid">
            <label
              class="flow-choice"
              :class="{ selected: form.schedule === 'wakeAfter' }"
            >
              <input v-model="form.schedule" type="radio" value="wakeAfter" />
              <span>{{ t('event.afterWake') }}</span>
            </label>
            <label
              class="flow-choice"
              :class="{ selected: form.schedule === 'calendar' }"
            >
              <input v-model="form.schedule" type="radio" value="calendar" />
              <span>{{ t('event.calendar') }}</span>
            </label>
          </div>
        </fieldset>

        <label v-if="form.schedule === 'wakeAfter'">
          <span>{{ t('event.hours') }}</span>
          <input
            v-model.number="form.offsetHours"
            type="number"
            min="0.25"
            max="720"
            step="0.25"
            required
          />
        </label>
        <label v-else>
          <span>{{ t('event.dateTime') }}</span>
          <input v-model="form.firstDueAt" type="datetime-local" required />
        </label>

        <label>
          <span>{{ t('event.repeat') }}</span>
          <select v-model="form.repeat">
            <option value="once">{{ t('event.repeat.once') }}</option>
            <option value="daily">{{ t('event.repeat.daily') }}</option>
            <option value="everyDays">{{ t('event.repeat.everyDays') }}</option>
            <option value="everyCycles">
              {{ t('event.repeat.everyCycles') }}
            </option>
          </select>
        </label>
        <label
          v-if="form.repeat === 'everyDays' || form.repeat === 'everyCycles'"
        >
          <span>N</span>
          <input
            v-model.number="form.interval"
            type="number"
            min="1"
            max="365"
            step="1"
            required
          />
        </label>
        <label>
          <span>{{ t('event.reminder') }}</span>
          <div class="flow-input-with-suffix">
            <input
              v-model.number="form.reminderMinutes"
              type="number"
              min="0"
              max="1440"
              step="1"
              required
            />
            <span>{{ t('event.minutes') }}</span>
          </div>
        </label>

        <div class="flow-modal-actions">
          <button
            class="flow-button secondary"
            type="button"
            @click="$emit('cancel')"
          >
            {{ t('event.cancel') }}
          </button>
          <button class="flow-button primary" type="submit">
            {{ t('event.save') }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useLocale } from '@fuyeor/locale';
import type { EventDefinition, EventRepeat, EventSchedule } from '@/types';

const props = defineProps<{ initial?: EventDefinition }>();
const emit = defineEmits<{
  cancel: [];
  save: [value: Omit<EventDefinition, 'id' | 'createdAt' | 'updatedAt'>];
}>();
const { t } = useLocale();

const toDateTimeInput = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const form = reactive({
  title: props.initial?.title ?? '',
  tag: props.initial?.tag ?? '',
  schedule: props.initial?.schedule ?? ('wakeAfter' as EventSchedule),
  offsetHours: (props.initial?.offsetMinutes ?? 360) / 60,
  firstDueAt: toDateTimeInput(props.initial?.firstDueAt),
  repeat: props.initial?.repeat ?? ('once' as EventRepeat),
  interval: props.initial?.interval ?? 2,
  reminderMinutes: props.initial?.reminderMinutes ?? 0,
});

const submit = () => {
  const firstDueAt =
    form.schedule === 'calendar' && form.firstDueAt
      ? new Date(form.firstDueAt).toISOString()
      : undefined;
  emit('save', {
    title: form.title,
    tag: form.tag || undefined,
    schedule: form.schedule,
    offsetMinutes:
      form.schedule === 'wakeAfter'
        ? Math.round(form.offsetHours * 60)
        : undefined,
    firstDueAt,
    repeat: form.repeat,
    interval: Math.max(1, Math.round(form.interval)),
    reminderMinutes: Math.max(0, Math.round(form.reminderMinutes)),
    enabled: true,
  });
};
</script>
