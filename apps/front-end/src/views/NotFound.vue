<!-- @/views/NotFound.vue -->
<template>
  <div class="flow-page flow-not-found">
    <p class="flow-eyebrow">404</p>
    <h1>{{ t('notFound.title') }}</h1>
    <router-link class="flow-button primary" to="/">{{
      t('nav.home')
    }}</router-link>
  </div>
</template>

<script setup lang="ts">
import { useLocale } from '@fuyeor/locale';
const { t } = useLocale();
</script>
