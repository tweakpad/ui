import { html, nothing, type TemplateResult } from 'lit';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { boldIcon, italicIcon } from '../../../icons/text-formatting.js';
import { downloadIcon } from '../../../icons/download.js';
import { icon, type WorkspaceHost } from '../host.js';
import './brief.css';

type MenuAction = CustomEvent<{ value: string }>;
type Font = 'sans' | 'mono';

const initialBrief =
  'A calmer workspace for teams.\n\nWe are bringing planning, files and conversations into one place. The launch should make the first ten minutes feel effortless.\n\nWhat success looks like\n• New teammates can find their first task without help.\n• Every important action works with a keyboard.\n• The mobile experience feels as considered as desktop.\n\nRelease plan\nReview the onboarding journey, close the accessibility audit, then invite our pilot teams.';
const outline = 'New release brief\n\nDescribe the problem, audience and success measures.';

/** A Mac shortcut hint rendered in a menu item's Shortcut position. */
const shortcut = (...keys: string[]) =>
  html`<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"
    >${keys.map((key) => html`<tp-key-hint key=${key}></tp-key-hint>`)}</tp-key-hint-group
  >`;

function download(host: WorkspaceHost, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const anchor = host.ownerDocument.createElement('a');
  anchor.href = url;
  anchor.download = 'Launch brief.md';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Release brief editor: Menubar commands, formatting Toggles and a resizable live preview. */
export function renderBrief(host: WorkspaceHost): TemplateResult {
  const text = host.view('brief.text', initialBrief);
  const bold = host.view('brief.bold', false);
  const italic = host.view('brief.italic', false);
  const alignment = host.view('brief.alignment', 'start');
  const preview = host.view('brief.preview', true);
  const counting = host.view('brief.wordCount', true);
  const font = host.view<Font>('brief.font', 'sans');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  // The page decides what a section is: a block whose short first line is followed by more lines
  // is a titled section; the opening block is the overview. Other blocks belong to the section
  // before them. The table of contents only follows the targets it is given.
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((body, index) => {
      const [first = '', ...rest] = body.split('\n');
      const title = index === 0 ? 'Overview' : rest.length && first.length <= 48 ? first : null;
      return { id: `workspace-brief-section-${index + 1}`, title, body };
    });
  const sections = blocks.filter(
    (block): block is typeof block & { title: string } => block.title !== null,
  );
  const command = (event: MenuAction) => {
    const value = event.detail.value;
    if (value === 'download') download(host, text);
    else if (value === 'reset') {
      host.setView('brief.text', outline);
      host.notify('Brief reset to a new outline');
    } else if (value === 'invite') host.open('invite');
    else if (value === 'discuss') host.go('activity');
    else if (value === 'discovery') host.open('discovery');
    else if (value === 'settings') host.openSettings('general');
  };
  const own =
    <T>(apply: (value: T) => void) =>
    (event: TpValueChangeEvent<T>) => {
      if (event.target === event.currentTarget) host.accept(event, apply);
    };
  return html`<div class="workspace-stack">
    <div class="workspace-row workspace-between">
      <tp-menubar aria-label="Brief actions" @tp-action=${command}>
        <tp-menu value="file" label="File"
          ><tp-button slot="trigger" variant="ghost">File</tp-button
          ><tp-menu-item value="download"
            ><tp-icon .icon=${downloadIcon}></tp-icon>Download
            Markdown${shortcut('command', 'S')}</tp-menu-item
          ><tp-separator></tp-separator
          ><tp-menu label="Share brief"
            ><tp-button slot="trigger" variant="ghost">${icon('share')}Share</tp-button
            ><tp-menu-item value="invite">${icon('account')}Invite teammate</tp-menu-item
            ><tp-menu-item value="discuss">${icon('bell')}Discuss with team</tp-menu-item></tp-menu
          ><tp-separator></tp-separator
          ><tp-menu-item value="reset" variant="destructive"
            >${icon('trash')}Reset to outline</tp-menu-item
          ></tp-menu
        >
        <tp-menu value="view" label="View"
          ><tp-button slot="trigger" variant="ghost">View</tp-button
          ><tp-menu-checkbox-item
            .checked=${preview}
            @tp-value-change=${own<boolean>((value) => host.setView('brief.preview', value))}
            >Show preview${shortcut('command', 'P')}</tp-menu-checkbox-item
          ><tp-menu-checkbox-item
            .checked=${counting}
            @tp-value-change=${own<boolean>((value) => host.setView('brief.wordCount', value))}
            >Word count</tp-menu-checkbox-item
          ><tp-separator></tp-separator>
          <div role="group" aria-label="Preview font">
            <span data-menu-label>Preview font</span
            ><tp-menu-radio-group
              aria-label="Preview font"
              .value=${font}
              @tp-value-change=${own<Font>((value) => host.setView('brief.font', value))}
              ><tp-menu-radio-item value="sans">Sans</tp-menu-radio-item
              ><tp-menu-radio-item value="mono">Mono</tp-menu-radio-item></tp-menu-radio-group
            >
          </div></tp-menu
        >
        <tp-menu value="project" label="Project"
          ><tp-button slot="trigger" variant="ghost">Project</tp-button
          ><tp-menu-item value="discovery">${icon('sparkle')}Define release goals</tp-menu-item
          ><tp-menu-item value="settings"
            >${icon('settings')}Project settings${shortcut('command', ',')}</tp-menu-item
          ></tp-menu
        >
      </tp-menubar>
      <div class="workspace-row">
        <tp-toggle
          aria-label="Bold preview"
          .pressed=${bold}
          @tp-value-change=${own<boolean>((value) => host.setView('brief.bold', value))}
          ><tp-icon .icon=${boldIcon}></tp-icon
        ></tp-toggle>
        <tp-toggle
          aria-label="Italic preview"
          .pressed=${italic}
          @tp-value-change=${own<boolean>((value) => host.setView('brief.italic', value))}
          ><tp-icon .icon=${italicIcon}></tp-icon
        ></tp-toggle>
        <tp-separator orientation="vertical"></tp-separator>
        <tp-toggle-group
          label="Preview alignment"
          .value=${[alignment]}
          @tp-value-change=${own<string[]>((value) =>
            host.setView('brief.alignment', value[0] ?? 'start'),
          )}
          ><tp-toggle value="start">Start</tp-toggle><tp-toggle value="center">Center</tp-toggle
          ><tp-toggle value="end">End</tp-toggle></tp-toggle-group
        >
      </div>
    </div>
    <tp-resizable-panel-group
      class="brief-editor"
      .orientation=${host.mobile ? 'vertical' : 'horizontal'}
    >
      <tp-resizable-panel default-size="50%" min-size="25%"
        ><div class="brief-pane">
          <div class="brief-pane-heading workspace-row workspace-between">
            <tp-label for="workspace-brief-input">Release brief</tp-label>
            ${
              counting
                ? html`<span class="workspace-muted workspace-small" role="status"
                    >${words} words</span
                  >`
                : nothing
            }
          </div>
          <tp-text-area
            id="workspace-brief-input"
            label="Release brief"
            resize="none"
            .value=${text}
            @tp-value-change=${own<string>((value) => host.setView('brief.text', value))}
          ></tp-text-area></div
      ></tp-resizable-panel>
      ${
        preview
          ? html`<tp-resizable-handle
                label="Resize editor and preview"
                with-handle
              ></tp-resizable-handle>
              <tp-resizable-panel min-size="25%"
                ><div class="brief-pane">
                  <div class="brief-pane-heading workspace-row workspace-between">
                    <strong>Preview</strong><tp-badge variant="outline">Live</tp-badge>
                  </div>
                  <tp-scroll-area class="brief-scroll" aria-label="Brief preview"
                    ><div class="brief-preview-layout">
                      <article
                        class="brief-preview"
                        ?data-bold=${bold}
                        ?data-italic=${italic}
                        data-align=${alignment}
                        data-font=${font}
                      >
                        ${blocks.map(
                          (section) =>
                            html`<section id=${section.id} class="brief-section">
                              ${section.body.split('\n').map((line) => html`<p>${line}</p>`)}
                            </section>`,
                        )}
                      </article>
                      ${
                        host.mobile || sections.length < 2
                          ? nothing
                          : html`<aside class="brief-toc">
                              <tp-table-of-contents label="Sections" navigation="scroll">
                                ${sections.map(
                                  (section) =>
                                    html`<tp-table-of-contents-item href=${`#${section.id}`}
                                      >${section.title}</tp-table-of-contents-item
                                    >`,
                                )}
                              </tp-table-of-contents>
                            </aside>`
                      }
                    </div></tp-scroll-area
                  >
                </div></tp-resizable-panel
              >`
          : nothing
      }
    </tp-resizable-panel-group>
    <p class="workspace-muted workspace-small">
      Edits stay in this preview session. Download a copy from File.
    </p>
    <tp-collapsible
      ><span slot="label">Release criteria</span>
      <ul class="brief-criteria workspace-muted">
        <li>Every flow supports keyboard navigation.</li>
        <li>All launch copy is approved by marketing and legal.</li>
        <li>The pilot teams in every launch city have access.</li>
      </ul></tp-collapsible
    >
  </div>`;
}
