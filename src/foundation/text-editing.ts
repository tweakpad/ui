import type { ReactiveControllerHost } from 'lit';
import type { HostProperties } from './part.js';
import type { ChangeReason } from './types.js';

/** A semantic value model for the existing native text editor, not another editor. */
export interface TextEditingModel {
  readonly text: string;
  readonly fieldValue: unknown;
  readonly controlled: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly required: boolean;
  readonly formValue: string | null;
  readonly validity: ValidityStateFlags;
  readonly validationMessage: string;
  readonly properties: HostProperties;
  input(text: string, reason: ChangeReason, event?: Event): boolean;
  blur(event?: Event): void;
  keyDown(event: KeyboardEvent): void;
  reset(): void;
  restore(value: string): void;
  updated?(): void;
  disconnected?(): void;
}

type Host = HTMLElement & ReactiveControllerHost;
const models = new WeakMap<Host, TextEditingModel>();

export function textEditingModel(host: Host): TextEditingModel | undefined {
  return models.get(host);
}

/** Binding is exclusive and reversible; the Input retains its native and form lifecycle. */
export function bindTextEditingModel(host: Host, model: TextEditingModel): () => void {
  if (models.has(host)) throw new Error('A text control already has an editing model.');
  models.set(host, model);
  host.requestUpdate();
  return () => {
    if (models.get(host) !== model) return;
    model.disconnected?.();
    models.delete(host);
    host.requestUpdate();
  };
}
