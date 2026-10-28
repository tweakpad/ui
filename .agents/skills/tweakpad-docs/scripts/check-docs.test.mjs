// node --test .agents/skills/tweakpad-docs/scripts/check-docs.test.mjs
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { checkPage, normalizeWebsitePage, paragraphs, readLedger } from './check-docs.mjs';

const roots = [];
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

const WEBSITE = `---
title: Badge
description: A compact label.
tag: tp-badge
reference: false
---

import Preview from '../../../components/Preview.astro';

<Preview
  title="Badge"
  code={\`<tp-badge>New</tp-badge>\`}
/>

## Usage

A Badge is a non-focusable label.

### Variants

<Preview title="Variants" code={\`<tp-badge variant="secondary">Secondary</tp-badge>\`} />

\`variant\` is visual emphasis only.
`;

const CAPTURE = {
  id: 'components/badge',
  items: [
    { id: 'md: (intro)', kind: 'md' },
    { id: 'example: Counts in buttons', kind: 'example' },
  ],
};

const LEDGER = `# components/badge

## B items

| Item | Disposition | Target |
| --- | --- | --- |
| md: (intro) | merged | ## Usage |
| example: Counts in buttons | appended | ### Counts in buttons |

## Forced edits

| Kind | A text | Reason |
| --- | --- | --- |
`;

const MERGED = `${normalizeWebsitePage(WEBSITE).trimEnd()}

### Counts in buttons

<Preview title="Counts in buttons" code={\`<tp-button>Inbox <tp-badge>8</tp-badge></tp-button>\`} />

A bare number is fine here.
`.replace(
  'A Badge is a non-focusable label.',
  'A Badge is a non-focusable label. Its text should carry the meaning on its own.',
);

function fixture(page, { ledger = LEDGER, capture = CAPTURE } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'tp-docs-'));
  roots.push(root);
  const files = {
    'docs/components/badge.mdx': page,
    'plans/docs/sources/website/components/badge.mdx': WEBSITE,
    'plans/docs/sources/storybook/components/badge.json': JSON.stringify(capture),
  };
  if (ledger !== null) files['plans/docs/ledger/components/badge.md'] = ledger;
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return checkPage('components/badge', { root });
}

test('a page that moves A unchanged and appends B passes', () => {
  assert.deepEqual(fixture(MERGED), []);
});

test('the mechanical move drops Astro imports and rendering hints only', () => {
  const moved = normalizeWebsitePage(WEBSITE);
  assert.doesNotMatch(moved, /import Preview|reference:/);
  assert.match(moved, /^---\ntitle: Badge\n/);
  assert.match(moved, /---\n\n<Preview/);
});

test('a reworded A paragraph fails', () => {
  const problems = fixture(MERGED.replace('visual emphasis only', 'only visual emphasis'));
  assert.ok(
    problems.some((problem) => problem.includes('website paragraph changed')),
    problems.join('\n'),
  );
});

test('a changed A preview fails, unless a forced edit lists it', () => {
  const changed = MERGED.replace('variant="secondary">Secondary', 'variant="outline">Secondary');
  assert.ok(
    fixture(changed).some((problem) => problem.includes('"Variants" is missing, moved or changed')),
  );
  const ledger = `${LEDGER}| preview | Variants | inline svg becomes tp-icon |\n`;
  assert.deepEqual(fixture(changed, { ledger }), []);
});

test('a B section placed before an A section fails', () => {
  const page = normalizeWebsitePage(WEBSITE).replace(
    '### Variants',
    '### Counts in buttons\n\n<Preview title="Counts in buttons" code={`<tp-badge>8</tp-badge>`} />\n\n### Variants',
  );
  assert.ok(
    fixture(page).some((problem) =>
      problem.includes('website heading ### Variants must be heading 2'),
    ),
  );
});

test('a changed hero or frontmatter fails', () => {
  assert.ok(
    fixture(MERGED.replace('>New<', '>Fresh<')).some((problem) => problem.includes('hero')),
  );
  assert.ok(
    fixture(MERGED.replace('A compact label.', 'A small label.')).some((problem) =>
      problem.includes('frontmatter description'),
    ),
  );
});

test('every captured B item needs exactly one known disposition', () => {
  assert.ok(
    fixture(MERGED, { ledger: null }).some(
      (problem) => problem.includes('ledger') && problem.includes('missing'),
    ),
  );
  const missingRow = LEDGER.replace(
    '| example: Counts in buttons | appended | ### Counts in buttons |\n',
    '',
  );
  assert.ok(
    fixture(MERGED, { ledger: missingRow }).some((problem) =>
      problem.includes('no row for B item "example: Counts in buttons"'),
    ),
  );
  const unknown = LEDGER.replace('| merged |', '| rewritten |');
  assert.ok(
    fixture(MERGED, { ledger: unknown }).some((problem) =>
      problem.includes('unknown disposition "rewritten"'),
    ),
  );
  const target = LEDGER.replace('### Counts in buttons |', '### Counters |');
  assert.ok(
    fixture(MERGED, { ledger: target }).some((problem) => problem.includes('which the page lacks')),
  );
});

test('paragraphs leave out headings and block elements, and keep inline Keys', () => {
  const blocks = paragraphs(
    `---\ntitle: X\n---\n\n<Preview title="A" code={\`a\n\nb\`} />\n\n## Usage\n\nOne\ntwo.\n\n| <Keys keys="mod+k" /> | Opens |\n`,
  );
  assert.deepEqual(blocks, ['One two.', '| <Keys keys="mod+k" /> | Opens |']);
});

test('the ledger reader skips header and divider rows', () => {
  const ledger = readLedger(LEDGER);
  assert.equal(ledger.items.length, 2);
  assert.equal(ledger.forced.length, 0);
  assert.ok(ledger.hasForced);
});
