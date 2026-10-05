import { LitElement, css, html, nothing, type CSSResultGroup } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { TpMessageScroller } from '../components/message-scroller/index.js';
import { plusIcon } from '../icons/plus.js';
import { refreshIcon } from '../icons/refresh.js';
import { chatIcons } from '../icons/chat.js';

// Application-owned transport, matching the reference's read-only queued chat.
export const conversation = [
  [
    'Could you help me prepare the pilot launch?',
    'Start with the launch checklist, then confirm who will review it. Keep the pilot focused on one complete journey so the team can test it from beginning to end.\n\nBefore inviting the pilot group, check the first-run experience, keyboard navigation, and error recovery. Record each finding alongside a clear acceptance criterion and an owner.',
  ],
  [
    'The design review is done. We still have one keyboard navigation issue.',
    'Keep that issue in the release criteria so it cannot get lost among smaller tasks. Write down the exact key sequence, the expected focus target, and what happens now.\n\nAfter the fix, repeat the same sequence and ask someone else to try it. Include returning to the page, opening and closing overlays, and recovering from an invalid submission.',
  ],
  [
    'I have shared the checklist with the team. What should I check next?',
    'Review the first ten minutes with someone who has not used the product before. Ask them to complete the main task without guidance and note where they hesitate.\n\nBring those observations back to the checklist. Resolve anything that blocks the main journey, then agree which smaller improvements can wait until after the pilot.',
  ],
  [
    'The checklist is complete and the pilot group is ready.',
    'Send the invitation with a short explanation of what to try and where to report problems. Make sure someone is available to respond during the first session.\n\nAfterward, review the feedback together. Separate failures from suggestions, update the checklist, and agree on the next change before expanding the pilot.',
  ],
] as const;
export type Row = {
  id: string;
  text: string;
  own: boolean;
  author?: string;
  marker?: boolean;
  anchor?: boolean;
  tinted?: boolean;
};
export type ScrollerOptions = Partial<
  Pick<
    TpMessageScroller,
    | 'label'
    | 'initialPosition'
    | 'follow'
    | 'defaultPinned'
    | 'threshold'
    | 'readingLine'
    | 'previousItemPeek'
    | 'returnControlPeek'
    | 'preserveOnPrepend'
    | 'returnDirection'
  >
>;

export class MessageScrollerDemo extends LitElement {
  static properties = {
    rows: { state: true },
    streaming: { state: true },
    turn: { state: true },
    variant: {},
    scrollerOptions: { attribute: false },
  };
  static styles: CSSResultGroup = css`
    :host {
      display: block;
      inline-size: 100%;
      font-size: var(--tp-text-sm);
    }

    tp-card {
      display: block;
      inline-size: 100%;
      max-inline-size: 24rem;
      margin-inline: auto;
    }

    tp-card::part(card) {
      block-size: 35rem;
      grid-template-rows: auto minmax(0, 1fr) auto;
      border-radius: min(var(--tp-radius-4xl), 1.5rem);
    }

    tp-card::part(card-title) {
      font-size: var(--tp-text-base);
      font-weight: var(--tp-font-medium);
    }

    tp-card::part(card-action) {
      grid-row: 1 / 3;
      align-self: start;
    }

    tp-card::part(card-content) {
      min-block-size: 0;
      overflow: hidden;
      padding: 0;
    }

    tp-card::part(card-footer) {
      border: 0;
    }

    tp-form {
      inline-size: 100%;
    }

    tp-input-group::part(input-group) {
      background: color-mix(in oklab, var(--tp-input) 50%, transparent);
      border-color: transparent;
      border-radius: var(--tp-radius-3xl);
    }

    tp-text-area::part(text-area) {
      box-sizing: border-box;
      block-size: 3.5rem;
      min-block-size: 0;
      overflow: hidden;
    }

    .composer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      inline-size: 100%;
      gap: inherit;
    }

    tp-button::part(button) {
      border-radius: var(--tp-radius-full);
    }

    tp-empty-state {
      display: grid;
      place-items: center;
      min-block-size: 0;
    }

    tp-empty-state::part(empty-state-title) {
      font-size: var(--tp-text-xl);
    }

    tp-empty-state::part(empty-state-media) {
      inline-size: 2.5rem;
      block-size: 2.5rem;
    }

    tp-message-scroller {
      min-block-size: 0;
      block-size: 100%;

      --tp-message-scroller-height: 100%;
    }

    tp-bubble::part(bubble) {
      border-radius: var(--tp-radius-4xl);
    }

    tp-bubble p {
      white-space: pre-wrap;
    }

    .note {
      max-inline-size: 24rem;
      margin: var(--tp-space-4) auto 0;
      text-align: center;
      color: var(--tp-muted-foreground);
      font-size: var(--tp-text-xs);
    }
  `;
  rows: Row[] = [];
  streaming = false;
  turn = 0;
  variant: 'chat' | 'streaming' = 'chat';
  scrollerOptions: ScrollerOptions = {};
  #timer: ReturnType<typeof setInterval> | undefined;
  override disconnectedCallback() {
    clearInterval(this.#timer);
    this.streaming = false;
    super.disconnectedCallback();
  }
  protected reset = () => {
    if (this.streaming) return;
    clearInterval(this.#timer);
    this.rows = [];
    this.turn = 0;
  };
  protected send = () => {
    const next = conversation[this.turn];
    if (!next || this.streaming) return;
    const id = `turn-${this.turn}`;
    this.rows = [...this.rows, { id, text: next[0], own: true }];
    this.turn += 1;
    this.streaming = true;
    let index = 0;
    this.#timer = setInterval(() => {
      index += 3;
      const reply = { id: `${id}-reply`, text: next[1].slice(0, index), own: false };
      this.rows = this.rows.some((row) => row.id === reply.id)
        ? this.rows.map((row) => (row.id === reply.id ? reply : row))
        : [...this.rows, reply];
      if (index >= next[1].length) {
        clearInterval(this.#timer);
        this.streaming = false;
      }
    }, 20);
  };
  protected renderRow(row: Row) {
    return html`<tp-message-scroller-item
      .messageId=${row.id}
      .scrollAnchor=${row.anchor ?? row.own}
    >
      ${
        row.marker
          ? html`<tp-marker variant="separator">${row.text}</tp-marker>`
          : html` <tp-message .align=${row.own ? 'end' : 'start'} .author=${row.author ?? ''}>
              <tp-bubble
                .align=${row.own ? 'end' : 'start'}
                .variant=${row.tinted ? 'tinted' : row.own ? 'subdued' : 'ghost'}
                .label=${row.author || (row.own ? 'You' : 'Assistant')}
              >
                ${row.text.split('\n\n').map((p) => html`<p>${p}</p>`)}
              </tp-bubble>
            </tp-message>`
      }
    </tp-message-scroller-item>`;
  }
  protected renderTranscript(rows = this.rows, options = this.scrollerOptions) {
    return html`<tp-message-scroller
      .label=${options.label ?? 'Conversation'}
      .initialPosition=${options.initialPosition ?? 'end'}
      .follow=${options.follow ?? this.variant === 'streaming'}
      .defaultPinned=${options.defaultPinned ?? true}
      .threshold=${options.threshold ?? 8}
      .readingLine=${options.readingLine ?? 0}
      .previousItemPeek=${options.previousItemPeek ?? 64}
      .returnControlPeek=${options.returnControlPeek ?? 0}
      .preserveOnPrepend=${options.preserveOnPrepend ?? true}
    >
      <tp-message-scroller-viewport>
        <tp-message-scroller-content
          .partContracts=${{ 'message-scroller-content': { hostProperties: { 'aria-busy': String(this.streaming) } } }}
        >
          ${repeat(
            rows,
            (row) => row.id,
            (row) => this.renderRow(row),
          )}
        </tp-message-scroller-content>
      </tp-message-scroller-viewport>
      <tp-message-scroller-return-control
        .returnDirection=${options.returnDirection ?? 'end'}
      ></tp-message-scroller-return-control>
    </tp-message-scroller>`;
  }
  protected renderEmpty(title: string, description: string) {
    return html`<tp-empty-state media-treatment="icon" .title=${title} .description=${description}>
      <tp-icon slot="media" .icon=${chatIcons.conversation}></tp-icon>
    </tp-empty-state>`;
  }
  protected renderReset(label = 'Reset conversation', disabled = this.streaming) {
    return html`<tp-tooltip slot="action"
      ><tp-button
        slot="trigger"
        variant="outline"
        size="icon-sm"
        .ariaLabel=${label}
        .icon=${refreshIcon}
        ?disabled=${disabled}
        @click=${this.reset}
      ></tp-button
      >Reset</tp-tooltip
    >`;
  }
  protected renderComposer(extra: unknown = nothing) {
    return html` <tp-form
      slot="footer"
      aria-label="Send a queued message"
      .onFormSubmit=${this.send}
    >
      <tp-input-group aria-label="Message composer">
        <tp-text-area
          label="Queued message"
          readonly
          resize="none"
          rows="2"
          .value=${conversation[this.turn]?.[0] ?? `No messages queued. Reset the conversation.`}
        ></tp-text-area>
        <div slot="block-end" class="composer-actions">
          <tp-menu label="Add files" side="top" align="start">
            <tp-button
              slot="trigger"
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Add files"
              .icon=${plusIcon}
            ></tp-button>
            ${(
              [
                ['attachment', 'Add Photos & Files'],
                ['image', 'Create Image'],
                ['research', 'Deep Research'],
                ['globe', 'Web Search'],
              ] as const
            ).map(
              ([icon, label], i) =>
                html`${i === 1 ? html`<tp-separator></tp-separator>` : nothing}<tp-menu-item
                    .value=${label}
                    ><tp-icon .icon=${chatIcons[icon]}></tp-icon>${label}</tp-menu-item
                  >`,
            )}
          </tp-menu>
          ${extra}
          <tp-button
            type="submit"
            size="icon-sm"
            aria-label="Send"
            .icon=${chatIcons.send}
            ?disabled=${!conversation[this.turn] || this.streaming}
          ></tp-button>
        </div>
      </tp-input-group>
    </tp-form>`;
  }
  protected override render() {
    const isStream = this.variant === 'streaming';
    return html`<tp-card section-colors="off">
        <span slot="header">${isStream ? 'Live launch review' : 'Launch assistant'}</span>
        <span slot="description"
          >${isStream ? 'Review the checklist as replies arrive.' : 'Prepare a focused pilot release.'}</span
        >
        ${this.renderReset(isStream ? 'Reset stream' : 'Reset conversation', this.streaming || (isStream && !this.rows.length))}
        ${this.rows.length ? this.renderTranscript() : this.renderEmpty(isStream ? 'Review the launch plan' : 'Start your launch plan', 'Send the first question to work through the pilot checklist.')}
        ${this.renderComposer()}
      </tp-card>
      <p class="note">
        ${isStream ? 'Streaming is simulated. Following is enabled.' : 'Demo is read only. Press send to send messages.'}
      </p>`;
  }
}
if (!customElements.get('message-scroller-demo'))
  customElements.define('message-scroller-demo', MessageScrollerDemo);
