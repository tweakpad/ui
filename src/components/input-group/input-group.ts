import { css, html, nothing, type PropertyValues } from 'lit';
import { observeSlots } from '../shared/slots.js';
import { TpElement } from '../../foundation/element.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { assignedElements } from '../shared/events.js';
import { inputGroupPresentation } from '../../presentation/families/input-group.js';

type Edge = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
/** Presentation composition only; the editor and actions retain their own behavior. */
export class TpInputGroup extends TpElement {
  static tagName = 'tp-input-group';
  static override presentation = inputGroupPresentation;
  static override properties = {
    ...TpElement.properties,
    addonPosition: { type: String, attribute: 'addon-position', reflect: true },
    actionSize: { type: String, attribute: 'action-size', reflect: true },
    actionVariant: { type: String, attribute: 'action-variant', reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
        inline-size: 100%;
        min-inline-size: 0;
      }

      .root {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        align-items: stretch;
        min-inline-size: 0;
      }

      .editor {
        grid-column: 2;
        grid-row: 2;
        min-inline-size: 0;
        display: flex;
        align-items: center;
      }

      .actions {
        grid-column: 3;
        grid-row: 2;
      }

      .addon {
        display: flex;
        align-items: center;
        min-inline-size: 0;
      }

      .addon[data-position^='inline-'] {
        justify-content: center;
      }

      .addon[data-position^='inline-'] ::slotted(span) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      [data-position='inline-start'] {
        grid-column: 1;
        grid-row: 2;
      }

      [data-position='inline-end']:not(.actions) {
        grid-column: 4;
        grid-row: 2;
      }

      [data-position='block-start'] {
        grid-column: 1 / -1;
        grid-row: 1;
      }

      [data-position='block-end'] {
        grid-column: 1 / -1;
        grid-row: 3;
      }

      .addon[hidden] {
        display: none;
      }

      ::slotted(div),
      ::slotted(input),
      ::slotted(textarea),
      ::slotted(tp-input),
      ::slotted(tp-text-area) {
        flex: 1;
        min-inline-size: 0;
      }
    `,
  ];
  addonPosition: Edge = 'inline-start';
  actionSize: 'xs' | 'sm' | 'icon-xs' | 'icon-sm' = 'xs';
  actionVariant: 'ghost' | 'default' | 'secondary' | 'destructive' | 'outline' | 'link' = 'ghost';
  #control: HTMLElement | null = null;
  #native: HTMLElement | null = null;
  #controlCleanup: (() => void) | undefined;
  #releaseSlots: (() => void) | undefined;
  #editorObserver: MutationObserver | undefined;
  #inherited = new Map<HTMLElement, Map<string, { original: string | null; applied: string }>>();
  #actionParts = new Map<HTMLElement, { target: HTMLElement; release: () => void }>();
  #actionObservers = new Map<HTMLElement, MutationObserver>();
  #textParts = new Map<HTMLElement, () => void>();
  #candidateCount: number | undefined;
  #controlInvalid = false;
  #controlDisabled = false;
  #syncRegions = (): void => {
    for (const region of this.renderRoot.querySelectorAll<HTMLElement>('.addon')) {
      region.hidden = ![...region.querySelectorAll<HTMLSlotElement>('slot')].some((slot) =>
        slot.assignedNodes().some((node) => node.nodeType !== 3 || !!node.textContent?.trim()),
      );
    }
  };
  #addon(position: Edge) {
    return this.renderPart(
      'input-group-addon',
      { position },
      {
        tag: 'span',
        properties: { class: 'addon', 'data-position': position, hidden: true },
        content: html`${this.addonPosition === position ? html`<slot name="prefix" @slotchange=${this.#syncRegions}></slot>` : nothing}
          <slot name=${position} @slotchange=${this.#syncRegions}></slot>
          ${position === 'inline-end' ? html`<slot name="suffix" @slotchange=${this.#syncRegions}></slot>` : nothing}`,
      },
    );
  }
  protected override render() {
    return this.renderPart(
      'input-group',
      { invalid: this.invalid || this.#controlInvalid, disabled: this.#controlDisabled },
      {
        tag: 'div',
        properties: {
          class: 'root',
          role: 'group',
          'aria-label': this.getAttribute('aria-label') ?? undefined,
          'data-invalid': this.invalid || this.#controlInvalid,
          'data-disabled': this.#controlDisabled,
          '@pointerdown': this.#focusFromAddon,
        },
        content: html`${this.#addon('block-start')}${this.#addon('inline-start')}
          <span class="editor"><slot @slotchange=${this.#readControl}></slot></span>
          ${this.renderPart('input-group-addon', { position: 'inline-end' }, { tag: 'span', properties: { class: 'addon actions', 'data-position': 'inline-end', hidden: true }, content: html`<slot name="action" @slotchange=${this.#syncActions}></slot>` })}
          ${this.#addon('inline-end')}${this.#addon('block-end')}`,
      },
    );
  }
  #nativeControl(): HTMLElement | null {
    if (this.#control instanceof TpElement)
      return (
        (this.#control as TpElement & { inputElement?: HTMLElement | null }).inputElement ?? null
      );
    return this.#control;
  }
  #syncNative = (): void => {
    const native = this.#nativeControl();
    if (native !== this.#native) {
      this.#controlCleanup?.();
      this.#native = native;
      this.#controlCleanup = native
        ? this.presentationController.registerPart('input-group-control', native)
        : undefined;
    }
    const invalid = !!native?.matches('[aria-invalid="true"],[invalid]');
    const disabled = !!native?.matches(':disabled,[disabled],[aria-disabled="true"]');
    if (invalid !== this.#controlInvalid || disabled !== this.#controlDisabled) {
      this.#controlInvalid = invalid;
      this.#controlDisabled = disabled;
      this.requestUpdate();
    }
  };
  #readControl = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])');
    if (!slot) return;
    const selector = 'tp-input,tp-text-area,input,textarea,[contenteditable="true"]';
    const candidates = assignedElements(slot).flatMap((element) =>
      element.matches(selector) ? [element] : [...element.querySelectorAll<HTMLElement>(selector)],
    );
    const control = candidates.length === 1 ? candidates[0]! : null;
    this.toggleAttribute('data-invalid-composition', candidates.length !== 1);
    if (candidates.length !== 1 && this.#candidateCount !== candidates.length)
      this.diagnose(
        'input-group-composition',
        `Input group expects exactly one editor; found ${candidates.length}.`,
      );
    this.#candidateCount = candidates.length;
    if (this.#control !== control) {
      this.#editorObserver?.disconnect();
      this.#control = control;
      const observe = () => {
        if (!this.isConnected || this.#control !== control || !control) return;
        this.#editorObserver ??= new this.ownerDocument.defaultView!.MutationObserver(
          this.#syncNative,
        );
        this.#editorObserver.observe(control.shadowRoot ?? control, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['aria-invalid', 'disabled', 'readonly'],
        });
        this.#syncNative();
      };
      if (control instanceof TpElement) void control.updateComplete.then(observe);
      else observe();
    }
    this.#syncNative();
  };
  #syncActions = (): void => {
    const actions = [...this.querySelectorAll<HTMLElement>(':scope > [slot="action"]')];
    this.#syncRegions();
    for (const [action, binding] of this.#actionParts)
      if (!actions.includes(action)) {
        binding.release();
        this.#actionParts.delete(action);
        this.#actionObservers.get(action)?.disconnect();
        this.#actionObservers.delete(action);
      }
    for (const [action, inherited] of this.#inherited)
      if (!actions.includes(action)) {
        for (const [key, value] of inherited)
          if (action.getAttribute(key) === value.applied) {
            if (value.original === null) action.removeAttribute(key);
            else action.setAttribute(key, value.original);
          }
        this.#inherited.delete(action);
      }
    for (const action of actions) {
      const inherited =
        this.#inherited.get(action) ??
        new Map<string, { original: string | null; applied: string }>();
      for (const [key, next] of [
        ['size', this.actionSize],
        ['variant', this.actionVariant],
      ]) {
        const previous = inherited.get(key!);
        const authored =
          action instanceof TpElement
            ? action.authoredAttributes.has(key!)
            : action.hasAttribute(key!);
        const property = (action as unknown as Record<string, unknown>)[key!];
        const nonDefaultProperty =
          (action.localName === 'tp-button' ||
            (action.constructor as { presentation?: { definition: { tagName: string } } })
              .presentation?.definition.tagName === 'tp-button') &&
          typeof property === 'string' &&
          property !== 'default';
        if (!previous && (authored || nonDefaultProperty)) continue;
        if (previous && action.getAttribute(key!) !== previous.applied) {
          inherited.delete(key!);
          if (action instanceof TpElement) action.authoredAttributes.add(key!);
          continue;
        }
        inherited.set(key!, {
          original: previous ? previous.original : action.getAttribute(key!),
          applied: next!,
        });
        action.setAttribute(key!, next!);
      }
      this.#inherited.set(action, inherited);
      const bind = () => {
        if (
          !this.isConnected ||
          !action.isConnected ||
          action.parentElement !== this ||
          action.slot !== 'action'
        )
          return;
        const target = action.shadowRoot?.querySelector<HTMLElement>('[part~="button"]') ?? action;
        const previous = this.#actionParts.get(action);
        if (previous?.target === target) return;
        previous?.release();
        this.#actionParts.set(action, {
          target,
          release: this.presentationController.registerPart('input-group-action', target),
        });
      };
      if (action instanceof TpElement)
        void action.updateComplete.then(() => {
          bind();
          if (
            action.shadowRoot &&
            action.parentElement === this &&
            this.isConnected &&
            !this.#actionObservers.has(action)
          ) {
            const observer = new this.ownerDocument.defaultView!.MutationObserver(bind);
            observer.observe(action.shadowRoot, { childList: true, subtree: true });
            this.#actionObservers.set(action, observer);
          }
        });
      else bind();
    }
  };
  #syncText = (): void => {
    const text = [...this.children].filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        !(node instanceof TpElement) &&
        ['prefix', 'suffix', 'inline-start', 'inline-end', 'block-start', 'block-end'].includes(
          node.slot,
        ) &&
        !node.matches('button,a,input,textarea,select'),
    );
    for (const [node, release] of this.#textParts)
      if (!text.includes(node)) {
        release();
        this.#textParts.delete(node);
      }
    for (const node of text)
      if (!this.#textParts.has(node))
        this.#textParts.set(
          node,
          this.presentationController.registerPart('input-group-text', node),
        );
  };
  #focusFromAddon = (event: PointerEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    const path = event.composedPath();
    if (!path.some((target) => target instanceof HTMLElement && target.classList.contains('addon')))
      return;
    if (
      path.some(
        (target) =>
          target instanceof HTMLElement &&
          target.matches(
            'button, a[href], input, textarea, select, [contenteditable], [role="button"], tp-button, tp-toggle',
          ),
      )
    )
      return;
    const editor = this.#nativeControl();
    if (editor && !editor.matches(':disabled,[disabled],[aria-disabled="true"]')) {
      event.preventDefault();
      this.#control?.focus();
    }
  };

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncRegions();
    this.#syncText();
    this.#readControl();
    if (changed.has('actionSize') || changed.has('actionVariant')) this.#syncActions();
  }
  override disconnectedCallback(): void {
    this.#releaseSlots?.();
    this.#editorObserver?.disconnect();
    this.#controlCleanup?.();
    this.#controlCleanup = undefined;
    this.#native = null;
    this.#control = null;
    for (const binding of this.#actionParts.values()) binding.release();
    this.#actionParts.clear();
    for (const observer of this.#actionObservers.values()) observer.disconnect();
    this.#actionObservers.clear();
    for (const release of this.#textParts.values()) release();
    this.#textParts.clear();
    this.#candidateCount = undefined;
    for (const [action, inherited] of this.#inherited)
      for (const [key, value] of inherited)
        if (action.getAttribute(key) === value.applied) {
          if (value.original === null) action.removeAttribute(key);
          else action.setAttribute(key, value.original);
        }
    this.#inherited.clear();
    super.disconnectedCallback();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#releaseSlots = observeSlots(this, () => {
      this.#readControl();
      this.#syncActions();
      this.#syncText();
    });
    this.requestUpdate();
    if (this.hasUpdated) {
      this.#readControl();
      this.#syncActions();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-input-group': TpInputGroup;
  }
}
