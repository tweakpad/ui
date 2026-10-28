import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PresentationRule } from '../../resolver.js';
import { tableAppearance } from '../table.js';
import { selectionFill } from './selection.js';

// Each case imports the set it tests, so a missing set fails only its own case.
const load = () => import('./document-table.js');

const selectors = {
  wrapper: '& .table-wrapper',
  table: '& .table',
  sizedTable: '& .table.sized',
  cell: '& .cell',
  headerCell: '& .header-cell',
  selectedCell: '& .cell.selected',
} as const;

async function rules(): Promise<readonly PresentationRule[]> {
  const { documentTableRules } = await load();
  return documentTableRules(selectors);
}

/** The declarations of the rule at one of the passed selectors. */
function at(set: readonly PresentationRule[], selector: string) {
  return set.find((rule) => rule.selector === selector)?.declarations;
}

describe('document table set', () => {
  it("borders every cell edge in the border role, with Table's cell padding and header weight (`uwg-te-table-req-document`)", async () => {
    const set = await rules();
    const cell = at(set, selectors.cell);
    expect(cell?.border).toBe('var(--tp-border-width) var(--tp-border-style) var(--tp-border)');
    for (const edge of ['block-start', 'block-end', 'inline-start', 'inline-end'])
      expect(cell).not.toHaveProperty(`border-${edge}`);
    expect(cell?.padding).toBe(tableAppearance['table-cell']?.[0]?.declarations.padding);
    expect(cell?.['box-sizing']).toBe('border-box');
    const headerWeight = tableAppearance['table-column-header']?.find(
      (rule) => rule.declarations['font-weight'] !== undefined,
    )?.declarations['font-weight'];
    expect(headerWeight).toBe('var(--tp-font-medium)');
    expect(at(set, selectors.headerCell)?.['font-weight']).toBe(headerWeight);
  });

  it('wraps cells and aligns them to the block start (`uwg-te-table-req-document`)', async () => {
    const set = await rules();
    expect(at(set, selectors.cell)).toMatchObject({
      'vertical-align': 'top',
      'text-align': 'start',
    });
    for (const rule of set) expect(rule.declarations).not.toHaveProperty('white-space');
  });

  it('fills header cells with the muted role (`uwg-te-table-req-document`)', async () => {
    const header = at(await rules(), selectors.headerCell);
    expect(header?.['background-color']).toBe('var(--tp-muted)');
    expect(header).not.toHaveProperty('background');
  });

  it('sizes columns automatically unless widths are declared, which a fixed layout honors (`uwg-te-table-req-document`)', async () => {
    const set = await rules();
    expect(at(set, selectors.table)).toEqual({
      'inline-size': '100%',
      'border-collapse': 'collapse',
    });
    expect(at(set, selectors.sizedTable)).toEqual({
      'table-layout': 'fixed',
      'inline-size': 'fit-content',
    });
    const order = set.map((rule) => rule.selector);
    expect(order.indexOf(selectors.sizedTable)).toBeGreaterThan(order.indexOf(selectors.table));
  });

  it('scrolls a wide table inside its wrapper (`uwg-te-table-req-document`)', async () => {
    expect(at(await rules(), selectors.wrapper)).toEqual({ 'overflow-x': 'auto' });
  });

  it('tints a cell range from the shared selection fill without changing layout or content colors (`uwg-te-sel-req-overlay`, `uwg-te-req-pres-4`)', async () => {
    const set = await rules();
    expect(at(set, selectors.selectedCell)).toEqual({
      'background-image': `linear-gradient(${selectionFill}, ${selectionFill})`,
    });
    const order = set.map((rule) => rule.selector);
    expect(order.indexOf(selectors.selectedCell)).toBeGreaterThan(
      order.indexOf(selectors.headerCell),
    );
  });

  it("applies only at the consumer's selectors and leaves Table alone (`uwg-te-table-req-document`, `ucl22-table`)", async () => {
    const set = await rules();
    expect(set.map((rule) => rule.selector)).toEqual(Object.values(selectors));
    expect(JSON.stringify(set)).not.toMatch(/tp-table|part~="table-|\[part/u);
    const table = readFileSync(new URL('../table.ts', import.meta.url), 'utf8');
    expect(table).not.toContain('document-table');
    const own = readFileSync(new URL('./document-table.ts', import.meta.url), 'utf8');
    expect(own).not.toMatch(/from '\.\.\/table\.js'/u);
    const bound = (await load()).documentTableRules({ ...selectors, table: '&' });
    expect(Object.keys(bound[1] ?? {})).toEqual(['declarations']);
  });

  it("places its rules with the document content sets' selector rule (`dcp-binding`)", () => {
    const own = readFileSync(new URL('./document-table.ts', import.meta.url), 'utf8');
    expect(own).toMatch(/import \{[^}]*\bat\b[^}]*\} from '\.\/document-content\.js'/u);
    expect(own).not.toMatch(/function at\(/u);
  });

  it('adds no interactive behavior (`audit-table-no-grid`)', async () => {
    for (const rule of await rules())
      for (const property of ['cursor', 'pointer-events', 'user-select', 'resize', 'touch-action'])
        expect(rule.declarations, `${rule.selector ?? '&'} ${property}`).not.toHaveProperty(
          property,
        );
  });
});
