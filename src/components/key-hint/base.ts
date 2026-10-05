import { css, html, nothing } from 'lit';
import { TpElement } from '../../foundation/element.js';
import {
  keyHintPlatform,
  type KeyHintLabels,
  type KeyHintPlatform,
  type ResolvedKeyHintPlatform,
} from './notation.js';

interface GroupContext {
  platform: ResolvedKeyHintPlatform;
  labels: KeyHintLabels;
  prefix: string;
}
/** Shared noninteractive notation context; no keyboard event listeners. */
export abstract class KeyHintElement extends TpElement {
  static override properties = {
    ...TpElement.properties,
    platform: { type: String },
    keyLabels: { attribute: false },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
        color: inherit;
        font: inherit;
      }

      .prefix {
        margin-inline-end: var(--tp-space-1);
        font-size: var(--tp-text-xs);
      }

      .content {
        display: contents;
      }

      kbd {
        display: inline-flex;
        align-items: center;
        margin: 0;
      }
    `,
  ];
  platform: KeyHintPlatform = 'auto';
  keyLabels: KeyHintLabels = {};
  label = '';
  #groupOwner: HTMLElement | undefined;
  #groupContext: GroupContext | undefined;
  get resolvedPlatform(): ResolvedKeyHintPlatform {
    return this.platform === 'auto' && this.#groupContext
      ? this.#groupContext.platform
      : keyHintPlatform(this.platform, this.ownerDocument.defaultView?.navigator);
  }
  protected get resolvedLabels(): KeyHintLabels {
    return { ...this.#groupContext?.labels, ...this.keyLabels };
  }
  /** @internal Parent Group owns context without overwriting authored properties. */
  setGroupContext(owner: HTMLElement, context: GroupContext): void {
    this.#groupOwner = owner;
    this.#groupContext = context;
    this.requestUpdate();
  }
  /** @internal Release only the calling Group's contribution after membership changes. */
  clearGroupContext(owner: HTMLElement): void {
    if (owner !== this.#groupOwner) return;
    this.#groupOwner = undefined;
    this.#groupContext = undefined;
    this.requestUpdate();
  }
  protected renderPrefix() {
    return this.#groupContext?.prefix
      ? html`<span class="prefix">${this.#groupContext.prefix}</span>`
      : nothing;
  }
}
