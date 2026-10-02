import type { PropertyValues } from 'lit';
import { TpHoverSurface } from '../anchored-surface.js';
import type { TpElement } from '../../foundation/element.js';
import { setPartComposition } from '../../presentation/controller.js';

/** Descriptive, non-modal hover/focus surface. Rich children must remain noninteractive. */
export class TpTooltip extends TpHoverSurface {
  static tagName = 'tp-tooltip';
  constructor() {
    super();
    this.side = 'block-start';
    this.align = 'center';
    this.sideOffset = 6;
    this.showArrow = true;
    this.arrowWidth = 10;
    this.arrowHeight = 5;
    this.dismissible = false;
    this.closeOnClick = true;
  }
  protected override get partPrefix(): string {
    return 'tooltip';
  }
  protected override get overlayRole(): string {
    return 'tooltip';
  }
  protected override get isTooltip(): boolean {
    return true;
  }
  protected override get defaultHoverDelay(): number {
    return 600;
  }
  #hints = new Set<TpElement>();
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const hints = new Set(
      [
        ...this.querySelectorAll<TpElement>('tp-key-hint'),
        ...this.renderRoot.querySelectorAll<TpElement>('tp-key-hint'),
      ].filter((hint) => !hint.closest('[slot=trigger]')),
    );
    for (const hint of this.#hints) if (!hints.has(hint)) setPartComposition(hint, this);
    for (const hint of hints)
      setPartComposition(hint, this, {
        'key-hint': {
          styleHook: {
            color: 'var(--tp-background)',
            background: 'color-mix(in srgb, currentColor 15%, transparent)',
            'border-color': 'color-mix(in srgb, currentColor 25%, transparent)',
          },
        },
      });
    this.#hints = hints;
    if (
      [...this.children].some(
        (child) =>
          child.getAttribute('slot') !== 'trigger' &&
          (child.matches('button,a[href],input,select,textarea,tp-button,tp-input,[tabindex]') ||
            child.querySelector(
              'button,a[href],input,select,textarea,tp-button,tp-input,[tabindex]',
            )),
      )
    ) {
      this.diagnostic(
        'interactive-content',
        'Tooltip content must be descriptive. Use Popover for interactive content.',
      );
    }
  }
  override disconnectedCallback(): void {
    for (const hint of this.#hints) setPartComposition(hint, this);
    this.#hints.clear();
    super.disconnectedCallback();
  }
}
