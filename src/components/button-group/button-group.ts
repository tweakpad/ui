import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { setPartComposition } from '../../presentation/controller.js';
import { joinedControlPresentation } from '../../presentation/composition.js';
import { groupMember, paginationMembers, type GroupMember } from './members.js';

type Binding = GroupMember & { key: string; release: () => void };
/** Layout and part composition only: members retain all interaction and value ownership. */
export class TpButtonGroup extends TpElement {
  static tagName = 'tp-button-group';
  static override properties = {
    ...TpElement.properties,
    joined: { type: Boolean, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        inline-size: fit-content;
        vertical-align: middle;
        min-inline-size: 0;
        max-inline-size: 100%;
      }

      [part~='button-group'] {
        display: flex;
        align-items: stretch;
        min-inline-size: 0;
        flex: 1;
      }

      :host([orientation='vertical']) [part~='button-group'] {
        flex-direction: column;
      }

      ::slotted(*) {
        min-inline-size: 0;
      }

      ::slotted(:focus-within) {
        position: relative;
        z-index: 1;
      }

      ::slotted(tp-input),
      ::slotted(tp-text-area),
      ::slotted(tp-input-group) {
        flex: 1;
      }

      ::slotted(tp-pagination),
      ::slotted(tp-button-group) {
        flex-shrink: 0;
      }

      ::slotted(tp-separator) {
        flex: none;
        align-self: stretch;
        block-size: auto;
      }

      ::slotted(tp-separator[orientation='horizontal']) {
        block-size: var(--tp-border-width);
        inline-size: auto;
      }
    `,
  ];
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  joined = true;
  label = 'Actions';
  #bindings = new Map<TpElement, Binding>();
  #pagination = new Map<TpElement, string>();
  #observer: MutationObserver | undefined;
  #observed = new Map<TpElement, MutationObserver | undefined>();
  #separatorAxes = new Map<
    TpElement,
    { previous: TpElement['orientation']; applied: TpElement['orientation'] }
  >();
  #queued = false;
  #schedule = (): void => {
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.isConnected) this.#sync();
    });
  };
  #observe(element: TpElement): void {
    if (this.#observed.has(element)) return;
    this.#observed.set(element, undefined);
    void element.updateComplete.then(() => {
      if (!this.isConnected || !this.#observed.has(element)) return;
      if (element.shadowRoot) {
        const observer = new this.ownerDocument.defaultView!.MutationObserver(this.#schedule);
        observer.observe(element.shadowRoot, { childList: true, subtree: true });
        this.#observed.set(element, observer);
      }
      this.#schedule();
    });
  }
  #axis(member: TpElement): void {
    const previous = this.#separatorAxes.get(member);
    if (
      previous
        ? member.orientation !== previous.applied
        : member.authoredAttributes.has('orientation') || member.orientation !== 'horizontal'
    )
      return;
    const applied = this.orientation === 'vertical' ? 'horizontal' : 'vertical';
    this.#separatorAxes.set(member, {
      previous: previous?.previous ?? member.orientation,
      applied,
    });
    member.orientation = applied;
  }
  #release(member: TpElement): void {
    this.#bindings.get(member)?.release();
    this.#bindings.delete(member);
    setPartComposition(member, this);
    const axis = this.#separatorAxes.get(member);
    if (axis && member.orientation === axis.applied) member.orientation = axis.previous;
    this.#separatorAxes.delete(member);
  }
  #sync = (): void => {
    const children = [...this.children].filter(
      (child) => !child.hasAttribute('slot') && !child.hasAttribute('hidden'),
    );
    const nested = children.some((child) => child.localName === 'tp-button-group');
    const root = this.renderRoot.querySelector('[part~="button-group"]');
    root?.toggleAttribute('data-nested', nested);
    if (root instanceof HTMLElement) {
      root.ariaLabel = this.getAttribute('aria-label') ?? this.label;
      root.ariaLabelledByElements = this.ariaLabelledByElements;
    }
    const pagination = new Set<TpElement>();
    const members = children.flatMap((child): (GroupMember | undefined)[] => {
      if (child instanceof TpElement) this.#observe(child);
      if (child instanceof TpElement && child.localName === 'tp-pagination') {
        pagination.add(child);
        const key = `${this.joined}:${this.orientation}`;
        if (this.#pagination.get(child) !== key) {
          this.#pagination.set(child, key);
          setPartComposition(child, this, {
            'pagination-list': {
              styleHook: {
                gap: this.joined ? '0' : 'var(--tp-space-2)',
                'flex-direction': this.orientation === 'vertical' ? 'column' : 'row',
                'align-items': 'stretch',
                'flex-wrap': 'nowrap',
              },
            },
            'pagination-page-item': {
              styleHook: { 'flex-direction': 'column', 'align-items': 'stretch' },
            },
            'pagination-page-link': {
              styleHook: this.orientation === 'vertical' ? { 'inline-size': '100%' } : {},
            },
          });
        }
        const controls = paginationMembers(child);
        for (const member of controls) if (member) this.#observe(member.host);
        return [undefined, ...controls, undefined];
      }
      const member = groupMember(child);
      if (member) this.#observe(member.host);
      return [member];
    });
    for (const previous of this.#pagination.keys()) {
      if (pagination.has(previous)) continue;
      setPartComposition(previous, this);
      this.#pagination.delete(previous);
    }
    const active = new Set(members.flatMap((member) => (member ? [member.host] : [])));
    for (const [element, observer] of this.#observed) {
      if (active.has(element) || children.includes(element)) continue;
      observer?.disconnect();
      this.#observed.delete(element);
    }
    for (const member of this.#bindings.keys()) if (!active.has(member)) this.#release(member);
    // Nested groups and unsupported content split seam runs, preserving their own ownership.
    for (let index = 0; index < members.length; index++) {
      const member = members[index];
      if (!member) continue;
      const separator = member.part === 'separator';
      if (separator) this.#axis(member.host);
      let start = index,
        end = index;
      while (start > 0 && members[start - 1]) start--;
      while (end + 1 < members.length && members[end + 1]) end++;
      const key = `${this.joined && !nested}:${this.orientation}:${index - start}:${end - start + 1}`;
      const previous = this.#bindings.get(member.host);
      if (
        previous?.element === member.element &&
        previous.part === member.part &&
        previous.key === key
      )
        continue;
      previous?.release();
      const familyPart = separator
        ? 'button-group-separator'
        : member.part === 'button-group-text-segment'
          ? member.part
          : 'button-group-control';
      const release = member.element
        ? this.presentationController.registerPart(familyPart, member.element)
        : () => {};
      this.#bindings.set(member.host, { ...member, key, release });
      setPartComposition(
        member.host,
        this,
        this.joined && !nested && !separator
          ? {
              [member.part]: {
                styleHook: joinedControlPresentation(
                  index - start,
                  end - start + 1,
                  this.orientation,
                  null,
                ),
              },
            }
          : undefined,
      );
    }
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.#schedule);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'slot', 'orientation', 'aria-label', 'aria-labelledby'],
    });
    this.#schedule();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    for (const observer of this.#observed.values()) observer?.disconnect();
    this.#observed.clear();
    for (const pagination of this.#pagination.keys()) setPartComposition(pagination, this);
    this.#pagination.clear();
    for (const member of this.#bindings.keys()) this.#release(member);
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('joined') || changed.has('orientation')) this.#sync();
  }
  protected override render() {
    return this.renderPart(
      'button-group',
      { orientation: this.orientation, joined: this.joined },
      {
        tag: 'div',
        properties: {
          role: 'group',
          'aria-label': this.getAttribute('aria-label') ?? this.label,
          '.ariaLabelledByElements': this.ariaLabelledByElements,
        },
        content: html`<slot @slotchange=${this.#sync}></slot>`,
      },
    );
  }
}
