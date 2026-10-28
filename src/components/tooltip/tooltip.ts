import type { PropertyDeclarations, PropertyValues } from 'lit';
import { TpHoverSurface } from '../anchored-surface/anchored-surface.js';
import type { TpElement } from '../../foundation/element.js';
import { setPartComposition } from '../../presentation/controller.js';
import { tooltipPresentation } from '../../presentation/families/tooltip.js';

/** What the tooltip content means to assistive technology. */
export type TooltipDescribes = 'trigger' | 'none';

/**
 * A brief description of a focusable control, shown on hover after a delay and on keyboard focus at
 * once. The text becomes the control's accessible description, never its name; anything
 * interactive belongs in a Popover.
 *
 * @slot - The description: text, with an Icon or a Key Hint.
 * @slot trigger - The focusable control the tooltip describes.
 */
export class TpTooltip extends TpHoverSurface {
  static tagName = 'tp-tooltip';
  static override presentation = tooltipPresentation;
  static override properties = {
    ...TpHoverSurface.properties,
    describes: { type: String, reflect: true },
  } satisfies PropertyDeclarations;
  /**
   * `trigger` makes the text the trigger's accessible description; `none` keeps the tooltip visual
   * only, for a trigger whose name already says the same, such as a Play button whose tooltip shows
   * "Play" and its shortcut.
   */
  describes: TooltipDescribes = 'trigger';
  constructor() {
    super();
    this.side = 'block-start';
    this.align = 'center';
    this.showArrow = true;
    this.dismissible = false;
    this.closeOnClick = true;
  }
  protected override get defaultArrowWidthUnits(): number {
    return 3;
  }
  protected override get defaultArrowHeightUnits(): number {
    return 1.5;
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
  protected override get exposesTriggerDescription(): boolean {
    return this.describes !== 'none';
  }
  protected override popupProperties(): Record<string, unknown> {
    const properties = super.popupProperties();
    return this.describes === 'none' ? { ...properties, 'aria-hidden': 'true' } : properties;
  }
  protected override get defaultHoverDelay(): number {
    return 600;
  }
  #hints = new Set<TpElement>();
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const hints = new Set(
      [
        ...this.contentNodes.flatMap((node) =>
          node instanceof Element
            ? [
                ...(node.matches('tp-key-hint') ? [node as TpElement] : []),
                ...node.querySelectorAll<TpElement>('tp-key-hint'),
              ]
            : [],
        ),
        // Content rendered from a payload (`content`) lives in the popup, not among the children.
        ...(this.popupElement?.querySelectorAll<TpElement>('tp-key-hint') ?? []),
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

declare global {
  interface HTMLElementTagNameMap {
    'tp-tooltip': TpTooltip;
  }
}
