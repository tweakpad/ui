import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { StatusDotMotion, StatusDotVariant } from '../../../components/status-dot/index.js';
import type { TpTextArea } from '../../../components/text-area/index.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import type { EmojiPickerItem } from '../../../widgets/emoji-picker/index.js';
import { downloadIcon } from '../../../icons/download.js';
import { fileTextIcon } from '../../../icons/file-text.js';
import { plusIcon } from '../../../icons/plus.js';
import { at, type PageView, type WorkspaceHost } from '../host.js';
import { initials } from '../data.js';
import './activity.css';

/** A moment the given number of minutes before now, so relative times always read as past. */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

interface Reaction {
  emoji: string;
  /** The emoji's name, for the reaction's accessible name. */
  label: string;
  count: number;
  /** Whether the current member is one of the reactors. */
  mine: boolean;
}

interface Message {
  id: number;
  author: string;
  time: Date;
  text: string;
  /** Reaction counts shown on the bubble. */
  reactions?: readonly Reaction[];
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
    reactions: [{ emoji: '👍', label: 'Thumbs up', count: 2, mine: false }],
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
const presence: Record<
  string,
  { variant: StatusDotVariant; label: string; motion?: StatusDotMotion }
> = {
  'Alex Morgan': { variant: 'success', label: 'Online', motion: 'ping' },
  'Sam Rivera': { variant: 'success', label: 'Available for review' },
  'Jamie Chen': { variant: 'default', label: 'In a meeting until 11:00' },
  'Taylor Kim': { variant: 'secondary', label: 'Away · back tomorrow' },
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

/** A pick from an emoji picker: the emoji with the skin tone applied, and its record. */
type EmojiAction = CustomEvent<{ value: string; item: EmojiPickerItem }>;

/** What the conversation's reactions and composer may do with the page state. */
interface Conversation {
  recent: readonly string[];
  react(message: Message, emoji: string, label: string): void;
}

/** Emoji inserted since the composer's picker opened. */
const composerPicks: string[] = [];

/** Adds the current member's reaction, or takes it back when it is already theirs. */
function toggleReaction(message: Message, emoji: string, label: string): Message {
  const reactions = message.reactions ?? [];
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  const next = !existing
    ? [...reactions, { emoji, label, count: 1, mine: true }]
    : reactions
        .map((reaction) =>
          reaction !== existing
            ? reaction
            : {
                ...reaction,
                mine: !reaction.mine,
                count: reaction.count + (reaction.mine ? -1 : 1),
              },
        )
        .filter((reaction) => reaction.count > 0);
  return { ...message, reactions: next };
}

function bubble(message: Message, own: boolean, conversation: Conversation) {
  const reactions = message.reactions ?? [];
  // Reactions overhang the bubble edge, and scroller items paint-contain their content
  // (content-visibility: auto); a reacted bubble reserves that overhang.
  return html`<tp-bubble
    class=${reactions.length ? 'activity-reacted' : ''}
    .align=${own ? 'end' : 'start'}
    .variant=${own ? 'default' : 'secondary'}
    >${message.text}${reactions.map(
      (reaction) =>
        html`<tp-button
          slot="reactions"
          size="xs"
          variant="ghost"
          aria-pressed=${reaction.mine ? 'true' : 'false'}
          aria-label=${`${reaction.label} reaction, ${reaction.count}`}
          @click=${() => conversation.react(message, reaction.emoji, reaction.label)}
          >${reaction.emoji} ${reaction.count}</tp-button
        >`,
    )}</tp-bubble
  >`;
}

/** The popup picker that adds a reaction to a message; it stays empty so the trigger keeps its face. */
function reactionPicker(message: Message, conversation: Conversation) {
  return html`<tp-emoji-picker
    slot="footer"
    picker="popup"
    label=${`Add a reaction to ${message.author}’s message`}
    .value=${''}
    .recent=${conversation.recent}
    @tp-action=${(event: EmojiAction) =>
      conversation.react(message, event.detail.value, event.detail.item.label)}
  ></tp-emoji-picker>`;
}

function turn(messages: Message[], conversation: Conversation) {
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
          }${bubble(message, own, conversation)}${
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
          }${last && !own ? reactionPicker(message, conversation) : nothing}</tp-message
        >`;
      })}</tp-message-group
    ></tp-message-scroller-item
  >`;
}

/** Team conversation with history and a composer, plus who is around and what is coming up. */
export function renderActivity(host: WorkspaceHost): PageView {
  const messages = host.view<Message[]>('activity.messages', initialMessages);
  const loaded = host.view('activity.history', false);
  const following = host.view('activity.follow', true);
  const recent = host.view<readonly string[]>('activity.recent', ['👍', '🎉', '🚀', '👀']);
  /** Moves picks to the front of the Recent category every picker shows. */
  const remember = (...picks: string[]) => {
    const current = host.view<readonly string[]>('activity.recent', recent);
    const next = [...new Set([...picks.reverse(), ...current])].slice(0, 12);
    host.setView('activity.recent', next);
  };
  const conversation: Conversation = {
    recent,
    react: (message, emoji, label) => {
      host.setView(
        'activity.messages',
        host
          .view<Message[]>('activity.messages', initialMessages)
          .map((entry) => (entry.id === message.id ? toggleReaction(entry, emoji, label) : entry)),
      );
      remember(emoji);
    },
  };
  /**
   * Inserts a composer pick at the caret and keeps the popup open for further picks. The picks
   * join Recent once the popup closes, so the category never reorders under the pointer.
   */
  const insert = (event: EmojiAction) => {
    const field = (event.currentTarget as Element)
      .closest('tp-input-group')
      ?.querySelector<TpTextArea>('tp-text-area');
    if (!field) return;
    const text = String(field.value ?? '');
    const start = field.selectionStart ?? text.length;
    const end = field.selectionEnd ?? text.length;
    const emoji = event.detail.value;
    field.setValue(text.slice(0, start) + emoji + text.slice(end));
    // The caret follows the inserted emoji, so consecutive picks read in order.
    void field.updateComplete.then(() => {
      field.selectionStart = field.selectionEnd = start + emoji.length;
    });
    composerPicks.push(emoji);
  };
  const send = (values: Record<string, unknown>, details: { form: HTMLFormElement }) => {
    const text = String(values.message ?? '').trim();
    if (!text) return;
    host.setView('activity.messages', [
      ...messages,
      { id: Date.now(), author: me, time: new Date(), text },
    ]);
    details.form.reset();
  };
  const body = html`<div class="workspace-columns">
    <tp-card class="activity-conversation"
      ><h2 slot="header">#atlas-launch</h2>
      <p slot="description">The team channel</p>
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
          (group) => turn(group, conversation),
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
          ><tp-emoji-picker
            slot="block-end"
            picker="popup"
            label="Insert emoji"
            .value=${''}
            .recent=${recent}
            @tp-action=${insert}
            @tp-open-change=${(event: TpValueChangeEvent<boolean>) => {
              if (!event.detail.value && event.detail.reason === 'item-press')
                event.preventDefault();
            }}
            @tp-open-change-complete=${(event: CustomEvent<{ open: boolean }>) => {
              if (event.detail.open || !composerPicks.length) return;
              remember(...composerPicks.splice(0));
            }}
          ></tp-emoji-picker
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
            const status = presence[name] ?? { variant: 'secondary', label: 'Offline' };
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
                <tp-status-dot
                  show-label
                  .variant=${status.variant}
                  .label=${status.label}
                  .motion=${status.motion ?? 'none'}
                ></tp-status-dot></div
            ></tp-preview-card>`;
          })}
        </div></tp-card
      >
      <tp-card
        ><h2 slot="header">This week</h2>
        <p slot="description">Reviews and milestones on the calendar</p>
        <tp-list aria-label="Upcoming events">
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
        </tp-list>
      </tp-card>
    </div>
  </div>`;
  return {
    title: 'Activity',
    description: 'Decisions and updates for the Atlas launch.',
    actions: html`<tp-button variant="outline" size="sm" @click=${host.invite}>Invite</tp-button>`,
    body,
  };
}
