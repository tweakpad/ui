// Generates the framework bindings from the custom elements manifest (`npm run cem` runs it after
// the analyzer). `--check` writes nothing and fails when a committed binding is stale.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { bindingModel } from './model.mjs';
import { reactBindings } from './react.mjs';
import { vueBindings } from './vue.mjs';
import { elementTypes } from './elements.mjs';

const root = resolve(import.meta.dirname, '../..');

/** Folders that hold only generated bindings, apart from the hand-written files listed. */
export const generatedFolders = [
  { folder: 'src/react', handWritten: ['adapter.ts'] },
  { folder: 'src/react/widgets', handWritten: [] },
  { folder: 'tests/frameworks/react', handWritten: ['raw.tsx', 'usage.tsx'] },
  { folder: 'src/vue', handWritten: ['adapter.ts'] },
  { folder: 'src/vue/widgets', handWritten: [] },
  ...['preact', 'solid', 'svelte'].flatMap((name) => [
    { folder: `src/${name}`, handWritten: [] },
    { folder: `src/${name}/widgets`, handWritten: [] },
  ]),
];

/** Every generated binding file, formatted as the repository formats sources: path → text. */
export async function generateBindings(manifest) {
  const model = bindingModel(manifest, { root });
  const files = new Map([...reactBindings(model), ...vueBindings(model), ...elementTypes(model)]);
  const options = (await prettier.resolveConfig(join(root, 'src/index.ts'))) ?? {};
  const formatted = new Map();
  for (const [path, text] of [...files].sort(([a], [b]) => (a < b ? -1 : 1)))
    formatted.set(path, await prettier.format(text, { ...options, filepath: join(root, path) }));
  return formatted;
}

/** Generated files that differ from disk, are missing, or no longer generated. */
export function staleBindings(files) {
  const stale = [];
  for (const [path, text] of files) {
    const absolute = join(root, path);
    if (!existsSync(absolute) || readFileSync(absolute, 'utf8') !== text) stale.push(path);
  }
  for (const { folder, handWritten } of generatedFolders) {
    const absolute = join(root, folder);
    if (!existsSync(absolute)) continue;
    for (const entry of readdirSync(absolute))
      if (
        /\.tsx?$/u.test(entry) &&
        !handWritten.includes(entry) &&
        !files.has(`${folder}/${entry}`)
      )
        stale.push(`${folder}/${entry}`);
  }
  return stale.sort();
}

async function main() {
  const check = process.argv.includes('--check');
  const manifestPath = join(root, 'dist/custom-elements.json');
  if (!existsSync(manifestPath))
    throw new Error('Run `npm run cem` first: dist/custom-elements.json is missing.');
  const files = await generateBindings(JSON.parse(readFileSync(manifestPath, 'utf8')));
  const stale = staleBindings(files);
  if (check) {
    if (stale.length) {
      console.error(`Stale framework bindings (run \`npm run cem\`):\n  ${stale.join('\n  ')}`);
      process.exitCode = 1;
    }
    return;
  }
  for (const path of stale) {
    const absolute = join(root, path);
    if (!files.has(path)) {
      rmSync(absolute);
      continue;
    }
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, files.get(path));
  }
  console.log(`Framework bindings: ${files.size} files, ${stale.length} updated.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
