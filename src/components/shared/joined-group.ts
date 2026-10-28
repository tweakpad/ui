import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { setPartComposition } from '../../presentation/controller.js';
import { joinedControlPresentation } from '../../presentation/composition.js';
import { groupMember, type GroupMember } from './group-members.js';

/** Family part names a joined group registers on its root, member boundaries and separators. */
export interface JoinedGroupParts {
  readonly root: string;
  readonly control: string;
  readonly separator: string;
  /** Part for noninteractive text segments; without it, text segments are foreign content. */
  readonly text?: string;
}

type Binding = GroupMember & { key: string; release: () => void };

const TEXT_SEGMENT = 'button-group-text-segment';

/**
 * Layout and part composition only: members retain all interaction and value ownership.
 * Button group and Field group bind their part vocabulary and member policy to this owner
 * (Component Library §22 Button group and Field group seam contracts).
 */
export abstract class TpJoinedGroup extends TpElement {
  static override properties = {
    ...TpElement.properties,
    joined: { type: Boolean, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        vertical-align: middle;
        min-inline-size: 0;
        max-inline-size: 100%;
      }

      .group {
        display: flex;
        align-items: stretch;
        min-inline-size: 0;
        flex: 1;
      }

      :host([orientation='vertical']) .group {
        flex-direction: column;
      }

      ::slotted(*) {
        min-inline-size: 0;
      }

      ::slotted(:focus-within) {
        position: relative;
        z-index: 1;
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
  /** The family parts this group registers; set by each public group. */
  protected abstract readonly groupParts: JoinedGroupParts;
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  joined = true;
  label = '';
  #bindings = new Map<TpElement, Binding>();
  #observer: MutationObserver | undefined;
  #observed = new Map<TpElement, MutationObserver | undefined>();
  #separatorAxes = new Map<
    TpElement,
    { previous: TpElement['orientation']; applied: TpElement['orientation'] }
  >();
  #queued = false;
  /** Queues one membership sync per microtask; member hosts and slot changes call it. */
  protected schedule = (): void => {
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.isConnected) this.sync();
    });
  };
  /** Watches a member host's shadow tree so boundary replacement re-resolves the member. */
  protected observe(element: TpElement): void {
    if (this.#observed.has(element)) return;
    this.#observed.set(element, undefined);
    void element.updateComplete.then(() => {
      if (!this.isConnected || !this.#observed.has(element)) return;
      if (element.shadowRoot) {
        const observer = new this.ownerDocument.defaultView!.MutationObserver(this.schedule);
        observer.observe(element.shadowRoot, { childList: true, subtree: true });
        this.#observed.set(element, observer);
      }
      this.schedule();
    });
  }
  /**
   * Members a direct child contributes, in order; `undefined` entries split seam runs so
   * foreign content and nested groups keep their own seams. Public groups extend this for
   * their own composite members.
   */
  protected expand(child: Element): (GroupMember | undefined)[] {
    const member = groupMember(child);
    if (member?.part === TEXT_SEGMENT && !this.groupParts.text) return [undefined];
    return [member];
  }
  /** Releases policy-specific composition for children that are no longer direct members. */
  protected prune(children: readonly Element[]): void {
    void children;
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
  /** Resolves direct children to member boundaries and applies seams and part aliases. */
  protected sync = (): void => {
    const children = [...this.children].filter(
      (child) => !child.hasAttribute('slot') && !child.hasAttribute('hidden'),
    );
    const nested = children.some((child) => child.localName === this.localName);
    const root = this.renderRoot.querySelector('.group');
    root?.toggleAttribute('data-nested', nested);
    if (root instanceof HTMLElement) {
      root.ariaLabel = this.getAttribute('aria-label') ?? this.label;
      root.ariaLabelledByElements = this.ariaLabelledByElements;
    }
    const members = children.flatMap((child): (GroupMember | undefined)[] => {
      if (child instanceof TpElement) this.observe(child);
      const expanded = this.expand(child);
      for (const member of expanded) if (member) this.observe(member.host);
      return expanded;
    });
    this.prune(children);
    const active = new Set(members.flatMap((member) => (member ? [member.host] : [])));
    for (const [element, observer] of this.#observed) {
      if (active.has(element) || children.includes(element)) continue;
      observer?.disconnect();
      this.#observed.delete(element);
    }
    for (const member of this.#bindings.keys()) if (!active.has(member)) this.#release(member);
    const parts = this.groupParts;
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
        ? parts.separator
        : member.part === TEXT_SEGMENT
          ? (parts.text ?? member.part)
          : parts.control;
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
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.schedule);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'slot', 'orientation', 'aria-label', 'aria-labelledby'],
    });
    this.schedule();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    for (const observer of this.#observed.values()) observer?.disconnect();
    this.#observed.clear();
    this.prune([]);
    for (const member of this.#bindings.keys()) this.#release(member);
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('joined') || changed.has('orientation')) this.sync();
  }
  protected override render() {
    return this.renderPart(
      this.groupParts.root,
      { orientation: this.orientation, joined: this.joined },
      {
        tag: 'div',
        properties: {
          class: 'group',
          role: 'group',
          'aria-label': this.getAttribute('aria-label') ?? this.label,
          '.ariaLabelledByElements': this.ariaLabelledByElements,
        },
        content: html`<slot @slotchange=${this.sync}></slot>`,
      },
    );
  }
}
