import { html, nothing } from 'lit';
import type { SkinTone } from '../../../foundation/emoji/types.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import type { PartPresentation } from '../../../presentation/resolver.js';
import type { EmojiPickerItem } from '../types.js';

export interface FooterOptions {
  readonly preview: boolean;
  readonly skinToneSelector: boolean;
  /** The highlighted emoji, otherwise the value; null shows the placeholder. */
  readonly item: EmojiPickerItem | null;
  readonly placeholder: string;
  /** Sample hand in the active tone. */
  readonly toneSample: string;
  /** Name of the skin tone Button: the selector and the active tone. */
  readonly toneLabel: string;
  /** Name of the skin tone menu and its radio group. */
  readonly toneMenuLabel: string;
  readonly tone: SkinTone;
  /** Every tone with its name and its sample hand. */
  readonly tones: readonly {
    readonly tone: SkinTone;
    readonly name: string;
    readonly sample: string;
  }[];
  readonly disabled: boolean;
  readonly onTone: (event: TpValueChangeEvent<unknown>) => void;
}

const stop = (event: Event): void => event.stopPropagation();
/** Tone rows are secondary: smaller than ordinary menu commands. */
const TONE_ITEM: PartPresentation = {
  'menu-radio-item': { styleHook: { 'font-size': 'var(--tp-text-xs)' } },
};

/** The emoji glyph or custom image of an item; `part` names it where it is a public part. */
export function renderGlyph(item: Pick<EmojiPickerItem, 'emoji' | 'src'>, part?: string) {
  return item.src
    ? html`<img
        class="glyph image"
        part=${part ?? 'emoji-picker-image'}
        src=${item.src}
        alt=""
        draggable="false"
      />`
    : html`<span class="glyph" part=${part ?? nothing}>${item.emoji}</span>`;
}

/**
 * Footer row: the decorative preview of the highlighted or chosen emoji, then the skin tone
 * Button at the inline end, then the footer slot.
 */
export function renderFooter(options: FooterOptions) {
  if (!options.preview && !options.skinToneSelector) return nothing;
  const item = options.item;
  const preview = options.preview
    ? html`<div class="preview" part="emoji-picker-preview" aria-hidden="true">
        ${
          item
            ? html`${renderGlyph(item, 'emoji-picker-preview-emoji')}<span
                  class="preview-label"
                  part="emoji-picker-preview-label"
                  >${item.label}</span
                >`
            : html`<span class="preview-label placeholder" part="emoji-picker-preview-label"
                >${options.placeholder}</span
              >`
        }
      </div>`
    : nothing;
  // The hand opens a Menu whose radio group holds every tone; picking one closes it.
  const tone = options.skinToneSelector
    ? html`<tp-menu
        class="skin-tone-menu"
        .portal=${false}
        side="top"
        align="end"
        label=${options.toneMenuLabel}
        @tp-open-change=${stop}
        @tp-open-change-complete=${stop}
        @tp-action=${stop}
        ><tp-button
          slot="trigger"
          class="skin-tone"
          part="emoji-picker-skin-tone"
          variant="ghost"
          size="icon-sm"
          aria-label=${options.toneLabel}
          ?disabled=${options.disabled}
          ><span slot="icon-start" class="tone-sample" aria-hidden="true"
            >${options.toneSample}</span
          ></tp-button
        ><tp-menu-radio-group
          aria-label=${options.toneMenuLabel}
          .value=${options.tone}
          @tp-value-change=${options.onTone}
          >${options.tones.map(
            (entry) =>
              html`<tp-menu-radio-item
                class="tone-option"
                value=${entry.tone}
                .closeOnClick=${true}
                .partPresentation=${TONE_ITEM}
                ><span class="tone-glyph" aria-hidden="true">${entry.sample}</span
                >${entry.name}</tp-menu-radio-item
              >`,
          )}</tp-menu-radio-group
        ></tp-menu
      >`
    : nothing;
  return html`<div class="footer" part="emoji-picker-footer">
    ${preview}${tone}<slot name="footer"></slot>
  </div>`;
}
