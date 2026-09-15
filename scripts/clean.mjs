import { rm } from 'node:fs/promises';
import { URL } from 'node:url';

await Promise.all([
  rm(new URL('../dist', import.meta.url), { force: true, recursive: true }),
  rm(new URL('../storybook-static', import.meta.url), { force: true, recursive: true }),
]);
