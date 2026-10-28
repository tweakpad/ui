import { describe, expect, it } from 'vitest';
import {
  compositeControl,
  type CompositeControlState,
} from '../../foundation/composite-control.js';
import type { PartRenderContext } from '../../foundation/part.js';
import { TpToggle } from './toggle.js';

const owner = {};
const refresh = () => {};

function toggle(options: { disabled?: boolean; nativeAction?: boolean } = {}): TpToggle {
  const element = new TpToggle();
  element.disabled = options.disabled ?? false;
  element.nativeAction = options.nativeAction ?? true;
  element.partContracts = { toggle: { renderDelegate: (context) => context } };
  return element;
}

/** The `toggle` part properties of one render, read through a public render delegate. */
function rendered(element: TpToggle): Record<string, unknown> {
  return (element as unknown as { render(): PartRenderContext }).render().properties;
}

function register(element: TpToggle, state: CompositeControlState): void {
  const control = compositeControl(element);
  expect(control).toBeDefined();
  control!.apply(owner, state, refresh);
}

function key(type: 'keydown' | 'keyup', name: string) {
  let prevented = false;
  return {
    type,
    key: name,
    repeat: false,
    get defaultPrevented() {
      return prevented;
    },
    preventDefault() {
      prevented = true;
    },
  } as unknown as KeyboardEvent;
}

function press(element: TpToggle): void {
  const properties = rendered(element);
  (properties['@keydown'] as (event: KeyboardEvent) => void)(key('keydown', ' '));
  (properties['@keyup'] as (event: KeyboardEvent) => void)(key('keyup', ' '));
}

describe('Toggle as a composite control', () => {
  it('a Toggle is a composite control whose disabled source is its own and its group state (`node-011941`)', () => {
    const element = toggle();
    const control = compositeControl(element);
    expect(control?.host).toBe(element);
    expect(control?.readDisabled()).toBe(false);
    element.disabled = true;
    expect(control?.readDisabled()).toBe(true);
  });

  it('a registered disabled Toggle stays a focusable roving stop (`node-010070`)', () => {
    const element = toggle();
    register(element, { disabled: true, focusableWhenDisabled: true, tabIndex: 0 });
    expect(rendered(element)).toMatchObject({
      tabindex: 0,
      'aria-disabled': 'true',
      '.disabled': false,
      'data-disabled': true,
      'aria-pressed': 'false',
    });
  });

  it('a registered Toggle takes the tab index of its Toolbar (`node-010070`)', () => {
    const element = toggle();
    register(element, { disabled: false, focusableWhenDisabled: true, tabIndex: -1 });
    const properties = rendered(element);
    expect(properties).toMatchObject({ tabindex: -1, '.disabled': false, 'data-disabled': false });
    expect(properties['aria-disabled']).toBeUndefined();
  });

  it('a Toggle that its Toolbar does not keep focusable is skipped (`node-010070`)', () => {
    const element = toggle();
    register(element, { disabled: true, focusableWhenDisabled: false, tabIndex: -1 });
    expect(rendered(element)).toMatchObject({
      tabindex: -1,
      '.disabled': true,
      'aria-disabled': 'true',
    });
  });

  it('the disabled state of a Toolbar never becomes the own state of the Toggle (`node-011941`)', () => {
    const element = toggle();
    register(element, { disabled: true, focusableWhenDisabled: true, tabIndex: 0 });
    expect(compositeControl(element)?.readDisabled()).toBe(false);
    expect(element.toggleDisabled).toBe(false);
    compositeControl(element)?.release(owner);
    const properties = rendered(element);
    expect(properties).toMatchObject({ tabindex: 0, '.disabled': false });
    expect(properties['aria-disabled']).toBeUndefined();
  });

  it('a registered disabled Toggle never activates (`node-010070`)', () => {
    const standalone = toggle({ nativeAction: false });
    press(standalone);
    expect(standalone.pressed).toBe(true);

    const element = toggle({ nativeAction: false });
    register(element, { disabled: true, focusableWhenDisabled: true, tabIndex: 0 });
    press(element);
    expect(element.pressed).toBe(false);
    element.activateFromLabel();
    expect(element.pressed).toBe(false);
  });

  it('an unregistered disabled Toggle keeps leaving the tab order (`node-010070`)', () => {
    const element = toggle({ disabled: true });
    expect(compositeControl(element)?.state).toBeUndefined();
    expect(rendered(element)).toMatchObject({
      tabindex: -1,
      '.disabled': true,
      'aria-disabled': 'true',
    });
  });
});
