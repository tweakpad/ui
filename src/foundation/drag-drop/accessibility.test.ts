import { expect, it } from 'vitest';
import { activatorAttributes } from './accessibility.js';

function activator(localName: string, attributes: Record<string, string> = {}) {
  const native = ['button', 'input', 'select', 'textarea'];
  return {
    localName,
    matches: (selector: string) =>
      selector.includes('[tabindex]') && (native.includes(localName) || 'tabindex' in attributes),
    hasAttribute: (name: string) => name in attributes,
  };
}

it('keeps native handle button semantics without a role description', () => {
  expect(activatorAttributes(activator('button'))).toEqual({});
});

it('describes non-native activators as draggable and makes them focusable', () => {
  expect(activatorAttributes(activator('li'))).toEqual({
    tabindex: '0',
    'aria-roledescription': 'draggable',
  });
  expect(activatorAttributes(activator('tp-button', { tabindex: '0' }))).toEqual({
    'aria-roledescription': 'draggable',
  });
  expect(
    activatorAttributes(activator('div', { tabindex: '0', 'aria-roledescription': 'card' })),
  ).toEqual({});
});
