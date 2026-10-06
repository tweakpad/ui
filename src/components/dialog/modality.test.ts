import { describe, expect, it } from 'vitest';
import {
  dialogModalities,
  isolatingModality,
  normalizeDialogModality,
  resolveDialogModality,
  type DialogModality,
} from './modality.js';

const ownerDocument = {} as Document;
const otherDocument = {} as Document;
const container = { nodeType: 1, ownerDocument } as unknown as HTMLElement;
const shadow = { nodeType: 11, ownerDocument } as unknown as ShadowRoot;

describe('dialog modality normalization', () => {
  it('accepts every Dialog value and normalizes unknown values to modal', () => {
    for (const value of dialogModalities)
      expect(normalizeDialogModality(value)).toEqual({ modality: value, unsupported: false });
    expect(normalizeDialogModality('sideways')).toEqual({ modality: 'modal', unsupported: false });
    expect(normalizeDialogModality(undefined)).toEqual({ modality: 'modal', unsupported: false });
  });
  it('normalizes known values a family member does not support and reports them', () => {
    const alert: DialogModality[] = ['modal', 'container'];
    expect(normalizeDialogModality('container', alert).modality).toBe('container');
    expect(normalizeDialogModality('non-modal', alert)).toEqual({
      modality: 'modal',
      unsupported: true,
    });
    const drawer: DialogModality[] = ['modal', 'non-modal', 'trap-focus-only'];
    expect(normalizeDialogModality('container', drawer)).toEqual({
      modality: 'modal',
      unsupported: true,
    });
  });
  it('classifies isolating modalities', () => {
    expect(isolatingModality('modal')).toBe(true);
    expect(isolatingModality('container')).toBe(true);
    expect(isolatingModality('trap-focus-only')).toBe(false);
    expect(isolatingModality('non-modal')).toBe(false);
    expect(isolatingModality(undefined)).toBe(false);
  });
});

describe('dialog modality resolution', () => {
  it('passes document-wide policies through without a scope', () => {
    for (const requested of ['modal', 'trap-focus-only', 'non-modal'] as const)
      expect(resolveDialogModality({ requested, container, ownerDocument })).toEqual({
        modality: requested,
        scope: null,
      });
  });
  it('scopes container modality to an element, ref, resolver or shadow root', () => {
    expect(resolveDialogModality({ requested: 'container', container, ownerDocument })).toEqual({
      modality: 'container',
      scope: container,
    });
    expect(
      resolveDialogModality({
        requested: 'container',
        container: { current: container },
        ownerDocument,
      }).scope,
    ).toBe(container);
    expect(
      resolveDialogModality({ requested: 'container', container: () => shadow, ownerDocument })
        .scope,
    ).toBe(shadow);
  });
  it('falls back to document modality with a diagnostic when no container applies', () => {
    for (const value of [null, { current: null }, () => null]) {
      const resolved = resolveDialogModality({
        requested: 'container',
        container: value,
        ownerDocument,
      });
      expect(resolved.modality).toBe('modal');
      expect(resolved.scope).toBeNull();
      expect(resolved.diagnostic).toMatch(/requires a container/);
    }
    const foreign = { nodeType: 1, ownerDocument: otherDocument } as unknown as HTMLElement;
    expect(
      resolveDialogModality({ requested: 'container', container: foreign, ownerDocument }),
    ).toMatchObject({ modality: 'modal', scope: null, diagnostic: expect.any(String) });
    expect(
      resolveDialogModality({
        requested: 'container',
        container,
        ownerDocument,
        portalFallback: true,
      }),
    ).toMatchObject({ modality: 'modal', scope: null, diagnostic: expect.any(String) });
  });
});
