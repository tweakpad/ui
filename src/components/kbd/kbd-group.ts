import { html, type PropertyValues } from 'lit';
import { KbdElement } from './base.js';
import { TpKbd } from './kbd.js';
import type { KbdSeparator } from '../../foundation/key-notation.js';
import { kbdPresentation } from '../../presentation/families/kbd.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/**
 * The keys of one shortcut, or the steps of a sequence, spaced and separated as one notation. Its
 * platform and key labels pass down to the keys and groups inside it.
 *
 * @slot - The Kbd elements, or nested groups for a sequence of chords, as direct children.
 */
export class TpKbdGroup extends KbdElement {
  static tagName = 'tp-kbd-group';
  /** Library elements this element contains (Keys, nested groups); defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpKbd, TpKbdGroup];
  }
  static override presentation = kbdPresentation;
  static override properties = { ...KbdElement.properties, separator: { type: String } };
  /** What sits between the children: `plus` for a chord, `none` for adjacent keycaps, `then` for a sequence. */
  separator: KbdSeparator = 'plus';
  #members = new Set<KbdElement>();
  #observer: MutationObserver | undefined;
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.#syncMembers);
    this.#observer.observe(this, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['hidden'],
    });
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    for (const member of this.#members) member.clearGroupContext(this);
    this.#members.clear();
    super.disconnectedCallback();
  }
  #syncMembers = (): void => {
    const members = [...this.children].filter(
      (element): element is KbdElement => element instanceof KbdElement && !element.hidden,
    );
    for (const member of this.#members)
      if (!members.includes(member)) member.clearGroupContext(this);
    this.#members = new Set(members);
    const labels = this.resolvedLabels;
    const then = labels.then;
    const prefix =
      this.separator === 'none'
        ? ''
        : this.separator === 'then'
          ? typeof then === 'string'
            ? then
            : (then?.text ?? 'then')
          : '+';
    members.forEach((member, index) =>
      member.setGroupContext(this, {
        platform: this.resolvedPlatform,
        labels,
        prefix: index ? prefix : '',
      }),
    );
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncMembers();
  }
  protected override render() {
    return html`${this.renderPrefix()}${this.renderPart(
      'kbd-group',
      { separator: this.separator, platform: this.resolvedPlatform },
      {
        tag: 'kbd',
        properties: {
          role: this.label ? 'group' : undefined,
          'aria-label': this.label || undefined,
        },
        content: html`<slot @slotchange=${this.#syncMembers}></slot>`,
      },
    )}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-kbd-group': TpKbdGroup;
  }
}
