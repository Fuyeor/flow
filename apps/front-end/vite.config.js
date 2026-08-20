// @fuyeor/flow-front-end/vite.config.js
import { defineConfig } from 'vite';
import { createViteConfig } from '@fuyeor/config/vite.config.js';

export default defineConfig(({}) => {
  return createViteConfig(
    {
      server: {
        host: '0.0.0.0',
        port: 5200,
        allowedHosts: ['flow.localhost'],
      },
    },
    import.meta.dirname,
  );
});
