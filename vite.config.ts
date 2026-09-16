import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const iconDirectory = resolve(import.meta.dirname, 'src/icons');
const iconEntries = Object.fromEntries(
  readdirSync(iconDirectory)
    .filter((file) => file.endsWith('.ts') && file !== 'types.ts' && !file.endsWith('.test.ts'))
    .map((file) => [`icons/${file.slice(0, -3)}`, resolve(iconDirectory, file)]),
);

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        register: resolve(import.meta.dirname, 'src/register.ts'),
        'register/icon': resolve(import.meta.dirname, 'src/register/icon.ts'),
        ...iconEntries,
      },
      formats: ['es'],
      cssFileName: 'styles',
    },
    rollupOptions: {
      external: ['lit', /^lit\//],
    },
    sourcemap: true,
  },
});
