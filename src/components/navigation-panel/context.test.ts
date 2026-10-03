import { describe, expect, it } from 'vitest';
import { navigationPartContract, type NavigationPanelOwner } from './context.js';
import type { PartRenderContext, PartState } from '../../foundation/part.js';
const nativeState = Object.freeze({ variant: 'outline', disabled: true, value: 'planning' });
function fixture() {
  const providerState = Object.freeze({
    expanded: true,
    collapsed: false,
    compact: false,
    compactOpen: false,
    side: 'inline-start',
    collapseMode: 'compact',
    variant: 'floating',
  });
  const owner = {
    partContracts: {},
    provider: { state: providerState },
  } as unknown as NavigationPanelOwner;
  return { owner, providerState };
}
function resolve<T>(
  hook: T | ((state: PartState) => T) | undefined,
  state: PartState,
): T | undefined {
  return typeof hook === 'function' ? (hook as (state: PartState) => T)(state) : hook;
}
describe('Navigation Panel native owner context layering', () => {
  it('passes Provider state to root hooks and retains native state for terminal local hooks', () => {
    const { owner, providerState } = fixture();
    owner.partContracts = {
      'navigation-panel-input': {
        classHook: (state) => `root-${state.variant}`,
        styleHook: (state) => ({ '--root-mode': String(state.compact) }),
        content: (state: PartState) => state,
      },
    };
    const contract = navigationPartContract(owner, 'navigation-panel-input', {
      classHook: (state) => `native-${state.variant}`,
      styleHook: (state) => ({ '--native-value': String(state.value) }),
      content: (state: PartState) => state,
    });
    expect(resolve(contract.classHook, nativeState)).toBe('root-floating native-outline');
    expect(resolve(contract.styleHook, nativeState)).toEqual({
      '--root-mode': 'false',
      '--native-value': 'planning',
    });
    expect(resolve(contract.content, nativeState)).toBe(nativeState);
    const rootOnly = navigationPartContract(owner, 'navigation-panel-input');
    expect(resolve(rootOnly.content, nativeState)).toBe(providerState);
  });
  it('adapts root delegate context with stable identity while local delegates preserve native state', () => {
    const { owner, providerState } = fixture();
    owner.partContracts = { 'navigation-panel-link': { renderDelegate: ({ state }) => state } };
    const first = navigationPartContract(owner, 'navigation-panel-link');
    const second = navigationPartContract(owner, 'navigation-panel-link');
    expect(first.renderDelegate).toBe(second.renderDelegate);
    const context = {
      state: nativeState,
      properties: {},
      content: undefined,
      bind: undefined,
    } as unknown as PartRenderContext;
    expect(first.renderDelegate?.(context)).toBe(providerState);
    const delegate = ({ state }: PartRenderContext) => state;
    const local = navigationPartContract(owner, 'navigation-panel-link', {
      renderDelegate: delegate,
    });
    expect(local.renderDelegate).toBe(delegate);
    expect(local.renderDelegate?.(context)).toBe(nativeState);
  });
});
