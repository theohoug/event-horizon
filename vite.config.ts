import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  publicDir: 'static',
  plugins: [
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag', '**/*.comp'],
      defaultExtension: 'glsl',
      compress: true,
    }),
  ],
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
          lenis: ['lenis'],
        },
      },
    },
  },
  server: {
    port: 4200,
    open: true,
  },
});
