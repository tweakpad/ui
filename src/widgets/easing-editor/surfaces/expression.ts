import { html, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { bindPart } from '../../../foundation/part.js';
import { easingEditorPresentation } from '../../../presentation/families/easing-editor.js';
import { DEFAULT_STRINGS, resolveStrings } from '../strings.js';
import { easingExpressionStyles } from '../styles.js';
import type { EasingEditorStrings } from '../types.js';
import { numberTokenRange, stepNumberAt, tokenizeExpression } from './expression-tokens.js';

export type ExpressionChangeReason = 'input' | 'input-blur' | 'keyboard';
export interface EasingExpressionChangeDetail {
  readonly text: string;
  readonly reason: ExpressionChangeReason;
  readonly sourceEvent: Event;
}
export const EXPRESSION_CHANGE = 'easing-expression-change';

/**
 * The expression field: the adapter output as an editable text with its numbers highlighted
 * (Widgets 6.2 Anatomy footer row). Typing commits on Enter or blur and Escape reverts; Up and
 * Down step the number at the caret and commit at once. A transparent native input carries the
 * caret, selection and IME over a highlighted mirror of the same text.
 */
export class TpEasingEditorExpression extends TpElement {
  static tagName = 'tp-easing-editor-expression';
  static override presentation = easingEditorPresentation;
  static override properties = {
    ...TpElement.properties,
    text: { attribute: false },
    label: { type: String },
    strings: { attribute: false },
    readOnly: { type: Boolean, attribute: 'readonly' },
  };
  static override styles = [TpElement.styles, easingExpressionStyles];

  /** The owner's current output; shown unless an edit is in progress. */
  text = '';
  label = '';
  strings: Partial<EasingEditorStrings> = {};
  readOnly = false;

  #input: HTMLInputElement | null = null;
  #highlight: HTMLElement | null = null;
  #draft: string | undefined;
  #invalid = false;
  #activeToken: number | undefined;

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  /** The text being shown: the draft while editing, the owner's text otherwise. */
  get shownText(): string {
    return this.#draft ?? this.text;
  }

  override focus(options?: FocusOptions): void {
    this.#input?.focus(options);
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const input = this.#input;
    if (!input) return;
    if (this.#draft === undefined && input.value !== this.text) {
      input.value = this.text;
      const active = this.#activeToken;
      if (active !== undefined && this.shadowRoot?.activeElement === input) {
        const range = numberTokenRange(this.text, active);
        if (range) input.setSelectionRange(range[0], range[1]);
      }
    }
    this.#syncScroll();
  }

  #inputReference = (node: HTMLElement | null): void => {
    const input = node as HTMLInputElement | null;
    this.#input = input;
    if (input && this.#draft === undefined && input.value !== this.text) input.value = this.text;
  };

  #highlightReference = (node: HTMLElement | null): void => {
    this.#highlight = node;
  };

  #syncScroll(): void {
    if (this.#highlight && this.#input) this.#highlight.scrollLeft = this.#input.scrollLeft;
  }

  #onInput = (): void => {
    const input = this.#input;
    if (!input) return;
    this.#draft = input.value;
    this.#invalid = false;
    this.#activeToken = undefined;
    this.requestUpdate();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const input = this.#input;
    if (!input || this.disabled) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.#commit('input', event);
      return;
    }
    if (event.key === 'Escape') {
      if (this.#draft === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      this.#revert();
      return;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (this.readOnly) return;
    const tuned = stepNumberAt(
      input.value,
      input.selectionStart ?? 0,
      event.key === 'ArrowUp' ? 1 : -1,
      {
        large: event.shiftKey || event.ctrlKey || event.metaKey,
        small: event.altKey,
      },
    );
    if (!tuned) return;
    event.preventDefault();
    input.value = tuned.text;
    input.setSelectionRange(tuned.start, tuned.end);
    this.#draft = tuned.text;
    this.#activeToken = tuned.index;
    this.#invalid = false;
    const accepted = this.#dispatch('keyboard', event);
    if (accepted) this.#draft = undefined;
    else this.#invalid = true;
    this.requestUpdate();
  };

  #onBlur = (event: FocusEvent): void => {
    if (this.#draft !== undefined) this.#commit('input-blur', event);
    if (this.#invalid) this.#revert();
  };

  #commit(reason: ExpressionChangeReason, sourceEvent: Event): void {
    const input = this.#input;
    if (!input) return;
    if (this.#draft === undefined || this.#draft === this.text) {
      this.#draft = undefined;
      this.#invalid = false;
      this.requestUpdate();
      return;
    }
    if (this.readOnly) {
      this.#revert();
      return;
    }
    const accepted = this.#dispatch(reason, sourceEvent);
    if (accepted) this.#draft = undefined;
    this.#invalid = !accepted;
    this.requestUpdate();
  }

  #revert(): void {
    this.#draft = undefined;
    this.#invalid = false;
    this.#activeToken = undefined;
    if (this.#input) this.#input.value = this.text;
    this.requestUpdate();
  }

  /** Offers the text to the owner; a prevented event means it could not be applied. */
  #dispatch(reason: ExpressionChangeReason, sourceEvent: Event): boolean {
    const detail: EasingExpressionChangeDetail = {
      text: this.#input?.value ?? '',
      reason,
      sourceEvent,
    };
    return this.emit(EXPRESSION_CHANGE, detail, { composed: false, cancelable: true });
  }

  protected override render() {
    const text = this.strings === DEFAULT_STRINGS ? DEFAULT_STRINGS : resolveStrings(this.strings);
    const shown = this.shownText;
    const tokens = tokenizeExpression(shown);
    const name = `${this.label ? `${this.label}: ` : ''}${text.expression}`;
    return this.renderPart(
      'easing-editor-output',
      { invalid: this.#invalid, editing: this.#draft !== undefined },
      {
        tag: 'div',
        properties: {
          part: 'easing-editor-output',
          class: 'expression',
          'data-invalid': this.#invalid,
          'data-editing': this.#draft !== undefined,
          'data-disabled': this.disabled,
          'data-readonly': this.readOnly,
        },
        content: html`<div
            ${bindPart({ class: 'highlight', 'aria-hidden': 'true' }, [this.#highlightReference])}
          >
            ${tokens.map((token) =>
              token.type === 'text'
                ? html`<span class="token" data-type="text">${token.text}</span>`
                : this.renderPart(
                    'easing-editor-output-token',
                    { type: token.type },
                    {
                      tag: 'span',
                      properties: {
                        part: 'easing-editor-output-token',
                        class: 'token',
                        'data-type': token.type,
                      },
                      content: token.text,
                    },
                  ),
            )}
          </div>
          <input
            ${bindPart(
              {
                class: 'source',
                type: 'text',
                spellcheck: 'false',
                autocomplete: 'off',
                'aria-label': name,
                'aria-invalid': this.#invalid ? 'true' : nothing,
                disabled: this.disabled,
                readonly: this.readOnly,
                '@input': this.#onInput,
                '@keydown': this.#onKeyDown,
                '@blur': this.#onBlur,
                '@scroll': () => this.#syncScroll(),
              },
              [this.#inputReference],
            )}
          />`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-easing-editor-expression': TpEasingEditorExpression;
  }
}
