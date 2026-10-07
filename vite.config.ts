import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const iconDirectory = resolve(import.meta.dirname, 'src/icons');
const iconEntries = Object.fromEntries(
  readdirSync(iconDirectory)
    .filter((file) => file.endsWith('.ts') && file !== 'types.ts' && !file.endsWith('.test.ts'))
    .map((file) => [`icons/${file.slice(0, -3)}`, resolve(iconDirectory, file)]),
);

export default defineConfig({
  plugins: [
    {
      name: 'bundled-source-licenses',
      generateBundle() {
        for (const [source, fileName] of [
          ['src/foundation/carousel/LICENSE', 'LICENSE.swiper'],
          ['src/components/message-scroller/LICENSE', 'LICENSE.message-scroller'],
          ['src/foundation/drag-drop/LICENSE.dnd-kit', 'LICENSE.dnd-kit'],
        ] as const) {
          this.emitFile({
            type: 'asset',
            fileName,
            source: readFileSync(resolve(import.meta.dirname, source)),
          });
        }
      },
    },
  ],
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        // The stylesheet has its own entry (emitted as `styles.css`), so no typed module imports CSS.
        stylesheet: resolve(import.meta.dirname, 'src/stylesheet.ts'),
        'drag-drop': resolve(import.meta.dirname, 'src/foundation/drag-drop/index.ts'),
        carousel: resolve(import.meta.dirname, 'src/foundation/carousel/index.ts'),
        media: resolve(import.meta.dirname, 'src/foundation/media/index.ts'),
        map: resolve(import.meta.dirname, 'src/foundation/map/index.ts'),
        code: resolve(import.meta.dirname, 'src/foundation/code/index.ts'),
        register: resolve(import.meta.dirname, 'src/register.ts'),
        'register/icon': resolve(import.meta.dirname, 'src/register/icon.ts'),
        ...iconEntries,
      },
      formats: ['es'],
      cssFileName: 'styles',
    },
    rollupOptions: {
      external: ['lit', /^lit\//, /^@lit\//],
      output: {
        // One output module per source module: with package `sideEffects`, consumer bundlers
        // drop every module a page does not import, so one component ships only its own graph.
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
  },
});
