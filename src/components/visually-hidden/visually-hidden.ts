import { css, html, unsafeCSS } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { focusableElements } from '../../foundation/focus.js';
import { Scheduler } from '../../foundation/services.js';
import { visuallyHiddenText } from '../../foundation/visually-hidden.js';
import { visuallyHiddenPresentation } from '../../presentation/families/visually-hidden.js';

/**
 * Text that assistive technology reads but that is hidden on screen and takes no space. It adds no
 * role, name or live region of its own, so attributes such as `role` and `aria-live` set on it
 * apply unchanged.
 *
 * @slot - The text to read; never focusable or interactive content, whose focus could not be seen.
 */
export class TpVisuallyHidden extends TpElement {
  static tagName = 'tp-visually-hidden';
  static override presentation = visuallyHiddenPresentation;
  static override styles = [
    TpElement.styles,
    // Important host declarations win over every outer rule, so page and theme styles cannot
    // reveal the content; the base `:host([hidden])` rule is more specific and still removes it.
    css`
      :host {
        ${unsafeCSS(visuallyHiddenText({ important: true }))}
      }
    `,
  ];

  #scheduler: Scheduler | undefined;
  #cancelCheck: (() => void) | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#scheduleCheck();
  }

  override disconnectedCallback(): void {
    this.#cancelCheck?.();
    this.#cancelCheck = undefined;
    super.disconnectedCallback();
  }

  protected override render() {
    return html`<slot @slotchange=${this.#scheduleCheck}></slot>`;
  }

  /** Library controls render their focusable parts after assignment; check once they have. */
  #scheduleCheck = (): void => {
    this.#cancelCheck?.();
    this.#scheduler ??= new Scheduler(this.ownerDocument.defaultView ?? undefined);
    this.#cancelCheck = this.#scheduler.timeout(() => {
      this.#cancelCheck = undefined;
      const [focusable] = focusableElements(this);
      if (focusable)
        this.diagnose(
          'visually-hidden-focusable-content',
          'Visually hidden content must not be focusable: its focus could not be seen.',
          { once: true, context: focusable },
        );
    }, 0);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-visually-hidden': TpVisuallyHidden;
  }
}
