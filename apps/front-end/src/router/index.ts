// @/router/index.ts

import { createRouter, RouterView, type RouteRecord } from '@fuyeor/vue-router';

const appRoutes: Array<RouteRecord> = [
  {
    path: '',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { public: true, titleKey: 'site.title' },
  },
  {
    path: 'data',
    name: 'Data',
    component: () => import('@/views/Data.vue'),
    meta: { public: true, titleKey: 'data.title' },
  },
  {
    path: 'settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { public: true, titleKey: 'settings.title' },
  },
  {
    path: '/*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { public: true, titleKey: 'notFound.title' },
  },
];

const router = createRouter({
  routes: [
    {
      path: '',
      name: 'Root',
      component: RouterView,
      meta: { public: true },
      children: appRoutes,
    },
  ],
});

export default router;
