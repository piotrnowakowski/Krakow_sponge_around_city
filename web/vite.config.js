import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages under /Krakow_sponge_around_city/.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
});
