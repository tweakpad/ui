import { render, nothing } from 'lit';
import type { CSSResultGroup } from 'lit';
import { getCompatibleStyle } from '@lit/reactive-element/css-tag.js';
import type { SelectContainer } from './types.js';

/** An owned Lit root preserves actual part bindings when a consumer selects a portal. */
export class SelectPortal {
  #host: HTMLElement | null = null;
  #container: HTMLElement | ShadowRoot | null = null;
  #tokens = new Set<string>();
  constructor(
    private owner: HTMLElement,
    private styles: CSSResultGroup,
  ) {}
  get host(): HTMLElement | null {
    return this.#host;
  }
  get root(): ShadowRoot | null {
    return this.#host?.shadowRoot ?? null;
  }
  update(container: SelectContainer, content: unknown): boolean {
    const target =
      typeof container === 'function'
        ? container()
        : container && 'current' in container
          ? container.current
          : container;
    if (!target || target.ownerDocument !== this.owner.ownerDocument) {
      this.clear();
      return false;
    }
    if (target !== this.#container) {
      this.clear();
      this.#container = target;
      this.#host = this.owner.ownerDocument.createElement('div');
      this.#host.setAttribute('data-select-portal', '');
      const root = this.#host.attachShadow({ mode: 'open' });
      const appendStyles = (result: CSSResultGroup): void => {
        if (Array.isArray(result)) {
          for (const child of result) appendStyles(child);
          return;
        }
        const style = this.owner.ownerDocument.createElement('style');
        const compatible = getCompatibleStyle(result);
        style.textContent =
          'cssText' in compatible
            ? compatible.cssText
            : [...compatible.cssRules].map((rule) => rule.cssText).join('\n');
        root.append(style);
      };
      appendStyles(this.styles);
      target.append(this.#host);
    }
    const computed = this.owner.ownerDocument.defaultView!.getComputedStyle(this.owner);
    const nextTokens = new Set<string>();
    for (let index = 0; index < computed.length; index++) {
      const name = computed[index]!;
      if (name.startsWith('--tp-')) {
        nextTokens.add(name);
        this.#host!.style.setProperty(name, computed.getPropertyValue(name));
      }
    }
    for (const name of this.#tokens)
      if (!nextTokens.has(name)) this.#host!.style.removeProperty(name);
    this.#tokens = nextTokens;
    this.#host!.style.colorScheme = computed.colorScheme;
    this.#host!.dir = computed.direction;
    render(content, this.root!, { host: this.owner });
    return true;
  }
  clear(): void {
    if (this.root) render(nothing, this.root);
    this.#host?.remove();
    this.#host = null;
    this.#container = null;
    this.#tokens.clear();
  }
}
