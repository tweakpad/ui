// Checks the framework bindings ledger (`plans/frameworks/ledger.md`): one row per catalog entry
// (components and widgets), every status a known one, and evidence for every `passed`, `failed`,
// `blocked` or `not applicable` cell. `--complete` also requires every framework column resolved.
//
//   node scripts/bindings/check-ledger.mjs [--complete]
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const complete = process.argv.includes('--complete');
const statuses = new Set(['pending', 'passed', 'failed', 'blocked', 'not applicable']);
const columns = ['Smoke', 'React', 'Vue', 'Types'];

const catalogTags = (file) =>
  [
    ...readFileSync(join(root, file), 'utf8').matchAll(
      /\[\s*'[^']+',\s*'(tp-[a-z0-9-]+)',\s*'[a-z-]+'\s*\]/gu,
    ),
  ].map((match) => match[1]);
const expected = [...catalogTags('src/catalog.ts'), ...catalogTags('src/widgets/catalog.ts')];

const text = readFileSync(join(root, 'plans/frameworks/ledger.md'), 'utf8');
const lines = text.split('\n').filter((line) => line.startsWith('| `tp-'));
const header = text
  .split('\n')
  .find((line) => line.startsWith('| Tag '))
  ?.split('|')
  .slice(1, -1)
  .map((cell) => cell.trim());
const problems = [];
if (!header) problems.push('the ledger has no `| Tag …` table header');
const index = (name) => header?.indexOf(name) ?? -1;
const seen = new Map();
for (const line of lines) {
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
  const tag = cells[0].replaceAll('`', '');
  if (seen.has(tag)) problems.push(`${tag}: more than one row`);
  seen.set(tag, cells);
  const evidence = cells[index('Evidence')] ?? '';
  for (const column of columns) {
    const status = cells[index(column)];
    if (!statuses.has(status)) problems.push(`${tag}: ${column} status "${status}" is not known`);
    else if (status !== 'pending' && !evidence)
      problems.push(`${tag}: ${column} is ${status} without evidence`);
    else if (complete && status !== 'passed' && status !== 'not applicable')
      problems.push(`${tag}: ${column} is ${status}`);
  }
}
for (const tag of expected) if (!seen.has(tag)) problems.push(`${tag}: no ledger row`);
for (const tag of seen.keys())
  if (!expected.includes(tag)) problems.push(`${tag}: not a catalog entry`);

if (problems.length) {
  console.error(`Framework bindings ledger:\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
} else
  console.log(
    `Framework bindings ledger: ${seen.size} entries${complete ? ', every framework resolved' : ''}.`,
  );
