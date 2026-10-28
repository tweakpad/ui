import type { Manifest } from '../src/docs/api.js';

/**
 * The Custom Elements Manifest the Docs pages read their API sections from. `npm run cem` writes
 * it before Storybook starts; read through a glob so the project typechecks without it.
 */
export const manifest = Object.values(
  import.meta.glob<Manifest>('../dist/custom-elements.json', { eager: true, import: 'default' }),
)[0]!;
if (!manifest) throw new Error('dist/custom-elements.json is missing: run `npm run cem`');
