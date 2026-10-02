import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkGates } from './check-gates.mjs';

const table = (heading, headers, rows) =>
  `## ${heading}\n\n| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${row.join(' | ')} |`).join('\n')}\n\n`;

// A record for testing work-boundary decisions, not proof of component conformance.
function record({
  gate = 'passed',
  integration = 'passed',
  capability = 'passed',
  scenario = 'passed',
} = {}) {
  return (
    '- Requested work / claim: implement the assigned component\n- Scope source: user requested component implementation\n\n' +
    table(
      'Gate record',
      ['Gate', 'Status', 'Evidence'],
      Array.from({ length: 9 }, (_, id) => [
        `${id}. Gate`,
        id < 3 ? 'passed' : gate,
        'Source/diff review recorded at evidence.md',
      ]),
    ) +
    table(
      'Family dependency map',
      ['Responsibility', 'Upstream', 'Local', 'Decision', 'Consumers'],
      [
        [
          'open state',
          'base/root.ts shared owner',
          'dialog.ts DialogOwner',
          'repair existing owner',
          'dialog.ts and alert.ts; V-01',
        ],
      ],
    ) +
    table(
      'Presentation source map',
      ['Region', 'Preset', 'Source', 'Owner', 'Decision', 'Scenarios'],
      [
        [
          'footer',
          'base/nova',
          'dialog.tsx + nova.css .footer',
          'card footer recipe',
          'share recipe',
          'V-01',
        ],
      ],
    ) +
    table(
      'Implementation and composition reuse map',
      ['Location', 'Role', 'Component', 'Evidence', 'Exception'],
      [['alert.ts', 'action', 'tp-button', 'V-01', 'none']],
    ) +
    table(
      'Capability and interface mapping',
      [
        'ID',
        'Capability',
        'Authority',
        'Source',
        'Implementation',
        'Docs',
        'Scenarios',
        'Status',
        'Evidence',
      ],
      [
        [
          'C-01',
          'independent close option; default true',
          'live contract node',
          'DialogContent.showCloseButton',
          'dialog.ts binding',
          'docs/dialog.md',
          'V-01',
          capability,
          'Option mapping and evidence.md',
        ],
      ],
    ) +
    table(
      'Verification scenarios',
      ['ID', 'Capabilities', 'Setup', 'Expected', 'Actual', 'Tool', 'Status', 'Evidence'],
      [
        [
          'V-01',
          'C-01; behavior',
          'toggle corner control',
          'footer independent',
          scenario === 'passed' ? 'footer preserved' : 'not run',
          'Chrome DevTools MCP',
          scenario,
          'evidence.md',
        ],
      ],
    ) +
    table(
      'Early integration checkpoint',
      ['ID', 'Check', 'Status', 'Evidence'],
      ['I-01', 'I-02', 'I-03'].map((id) => [
        id,
        'integration',
        integration,
        'diff and source comparison in evidence.md',
      ]),
    )
  );
}

test('permits implementation from a complete plan with later execution pending', () => {
  assert.deepEqual(
    checkGates(
      record({
        gate: 'pending',
        integration: 'pending',
        capability: 'pending',
        scenario: 'pending',
      }),
      'implement',
    ),
    [],
  );
});
test('rejects missing or duplicate gates instead of accepting a favorable summary', () => {
  assert.ok(
    checkGates(
      record().replace('| 2. Gate | passed | Source/diff review recorded at evidence.md |', ''),
      'implement',
    ).some((error) => error.includes('Missing gate 2')),
  );
  assert.ok(
    checkGates(record().replace('3. Gate', '2. Gate'), 'implement').some((error) =>
      error.includes('duplicate gate'),
    ),
  );
});
test('blocks implementation when architecture is unresolved', () => {
  for (const status of ['pending', 'blocked', 'failed']) {
    const source = record().replace('2. Gate | passed', `2. Gate | ${status}`);
    assert.ok(checkGates(source, 'implement').some((error) => error.includes(`Gate 2: ${status}`)));
  }
});
test('blocks broad verification until actual integration has been checked', () => {
  assert.ok(
    checkGates(record({ integration: 'pending' }), 'verify').some((error) =>
      error.includes('I-01: pending'),
    ),
  );
  assert.deepEqual(
    checkGates(record({ gate: 'pending', capability: 'pending', scenario: 'pending' }), 'verify'),
    [],
  );
});
test('rejects missing family and presentation source maps', () => {
  for (const heading of ['Family dependency map', 'Presentation source map'])
    assert.ok(
      checkGates(record().replace(`## ${heading}`, '## Removed map'), 'implement').some(
        (error) => error === `Missing section: ${heading}`,
      ),
    );
});
test('rejects blank/placeholder evidence and status values outside the vocabulary', () => {
  assert.ok(
    checkGates(
      record().replace('diff and source comparison in evidence.md', '[evidence]'),
      'verify',
    ).length,
  );
  assert.ok(
    checkGates(record({ capability: 'passed with gaps' }), 'complete').some((error) =>
      error.includes('invalid status'),
    ),
  );
  for (const missing of ['not run', 'not checked', 'none'])
    assert.ok(
      checkGates(
        record().replaceAll('Source/diff review recorded at evidence.md', missing),
        'implement',
      ).some((error) => error.includes('requires concrete evidence')),
    );
});
test('rejects unresolved required capabilities even when every gate claims passed', () => {
  for (const status of ['pending', 'blocked', 'failed'])
    assert.ok(
      checkGates(record({ capability: status }), 'complete').some((error) =>
        error.includes(`C-01: ${status}`),
      ),
    );
});
test('rejects dangling capability/scenario links and unobserved passes', () => {
  assert.ok(
    checkGates(
      record().replace('V-01 | passed | Option', 'V-99 | passed | Option'),
      'implement',
    ).some((error) => error.includes('unknown capability/scenario')),
  );
  assert.ok(
    checkGates(record().replace('footer preserved', 'not run'), 'complete').some((error) =>
      error.includes('observed result'),
    ),
  );
});
test('allows justified non-applicability and a resolved complete record', () => {
  assert.deepEqual(checkGates(record(), 'complete'), []);
  assert.deepEqual(
    checkGates(record({ gate: 'not applicable', integration: 'not applicable' }), 'complete'),
    [],
  );
});
test('rejects unsupported stages and an empty record', () => {
  assert.ok(checkGates(record(), 'skip').length);
  assert.ok(checkGates('', 'implement').length);
});
