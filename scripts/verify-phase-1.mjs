import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const outputDirectory = new URL('../plans/phase-1/outputs/', import.meta.url);
const expectedFiles = [
  'acceptance-map.md',
  'contract-index.md',
  'decision-register.md',
  'issue-register.md',
  'readiness-report.md',
  'scope-baseline.md',
];
const expectedCounts = { SCOPE: 14, CON: 346, ISS: 2, DEC: 9, ACC: 13 };
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const actualFiles = (await readdir(outputDirectory)).filter((file) => file.endsWith('.md')).sort();
assert(
  JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
  `Expected exactly ${expectedFiles.join(', ')}; found ${actualFiles.join(', ')}`,
);

const sources = new Map(
  await Promise.all(
    expectedFiles.map(async (file) => [
      file,
      await readFile(join(outputDirectory.pathname, file), 'utf8'),
    ]),
  ),
);
const combined = [...sources.values()].join('\n');

for (const [file, source] of sources) {
  assert(!/\.md\b/i.test(source), `${file} contains a .md reference`);
  assert(!/\bplans\//i.test(source), `${file} contains a plans/ path reference`);
  assert(!/\[[^\]]+\]\([^)]+\)/.test(source), `${file} contains a Markdown link`);
}

const anchors = new Map();
for (const match of combined.matchAll(/<a id="(scope|con|iss|dec|acc)-(\d{3})"><\/a>/g)) {
  const id = `${match[1].toUpperCase()}-${match[2]}`;
  const records = anchors.get(id) ?? [];
  records.push(match.index);
  anchors.set(id, records);
}
for (const [id, occurrences] of anchors)
  assert(occurrences.length === 1, `${id} has ${occurrences.length} anchors`);

for (const [prefix, count] of Object.entries(expectedCounts)) {
  const ids = [...anchors]
    .filter(([id]) => id.startsWith(`${prefix}-`))
    .map(([id]) => id)
    .sort();
  assert(ids.length === count, `${prefix} expected ${count} anchors; found ${ids.length}`);
  for (let index = 1; index <= count; index += 1) {
    const id = `${prefix}-${String(index).padStart(3, '0')}`;
    assert(anchors.has(id), `Missing anchor ${id}`);
  }
}

for (const match of combined.matchAll(/\b(SCOPE|CON|ISS|DEC|ACC)-(\d{3})\b/g)) {
  const id = `${match[1]}-${match[2]}`;
  assert(anchors.has(id), `Reference ${id} has no target anchor`);
}

const contractIndex = sources.get('contract-index.md');
const contractRows = contractIndex
  .split('\n')
  .filter((line) => /^\| <a id="con-\d{3}"><\/a>CON-\d{3} \|/.test(line));
assert(
  contractRows.length === expectedCounts.CON,
  `Contract table expected ${expectedCounts.CON} rows; found ${contractRows.length}`,
);
for (const row of contractRows) {
  const id = row.match(/CON-\d{3}/)?.[0] ?? 'unknown contract';
  assert(/\| clear \|/.test(row), `${id} is not marked clear`);
  if (id === 'CON-140')
    assert(/\| not applicable: excluded \|$/.test(row), 'CON-140 must be explicitly excluded');
  else assert(/\| ACC-\d{3}(?:, ACC-\d{3})* \|$/.test(row), `${id} has no acceptance mapping`);
}

const scopeBaseline = sources.get('scope-baseline.md');
const scopeRows = scopeBaseline
  .split('\n')
  .filter((line) => /^\| <a id="scope-\d{3}"><\/a>SCOPE-\d{3} \|/.test(line));
assert(
  scopeRows.length === expectedCounts.SCOPE,
  `Scope table expected ${expectedCounts.SCOPE} rows; found ${scopeRows.length}`,
);
for (const row of scopeRows)
  assert(/\| (included|excluded) \|/.test(row), `${row.match(/SCOPE-\d{3}/)?.[0]} is not settled`);

const issues = sources.get('issue-register.md');
assert(/## Open issues\s+None\./.test(issues), 'Issue register has unresolved open issues');
assert(
  (issues.match(/\| Status \| resolved \|/g) ?? []).length === expectedCounts.ISS,
  'Every issue must be resolved',
);

const decisions = sources.get('decision-register.md');
for (let index = 1; index <= expectedCounts.DEC; index += 1) {
  const id = `DEC-${String(index).padStart(3, '0')}`;
  const start = decisions.indexOf(`### ${id}`);
  const next = decisions.indexOf('\n### DEC-', start + 1);
  const record = decisions.slice(start, next < 0 ? undefined : next);
  assert(start >= 0, `Missing decision section ${id}`);
  assert(/\| Decision owner \| [^|]+ \|/.test(record), `${id} has no owner`);
  assert(/\| Decision deadline \| [^|]+ \|/.test(record), `${id} has no deadline`);
  assert(
    new RegExp(`\\| Status \\| ${index <= 3 ? 'decided' : 'scheduled'} \\|`).test(record),
    `${id} has the wrong status`,
  );
}

const readiness = sources.get('readiness-report.md');
const readinessRows = readiness
  .split('\n')
  .filter((line) => /^\| [^|]+ \| (pass|fail|not run) \|/.test(line));
assert(
  readinessRows.length === 12,
  `Readiness report expected 12 check rows; found ${readinessRows.length}`,
);
for (const row of readinessRows)
  assert(/\| pass \|/.test(row), `Readiness check is not passing: ${row}`);
assert(
  /## Unresolved blockers\s+None\./.test(readiness),
  'Readiness report has unresolved blockers',
);
assert(/\*\*Ready\.\*\*/.test(readiness), 'Readiness verdict is not Ready');

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({
      files: actualFiles.length,
      records: Object.fromEntries(
        Object.entries(expectedCounts).map(([prefix]) => [
          prefix,
          [...anchors].filter(([id]) => id.startsWith(`${prefix}-`)).length,
        ]),
      ),
      contractRows: contractRows.length,
      readinessChecks: readinessRows.length,
      unresolvedReferences: 0,
      forbiddenOutputReferences: 0,
    }),
  );
}
