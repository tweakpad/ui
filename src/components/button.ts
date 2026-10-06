import { transitionCss } from '../presentation/motion.js';
import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { CompositeControlController } from '../foundation/composite-control.js';
import { SyntheticPress } from '../foundation/synthetic-press.js';
import { componentHandlingPrevented, renderPart } from '../foundation/part.js';
import type { ComponentPartContract } from '../foundation/part.js';
import type { LogicalPosition } from '../foundation/types.js';
import type { IconDefinition } from '../icons/types.js';
import { buttonPresentation } from '../presentation/families/button.js';
import { TpSpinner } from './spinner/spinner.js';
import { TpIcon } from './icon.js';
import type { CustomElementConstructorWithTag } from '../foundation/define.js';

type ButtonType = 'button' | 'submit' | 'reset';

export class TpButton extends TpElement {
  static tagName = 'tp-button';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSpinner, TpIcon];
  }
  static override presentation = buttonPresentation;
  static override properties = {
    ...TpElement.properties,
    type: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: { type: String, reflect: true },
    icon: { attribute: false },
    iconPosition: { type: String, attribute: 'icon-position', reflect: true },
    loadingPosition: { type: String, attribute: 'loading-position', reflect: true },
    href: { type: String, reflect: true },
    target: { type: String, reflect: true },
    rel: { type: String, reflect: true },
    download: { type: String, reflect: true },
    nativeAction: { type: Boolean, attribute: 'native-action', reflect: true },
    focusableWhenDisabled: {
      type: Boolean,
      attribute: 'focusable-when-disabled',
      reflect: true,
    },
    ariaLabel: { type: String, attribute: 'aria-label' },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
      }

      .control {
        position: relative;
        inline-size: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: ${transitionCss(['color', 'background-color', 'border-color'], 'fast')};
      }

      .control[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .control > * {
        position: relative;
        z-index: 1;
      }

      .control:not(:disabled, [aria-disabled='true']):active {
        transform: translateY(calc(var(--tp-spacing) / 4));
      }

      [part~='button-leading-mark'],
      [part~='button-trailing-mark'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
      }

      [part~='button-leading-mark'] tp-spinner,
      [part~='button-trailing-mark'] tp-spinner {
        width: 1em;
        height: 1em;
        color: inherit;
      }

      .control > [hidden] {
        display: none;
      }

      :host([size^='icon']) [part~='button-label'] {
        display: none;
      }
    `,
  ];

  type: ButtonType = 'button';
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' = 'default';
  size: 'xs' | 'sm' | 'default' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg' = 'default';
  name = '';
  value = '';
  icon: IconDefinition | undefined;
  iconPosition: LogicalPosition = 'leading';
  loadingPosition: LogicalPosition | null = null;
  href: string | null = null;
  target: string | null = null;
  rel: string | null = null;
  download: string | null = null;
  nativeAction = true;
  focusableWhenDisabled = false;
  declare ariaLabel: string | null;
  readonly #press = new SyntheticPress(() => this.click());
  #unnamedReported = false;

  #slottedMarks = new Set<LogicalPosition>();
  #controlElement: HTMLElement | null = null;
  #invalidLinkDelegate: ComponentPartContract['renderDelegate'];
  #controlReference = (element: HTMLElement | null): void => {
    if (element === this.#controlElement) return;
    this.#controlElement?.removeEventListener('click', this.#blockDisabledActivation, true);
    this.#press.reset();
    this.#controlElement = element;
    element?.addEventListener('click', this.#blockDisabledActivation, true);
    if (!element) return;
    this.#syncControl();
    if (this.href !== null && element.localName !== 'a') {
      const delegate = this.buttonPartContract()?.renderDelegate;
      if (delegate && this.#invalidLinkDelegate !== delegate) {
        this.#invalidLinkDelegate = delegate;
        queueMicrotask(() => {
          if (!this.isConnected || this.buttonPartContract()?.renderDelegate !== delegate) return;
          this.emit('tp-diagnostic', {
            code: 'button-native-link-required',
            message:
              'A Button with href requires a native anchor delegate; using the native anchor.',
            severity: 'warning' as const,
          });
          this.requestUpdate();
        });
      }
    }
  };

  #composite = new CompositeControlController(
    this,
    () => this.#controlElement,
    () => this.disabled,
  );

  protected get effectiveDisabled(): boolean {
    return this.disabled || !!this.#composite.state?.disabled;
  }

  protected get effectiveFocusableWhenDisabled(): boolean {
    return this.#composite.state?.focusableWhenDisabled ?? this.focusableWhenDisabled;
  }

  protected buttonPartContract(): ComponentPartContract | undefined {
    return this.partContracts.button;
  }

  protected buttonTabIndex(): string | null {
    if (this.#composite.state) return String(this.#composite.state.tabIndex);
    return this.effectiveDisabled && !this.effectiveFocusableWhenDisabled
      ? '-1'
      : this.href !== null || this.nativeAction
        ? null
        : '0';
  }

  protected override render() {
    const state = Object.freeze({
      disabled: this.effectiveDisabled,
      focusableWhenDisabled: this.effectiveFocusableWhenDisabled,
      nativeAction: this.nativeAction,
      variant: this.variant,
      size: this.size,
      type: this.#type(),
      href: this.href,
      loadingPosition: this.#resolvedLoadingPosition(),
      iconPosition: this.#resolvedIconPosition(),
    });
    const parts = (part: string) =>
      `${part} ${part}-variant-${this.variant} ${part}-size-${this.size}`;
    const loadingPosition = this.#resolvedLoadingPosition();
    const iconPosition = this.#resolvedIconPosition();
    const mark = (position: LogicalPosition): unknown => {
      if (loadingPosition)
        return loadingPosition === position
          ? html`<tp-spinner aria-hidden="true"></tp-spinner>`
          : nothing;
      if (this.icon)
        return iconPosition === position
          ? html`<tp-icon .icon=${this.icon} size="1em"></tp-icon>`
          : nothing;
      return html`<slot
        name=${position === 'leading' ? 'icon-start' : 'icon-end'}
        @slotchange=${this.#syncMark}
      ></slot>`;
    };
    const hiddenMark = (position: LogicalPosition): boolean =>
      loadingPosition
        ? loadingPosition !== position
        : this.icon
          ? iconPosition !== position
          : !this.#slottedMarks.has(position) &&
            !('content' in (this.partContracts[`button-${position}-mark`] ?? {}));
    const content = html`${this.renderPart('button-leading-mark', state, {
      tag: 'span',
      properties: { part: parts('button-leading-mark'), hidden: hiddenMark('leading') },
      protectedProperties: ['hidden'],
      content: mark('leading'),
    })}${this.renderPart('button-label', state, {
      tag: 'span',
      properties: { part: parts('button-label') },
      content: html`<slot @slotchange=${this.#checkName}></slot>`,
    })}${this.renderPart('button-trailing-mark', state, {
      tag: 'span',
      properties: { part: parts('button-trailing-mark'), hidden: hiddenMark('trailing') },
      protectedProperties: ['hidden'],
      content: mark('trailing'),
    })}`;
    const link = this.href !== null;
    const contract = this.buttonPartContract();
    let safeContract = contract;
    if (link && contract?.renderDelegate && contract.renderDelegate === this.#invalidLinkDelegate) {
      safeContract = { ...contract };
      delete safeContract.renderDelegate;
    }
    return renderPart('button', state, safeContract, {
      tag: link ? 'a' : this.nativeAction ? 'button' : 'span',
      reference: this.#controlReference,
      properties: {
        class: 'control',
        part: `${parts('button')} focusable`,
        role: link ? 'link' : 'button',
        ...(link
          ? { href: this.href, target: this.target, rel: this.rel, download: this.download }
          : {
              type: this.#type(),
              '.value': this.value,
              disabled: this.effectiveDisabled && !this.effectiveFocusableWhenDisabled,
            }),
        tabindex: this.buttonTabIndex(),
        'aria-disabled': this.effectiveDisabled ? 'true' : null,
        'aria-busy': loadingPosition ? 'true' : null,
        'aria-label': this.ariaLabel || null,
        'data-disabled': this.effectiveDisabled,
        '@click': this.#activate,
        '@keydown': this.#keyDown,
        '@keyup': this.#keyUp,
        '@focusin': this.#focusIn,
        '@focusout': this.#focusOut,
      },
      protectedProperties: ['href', 'target', 'rel', 'download'],
      onHandlerPrevented: {
        '@click': (event) => {
          if (this.href !== null) event.preventDefault();
        },
        '@keydown': () => this.#press.reset(),
        '@keyup': () => this.#press.reset(),
        '@focusout': this.#focusOut,
      },
      content,
    });
  }

  #syncControl(): void {
    const element = this.#controlElement;
    if (!element || this.href !== null) return;
    if (element.localName !== 'button') {
      element.removeAttribute('disabled');
      element.tabIndex = Number(this.buttonTabIndex() ?? '0');
    }
  }

  #blockDisabledActivation = (event: MouseEvent): void => {
    if (!this.effectiveDisabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #keyDown = (event: KeyboardEvent): void => {
    if (this.effectiveDisabled || this.href !== null) return;
    if (!this.nativeAction || this.#controlElement?.localName !== 'button')
      this.#press.keyDown(event);
  };

  #keyUp = (event: KeyboardEvent): void => {
    if (this.effectiveDisabled || this.href !== null) {
      this.#press.reset();
      return;
    }
    if (!this.nativeAction || this.#controlElement?.localName !== 'button')
      this.#press.keyUp(event);
  };

  override disconnectedCallback(): void {
    this.#press.reset();
    super.disconnectedCallback();
  }

  override focus(options?: FocusOptions): void {
    this.#control()?.focus(options);
  }

  override blur(): void {
    this.#control()?.blur();
  }

  override click(): void {
    this.#control()?.click();
  }

  #control(): HTMLElement | null {
    return this.#controlElement;
  }

  #type(): ButtonType {
    return this.type === 'submit' || this.type === 'reset' ? this.type : 'button';
  }

  #resolvedIconPosition(): LogicalPosition {
    return this.iconPosition === 'trailing' ? 'trailing' : 'leading';
  }

  #resolvedLoadingPosition(): LogicalPosition | null {
    return this.loadingPosition === 'leading' || this.loadingPosition === 'trailing'
      ? this.loadingPosition
      : null;
  }

  #syncMark = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    const position = slot.name === 'icon-end' ? 'trailing' : 'leading';
    const visible = slot.assignedNodes({ flatten: true }).length > 0;
    if (visible === this.#slottedMarks.has(position)) return;
    if (visible) this.#slottedMarks.add(position);
    else this.#slottedMarks.delete(position);
    this.requestUpdate();
  };

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-disabled', this.effectiveDisabled);
    this.#syncControl();
    this.#checkName();
  }

  #checkName = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])');
    const visibleText =
      slot
        ?.assignedNodes({ flatten: true })
        .map((node) => node.textContent ?? '')
        .join('')
        .trim() || this.renderRoot.querySelector('[part~="button-label"]')?.textContent?.trim();
    const unnamed = !this.ariaLabel && (this.size.startsWith('icon') || !visibleText);
    if (!unnamed) {
      this.#unnamedReported = false;
    } else if (!this.#unnamedReported) {
      this.#unnamedReported = true;
      queueMicrotask(() =>
        this.emit('tp-diagnostic', {
          code: 'button-accessible-name-missing',
          message: 'Button requires an accessible name; icon-only buttons need aria-label.',
          severity: 'warning' as const,
        }),
      );
    }
  };

  #focusIn = (event: FocusEvent): void => {
    this.toggleAttribute('data-focus-visible', (event.target as Element).matches(':focus-visible'));
  };

  #focusOut = (): void => {
    this.#press.reset();
    this.removeAttribute('data-focus-visible');
  };

  #activate = (event: MouseEvent): void => {
    if (this.effectiveDisabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (this.href !== null) return;
    if (this.#type() === 'button') return;
    // Consumer click handlers must be able to cancel the initiating event first.
    queueMicrotask(() => {
      if (
        !this.isConnected ||
        this.effectiveDisabled ||
        event.defaultPrevented ||
        componentHandlingPrevented(event)
      )
        return;
      const owner = this.closest('tp-form') as
        | (HTMLElement & { requestSubmit: (submitter?: HTMLElement) => void; reset: () => void })
        | null;
      if (this.#type() === 'submit') {
        if (owner) owner.requestSubmit(this);
        else this.#requestNativeSubmit();
      } else if (owner) owner.reset();
      else this.#nativeForm()?.reset();
    });
  };

  #nativeForm(): HTMLFormElement | null {
    const id = this.getAttribute('form');
    if (id) {
      const target = this.ownerDocument.getElementById(id);
      return target instanceof HTMLFormElement ? target : null;
    }
    return this.closest('form');
  }

  #requestNativeSubmit(): void {
    const form = this.#nativeForm();
    if (!form) return;
    const proxy = this.ownerDocument.createElement('button');
    proxy.type = 'submit';
    proxy.hidden = true;
    proxy.name = this.name;
    proxy.value = this.value;
    form.append(proxy);
    try {
      form.requestSubmit(proxy);
    } finally {
      proxy.remove();
    }
  }
}
