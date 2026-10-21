import { describe, expect, it } from 'vitest';
import {
  linkApplyDecision,
  linkApplyProposal,
  linkRemoveProposal,
  popoverCloseRefocuses,
} from './link-popover.js';

describe('link popover (uwg-te-req-surfaces-3)', () => {
  it('applies a URL that passes the link policy, marks one that fails it and ignores an empty one', () => {
    expect(linkApplyDecision('  https://example.test/a ')).toEqual({
      kind: 'apply',
      href: 'https://example.test/a',
    });
    expect(linkApplyDecision('mailto:team@example.test').kind).toBe('apply');
    expect(linkApplyDecision('/docs#intro').kind).toBe('apply');
    expect(linkApplyDecision('javascript:alert(1)')).toEqual({ kind: 'invalid' });
    expect(linkApplyDecision('   ')).toEqual({ kind: 'empty' });
    expect(linkApplyDecision('ftp://x.test', ['https:'])).toEqual({ kind: 'invalid' });
  });

  it('applies through the link tool and removes through link.unset, reason item-press', () => {
    const event = new Event('click');
    expect(linkApplyProposal('https://x.test', 'selection-toolbar', event)).toEqual({
      target: 'link',
      value: { href: 'https://x.test' },
      surface: 'selection-toolbar',
      reason: 'item-press',
      sourceEvent: event,
      trigger: null,
    });
    const range = { block: 'a', from: 1, to: 4 };
    expect(linkRemoveProposal(range, 'keyboard', event)).toMatchObject({
      target: [{ type: 'link.unset', range }],
      surface: 'keyboard',
      reason: 'item-press',
    });
    expect(linkRemoveProposal(undefined, 'api', undefined).target).toEqual([
      { type: 'link.unset' },
    ]);
  });

  it('returns focus on closing unless focus left the widget or a press in the editing root placed the caret', () => {
    const content = new EventTarget() as unknown as Element;
    const press = (path: EventTarget[]) => {
      const event = new Event('pointerdown');
      Object.defineProperty(event, 'composedPath', { value: () => path });
      return event;
    };
    expect(popoverCloseRefocuses('escape-key', undefined, content)).toBe(true);
    expect(popoverCloseRefocuses('item-press', undefined, content)).toBe(true);
    expect(popoverCloseRefocuses('focus-outside', undefined, content)).toBe(false);
    expect(
      popoverCloseRefocuses('outside-press', press([new EventTarget(), content]), content),
    ).toBe(false);
    expect(popoverCloseRefocuses('outside-press', press([new EventTarget()]), content)).toBe(true);
  });
});
