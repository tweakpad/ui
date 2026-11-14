import type { ApiTypes } from '../src/docs/api-types.js';

/**
 * The type cards the Docs pages open from a signature, read from the TypeScript compiler by
 * `npm run cem` (`scripts/manifest/api-types.mjs`). Read through a glob so the project typechecks
 * without it.
 */
export const types = Object.values(
  import.meta.glob<ApiTypes>('../dist/api-types.json', { eager: true, import: 'default' }),
)[0]!;
if (!types) throw new Error('dist/api-types.json is missing: run `npm run cem`');
