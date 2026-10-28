import { html } from 'lit';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ComponentPartContract } from '../../foundation/part.js';
import { TpButton } from './button.js';

/** A light-DOM child as the slot check reads it: its node type, text and `slot` attribute. */
interface Child {
  readonly nodeType: number;
  readonly textContent: string;
  getAttribute(name: string): string | null;
}
const text = (data: string): Child => ({
  nodeType: 3,
  textContent: data,
  getAttribute: () => null,
});
const element = (slot?: string): Child => ({
  nodeType: 1,
  textContent: '',
  getAttribute: (name) => (name === 'slot' ? (slot ?? null) : null),
});

class LabelProbe extends TpButton {}

beforeAll(() => {
  customElements.define('tp-button-label-probe', LabelProbe);
  vi.stubGlobal('Node', { ELEMENT_NODE: 1, TEXT_NODE: 3 });
});
afterAll(() => {
  vi.unstubAllGlobals();
});

/** The `button-label` properties one render merges, read through a public render delegate. */
function labelProperties(
  size: TpButton['size'],
  children: readonly Child[] = [],
  contract: ComponentPartContract = {},
): Record<string, unknown> {
  const button = new LabelProbe();
  Object.defineProperty(button, 'childNodes', { value: children });
  button.size = size;
  let seen: Record<string, unknown> = {};
  button.partContracts = {
    'button-label': {
      ...contract,
      renderDelegate: ({ properties, bind, content }) => {
        seen = properties;
        return html`<span ${bind}>${content}</span>`;
      },
    },
  };
  (button as unknown as { render(): unknown }).render();
  return seen;
}

describe('Button Label', () => {
  it.each(['xs', 'sm', 'default', 'lg'] as const)(
    'hides an empty Label at %s (uwg-te-req-pres-1, ucl16-button-anatomy-r2, req-cl-144-marker)',
    (size) => {
      expect(labelProperties(size).hidden).toBe(true);
      const marks = [text('\n  '), element('icon-start'), text(' '), element('icon-end')];
      expect(labelProperties(size, marks).hidden).toBe(true);
    },
  );

  it('keeps a Label with text, an element or content (ucl16-button-public-definition-detail-r2)', () => {
    expect(labelProperties('default', [text('Save')]).hidden).toBe(false);
    expect(labelProperties('default', [element()]).hidden).toBe(false);
    expect(labelProperties('default', [], { content: 'Delegated' }).hidden).toBe(false);
  });

  it.each(['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const)(
    'keeps the Label in %s (ucl16-button-icon-label)',
    (size) => {
      expect(labelProperties(size).hidden).toBe(false);
    },
  );

  it('owns hidden against hostProperties (ucl16-button-icon-label)', () => {
    expect(labelProperties('sm', [], { hostProperties: { hidden: false } }).hidden).toBe(true);
  });
});
