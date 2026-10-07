import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { downloadIcon } from '../../../icons/download.js';
import { fileTextIcon } from '../../../icons/file-text.js';
import { plusIcon } from '../../../icons/plus.js';
import { at, type WorkspaceHost } from '../host.js';
import { initials } from '../data.js';
import './activity.css';

/** A moment the given number of minutes before now, so relative times always read as past. */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

interface Message {
  id: number;
  author: string;
  time: Date;
  text: string;
  /** A reaction summary shown on the bubble. */
  reaction?: string;
  /** A shared file shown after the bubble. */
  file?: { filename: string; description: string };
}

const me = 'Alex Morgan';
const history: Message[] = [
  {
    id: -3,
    author: 'Sam Rivera',
    time: at('16:20', 1),
    text: 'The pilot team in Lisbon can start on Friday. Are we ready to share the new onboarding flow?',
  },
  {
    id: -2,
    author: me,
    time: at('16:24', 1),
    text: 'Yes. Let’s finish the accessibility review first.',
  },
  {
    id: -1,
    author: me,
    time: at('16:25', 1),
    text: 'Then we share the release brief with every pilot city.',
  },
];
const initialMessages: Message[] = [
  {
    id: 1,
    author: 'Sam Rivera',
    time: ago(96),
    text: 'The mobile checkout is ready for a second look.',
  },
  {
    id: 2,
    author: 'Sam Rivera',
    time: ago(95),
    text: 'I simplified the confirmation step and removed one screen.',
    reaction: '👍 2',
  },
  {
    id: 3,
    author: me,
    time: ago(41),
    text: 'Great. Let’s check keyboard navigation before Friday’s review.',
  },
  {
    id: 4,
    author: 'Jamie Chen',
    time: ago(12),
    text: 'I added the release checklist to Files. The launch announcement is next.',
    file: { filename: 'Release checklist.csv', description: 'CSV · 1.6 KB' },
  },
];
/** Upcoming events, as offsets in hours from now. */
const events = [
  { title: 'Design review', detail: 'Mobile checkout · 30 min', hours: 3 },
  { title: 'Pilot kickoff · Lisbon', detail: 'Remote · 45 min', hours: 26 },
  { title: 'Accessibility audit', detail: 'Keyboard and screen reader pass', hours: 50 },
  { title: 'Launch go/no-go', detail: 'Whole team · 1 h', hours: 98 },
];
const presence: Record<string, { tone: string; label: string }> = {
  'Alex Morgan': { tone: 'success', label: 'Online' },
  'Sam Rivera': { tone: 'success', label: 'Available for review' },
  'Jamie Chen': { tone: 'accent', label: 'In a meeting until 11:00' },
  'Taylor Kim': { tone: 'neutral', label: 'Away · back tomorrow' },
};
const roles: Record<string, string> = {
  'Alex Morgan': 'Product lead · Owner',
  'Sam Rivera': 'Product designer · Can edit',
  'Jamie Chen': 'Content strategist · Can edit',
  'Taylor Kim': 'Engineer · Can comment',
};

/** Consecutive messages from one author form one turn. */
function turns(messages: readonly Message[]) {
  const result: Message[][] = [];
  for (const message of messages) {
    const last = result.at(-1);
    if (last && last[0]!.author === message.author) last.push(message);
    else result.push([message]);
  }
  return result;
}

function bubble(message: Message, own: boolean) {
  // Reactions overhang the bubble edge, and scroller items paint-contain their content
  // (content-visibility: auto, as upstream); a reacted bubble reserves that overhang.
  return html`<tp-bubble
    class=${message.reaction ? 'activity-reacted' : ''}
    .align=${own ? 'end' : 'start'}
    .variant=${own ? 'default' : 'secondary'}
    >${message.text}${
      message.reaction
        ? html`<tp-button
            slot="reactions"
            size="xs"
            variant="ghost"
            aria-label=${`Thumbs up reaction, ${message.reaction.split(' ')[1]}`}
            >${message.reaction}</tp-button
          >`
        : nothing
    }</tp-bubble
  >`;
}

function turn(messages: Message[]) {
  const author = messages[0]!.author;
  const own = author === me;
  return html`<tp-message-scroller-item .messageId=${String(messages[0]!.id)}
    ><tp-message-group
      >${messages.map((message, index) => {
        const last = index === messages.length - 1;
        return html`<tp-message
          .align=${own ? 'end' : 'start'}
          .author=${index === 0 ? author : ''}
          .timestamp=${index === 0 ? message.time : ''}
          aria-label=${author}
          >${
            last
              ? html`<tp-avatar
                  slot="avatar"
                  .fallback=${initials(author)}
                  .alt=${author}
                ></tp-avatar>`
              : html`<span slot="avatar" aria-hidden="true"></span>`
          }${bubble(message, own)}${
            message.file
              ? html`<tp-attachment
                  .filename=${message.file.filename}
                  .description=${message.file.description}
                  status="complete"
                  ><tp-icon slot="media" .icon=${fileTextIcon}></tp-icon
                  ><tp-button
                    slot="actions"
                    variant="ghost"
                    size="icon-sm"
                    aria-label=${`Download ${message.file.filename}`}
                    ><tp-icon slot="icon-start" .icon=${downloadIcon}></tp-icon></tp-button
                ></tp-attachment>`
              : nothing
          }</tp-message
        >`;
      })}</tp-message-group
    ></tp-message-scroller-item
  >`;
}

/** Team conversation with history and a composer, plus who is around and what is coming up. */
export function renderActivity(host: WorkspaceHost): TemplateResult {
  const messages = host.view<Message[]>('activity.messages', initialMessages);
  const loaded = host.view('activity.history', false);
  const following = host.view('activity.follow', true);
  const send = (values: Record<string, unknown>, details: { form: HTMLFormElement }) => {
    const text = String(values.message ?? '').trim();
    if (!text) return;
    host.setView('activity.messages', [
      ...messages,
      { id: Date.now(), author: me, time: new Date(), text },
    ]);
    details.form.reset();
  };
  return html`<div class="workspace-columns">
    <tp-card class="activity-conversation"
      ><h2 slot="header">Team conversation</h2>
      <p slot="description">Decisions and updates for the Atlas launch</p>
      <tp-badge slot="action" variant="secondary">${host.members.length} members</tp-badge>
      <tp-message-scroller class="activity-scroller" label="Team conversation">
        <tp-message-scroller-item message-id="history-control"
          ><div class="activity-history">
            <tp-button
              size="sm"
              variant="ghost"
              ?disabled=${loaded}
              @click=${() => {
                host.setView('activity.messages', [...history, ...messages]);
                host.setView('activity.history', true);
              }}
              >${loaded ? 'Beginning of conversation' : 'Load earlier messages'}</tp-button
            >
          </div></tp-message-scroller-item
        >
        ${repeat(
          turns(messages),
          (group) => group[0]!.id,
          (group) => turn(group),
        )}
      </tp-message-scroller>
      <tp-form slot="footer" class="workspace-grow" .onFormSubmit=${send}
        ><tp-input-group
          ><tp-text-area
            name="message"
            label="Message to the team"
            placeholder="Share an update…"
            rows="2"
          ></tp-text-area
          ><tp-button
            slot="block-end"
            variant="ghost"
            size="icon-sm"
            aria-label="Attach a file"
            @click=${() => host.go('files')}
            ><tp-icon slot="icon-start" .icon=${plusIcon}></tp-icon></tp-button
          ><tp-switch
            slot="block-end"
            size="sm"
            .checked=${following}
            @tp-value-change=${(event: TpValueChangeEvent<boolean>) =>
              host.accept(event, (value) => host.setView('activity.follow', value))}
            >Follow</tp-switch
          ><tp-button class="activity-send" slot="block-end" type="submit" size="sm"
            >Send</tp-button
          ></tp-input-group
        ></tp-form
      >
    </tp-card>
    <div class="workspace-stack">
      <tp-card
        ><h2 slot="header">Team</h2>
        <p slot="description">${host.members.length} people on this project</p>
        <div class="activity-team">
          ${host.members.map((name) => {
            const status = presence[name] ?? { tone: 'neutral', label: 'Offline' };
            return html`<tp-preview-card .label=${name} placement="block-end start"
              ><tp-button class="activity-member" slot="trigger" variant="ghost"
                ><tp-avatar slot="icon-start" .fallback=${initials(name)} .alt=${name}></tp-avatar
                >${name}</tp-button
              >
              <div class="activity-profile">
                <div class="activity-profile-heading">
                  <tp-avatar size="lg" .fallback=${initials(name)} .alt=${name}></tp-avatar>
                  <div>
                    <strong>${name}</strong>
                    <p class="workspace-muted">${roles[name] ?? 'Guest · Can view'}</p>
                  </div>
                </div>
                <tp-marker .tone=${status.tone} .label=${status.label}></tp-marker></div
            ></tp-preview-card>`;
          })}
        </div>
        <tp-button slot="footer" variant="outline" @click=${() => host.open('invite')}
          >Invite a teammate</tp-button
        ></tp-card
      >
      <tp-card
        ><h2 slot="header">This week</h2>
        <p slot="description">Reviews and milestones on the calendar</p>
        <tp-list-item-group aria-label="Upcoming events">
          ${events.map(
            (event) =>
              html`<tp-list-item size="sm" .description=${event.detail}
                >${event.title}<tp-time
                  slot="actions"
                  class="workspace-muted workspace-small"
                  mode="relative"
                  .datetime=${new Date(Date.now() + event.hours * 3_600_000)}
                ></tp-time
              ></tp-list-item>`,
          )}
        </tp-list-item-group>
      </tp-card>
    </div>
  </div>`;
}
