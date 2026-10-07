import { css, html, nothing, type PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { resolvesReducedMotion } from '../foundation/motion.js';
import type { TpMessageScroller } from '../components/message-scroller/index.js';
import { chatIcons } from '../icons/chat.js';
import {
  MessageScrollerDemo,
  conversation,
  type Row,
  type ScrollerOptions,
} from './message-scroller-streaming.js';

export const messageScrollerUseCases = [
  {
    id: 'anchoring',
    title: 'Anchoring turns',
    description: 'Choose which role starts each turn.',
    instruction:
      'Choose User or Assistant, then send messages one at a time. Changing the role starts a fresh comparison.',
  },
  {
    id: 'group-chat',
    title: 'Group chat',
    description: 'A participant joining can start a new turn.',
    instruction:
      'Add Alex to anchor the join marker. Then send Alex’s reply below that same marker.',
  },
  {
    id: 'previous-context',
    title: 'Keeping context visible',
    description: 'Keep a slice of the preceding reply above each new turn.',
    instruction:
      'Adjust the peek from 64 to 128 pixels, then send the next question. The new turn retains that much previous context.',
  },
  {
    id: 'opening-position',
    title: 'Opening saved threads',
    description: 'Choose where a saved conversation opens.',
    instruction:
      'Switch between start, end and last-anchor. Each selection remounts the same saved transcript at its opening position.',
  },
  {
    id: 'load-history',
    title: 'Loading earlier messages',
    description: 'Restore earlier messages without losing your place.',
    instruction:
      'Read any visible message, then load the earlier history. That message stays at the same viewport position.',
  },
  {
    id: 'animation',
    title: 'Animating new messages',
    description: 'Apply an entrance effect to the next outgoing message.',
    instruction:
      'Select an animation and send a turn. Only the new user message animates; the assistant reply streams in place.',
  },
  {
    id: 'commands',
    title: 'Jumping to messages',
    description: 'Navigate the transcript from an external menu.',
    instruction:
      'Open Jump to and choose a question. The command moves its stable message ID to the reading line.',
  },
  {
    id: 'visibility',
    title: 'Tracking the reader’s position',
    description: 'An outline follows the current anchored turn.',
    instruction:
      'Hover or focus the outline beside the card. Jump to a question, or scroll the transcript and watch the current turn change.',
  },
  {
    id: 'scrollable',
    title: 'Reading scroll state',
    description: 'Report which directions have more content.',
    instruction:
      'Scroll from the first message through the middle to the end. The footer reads the independent start and end edge flags.',
  },
] as const;
type UseCase = (typeof messageScrollerUseCases)[number]['id'];
const savedRows: Row[] = conversation.flatMap(([question, reply], index) => [
  { id: `turn-${index}`, text: question, own: true },
  { id: `turn-${index}-reply`, text: reply, own: false },
]);
const openingRows = savedRows.slice(0, 4).map((row, index) =>
  index !== 3
    ? row
    : {
        ...row,
        text: `${row.text}\n\nFor the review session, prepare three tasks: create a project, invite a colleague, and recover from an incorrect entry. Leave enough time for each person to describe what they expected.\n\nRecord the starting conditions for every issue. A useful report includes the page, the focused control, the key or pointer action, and the result.\n\nAt the end of the session, group the observations by the step where they occurred. Assign a reviewer to each release blocker and schedule a short follow-up before the invitation goes out.`,
      },
);
const groupRows: Row[] = [
  {
    id: 'group-you',
    text: 'The pilot is scheduled for Friday. Can we check the remaining release criteria?',
    own: true,
    anchor: false,
  },
  {
    id: 'group-assistant',
    text: 'The main journey is ready. We still need a keyboard review and confirmation that the invitation explains how to report problems.',
    own: false,
    author: 'Assistant',
    anchor: false,
  },
  { id: 'group-invite', text: 'Let’s bring Alex into the review.', own: true, anchor: true },
];
const animationPresets = [
  ['fade', 'Fade'],
  ['slide-up', 'Slide Up'],
  ['slide-side', 'Slide Side'],
  ['pop', 'Pop'],
  ['spring-bounce', 'Spring Bounce'],
  ['blur-fade', 'Blur Fade'],
  ['scale-fade', 'Scale Fade'],
] as const;
type AnimationPreset = (typeof animationPresets)[number][0];

// Application-owned Item entrances. Spring samples preserve the reference's
// stiffness/damping/mass values without adding a motion runtime to the library.
function entranceFrames(
  preset: AnimationPreset,
  rtl: boolean,
): { frames: Keyframe[]; duration: number; easing: string } {
  const end = { opacity: 1, transform: 'none', filter: 'none' };
  if (preset === 'pop' || preset === 'spring-bounce') {
    const stiffness = preset === 'pop' ? 500 : 520;
    const damping = preset === 'pop' ? 34 : 30;
    const mass = 0.7;
    const decay = damping / (2 * mass);
    const frequency = Math.sqrt(stiffness / mass - decay ** 2);
    const duration = 550;
    const frames = Array.from({ length: 34 }, (_, i) => {
      const t = ((i / 33) * duration) / 1000;
      const remaining =
        Math.exp(-decay * t) *
        (Math.cos(frequency * t) + (decay / frequency) * Math.sin(frequency * t));
      return {
        offset: i / 33,
        opacity: Math.min(1, Math.max(0, 1 - remaining)),
        transform: `translateY(${remaining * (preset === 'pop' ? 6 : 12)}px) scale(${1 - remaining * (preset === 'pop' ? 0.06 : 0.04)})`,
      };
    });
    return { frames: [...frames.slice(0, -1), { ...end, offset: 1 }], duration, easing: 'linear' };
  }
  const initial: Keyframe = { opacity: 0 };
  if (preset === 'slide-up') initial.transform = 'translateY(10px)';
  if (preset === 'slide-side') initial.transform = `translateX(${rtl ? -18 : 18}px)`;
  if (preset === 'blur-fade') {
    initial.filter = 'blur(4px)';
    initial.transform = 'translateY(6px)';
  }
  if (preset === 'scale-fade') initial.transform = 'scale(0.98)';
  return {
    frames: [initial, end],
    duration: preset === 'fade' ? 220 : preset === 'scale-fade' ? 240 : 280,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  };
}

/** Demo state only. All scrolling, inputs, overlays and presentation owners are public components. */
export class MessageScrollerUseCase extends MessageScrollerDemo {
  static override properties = {
    ...MessageScrollerDemo.properties,
    example: { reflect: true },
    anchorRole: { state: true },
    peek: { state: true },
    position: { state: true },
    loaded: { state: true },
    groupStep: { state: true },
    preset: { state: true },
    currentAnchor: { state: true },
    edges: { state: true },
    generation: { state: true },
  };
  static override styles = [
    MessageScrollerDemo.styles,
    css`
      .frame {
        position: relative;
        max-inline-size: 24rem;
        margin-inline: auto;
      }

      .frame.outlined {
        padding-inline-end: var(--tp-space-10);
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: inherit;
        inline-size: 100%;
        min-inline-size: 0;
      }

      .footer.stack {
        flex-direction: column;
      }

      .footer.stack > tp-button {
        inline-size: 100%;
      }

      .footer.stack > tp-button::part(button) {
        inline-size: 100%;
      }

      .footer output {
        font-size: var(--tp-text-xs);
        color: var(--tp-muted-foreground);
        text-align: center;
      }

      tp-card[data-divider]::part(card-footer) {
        border-block-start: var(--tp-border-width) solid var(--tp-border);
      }

      tp-card[data-footerless]::part(card) {
        grid-template-rows: auto minmax(0, 1fr);
      }

      tp-select {
        inline-size: 12rem;
        max-inline-size: calc(100% - 3rem);
      }

      tp-tabs {
        inline-size: 100%;
      }

      tp-tabs::part(tabs-list) {
        display: flex;
        justify-content: space-between;
      }

      .peek {
        inline-size: 8rem;
        min-inline-size: 0;
      }

      .outline {
        position: absolute;
        inset-inline-end: 0;
        inset-block-start: 50%;
        translate: 0 -50%;
      }

      .outline tp-icon {
        inline-size: 1.25rem;
        block-size: 1.25rem;
      }

      .status {
        inline-size: 100%;
        text-align: center;
        color: var(--tp-muted-foreground);
        font-size: var(--tp-text-sm);
      }
    `,
  ];
  example: UseCase = 'anchoring';
  anchorRole: 'user' | 'assistant' = 'user';
  peek = 64;
  position: 'start' | 'end' | 'last-anchor' = 'last-anchor';
  loaded = false;
  groupStep = 0;
  preset: AnimationPreset = 'fade';
  currentAnchor: string | null = null;
  edges = { start: false, end: false };
  generation = 0;
  #subscribedRoot: TpMessageScroller | null = null;
  #unsubscribers: Array<() => void> = [];
  #animated = new WeakSet<Element>();
  #animations = new Set<Animation>();
  get scroller(): TpMessageScroller | null {
    return this.renderRoot.querySelector('tp-message-scroller');
  }
  protected override willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);
    if (changed.has('example')) this.reset();
  }
  protected override reset = () => {
    if (this.streaming) return;
    this.#cancelAnimations();
    this.turn = 0;
    this.loaded = false;
    this.groupStep = 0;
    this.peek = 64;
    this.generation += 1;
    this.rows = this.example === 'previous-context' ? savedRows.slice(0, 2) : [];
    if (this.example === 'previous-context') this.turn = 1;
  };
  #cancelAnimations() {
    for (const animation of this.#animations) animation.cancel();
    this.#animations.clear();
  }
  #unsubscribe() {
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribers = [];
    this.#subscribedRoot = null;
  }
  override disconnectedCallback() {
    this.#unsubscribe();
    this.#cancelAnimations();
    super.disconnectedCallback();
  }
  override connectedCallback() {
    super.connectedCallback();
    this.requestUpdate();
  }
  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    const root = this.scroller;
    if (root !== this.#subscribedRoot) {
      this.#unsubscribe();
      this.#subscribedRoot = root;
      if (root && this.example === 'visibility')
        this.#unsubscribers.push(
          root.provider.subscribeVisibility((value) => {
            this.currentAnchor = value.currentAnchorId;
          }),
        );
      if (root && this.example === 'scrollable') {
        this.#unsubscribers.push(
          root.provider.scrollable.subscribe(({ value }) => {
            this.edges = value;
          }),
        );
        // The first edges come from the scroller's committed layout; read them after this update.
        queueMicrotask(() => {
          if (this.#subscribedRoot === root) this.edges = root.provider.scrollable.value;
        });
      }
    }
    if (this.example === 'animation')
      for (const item of this.renderRoot.querySelectorAll<HTMLElement>(
        'tp-message-scroller-item',
      )) {
        if (this.#animated.has(item)) continue;
        this.#animated.add(item);
        if (!item.getAttribute('message-id')?.endsWith('-reply') && !resolvesReducedMotion(item)) {
          const { frames, duration, easing } = entranceFrames(
            this.preset,
            getComputedStyle(item).direction === 'rtl',
          );
          const scale =
            Number.parseFloat(getComputedStyle(item).getPropertyValue('--tp-motion-scale')) || 1;
          const animation = item.animate(frames, { duration: duration * scale, easing });
          this.#animations.add(animation);
          void animation.finished.catch(() => {}).finally(() => this.#animations.delete(animation));
        }
      }
  }
  #appendOne = () => {
    const row = savedRows[this.rows.length];
    if (row) this.rows = [...this.rows, { ...row }];
  };
  #join = () => {
    this.groupStep = Math.min(2, this.groupStep + 1);
  };
  #jump = (id: string) => {
    this.scroller?.scrollToMessage(id, {
      align: 'start',
      behavior: 'smooth',
      scrollMargin: this.example === 'visibility' ? 12 : 0,
    });
  };
  #sendButton(onClick: () => void, disabled = false) {
    return html`<tp-button
      size="icon-sm"
      aria-label="Send message"
      .icon=${chatIcons.send}
      ?disabled=${disabled}
      @click=${onClick}
    ></tp-button>`;
  }
  #menu() {
    return html`<tp-menu slot="action" label="Jump to a message" align="end">
      <tp-button slot="trigger" variant="secondary" size="sm">Jump to…</tp-button>
      ${savedRows.filter((row) => row.own).map((row) => html`<tp-menu-item .value=${row.id} @click=${() => this.#jump(row.id)}>${row.text}</tp-menu-item>`)}
    </tp-menu>`;
  }
  #outline() {
    const turns = savedRows.filter((row) => row.own);
    return html`<tp-preview-card
      class="outline"
      side="inline-start"
      align="center"
      label="Transcript outline"
      .sideOffset=${-28}
      .partPresentation=${{ 'preview-card-content': { styleHook: { 'inline-size': '16rem' } } }}
    >
      <tp-button slot="trigger" size="icon-sm" variant="ghost" aria-label="Open transcript outline">
        <tp-icon
          .icon=${{ viewBox: '0 0 24 24', paths: turns.map((row, i) => ({ d: `M4 ${5 + i * 5}h16`, strokeWidth: 2, stroke: row.id === this.currentAnchor ? 'var(--tp-foreground)' : 'var(--tp-muted-foreground)' })) }}
        ></tp-icon>
      </tp-button>
      ${turns.map((row) => html`<tp-button variant="ghost" .partContracts=${{ button: { hostProperties: { 'aria-current': row.id === this.currentAnchor ? 'location' : undefined }, styleHook: { 'inline-size': '100%', 'justify-content': 'start', 'text-align': 'start', 'white-space': 'normal', height: 'auto', background: row.id === this.currentAnchor ? 'var(--tp-accent)' : undefined } } }} @click=${() => this.#jump(row.id)}>${row.text}</tp-button>`)}
    </tp-preview-card>`;
  }
  protected override render() {
    const definition = messageScrollerUseCases.find((item) => item.id === this.example)!;
    let rows = this.rows;
    const options: ScrollerOptions = {
      follow: false,
      previousItemPeek: 64,
      label: definition.title,
    };
    let footer: unknown = nothing;
    let action: unknown = this.renderReset('Reset example', this.streaming);
    let emptyTitle = 'No messages yet';
    let emptyDescription = 'Send a message to start this example.';
    let divider = true;
    switch (this.example) {
      case 'anchoring':
        rows = this.rows.map((row) => ({
          ...row,
          anchor: row.own === (this.anchorRole === 'user'),
        }));
        emptyTitle = 'Choose a turn boundary';
        emptyDescription = 'Send the first message to see the selected role anchor.';
        footer = html`<div slot="footer" class="footer">
          <tp-toggle-group
            label="Anchor role"
            .value=${[this.anchorRole]}
            size="sm"
            @tp-value-change=${(event: CustomEvent<{ value: string[] }>) => {
              const role = event.detail.value[0];
              if (role === 'user' || role === 'assistant') {
                this.anchorRole = role;
                this.reset();
              }
            }}
          >
            <tp-toggle value="user">User</tp-toggle
            ><tp-toggle value="assistant">Assistant</tp-toggle> </tp-toggle-group
          >${this.#sendButton(this.#appendOne, this.rows.length >= savedRows.length)}
        </div>`;
        break;
      case 'group-chat':
        rows = [
          ...groupRows,
          ...(this.groupStep >= 1
            ? [
                {
                  id: 'alex-joined',
                  text: 'Alex joined the review',
                  own: false,
                  marker: true,
                  anchor: true,
                },
              ]
            : []),
          ...(this.groupStep >= 2
            ? [
                {
                  id: 'alex-reply',
                  text: 'I’ll handle the keyboard review. I can test the invitation flow this afternoon and post the findings before the pilot begins.',
                  own: false,
                  author: 'Alex',
                  tinted: true,
                  anchor: false,
                },
              ]
            : []),
        ];
        footer = html`<div slot="footer" class="footer stack">
          <tp-button variant="secondary" ?disabled=${this.groupStep === 2} @click=${this.#join}
            >${this.groupStep === 0 ? 'Add Alex' : 'Send as Alex'}</tp-button
          ><output
            >${this.groupStep === 0 ? 'The join marker starts the new turn.' : 'Alex’s reply belongs below the join marker.'}</output
          >
        </div>`;
        break;
      case 'previous-context':
        options.previousItemPeek = this.peek;
        options.readingLine = 24;
        divider = false;
        footer = this.renderComposer(
          html`<tp-slider
            class="peek"
            aria-label="Previous context peek"
            .partContracts=${{ 'slider-output': { content: (state: Record<string, unknown>) => `${(state.values as number[])[0]}px` } }}
            .value=${this.peek}
            .minimum=${64}
            .maximum=${128}
            .step=${1}
            ?disabled=${this.streaming}
            @tp-value-change=${(event: CustomEvent<{ value: number | number[] }>) => {
              (event.currentTarget as HTMLElement & { value: number | number[] }).value =
                event.detail.value;
              this.peek = Number(
                Array.isArray(event.detail.value) ? event.detail.value[0] : event.detail.value,
              );
            }}
          ></tp-slider>`,
        );
        break;
      case 'opening-position':
        rows = openingRows;
        options.initialPosition = this.position;
        action = nothing;
        footer = html`<div slot="footer" class="footer">
          <tp-tabs
            label="Opening position"
            .value=${this.position}
            @tp-value-change=${(event: CustomEvent<{ value: 'start' | 'end' | 'last-anchor' }>) => {
              this.position = event.detail.value;
              this.generation += 1;
            }}
          >
            <button slot="tab" value="start">start</button
            ><button slot="tab" value="end">end</button
            ><button slot="tab" value="last-anchor">last-anchor</button>
          </tp-tabs>
        </div>`;
        break;
      case 'load-history':
        rows = (this.loaded ? savedRows : savedRows.slice(-5)).map((row) => ({
          ...row,
          anchor: false,
        }));
        rows = [
          ...rows,
          {
            id: 'history-end',
            text: 'End of conversation',
            marker: true,
            own: false,
            anchor: false,
          },
        ];
        action = this.renderReset('Reset history', !this.loaded);
        footer = html`<div slot="footer" class="footer stack">
          <tp-button
            variant="secondary"
            ?disabled=${this.loaded}
            @click=${() => {
              this.loaded = true;
            }}
          >
            ${this.loaded ? 'History loaded' : 'Load history'}</tp-button
          ><output
            >${this.loaded ? 'Earlier messages are available above.' : 'Restore the earlier part of this conversation.'}</output
          >
        </div>`;
        break;
      case 'animation':
        footer = html`<div slot="footer" class="footer">
          <tp-select
            label="Animation preset"
            .value=${this.preset}
            @tp-value-change=${(event: CustomEvent<{ value: AnimationPreset }>) => {
              (event.currentTarget as HTMLElement & { value: string }).value = event.detail.value;
              this.preset = event.detail.value;
            }}
            >${animationPresets.map(([value, label]) => html`<option value=${value}>${label}</option>`)}</tp-select
          >${this.#sendButton(this.send, this.streaming || this.turn >= conversation.length)}
        </div>`;
        break;
      case 'commands':
        rows = savedRows;
        action = this.#menu();
        break;
      case 'visibility':
        rows = savedRows;
        options.readingLine = 12;
        action = nothing;
        break;
      case 'scrollable':
        rows = savedRows;
        options.initialPosition = 'start';
        action = nothing;
        footer = html`<div slot="footer" class="status">
          ${this.edges.start && this.edges.end ? 'You can scroll both ways.' : this.edges.end ? 'You are at the top. You can scroll down.' : this.edges.start ? 'You are at the bottom. You can scroll up.' : 'All messages fit in the viewport.'}
        </div>`;
        break;
    }
    return html`<div class=${this.example === 'visibility' ? 'frame outlined' : 'frame'}>
        <tp-card
          section-colors="off"
          ?data-divider=${divider}
          ?data-footerless=${footer === nothing}
        >
          <span slot="header">${definition.title}</span
          ><span slot="description">${definition.description}</span>
          ${action}
          ${keyed(this.generation, rows.length ? this.renderTranscript(rows, options) : this.renderEmpty(emptyTitle, emptyDescription))}
          ${footer}
        </tp-card>
        ${this.example === 'visibility' ? this.#outline() : nothing}
      </div>
      <p class="note">${definition.instruction}</p>`;
  }
}
if (!customElements.get('message-scroller-use-case'))
  customElements.define('message-scroller-use-case', MessageScrollerUseCase);
