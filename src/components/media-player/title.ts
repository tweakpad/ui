import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { TpMediaElement } from './context.js';
import { mediaTextPreferenceStyles } from './styles.js';

/**
 * `tp-media-title`: renders the resolved media title (`content-title`, else media content data).
 * The text node changes only when the title value changes, so assistive technology does not
 * re-announce it; the element is `hidden` while the title is empty. `data-visible` follows
 * controls visibility (the title fades with the controls).
 *
 * @csspart text - The title text.
 */
export class TpMediaTitle extends TpMediaElement {
  static tagName = 'tp-media-title';

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        position: relative;
        z-index: 2;
        pointer-events: none;
      }

      :host(:not([data-visible])) {
        opacity: 0;
      }
    `,
    mediaTextPreferenceStyles("[part~='text']"),
  ];

  readonly #title = this.select((state) => state.title, Object.is);
  readonly #visible = this.select((state) => state.controlsVisible, Object.is);
  #owned: OwnedAttributes | undefined;

  /** The rendered title. */
  get text(): string {
    return this.#title.value;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#owned?.dispose();
    this.#owned = undefined;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const owned = (this.#owned ??= new OwnedAttributes(this));
    owned.set('hidden', this.#title.value ? owned.original('hidden') : '');
    this.toggleAttribute('data-visible', !this.player || this.#visible.value);
  }

  protected override render() {
    return html`<span part="text">${this.#title.value}</span>`;
  }
}
