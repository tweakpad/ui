import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import { activateLabeledControl } from '../shared/events.js';
import { labelPresentation } from '../../presentation/families/label.js';

/**
 * Visible text that names one control: it becomes the control's accessible name, a click on it
 * focuses or activates the control, and it can mark the control as optional.
 *
 * @slot - The label text, and optionally the control itself when it is nested instead of
 * referenced by `for`.
 * @csspart root - The native label that holds the text and the optional hint.
 * @csspart optional-indicator - The "Optional" hint after the text.
 */
export class TpLabel extends TpElement {
  static tagName = 'tp-label';
  static override presentation = labelPresentation;
  static override properties = {
    ...TpElement.properties,
    for: { type: String },
    optional: { type: Boolean },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      .optional {
        margin-inline-start: var(--tp-space-1);
      }
    `,
  ];
  /** The id of the control this Label names, in the same document or shadow root. */
  for = '';
  /** Adds an "Optional" hint after the text; it stays hidden while the control is `required`. */
  optional = false;
  #control: HTMLElement | null = null;
  #controlRequired = false;
  #controlObserver: MutationObserver | null = null;
  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this.#activateControl);
  }
  override disconnectedCallback(): void {
    this.removeEventListener('click', this.#activateControl);
    this.#controlObserver?.disconnect();
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#associate();
  }
  #associate(): void {
    if (!this.id) this.id = createId('tp-label');
    const root = this.getRootNode();
    const control = this.for
      ? root instanceof Document || root instanceof ShadowRoot
        ? root.getElementById(this.for)
        : document.getElementById(this.for)
      : this.querySelector<HTMLElement>(':scope > :not([slot])');
    if (!control) {
      if (this.#control && 'setFieldAssociation' in this.#control) {
        (
          this.#control as HTMLElement & {
            setFieldAssociation: (association: { label: string }) => void;
          }
        ).setFieldAssociation({ label: '' });
      }
      this.#controlObserver?.disconnect();
      this.#control = null;
      this.#syncRequired();
      return;
    }
    if (control !== this.#control) {
      if (this.#control && 'setFieldAssociation' in this.#control) {
        (
          this.#control as HTMLElement & {
            setFieldAssociation: (association: { label: string }) => void;
          }
        ).setFieldAssociation({ label: '' });
      }
      this.#controlObserver?.disconnect();
      this.#control = control;
      this.#controlObserver = new (this.ownerDocument.defaultView ?? window).MutationObserver(
        this.#syncRequired,
      );
      this.#controlObserver.observe(control, { attributes: true, attributeFilter: ['required'] });
    }
    this.#syncRequired();
    if ('setFieldAssociation' in control) {
      (
        control as HTMLElement & {
          setFieldAssociation: (association: { label: string }) => void;
        }
      ).setFieldAssociation({ label: this.textContent?.trim() ?? '' });
    } else {
      control.setAttribute('aria-labelledby', this.id);
    }
    if ('label' in control && !('setFieldAssociation' in control)) {
      (control as HTMLElement & { label: string }).label = this.textContent?.trim() ?? '';
    }
  }
  #syncRequired = (): void => {
    const required = Boolean(
      this.#control &&
      (this.#control.hasAttribute('required') ||
        ('required' in this.#control &&
          (this.#control as HTMLElement & { required: boolean }).required)),
    );
    if (required !== this.#controlRequired) {
      this.#controlRequired = required;
      this.requestUpdate();
    }
  };
  #activateControl = (event: Event): void => {
    if (this.#control && event.composedPath().includes(this.#control)) return;
    activateLabeledControl(this.#control);
  };
  protected override render() {
    return html`<label part="root">
      <slot @slotchange=${this.#associate}></slot>
      ${
        this.optional && !this.#controlRequired
          ? html`<span class="optional" part="optional-indicator">Optional</span>`
          : nothing
      }
    </label>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-label': TpLabel;
  }
}
