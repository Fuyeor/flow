<!-- apps/front-end/src/App.vue -->
<template>
  <LeftSidebar />
  <main class="flow-main">
    <router-view />
  </main>
</template>

<script setup lang="ts">
import LeftSidebar from '@/layout/Left.vue';
</script>
