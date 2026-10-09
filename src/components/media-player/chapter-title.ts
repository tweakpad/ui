import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { findChapter } from '../../foundation/media/chapters.js';
import type { MediaCue, MediaState } from '../../foundation/media/state.js';
import { TpMediaElement } from './context.js';
import { MediaPreviewController } from './preview.js';
import { timeSliderBounds, timeSliderChapters } from './time-slider.js';

/** The title of the chapter containing `time` (`''` for an untitled gap or no chapters). */
export function chapterTitleAt(
  cues: readonly MediaCue[],
  state: Pick<MediaState, 'duration' | 'seekable' | 'streamType'>,
  time: number | null | undefined,
): string {
  if (time === null || time === undefined) return '';
  const chapter = findChapter(timeSliderChapters(cues, timeSliderBounds(state)), time);
  return chapter?.cue?.text ?? '';
}

/**
 * `tp-media-chapter-title`: the title of the chapter at the preview position (Library
 * mp-l-preview; Video.js `TimeSliderChapterTitle`). It follows the pointer or drag time of the
 * nearest preview or time slider, and the slider value during keyboard interaction.
 *
 * It is `aria-hidden` except during keyboard interaction with the slider, when it is a polite
 * live region so the chapter is announced with the value. A `tp-media-time-slider-preview` is
 * itself `aria-hidden` (Library mp-l-preview), so the announcement applies only when the title
 * is placed outside a preview (for example directly inside the time slider). Hidden when empty.
 *
 * @csspart text - The chapter title text.
 */
export class TpMediaChapterTitle extends TpMediaElement {
  static tagName = 'tp-media-chapter-title';

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];

  readonly #state = this.select((state) => ({
    chapters: state.chapters,
    duration: state.duration,
    seekable: state.seekable,
    streamType: state.streamType,
  }));
  readonly #preview = new MediaPreviewController(this);
  #owned: OwnedAttributes | undefined;

  /** The rendered chapter title. */
  get text(): string {
    const preview = this.#preview;
    const time = preview.previewing || !preview.keyboardInteraction ? preview.time : preview.value;
    return chapterTitleAt(this.#state.value.chapters, this.#state.value, time);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#owned?.dispose();
    this.#owned = undefined;
  }

  protected override render() {
    return html`<span part="text">${this.text}</span>`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const owned = (this.#owned ??= new OwnedAttributes(this));
    const keyboard = this.#preview.keyboardInteraction;
    owned.set('aria-hidden', keyboard ? owned.original('aria-hidden') : 'true');
    owned.set('aria-live', keyboard ? 'polite' : owned.original('aria-live'));
    owned.set('hidden', this.text ? owned.original('hidden') : '');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-media-chapter-title': TpMediaChapterTitle;
  }
}
