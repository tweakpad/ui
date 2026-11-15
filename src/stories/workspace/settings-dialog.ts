import { html, nothing } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { navigationIcons } from '../../icons/navigation.js';
import { xIcon } from '../../icons/x.js';
import {
  initials,
  memberRoles,
  notificationChannels,
  pendingInvites,
  sessions,
  settingsSections,
} from './data.js';
import type { SettingsSection, WorkspaceHost } from './host.js';
import type { TpDialog } from '../../components/dialog/index.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { gradientTrackPaint, type GradientStop } from '../../widgets/gradient-picker/index.js';

/** What the Settings dialog needs beyond the page contract; the shell implements it. */
export interface SettingsHost extends WorkspaceHost {
  readonly overlay: string;
  settingsSection: SettingsSection;
  projectName: string;
  projectSettings: { timezone: string; cadence: string; visibility: string; capacity: number };
  memberAccess: Record<string, string>;
  /** The subtree the Appearance theme applies to. */
  readonly themeTarget: HTMLElement;
}
type OpenChange = CustomEvent<{ value: boolean }>;

const closeRegistrations = new WeakMap<Element, () => void>();
/** The header close button is the Dialog's registered close action (the dialog has no footer). */
const closeAction = ref((element) => {
  if (!element || closeRegistrations.has(element)) return;
  const dialog = element.closest<TpDialog>('tp-dialog');
  if (dialog) closeRegistrations.set(element, dialog.registerCloseAction(element as HTMLElement));
});
const email = (name: string) => `${name.split(' ')[0]!.toLowerCase()}@studio.example`;
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

function heading(title: string, description: string) {
  return html`<div class="workspace-stack-sm">
    <h3>${title}</h3>
    <p class="workspace-muted">${description}</p>
  </div>`;
}

function general(host: SettingsHost) {
  const saving = host.view('settings:saving', false);
  return html`<tp-form
    class="workspace-stack"
    .onFormSubmit=${(values: Record<string, unknown>) => {
      host.setView('settings:saving', true);
      setTimeout(() => {
        host.projectName = String(values.name);
        host.projectSettings = {
          timezone: String(values.timezone),
          cadence: String(values.cadence),
          visibility: String(values.visibility),
          capacity: Number(values.capacity),
        };
        host.setView('settings:saving', false);
        host.notify('Project settings saved');
      }, 800);
    }}
  >
    <tp-field label="Project name" description="Visible to everyone in Studio North."
      ><tp-input name="name" no-autofill .defaultValue=${host.projectName} required></tp-input
    ></tp-field>
    <tp-field label="Description"
      ><tp-text-area
        name="description"
        rows="2"
        .defaultValue=${'A calmer workspace for product teams, launching to five pilot cities.'}
      ></tp-text-area
    ></tp-field>
    <tp-field label="Cover image" description="Drag and zoom to frame the project's banner."
      ><tp-image-editor
        name="cover"
        src="images/harbor.jpg"
        alt="A harbor town at dusk"
        crop="rect"
        aspect-ratio="3/1"
        fit="cover"
        controls="zoom"
        cooperative-gestures
        style="block-size: calc(var(--tp-spacing) * 56)"
      ></tp-image-editor
    ></tp-field>
    <div class="workspace-grid">
      <tp-field label="Timezone"
        ><tp-select
          name="timezone"
          label="Project timezone"
          .defaultValue=${host.projectSettings.timezone}
          .items=${[
            { value: 'lisbon', label: 'Lisbon · WET' },
            { value: 'paris', label: 'Paris · CET' },
            { value: 'new-york', label: 'New York · ET' },
          ]}
        ></tp-select></tp-field
      ><tp-field label="Review cadence"
        ><tp-select
          name="cadence"
          label="Review cadence"
          .items=${['Weekly', 'Every two weeks', 'Monthly']}
          .defaultValue=${host.projectSettings.cadence}
        ></tp-select
      ></tp-field>
    </div>
    <tp-field label="Visibility"
      ><tp-radio-group
        name="visibility"
        label="Project visibility"
        .defaultValue=${host.projectSettings.visibility}
        ><tp-radio-group-item value="team">Everyone in Studio North</tp-radio-group-item
        ><tp-radio-group-item value="private"
          >Only invited members</tp-radio-group-item
        ></tp-radio-group
      ></tp-field
    >
    <tp-field label="Weekly capacity" description="Hours the team plans for this project."
      ><tp-slider
        name="capacity"
        label="Weekly capacity"
        min="0"
        max="80"
        step="4"
        .defaultValue=${host.projectSettings.capacity}
      ></tp-slider
    ></tp-field>
    <div slot="actions">
      <tp-button type="reset" variant="outline">Reset</tp-button>
      <tp-button type="submit" .loadingPosition=${saving ? 'leading' : null} ?disabled=${saving}
        >${saving ? 'Saving…' : 'Save changes'}</tp-button
      >
    </div>
  </tp-form>`;
}

function notifications(host: SettingsHost) {
  const email = host.view('settings:email', ['mentions', 'assignments', 'reviews']);
  return html`<div class="workspace-stack-lg">
    <div class="workspace-stack">
      ${notificationChannels.map(
        ([value, label, description, checked]) =>
          html`<tp-field orientation="horizontal" .label=${label} .description=${description}
            ><tp-switch name=${value} ?default-checked=${checked}></tp-switch
          ></tp-field>`,
      )}
    </div>
    <tp-separator></tp-separator>
    <tp-field label="Also send by email"
      ><div class="workspace-stack-sm">
        ${notificationChannels
          .slice(0, 3)
          .map(
            ([value, label]) =>
              html`<tp-checkbox
                .checked=${email.includes(value)}
                @tp-value-change=${(e: TpValueChangeEvent<boolean>) =>
                  host.accept(e, (checked) =>
                    host.setView(
                      'settings:email',
                      checked ? [...email, value] : email.filter((item) => item !== value),
                    ),
                  )}
                >${label}</tp-checkbox
              >`,
          )}
      </div></tp-field
    >
    <tp-field label="Digest delivery" description="When the weekly digest arrives."
      ><tp-native-select label="Digest delivery" default-value="monday"
        ><option value="monday">Monday, 9:00</option>
        <option value="friday">Friday, 16:00</option>
        <option value="never">Never</option></tp-native-select
      ></tp-field
    >
  </div>`;
}

function members(host: SettingsHost) {
  return html`<div class="workspace-stack-lg">
    <div class="workspace-row">
      <tp-input-group class="workspace-grow"
        ><tp-icon slot="prefix" .icon=${navigationIcons.account}></tp-icon
        ><tp-input type="email" placeholder="Invite by email" aria-label="Email address"></tp-input
      ></tp-input-group>
      <tp-button @click=${() => host.open('invite')}>Invite</tp-button>
    </div>
    <tp-list aria-label="Members">
      ${host.members.map((name) => {
        const role = host.memberAccess[name] ?? 'Can edit';
        return html`<tp-list-item .description=${email(name)}
          ><tp-avatar slot="media" .fallback=${initials(name)} .alt=${name}></tp-avatar>${name}
          <div slot="actions" class="workspace-row">
            <tp-select
              class="workspace-role"
              size="sm"
              label=${`${name} role`}
              .items=${memberRoles}
              .value=${role}
              ?disabled=${role === 'Owner'}
              @tp-value-change=${(e: TpValueChangeEvent<string>) =>
                host.accept(e, (value) => {
                  host.memberAccess = { ...host.memberAccess, [name]: value };
                })}
            ></tp-select>
            <tp-menu
              label=${`${name} actions`}
              @tp-action=${() => host.notify(`${name} would be removed from Atlas launch`)}
              ><tp-button
                slot="trigger"
                variant="ghost"
                size="icon-sm"
                aria-label=${`More actions for ${name}`}
                .icon=${navigationIcons.more}
              ></tp-button
              ><tp-menu-item value="copy">Copy email</tp-menu-item
              ><tp-menu-item value="remove" variant="destructive"
                >Remove from project</tp-menu-item
              ></tp-menu
            >
          </div></tp-list-item
        >`;
      })}
    </tp-list>
    <div class="workspace-stack">
      <h4>Pending invitations</h4>
      ${pendingInvites.map(
        (invite) =>
          html`<tp-list-item
            ><tp-avatar slot="media" .fallback=${invite.email[0]!.toUpperCase()}></tp-avatar
            >${invite.email}<span slot="description"
              >${invite.role} · sent
              <tp-time mode="relative" .datetime=${ago(invite.days * 24 * 60)}></tp-time
            ></span>
            <div slot="actions" class="workspace-row">
              <tp-badge variant="outline">Pending</tp-badge
              ><tp-button
                variant="ghost"
                size="sm"
                @click=${() => host.notify(`Invitation resent to ${invite.email}`)}
                >Resend</tp-button
              >
            </div></tp-list-item
          >`,
      )}
    </div>
  </div>`;
}

/** The workspace look the Appearance section edits, applied to the theme target. */
interface Look {
  density: string;
  appearance: string;
  reduceMotion: boolean;
  accent: string;
  easing: string;
}
const defaultLook: Look = {
  density: 'comfortable',
  appearance: 'default',
  reduceMotion: false,
  accent: '',
  easing: '',
};
/**
 * The roles the theme derives from other roles, read from the page's stylesheets: a role is
 * computed where it is declared, so an accent set on the workspace re-tints its tints, rings and
 * choices only when they are declared there too. Density roles are left to their seeds; flat
 * roles are restated only outside a flat region, where the `appearance` rule must keep winning.
 */
function themeDeclarations() {
  const derived = new Map<string, string>();
  const authored = new Map<string, string>();
  const flat = new Set<string>();
  const density = new Set<string>();
  const visit = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        const names = [...rule.style].filter((name) => /^--_?tp-/u.test(name));
        if (rule.selectorText === ':root')
          for (const name of names) {
            const value = rule.style.getPropertyValue(name).trim();
            if (!authored.has(name)) authored.set(name, value);
            if (/var\(--_?tp-/u.test(value) && !derived.has(name)) derived.set(name, value);
          }
        else if (/\[appearance=['"]?flat/u.test(rule.selectorText))
          for (const name of names) flat.add(name);
        else if (rule.selectorText.includes('[density'))
          for (const name of names) density.add(name);
      }
      if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules);
    } catch {
      // A cross-origin sheet cannot be read; it declares no library roles.
    }
  }
  // Only color roles follow an accent: a size or font restated here would stop following the
  // density of a nested region. A role is a color when its value mixes or switches colors, or
  // is an alias of another color role.
  const color = new Map<string, boolean>();
  const isColor = (name: string, seen = new Set<string>()): boolean => {
    if (color.has(name)) return color.get(name)!;
    const value = authored.get(name);
    let result = false;
    if (value !== undefined && !seen.has(name)) {
      seen.add(name);
      const alias = /^var\((--_?tp-[\w-]+)\)$/u.exec(value);
      result =
        /color-mix\(|light-dark\(|^#|^(?:rgb|hsl|oklch|oklab)\(/u.test(value) ||
        (!!alias && isColor(alias[1]!, seen));
    }
    color.set(name, result);
    return result;
  };
  return {
    derived: [...derived].filter(([name]) => !density.has(name) && isColor(name)),
    flat,
  };
}
let declarations: ReturnType<typeof themeDeclarations> | undefined;
function applyLook(target: HTMLElement, look: Look) {
  const toggle = (name: string, value: string | null) =>
    value === null ? target.removeAttribute(name) : target.setAttribute(name, value);
  toggle('density', look.density === 'compact' ? 'compact' : null);
  toggle('appearance', look.appearance === 'flat' ? 'flat' : null);
  toggle('motion-policy', look.reduceMotion ? 'reduce' : null);
  declarations ??= themeDeclarations();
  for (const [name] of declarations.derived) target.style.removeProperty(name);
  target.style.removeProperty('--tp-primary');
  if (look.accent) {
    target.style.setProperty('--tp-primary', look.accent);
    for (const [name, value] of declarations.derived)
      if (!(look.appearance === 'flat' && declarations.flat.has(name)))
        target.style.setProperty(name, value);
  }
  if (look.easing) target.style.setProperty('--tp-easing-standard', look.easing);
  else target.style.removeProperty('--tp-easing-standard');
}

function appearance(host: SettingsHost) {
  const look = host.view<Look>('settings:look', defaultLook);
  const update = (change: Partial<Look>) => {
    const next = { ...look, ...change };
    host.setView('settings:look', next);
    applyLook(host.themeTarget, next);
  };
  const cover = host.view<string>('settings:cover', '');
  return html`<div class="workspace-stack-lg">
    <tp-field label="Theme" description="System follows your device setting.">
      <tp-theme-switcher
        variant="group"
        label="Theme"
        storage-key="tp-workspace-theme"
        .target=${host.themeTarget}
      ></tp-theme-switcher>
    </tp-field>
    <tp-field label="Density"
      ><tp-radio-group
        label="Density"
        default-value=${look.density}
        @tp-value-change=${(event: TpValueChangeEvent<string>) =>
          update({ density: event.detail.value })}
        ><tp-radio-group-item value="comfortable">Comfortable</tp-radio-group-item
        ><tp-radio-group-item value="compact">Compact</tp-radio-group-item></tp-radio-group
      ></tp-field
    >
    <tp-field
      label="Surfaces"
      description="Flat separates panels and fields by fill instead of lines."
      ><tp-radio-group
        label="Surfaces"
        default-value=${look.appearance}
        @tp-value-change=${(event: TpValueChangeEvent<string>) =>
          update({ appearance: event.detail.value })}
        ><tp-radio-group-item value="default">Bordered</tp-radio-group-item
        ><tp-radio-group-item value="flat">Flat</tp-radio-group-item></tp-radio-group
      ></tp-field
    >
    <tp-field label="Accent color" description="Used for primary actions and selected states.">
      <tp-color-picker
        picker="popup"
        name="accent"
        default-value=${look.accent || '#6d5dfc'}
        @tp-value-commit=${(event: CustomEvent<{ value: string }>) =>
          update({ accent: event.detail.value })}
      ></tp-color-picker>
    </tp-field>
    <tp-collapsible>
      <tp-button slot="trigger" variant="ghost" size="sm">Choose from swatches</tp-button>
      <tp-color-palette
        label="Accent swatches"
        default-layout="grid"
        @tp-value-commit=${(event: CustomEvent<{ value: string }>) =>
          update({ accent: event.detail.value })}
      ></tp-color-palette>
    </tp-collapsible>
    <tp-field label="Cover" description="The gradient behind the project header.">
      <div class="workspace-stack">
        <span
          class="settings-cover"
          role="img"
          aria-label="Cover preview"
          style=${cover ? `background: ${cover}` : ''}
        ></span>
        <tp-gradient-picker
          label="Cover"
          name="cover"
          default-selected="0"
          @tp-value-commit=${(event: CustomEvent<{ value: readonly GradientStop[] }>) =>
            host.setView('settings:cover', gradientTrackPaint(event.detail.value))}
        >
          <tp-gradient-stop position="0" color="#6d5dfc"></tp-gradient-stop>
          <tp-gradient-stop position="1" color="#0ea5e9"></tp-gradient-stop>
        </tp-gradient-picker>
      </div>
    </tp-field>
    <tp-field
      orientation="horizontal"
      label="Reduce motion"
      description="Replace animated transitions with instant changes."
      ><tp-switch
        ?default-checked=${look.reduceMotion}
        @tp-value-change=${(event: TpValueChangeEvent<boolean>) =>
          update({ reduceMotion: event.detail.value })}
      ></tp-switch
    ></tp-field>
    <tp-field label="Transitions" description="The curve panels and menus move along.">
      <tp-easing-editor
        label="Transitions"
        name="easing"
        default-value="ease-out"
        @tp-value-commit=${(event: CustomEvent<{ value: string }>) =>
          update({ easing: event.detail.value })}
      ></tp-easing-editor>
    </tp-field>
    <div class="workspace-row">
      <tp-button
        variant="outline"
        size="sm"
        @click=${() => {
          host.setView('settings:look', defaultLook);
          host.setView('settings:cover', '');
          applyLook(host.themeTarget, defaultLook);
          host.notify('Appearance reset');
        }}
        >Reset appearance</tp-button
      >
    </div>
  </div>`;
}

/** The authenticator enrolment link the setup QR code carries. */
const enrolment = 'otpauth://totp/Atlas:alex%40studio.example?secret=JBSWY3DPEHPK3PXP&issuer=Atlas';

function security(host: SettingsHost) {
  const code = host.view<string>('settings:code', '');
  const error = host.view<string>('settings:codeError', '');
  const verified = host.view('settings:verified', false);
  const revoked = host.view<readonly string[]>('settings:revoked', []);
  const verify = () => {
    if (code.length !== 6) host.setView('settings:codeError', 'Enter all six digits.');
    else if (code !== '246810')
      host.setView('settings:codeError', 'That code does not match. Try the newest one.');
    else {
      host.setView('settings:codeError', '');
      host.setView('settings:verified', true);
      host.notify('Two-step verification enabled', { type: 'success' });
    }
  };
  return html`<div class="workspace-stack-lg">
    <div class="workspace-stack">
      <div class="workspace-settings-row">
        <div class="workspace-stack-sm">
          <h4>Two-step verification</h4>
          <span class="workspace-muted"
            >Ask for a code from your authenticator app when you sign in.</span
          >
        </div>
        ${
          verified
            ? html`<tp-marker tone="success" label="Enabled"></tp-marker>`
            : html`<tp-badge variant="outline">Not set up</tp-badge>`
        }
      </div>
      ${
        verified
          ? nothing
          : html`<tp-card size="sm">
              <div class="workspace-settings-enrol">
                <tp-qr-code
                  class="workspace-settings-qr"
                  value=${enrolment}
                  label="Authenticator setup code for Atlas"
                ></tp-qr-code>
                <div class="workspace-stack">
                  <ol class="workspace-settings-steps workspace-muted">
                    <li>Scan the code with your authenticator app.</li>
                    <li>Enter the six digits it shows. In this demo, use 246810.</li>
                  </ol>
                  <tp-field label="Authenticator code" .error=${error}
                    ><tp-one-time-code-field
                      length="6"
                      .value=${code}
                      @tp-value-change=${(e: TpValueChangeEvent<string>) =>
                        host.accept(e, (value) => {
                          host.setView('settings:code', value);
                          if (error) host.setView('settings:codeError', '');
                        })}
                    ></tp-one-time-code-field
                  ></tp-field>
                </div>
              </div>
              <div slot="footer" class="workspace-settings-footer">
                <tp-button size="sm" @click=${verify}>Verify and enable</tp-button>
              </div>
            </tp-card>`
      }
    </div>
    <tp-separator></tp-separator>
    <div class="workspace-stack">
      <h4>Active sessions</h4>
      <tp-list aria-label="Active sessions">
        ${sessions
          .filter((session) => !revoked.includes(session.id))
          .map(
            (session) =>
              html`<tp-list-item media-treatment="icon"
                ><tp-icon slot="media" .icon=${navigationIcons.terminal}></tp-icon
                >${session.device}<span slot="description"
                  >${session.place} ·
                  ${
                    session.current
                      ? 'Active now'
                      : html`<tp-time mode="relative" .datetime=${ago(session.minutes)}></tp-time>`
                  }</span
                >${
                  session.current
                    ? html`<tp-badge slot="actions" variant="secondary">This device</tp-badge>`
                    : html`<tp-button
                        slot="actions"
                        variant="outline"
                        size="sm"
                        @click=${() => {
                          host.setView('settings:revoked', [...revoked, session.id]);
                          host.notify(`Signed out of ${session.device}`);
                        }}
                        >Revoke</tp-button
                      >`
                }</tp-list-item
              >`,
          )}
      </tp-list>
    </div>
  </div>`;
}

const shortcut = (...keys: string[]) =>
  html`<tp-kbd-group separator="none" platform="mac"
    >${keys.map((key) => html`<tp-kbd value=${key}></tp-kbd>`)}</tp-kbd-group
  >`;
function shortcuts() {
  const groups = [
    [
      'navigation',
      'Navigation',
      [
        ['Search the workspace', ['command', 'K']],
        ['Toggle the sidebar', ['command', 'B']],
      ],
    ],
    [
      'tasks',
      'Tasks',
      [
        ['Create a task', ['C']],
        ['Mark selected tasks done', ['command', 'enter']],
      ],
    ],
    [
      'editing',
      'Brief editing',
      [
        ['Bold preview', ['command', 'B']],
        ['Italic preview', ['command', 'I']],
      ],
    ],
  ] as const;
  return html`<tp-accordion variant="outline" .defaultValue=${['navigation']}
    >${groups.map(
      ([value, label, rows]) =>
        html`<tp-accordion-item value=${value}
          ><span slot="label">${label}</span>
          <div class="workspace-stack">
            ${rows.map(
              ([action, keys]) =>
                html`<div class="workspace-row workspace-between">
                  <span>${action}</span>${shortcut(...keys)}
                </div>`,
            )}
          </div></tp-accordion-item
        >`,
    )}</tp-accordion
  >`;
}

function danger(host: SettingsHost) {
  const confirm = host.view<'' | 'archive' | 'delete'>('settings:confirm', '');
  const row = (title: string, description: string, action: unknown) =>
    html`<div class="workspace-row workspace-between workspace-danger-row">
      <div class="workspace-stack-sm">
        <strong>${title}</strong><span class="workspace-muted">${description}</span>
      </div>
      ${action}
    </div>`;
  return html`<div class="workspace-stack">
    ${row(
      'Archive project',
      'Hide Atlas launch from the sidebar. You can restore it later.',
      html`<tp-button variant="outline" @click=${() => host.setView('settings:confirm', 'archive')}
        >Archive</tp-button
      >`,
    )}
    ${row(
      'Delete project',
      'Permanently delete tasks, files and conversations.',
      html`<tp-button
        variant="destructive"
        @click=${() => host.setView('settings:confirm', 'delete')}
        >Delete project</tp-button
      >`,
    )}
    <tp-alert-dialog
      label=${confirm === 'delete' ? 'Delete Atlas launch?' : 'Archive Atlas launch?'}
      description=${
        confirm === 'delete'
          ? 'This permanently deletes 12 tasks, 6 files and every conversation. This cannot be undone.'
          : 'Members keep read-only access until you restore the project.'
      }
      .open=${confirm !== ''}
      @tp-open-change=${(e: OpenChange) => {
        if (e.target !== e.currentTarget || e.defaultPrevented) return;
        if (!e.detail.value) host.setView('settings:confirm', '');
      }}
      ><tp-button
        slot="cancel"
        variant="outline"
        @click=${() => host.setView('settings:confirm', '')}
        >Cancel</tp-button
      ><tp-button
        slot="confirm"
        variant=${confirm === 'delete' ? 'destructive' : 'default'}
        @click=${() => {
          host.setView('settings:confirm', '');
          host.notify(
            confirm === 'delete'
              ? 'Demo only: the project was not deleted'
              : 'Demo only: the project was not archived',
          );
        }}
        >${confirm === 'delete' ? 'Delete project' : 'Archive project'}</tp-button
      ></tp-alert-dialog
    >
  </div>`;
}

const sectionContent: Record<SettingsSection, (host: SettingsHost) => unknown> = {
  general,
  notifications,
  members,
  appearance,
  security,
  shortcuts,
  danger,
};

/** Settings in a Dialog with its own navigation. */
export function renderSettingsDialog(host: SettingsHost) {
  const current = settingsSections.find(([id]) => id === host.settingsSection)!;
  const select = (section: SettingsSection) => (event: Event) => {
    event.preventDefault();
    host.settingsSection = section;
  };
  return html`<tp-dialog
    class="workspace-settings"
    label="Settings"
    description="Customize Atlas launch and your account."
    .showHeader=${false}
    .showCloseControl=${false}
    .partPresentation=${{
      'dialog-content': {
        styleHook: {
          // Flush content at most 800px wide and 500px tall, with clipped edges.
          '--tp-dialog-spacing': '0',
          'inline-size': 'min(calc(var(--tp-space-16) * 12.5), calc(100% - var(--tp-space-8)))',
          overflow: 'hidden',
        },
      },
    }}
    .open=${host.overlay === 'settings'}
    @tp-open-change=${(e: OpenChange) => {
      if (e.target !== e.currentTarget || e.defaultPrevented) return;
      (e.target as HTMLElement & { open: boolean }).open = e.detail.value;
      host.open(e.detail.value ? 'settings' : '');
    }}
  >
    <div class="workspace-settings-layout" ?data-compact=${host.mobile}>
      ${
        host.mobile
          ? nothing
          : html`<tp-navigation-panel
              class="workspace-settings-nav"
              label="Settings sections"
              collapse-mode="none"
              .compact=${false}
              ><tp-navigation-panel-content
                ><tp-navigation-panel-group
                  ><tp-navigation-panel-menu
                    >${settingsSections.map(
                      ([id, label, icon]) =>
                        html`<tp-navigation-panel-item
                          ><tp-navigation-panel-link
                            href=${`#settings-${id}`}
                            .icon=${icon}
                            .active=${host.settingsSection === id}
                            @click=${select(id)}
                            >${label}</tp-navigation-panel-link
                          ></tp-navigation-panel-item
                        >`,
                    )}</tp-navigation-panel-menu
                  ></tp-navigation-panel-group
                ></tp-navigation-panel-content
              ></tp-navigation-panel
            >`
      }
      <main class="workspace-settings-main">
        <header class="workspace-row workspace-between workspace-settings-header">
          ${
            host.mobile
              ? html`<tp-select
                  class="workspace-grow"
                  label="Settings section"
                  .items=${settingsSections.map(([value, label]) => ({ value, label }))}
                  .value=${host.settingsSection}
                  @tp-value-change=${(e: TpValueChangeEvent<string>) =>
                    host.accept(e, (value) => {
                      host.settingsSection = value as SettingsSection;
                    })}
                ></tp-select>`
              : html`<tp-breadcrumb label="Settings location"
                  ><a href="#settings-general" @click=${select('general')}>Settings</a
                  ><span>${current[1]}</span></tp-breadcrumb
                >`
          }
          <tp-button
            ${closeAction}
            variant="ghost"
            size="icon-sm"
            aria-label="Close settings"
            .icon=${xIcon}
          ></tp-button>
        </header>
        <tp-scroll-area
          class="workspace-settings-scroll"
          scrollbar-visibility="scroll"
          label=${`${current[1]} settings`}
        >
          <div class="workspace-settings-body">
            ${heading(current[1], current[3])} ${sectionContent[host.settingsSection](host)}
          </div>
        </tp-scroll-area>
      </main>
    </div>
  </tp-dialog>`;
}
