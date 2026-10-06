import { html, type PropertyValues } from 'lit';
import { KeyHintElement } from './base.js';
import type { KeyHintSeparator } from './notation.js';
import { keyHintPresentation } from '../../presentation/families/key-hint.js';

/** Parent sequence layout; each slotted Key remains its own real component. */
export class TpKeyHintGroup extends KeyHintElement {
  static tagName = 'tp-key-hint-group';
  static presentationTagName = 'tp-key-hint';
  static override presentation = keyHintPresentation;
  static override properties = { ...KeyHintElement.properties, separator: { type: String } };
  separator: KeyHintSeparator = 'plus';
  #members = new Set<KeyHintElement>();
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
      (element): element is KeyHintElement => element instanceof KeyHintElement && !element.hidden,
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
      'key-hint-group',
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
