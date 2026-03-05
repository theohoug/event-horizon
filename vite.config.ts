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
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  server: {
    port: 4200,
    open: true,
  },
});
