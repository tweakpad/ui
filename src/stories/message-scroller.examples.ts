import { LitElement, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { TpMessageScroller } from '../components/message-scroller/index.js';

const history = [
  'Could you help me prepare the pilot launch?',
  'Of course. Start with the launch checklist, then confirm the people who will review it.',
  'The design review is done. We still have one keyboard navigation issue.',
  'Keep that issue in the release criteria so it cannot be lost among the smaller tasks.',
  'I have shared the checklist with the team. What should I check next?',
  'Review the first ten minutes of the experience with someone who has not used it before. Watch where they hesitate, then simplify that step.',
];
export class MessageScrollerDemo extends LitElement {
  static properties = {
    rows: { state: true },
    text: { state: true },
    streaming: { state: true },
    loaded: { state: true },
    initialPosition: {},
    follow: { type: Boolean },
  };
  rows = history.map((text, i) => ({ id: String(i), text, own: i % 2 === 0 }));
  text = '';
  streaming = false;
  loaded = false;
  initialPosition: TpMessageScroller['initialPosition'] = 'end';
  follow = true;
  #timer: ReturnType<typeof setInterval> | undefined;
  protected override createRenderRoot() {
    return this;
  }
  override disconnectedCallback() {
    clearInterval(this.#timer);
    super.disconnectedCallback();
  }
  #send(values: Record<string, unknown>, details: { form: HTMLFormElement }) {
    const text = String(values.message ?? '').trim();
    if (!text || this.streaming) return;
    const id = String(Date.now());
    this.rows = [...this.rows, { id, text, own: true }];
    details.form.reset();
    this.streaming = true;
    let index = 0;
    const reply =
      'This is a local streamed reply. You can scroll back through the conversation while it arrives. The scroller keeps your reading position and offers Jump to latest when you want to return. Older messages can be loaded without moving the message you are reading.';
    this.#timer = setInterval(() => {
      index += 7;
      const next = { id: `${id}-reply`, text: reply.slice(0, index), own: false };
      this.rows = this.rows.some((row) => row.id === next.id)
        ? this.rows.map((row) => (row.id === next.id ? next : row))
        : [...this.rows, next];
      if (index >= reply.length) {
        clearInterval(this.#timer);
        this.streaming = false;
      }
    }, 70);
  }
  protected override render() {
    return html`<tp-card style="max-inline-size:calc(var(--tp-spacing) * 240)">
      <strong slot="header">Launch assistant</strong
      ><span slot="description">Local demo · replies are scripted</span>
      <tp-button
        slot="header"
        variant="ghost"
        size="sm"
        ?disabled=${this.loaded}
        @click=${() => {
        this.rows = [
          { id: 'earlier-1', text: 'We are planning a small pilot release next week.', own: true },
          {
            id: 'earlier-2',
            text: 'Let’s keep the first release focused on one successful journey.',
            own: false,
          },
          ...this.rows,
        ];
        this.loaded = true;
      }}
        >${this.loaded ? 'Beginning of conversation' : 'Load earlier messages'}</tp-button
      >
      <tp-message-scroller
        label="Launch assistant conversation"
        .initialPosition=${this.initialPosition}
        .follow=${this.follow}
      >
        ${repeat(
          this.rows,
          (row) => row.id,
          (row) =>
            html`<tp-message-scroller-item .messageId=${row.id} .scrollAnchor=${row.own}>
              <tp-message
                .align=${row.own ? 'end' : 'start'}
                .author=${row.own ? 'You' : 'Launch assistant'}
              >
                <tp-bubble
                  .align=${row.own ? 'end' : 'start'}
                  .variant=${row.own ? 'secondary' : 'ghost'}
                  >${row.text}</tp-bubble
                >
              </tp-message>
            </tp-message-scroller-item>`,
        )}
      </tp-message-scroller>
      <tp-form
        slot="footer"
        style="inline-size:100%"
        .onFormSubmit=${(v: Record<string, unknown>, d: { form: HTMLFormElement }) => this.#send(v, d)}
      >
        <tp-field label="Message"
          ><tp-text-area
            name="message"
            required
            rows="2"
            placeholder="Ask about the launch…"
          ></tp-text-area
        ></tp-field>
        <div slot="actions">
          <tp-button type="submit" ?disabled=${this.streaming}>Send</tp-button> ${
          this.streaming
            ? html`<tp-button
                  variant="outline"
                  @click=${() => {
                    clearInterval(this.#timer);
                    this.streaming = false;
                  }}
                  >Stop reply</tp-button
                ><tp-spinner size="sm" label="Receiving reply"></tp-spinner>`
            : ''
        }
        </div>
      </tp-form>
    </tp-card>`;
  }
}
if (!customElements.get('message-scroller-demo'))
  customElements.define('message-scroller-demo', MessageScrollerDemo);
