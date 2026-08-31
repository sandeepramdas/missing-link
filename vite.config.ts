import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base: the built site is path-agnostic, so it works from the
  // GitHub Pages project subpath (/missing-link/) and from `vite preview`
  // alike, and survives a repo rename.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          motion: ['gsap', 'lenis'],
        },
      },
    },
  },
  server: { port: 3000, strictPort: true, open: false },
});
