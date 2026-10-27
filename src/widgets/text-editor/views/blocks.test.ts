import { render } from 'lit';
import { describe, expect, it, vi } from 'vitest';
import { textEditorTools } from '../../../foundation/text-editor/builtin-tools.js';
import { BASE_CAPABILITIES } from '../../../foundation/text-editor/capabilities.js';
import type { TextEditorRequestProposal } from '../../../foundation/text-editor/controller.js';
import { resolveTextEditorLayout } from '../../../foundation/text-editor/layout.js';
import { preReadyState } from '../../../foundation/text-editor/state.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import {
  resolveTextEditorTools,
  toolEnabled,
  type TextEditorTool,
  type TextEditorToolContext,
  type TextEditorToolTarget,
} from '../../../foundation/text-editor/tools.js';
import {
  blockDragText,
  blocksDeletedText,
  blocksDuplicatedText,
  blocksMovedText,
  blocksSelectedText,
  linkCopiedText,
} from '../announcer.js';
import { blockTree } from './block-selection.test.js';
import {
  blockLabel,
  blockLink,
  fragmentBlock,
  pressedTaskItem,
  taskCheckboxOf,
  taskToggleProposal,
  TextEditorBlocks,
  type TextEditorBlocksHost,
} from './blocks.js';

// The block menu renders its items into the Menu when it opens: the test reads that render.
vi.mock('lit', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  render: vi.fn(),
}));

describe('block links and fragments', () => {
  it('links the document URL without its fragment to a block', () => {
    expect(blockLink('https://example.com/notes?a=1#old', 'b-1')).toBe(
      'https://example.com/notes?a=1#b-1',
    );
    expect(blockLink('https://example.com/notes', 'b_2')).toBe('https://example.com/notes#b_2');
  });

  it('names a block from a fragment only when the document holds it', () => {
    const tree = blockTree([
      ['b-1', 'paragraph'],
      ['b 2', 'paragraph'],
    ]);
    expect(fragmentBlock('#b-1', tree)).toBe('b-1');
    expect(fragmentBlock('#b%202', tree)).toBe('b 2');
    expect(fragmentBlock('#missing', tree)).toBeNull();
    expect(fragmentBlock('#%E0%A4%A', tree)).toBeNull();
    expect(fragmentBlock('', tree)).toBeNull();
    expect(fragmentBlock('#b-1', null)).toBeNull();
  });
});

describe('block announcements', () => {
  const strings = textEditorStrings;

  it('names a block by its first line of text, else by its kind', () => {
    expect(blockLabel('\n  Tide pools  \nmore', 'paragraph', strings)).toBe('Tide pools');
    expect(blockLabel('x'.repeat(60), 'paragraph', strings)).toHaveLength(40);
    expect(blockLabel('', 'image', strings)).toBe(strings.image);
    expect(blockLabel('', 'callout', strings)).toBe('callout');
  });

  it('fills the block texts from the strings', () => {
    expect(blocksSelectedText(strings, 3)).toBe('Selected blocks: 3');
    expect(blocksDeletedText(strings, 2)).toBe('Deleted blocks: 2');
    expect(blocksDuplicatedText(strings, 1)).toBe('Duplicated blocks: 1');
    expect(blocksMovedText(strings, ['Tide pools'])).toBe('Moved Tide pools');
    expect(blocksMovedText(strings, ['a', 'b'])).toBe('Moved blocks: 2');
    expect(linkCopiedText(strings, true)).toBe('Link copied');
    expect(linkCopiedText(strings, false)).toBe('The link could not be copied');
  });

  it('names the block, its level and its parent at each drag stage', () => {
    const top = { label: 'Notes', level: 1, parent: null };
    const nested = { label: 'Count', level: 2, parent: 'Survey' };
    expect(blockDragText(strings, 'picked-up', top)).toBe(
      'Picked up Notes, level 1, at the top level.',
    );
    expect(blockDragText(strings, 'over', nested)).toBe('Count at level 2, in Survey.');
    expect(blockDragText(strings, 'dropped', nested)).toBe('Dropped Count at level 2, in Survey.');
    expect(blockDragText(strings, 'cancelled', top)).toBe(
      'Move cancelled. Notes is back at level 1, at the top level.',
    );
  });
});

describe('task checkbox press (uwg-te-req-blocks-7)', () => {
  const marker = (className: string) => ({
    classList: { contains: (name: string) => name === className },
  });
  const input = (type: string, parent: unknown) =>
    ({ tagName: 'INPUT', type, parentElement: parent }) as unknown as EventTarget;

  it('recognizes only a checkbox inside a task marker', () => {
    const checkbox = input('checkbox', marker('tp-te-task-marker'));
    expect(taskCheckboxOf(checkbox)).toBe(checkbox);
    expect(taskCheckboxOf(input('checkbox', marker('other')))).toBeNull();
    expect(taskCheckboxOf(input('text', marker('tp-te-task-marker')))).toBeNull();
    expect(taskCheckboxOf({ tagName: 'SPAN' } as unknown as EventTarget)).toBeNull();
    expect(taskCheckboxOf(undefined)).toBeNull();
  });

  it('toggles the deepest task item whose element holds the checkbox', () => {
    const tree = blockTree(
      [
        ['t-1', 'list-task'],
        ['t-2', 'list-task', 1],
        ['p-1', 'paragraph'],
      ],
      { 't-2': { checked: 1 } },
    );
    expect(pressedTaskItem(tree, (id) => id === 't-1' || id === 't-2')?.id).toBe('t-2');
    expect(pressedTaskItem(tree, (id) => id === 't-1')?.id).toBe('t-1');
    expect(pressedTaskItem(tree, (id) => id === 'p-1')).toBeNull();
  });

  it('proposes one block.set-attrs request with surface content and reason trigger-press', () => {
    const tree = blockTree([['t-1', 'list-task']]);
    const block = tree.get('t-1')!;
    const event = { type: 'click' } as Event;
    const trigger = {} as Element;
    expect(taskToggleProposal(block, event, trigger)).toEqual({
      target: [{ type: 'block.set-attrs', id: 't-1', attrs: { checked: true } }],
      surface: 'content',
      reason: 'trigger-press',
      sourceEvent: event,
      trigger,
      focus: false,
    });
    const checked = { ...block, attrs: { checked: true } };
    expect(taskToggleProposal(checked, event, trigger).target).toEqual([
      { type: 'block.set-attrs', id: 't-1', attrs: { checked: false } },
    ]);
  });
});

describe('block menu tools (uwg-te-req-blocks-3)', () => {
  it('resolves and activates the tools on the targeted blocks', () => {
    const tree = blockTree([
      ['p1', 'paragraph'],
      ['p2', 'paragraph'],
      ['p3', 'paragraph'],
    ]);
    const received: TextEditorToolTarget[] = [];
    const share: TextEditorTool = {
      id: 'share-block',
      kind: 'button',
      label: 'Share block',
      surfaces: ['block-menu'],
      action: (context) => {
        received.push(context.target);
        return context.target.kind === 'blocks'
          ? { type: 'block.align', align: 'center', ids: context.target.ids }
          : null;
      },
    };
    const registry = resolveTextEditorTools({
      builtins: textEditorTools,
      tools: [share],
      capabilities: new Set(BASE_CAPABILITIES),
    });
    const { layout } = resolveTextEditorLayout(null, registry);
    const state = preReadyState({ editable: true, empty: false });
    const selection = { kind: 'blocks', ids: ['p1', 'p2'] } as const;
    const context = (surface: TextEditorToolContext['surface'], target?: TextEditorToolTarget) => ({
      state: { ...state, selection },
      strings: textEditorStrings,
      surface,
      target: target ?? { kind: 'selection' },
      direction: 'ltr' as const,
      layout,
      table: null,
    });
    const requests: TextEditorRequestProposal[] = [];
    const stub = () => () => undefined;
    const host = {
      geometry: { addLayer: stub, invalidate: () => undefined, onScroll: stub },
      instance: () => ({ getBlocks: () => tree }),
      selection: () => selection,
      strings: () => textEditorStrings,
      layout: () => layout,
      access: () => ({ readOnly: false, disabled: false }),
      direction: () => 'ltr',
      registry: () => registry,
      toolContext: context,
      toolEnabled: (tool: TextEditorTool, toolContext: TextEditorToolContext) =>
        toolEnabled(tool, toolContext, {
          ready: true,
          disabled: false,
          editable: true,
          registry,
          can: () => true,
        }),
      shortcut: () => undefined,
      request: (proposal: TextEditorRequestProposal) => {
        requests.push(proposal);
        return Promise.resolve('applied' as const);
      },
      can: () => true,
      announce: () => undefined,
      requestUpdate: () => undefined,
      editingFocused: () => false,
    } as unknown as TextEditorBlocksHost;
    const blocks = new TextEditorBlocks(host);
    // The menu's item for the tool, enabled because its action sees the targeted blocks.
    let onClick: ((this: Element, event: Event) => void) | null = null;
    let disabled: unknown;
    const visit = (part: unknown): void => {
      if (Array.isArray(part)) return part.forEach(visit);
      if (!part || typeof part !== 'object' || !('strings' in part) || !('values' in part)) return;
      const { strings, values } = part as { strings: readonly string[]; values: unknown[] };
      if (strings.join('').includes('<tp-menu-item') && values.includes('share-block'))
        values.forEach((value, index) => {
          if (strings[index]!.trimEnd().endsWith('.onClick=')) onClick = value as never;
          if (strings[index]!.trimEnd().endsWith('?disabled=')) disabled = value;
        });
      values.forEach(visit);
    };
    // A closed menu resolves no tool; its opening renders the items into it.
    const template = blocks.menu.render(true) as { strings: readonly string[]; values: unknown[] };
    const at = template.strings.findIndex((text) => text.trimEnd().endsWith('@tp-open-change='));
    const menu = { getRootNode: () => ({ host: {} }) };
    vi.mocked(render).mockClear();
    (template.values[at] as (event: unknown) => void)({
      target: menu,
      currentTarget: menu,
      detail: { value: true },
    });
    visit(vi.mocked(render).mock.calls.at(-1)?.[0]);
    expect(disabled).toBe(false);
    expect(received.at(-1)).toEqual({ kind: 'blocks', ids: ['p1', 'p2'] });
    (onClick as unknown as (this: Element, event: Event) => void).call(
      {} as Element,
      new Event('click'),
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      target: 'share-block',
      surface: 'block-menu',
      reason: 'item-press',
      toolTarget: { kind: 'blocks', ids: ['p1', 'p2'] },
    });
  });
});
