<!-- @/views/Settings.vue -->
<template>
  <div class="flow-page">
    <header class="flow-page-header">
      <div>
        <p class="flow-eyebrow">{{ t('nav.settings') }}</p>
        <h1>{{ t('settings.title') }}</h1>
        <p class="flow-page-subtitle">{{ t('settings.subtitle') }}</p>
      </div>
      <router-link class="flow-text-link" to="/"
        >← {{ t('nav.home') }}</router-link
      >
    </header>

    <section class="flow-section-card settings-card">
      <div class="flow-section-heading">
        <div>
          <p class="flow-eyebrow">{{ t('settings.language') }}</p>
          <h2>{{ t('settings.language') }}</h2>
        </div>
      </div>
      <label class="flow-setting-row">
        <span>{{ t('settings.language') }}</span>
        <select :value="locale" @change="changeLocale">
          <option
            v-for="option in localeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </section>

    <section class="flow-section-card settings-card">
      <div class="flow-section-heading">
        <div>
          <p class="flow-eyebrow">{{ t('settings.notifications') }}</p>
          <h2>{{ t('settings.notifications') }}</h2>
        </div>
        <span class="status-pill" :class="notificationState">{{
          notificationLabel
        }}</span>
      </div>
      <p class="flow-muted">{{ notificationDescription }}</p>
      <button
        v-if="
          notificationState !== 'granted' && notificationState !== 'unsupported'
        "
        class="flow-button primary"
        type="button"
        @click="enableNotifications"
      >
        {{ t('settings.enableNotifications') }}
      </button>
    </section>

    <section class="flow-section-card settings-card">
      <div class="flow-section-heading">
        <div>
          <p class="flow-eyebrow">{{ t('settings.backup') }}</p>
          <h2>{{ t('settings.backup') }}</h2>
        </div>
      </div>
      <p class="flow-muted">{{ t('settings.backupHint') }}</p>
      <div class="settings-actions">
        <button class="flow-button primary" type="button" @click="exportData">
          {{ t('settings.export') }}
        </button>
        <button
          class="flow-button secondary"
          type="button"
          @click="fileInput?.click()"
        >
          {{ t('settings.import') }}
        </button>
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept="application/json,.json"
          @change="importData"
        />
      </div>
      <p v-if="state.lastBackupAt" class="settings-last-backup">
        {{ t('settings.saved') }} · {{ formatBackupDate(state.lastBackupAt) }}
      </p>
    </section>

    <section class="flow-notice-card">
      <strong>{{ t('settings.dataWarning') }}</strong>
      <p>{{ t('settings.subtitle') }}</p>
    </section>

    <div v-if="toast" class="flow-toast" role="status">{{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useLocale } from '@fuyeor/locale';
import { useLocaleStore } from '@fuyeor/commons';
import { useN24 } from '@/composables/useN24';
import { formatShortDate } from '@/utils/time';

const { t, locale } = useLocale();
const localeStore = useLocaleStore();
const {
  state,
  updateSettings,
  requestNotifications,
  exportBackup,
  importBackup,
} = useN24();
const fileInput = ref<HTMLInputElement>();
const toast = ref('');

const localeOptions = [
  { value: 'zh-hant', label: '繁體中文' },
  { value: 'zh-hans', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
];

const notificationState = computed(
  () => state.value.settings.notificationPermission,
);
const notificationLabel = computed(() =>
  notificationState.value === 'granted'
    ? 'ON'
    : notificationState.value === 'unsupported'
      ? 'N/A'
      : 'OFF',
);
const notificationDescription = computed(() =>
  notificationState.value === 'granted'
    ? t('settings.notificationsGranted')
    : notificationState.value === 'unsupported'
      ? t('settings.notificationsUnsupported')
      : t('settings.enableNotifications'),
);

const changeLocale = async (event: Event) => {
  const nextLocale = (event.target as HTMLSelectElement).value;
  await localeStore.setLocale(nextLocale);
  locale.value = nextLocale;
  updateSettings({ locale: nextLocale });
};

const enableNotifications = async () => {
  await requestNotifications();
};

const showToast = (message: string) => {
  toast.value = message;
  window.setTimeout(() => {
    toast.value = '';
  }, 3_000);
};

const exportData = () => {
  exportBackup();
  showToast(t('settings.saved'));
};

const importData = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    await importBackup(file);
    showToast(t('settings.imported'));
  } catch (error) {
    console.error('[n24] Failed to import backup', error);
    showToast('Invalid backup file');
  } finally {
    if (fileInput.value) fileInput.value.value = '';
  }
};

const formatBackupDate = (iso: string) =>
  formatShortDate(new Date(iso), locale.value);
</script>
