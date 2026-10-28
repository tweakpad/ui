import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BASE_CAPABILITIES,
  engineCapabilities,
  nodeCapability,
  OPTIONAL_CAPABILITIES,
  requirementsMet,
  type TextEditorCapability,
} from './capabilities.js';

/** The base capabilities as `uwg-te-req-engine-2` lists them. */
const SPEC_BASE = [
  // the marks
  'mark.bold',
  'mark.italic',
  'mark.underline',
  'mark.strike',
  'mark.code',
  'mark.superscript',
  'mark.subscript',
  'mark.highlight',
  'mark.text-color',
  'mark.clear',
  // link, align and history
  'link',
  'align',
  'history',
  // the block kinds
  'block.paragraph',
  'block.heading',
  'block.quote',
  'block.code',
  'block.list-bullet',
  'block.list-ordered',
  'block.list-task',
  'block.divider',
  'block.image',
  // block selection, moves and nesting
  'blocks.select',
  'blocks.move',
  'blocks.nest',
  'input-rules',
  // the four formats
  'format.html',
  'format.markdown',
  'format.text',
  'format.json',
];

describe('capabilities (uwg-te-req-engine-2, uwg-te-req-tools-2)', () => {
  it('V-013: the base set is exactly the 30 identifiers', () => {
    expect(SPEC_BASE).toHaveLength(30);
    expect([...BASE_CAPABILITIES]).toEqual(SPEC_BASE);
    for (const optional of ['block.table', 'table.merge', 'table.move'] as const)
      expect(BASE_CAPABILITIES.has(optional)).toBe(false);
  });

  it('lists the optional table capabilities apart from the base', () => {
    expect([...OPTIONAL_CAPABILITIES]).toEqual(['block.table', 'table.merge', 'table.move']);
  });

  it('requirementsMet needs every required capability', () => {
    const available = new Set<TextEditorCapability>([
      ...BASE_CAPABILITIES,
      'block.table',
      'block.callout',
    ]);
    expect(requirementsMet(undefined, available)).toBe(true);
    expect(requirementsMet([], available)).toBe(true);
    expect(requirementsMet([], new Set())).toBe(true);
    expect(requirementsMet(['mark.bold'], available)).toBe(true);
    expect(requirementsMet(['mark.text-color', 'mark.highlight'], available)).toBe(true);
    expect(requirementsMet(['block.table'], available)).toBe(true);
    expect(requirementsMet(['block.table', 'table.merge'], available)).toBe(false);
    expect(requirementsMet(['table.move'], available)).toBe(false);
    expect(requirementsMet(['block.callout'], available)).toBe(true);
    expect(requirementsMet(['inline.mention'], available)).toBe(false);
  });

  it('without an engine the base set applies, so an engine only adds tools', () => {
    const table: readonly TextEditorCapability[] = ['block.table'];
    const engine = new Set<TextEditorCapability>([...BASE_CAPABILITIES, 'block.table']);
    for (const capability of BASE_CAPABILITIES) {
      expect(requirementsMet([capability], BASE_CAPABILITIES)).toBe(true);
      expect(requirementsMet([capability], engine)).toBe(true);
    }
    expect(requirementsMet(table, BASE_CAPABILITIES)).toBe(false);
    expect(requirementsMet(table, engine)).toBe(true);
  });

  it('an engine declares the base set, with tables the table and merge ones, and moves when it can', () => {
    const base = engineCapabilities({ tables: false, move: true });
    expect([...base]).toEqual([...BASE_CAPABILITIES]);
    expect(Object.isFrozen(base)).toBe(true);
    expect([...engineCapabilities({ tables: true, move: false })]).toEqual([
      ...BASE_CAPABILITIES,
      'block.table',
      'table.merge',
    ]);
    expect([...engineCapabilities({ tables: true, move: true })]).toEqual([
      ...BASE_CAPABILITIES,
      ...OPTIONAL_CAPABILITIES,
    ]);
  });

  it('names the capability of a custom node by its kind and name', () => {
    expect(nodeCapability({ kind: 'block', name: 'callout' })).toBe('block.callout');
    expect(nodeCapability({ kind: 'inline', name: 'mention' })).toBe('inline.mention');
  });
});

describe('uwg-te-req-engine-2: the package check', () => {
  it('reads the base capabilities from the built module, never by scanning the source', () => {
    const script = readFileSync(
      new URL('../../../scripts/pack-smoke.mjs', import.meta.url),
      'utf8',
    );
    expect(script).toMatch(/dist\/foundation\/text-editor\/capabilities\.js/u);
    expect(script).toMatch(/\{ BASE_CAPABILITIES \}/u);
    expect(script).not.toMatch(/src\/foundation\/text-editor\/capabilities\.ts/u);
    expect(script).not.toMatch(/BASE_CAPABILITY_IDS/u);
  });
});
