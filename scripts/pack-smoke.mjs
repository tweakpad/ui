// Consumer-level package check: packs the built library, installs the tarball into a throwaway
// project and proves the published `exports`, types and tree-shaking work as a consumer sees
// them. No browser: rendering is verified separately.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const work = join(root, 'tmp', 'pack');
const run = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
const fail = (message) => {
  console.error(`pack-smoke: ${message}`);
  process.exit(1);
};

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

// 1. Pack and inspect the tarball contents.
const [pack] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', work]));
const files = new Set(pack.files.map((file) => file.path));
const forbidden = [...files].filter((path) =>
  /^(src|tmp|plans|external|docs|scripts|tests|\.storybook)\/|^\.env|stylesheet\.js/u.test(path),
);
if (forbidden.length) fail(`unexpected files in the package: ${forbidden.slice(0, 10).join(', ')}`);
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const [subpath, target] of Object.entries(manifest.exports)) {
  const paths = typeof target === 'string' ? [target] : Object.values(target);
  for (const path of paths) {
    if (path.includes('*')) continue;
    if (!files.has(path.replace(/^\.\//u, ''))) fail(`export ${subpath} -> ${path} is not packed`);
  }
}
for (const required of ['LICENSE', 'README.md', 'dist/custom-elements.json'])
  if (!files.has(required)) fail(`${required} is not packed`);
const elementsManifest = JSON.parse(readFileSync(join(root, 'dist/custom-elements.json'), 'utf8'));
const elements = new Map(
  elementsManifest.modules
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.tagName)
    .map((declaration) => [declaration.tagName, declaration]),
);
if (
  [...elements.values()].some((element) => element.events?.some((event) => event.name === 'type'))
)
  fail('custom-elements.json lists the bogus `type` event');
if (!elements.get('tp-input')?.events?.some((event) => event.name === 'tp-value-change'))
  fail('custom-elements.json misses tp-input tp-value-change');
const megabytes = (bytes) => bytes / 1024 / 1024;
if (megabytes(pack.size) > 8)
  fail(`tarball is ${megabytes(pack.size).toFixed(1)} MB (budget 8 MB)`);
console.log(
  `pack-smoke: ${pack.filename} ${megabytes(pack.size).toFixed(1)} MB packed, ${megabytes(pack.unpackedSize).toFixed(1)} MB unpacked, ${files.size} files`,
);

// 2. Install the tarball into a consumer project.
const consumer = join(work, 'consumer');
mkdirSync(consumer);
writeFileSync(
  join(consumer, 'package.json'),
  JSON.stringify({ name: 'tweakpad-ui-consumer', private: true, type: 'module' }, null, 2),
);
run(
  'npm',
  [
    'install',
    '--no-audit',
    '--no-fund',
    '--ignore-scripts',
    join(work, pack.filename),
    `lit@${manifest.peerDependencies.lit}`,
  ],
  consumer,
);

// 3. Import every public entry the way an application does.
writeFileSync(
  join(consumer, 'consumer.ts'),
  `import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpButton, defineElement, createId } from '@tweakpad/ui';
import { TpIcon } from '@tweakpad/ui/register/icon';
import { plusIcon } from '@tweakpad/ui/icons/plus';
import * as carousel from '@tweakpad/ui/carousel';
import * as dragDrop from '@tweakpad/ui/drag-drop';
import * as media from '@tweakpad/ui/media';
import * as map from '@tweakpad/ui/map';
import packageJson from '@tweakpad/ui/package.json' with { type: 'json' };

defineElement(TpButton.tagName, TpButton);
const button: HTMLElementTagNameMap['tp-button'] = document.createElement('tp-button');
button.variant = 'outline';
export const used = [TpIcon, plusIcon.viewBox, createId(), carousel, dragDrop, media, map, packageJson.version];
`,
);
writeFileSync(join(consumer, 'css.d.ts'), "declare module '*.css';\n");
writeFileSync(
  join(consumer, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        resolveJsonModule: true,
      },
      files: ['consumer.ts', 'css.d.ts'],
    },
    null,
    2,
  ),
);

// 4. Type-check against the published declarations, including the library's own.
run(join(root, 'node_modules/.bin/tsc'), ['-p', consumer]);
console.log('pack-smoke: consumer type check passed (skipLibCheck: false)');

// 5. Bundle a selective import and prove unrelated modules are dropped.
writeFileSync(
  join(consumer, 'icon-only.js'),
  `import '@tweakpad/ui/register/icon';
import { plusIcon } from '@tweakpad/ui/icons/plus';
document.querySelector('tp-icon').icon = plusIcon;
`,
);
writeFileSync(
  join(consumer, 'vite.config.mjs'),
  `export default {
  logLevel: 'warn',
  build: {
    outDir: 'out',
    minify: false,
    lib: { entry: { full: 'consumer.ts', 'icon-only': 'icon-only.js' }, formats: ['es'] },
    rollupOptions: { external: [/^lit/] },
  },
};
`,
);
run(join(root, 'node_modules/.bin/vite'), ['build'], consumer);
const out = join(consumer, 'out');
const iconOnly = readdirSync(out)
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(join(out, file), 'utf8'))
  .find((source) => source.includes('M12 5v14M5 12h14') && !source.includes('tp-button'));
if (!iconOnly)
  fail('the icon-only bundle is missing the plus icon or includes unrelated components');
if (iconOnly.includes('m9 18 6-6-6-6'))
  fail('the icon-only bundle includes the unrelated chevron icon');
console.log('pack-smoke: consumer bundle built; selective imports tree-shake');
