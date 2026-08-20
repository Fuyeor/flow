<!-- @/layout/Left.vue -->
<template>
  <LeftSidebar>
    <template #nav>
      <nav class="flow-nav" aria-label="Primary navigation">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.to"
          class="flow-nav-item"
          :class="{ active: route.name === item.name }"
        >
          <span class="flow-nav-icon" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ t(item.label) }}</span>
        </router-link>
      </nav>
    </template>
    <template #footer>
      <p class="flow-sidebar-note">{{ t('storage.localOnly') }}</p>
    </template>
  </LeftSidebar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from '@fuyeor/vue-router';
import { useLocale } from '@fuyeor/locale';
import { LeftSidebar } from '@fuyeor/interactify/components';

const { t } = useLocale();
const route = useRoute();

const navItems = computed(() => [
  { name: 'Home', to: '/', icon: '◒', label: 'nav.home' },
  { name: 'Data', to: '/data', icon: '⌁', label: 'nav.data' },
  { name: 'Settings', to: '/settings', icon: '⊙', label: 'nav.settings' },
]);
</script>
