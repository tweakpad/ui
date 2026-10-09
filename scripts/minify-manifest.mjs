// The custom elements manifest analyzer always pretty-prints its output; rewrite the published
// manifest compact so editors and tooling download the public surface, not its indentation.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const manifestPath = join(resolve(import.meta.dirname, '..'), 'dist', 'custom-elements.json');
writeFileSync(manifestPath, `${JSON.stringify(JSON.parse(readFileSync(manifestPath, 'utf8')))}\n`);
