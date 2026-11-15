import { html, nothing } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { downloadBlob } from '../../../foundation/download.js';
import { downloadIcon } from '../../../icons/download.js';
import { fileTextIcon } from '../../../icons/file-text.js';
import { navigationIcons } from '../../../icons/navigation.js';
import type {
  MarkdownHeadingTarget,
  MarkdownRenderDetail,
} from '../../../components/markdown/index.js';
import type { TpTextEditor } from '../../../widgets/text-editor/index.js';
import * as core from '@tiptap/core';
import * as state from '@tiptap/pm/state';
import * as history from '@tiptap/pm/history';
import * as starterKit from '@tiptap/starter-kit';
import * as list from '@tiptap/extension-list';
import * as table from '@tiptap/extension-table';
import * as tables from '@tiptap/pm/tables';
import { createTiptapEngine } from '../../../foundation/text-editor/adapters/tiptap/index.js';

/** A new editing engine from the installed engine modules; every editor needs its own. */
const createEngine = () =>
  createTiptapEngine({ core, state, history, starterKit, list, table, tables });
import { icon, type PageView, type WorkspaceHost } from '../host.js';
import './brief.css';

type MenuAction = CustomEvent<{ value: string }>;
type Font = 'sans' | 'mono';

const initialBrief = [
  '# A calmer workspace for teams',
  '',
  'We are bringing planning, files and conversations into one place. The pilot should make the **first ten minutes** feel effortless, for the person who sets up a team and for everyone they invite.',
  '',
  '## Problem',
  '',
  'Teams in the pilot cities juggle four tools before they ship anything. Plans live in spreadsheets, files in shared drives and decisions in chat threads nobody can find a week later.',
  '',
  '### What we heard',
  '',
  '- Leads rebuild the same status report every Friday.',
  '- New members ask where the latest file is in their first week.',
  '- Decisions made in chat never reach the plan.',
  '',
  '## Audience',
  '',
  'Team leads of five to twenty people at our pilot partners, and the members they invite. Leads choose the tool; members decide whether it sticks.',
  '',
  '## Goals',
  '',
  '1. A new member finds their first task without help.',
  '2. Every important action works with a keyboard.',
  '3. The mobile experience feels as considered as desktop.',
  '',
  '### Out of scope',
  '',
  'Time tracking, invoicing and guest portals stay out of the pilot. We revisit them with the general release.',
  '',
  '## Experience',
  '',
  '### First ten minutes',
  '',
  'A lead imports a plan, invites the team and sees a board that already reflects the work. Every empty state offers one clear next step.',
  '',
  '### Every day after',
  '',
  'Updates arrive where the work is. A task shows its files, its conversation and its history on one page, and nothing needs a second tool.',
  '',
  '## Success measures',
  '',
  '| Measure | Today | Pilot target |',
  '| :--- | ---: | ---: |',
  '| Invite to first finished task | 3 days | 1 day |',
  '| Weekly active members | 54% | 75% |',
  '| Status reports rebuilt by hand | 4 a month | 0 |',
  '',
  '## Release plan',
  '',
  'Review the onboarding journey, close the accessibility audit, then invite the pilot teams city by city, starting with Lisbon and Madrid.',
  '',
  '### Release criteria',
  '',
  '- Every flow supports keyboard navigation.',
  '- All launch copy is approved by marketing and legal.',
  '- The pilot teams in every launch city have access.',
  '',
  '## Risks',
  '',
  '> Partners may keep their old tools in parallel. We pair each lead with a launch contact for the first two weeks and measure the switch, not the sign-up.',
  '',
  '## Open questions',
  '',
  '- Do leads want the weekly report sent, or only available?',
  '- Which integrations block a partner from switching?',
  '',
].join('\n');
const outline = '# New release brief\n\nDescribe the problem, audience and success measures.\n';

/** Where the brief's claims come from; each chip previews its source. */
const sources = [
  {
    label: 'Pilot interviews',
    href: 'https://research.atlas.example/pilot-interviews',
    title: 'Pilot interviews · round two',
    description:
      'Twelve sessions with team leads in Lisbon, Oslo and Toronto about their first week.',
    mark: fileTextIcon,
  },
  {
    label: 'Onboarding funnel',
    href: 'https://metrics.atlas.example/onboarding',
    title: 'Onboarding funnel, last 30 days',
    description: 'Where new members stop between the invite email and their first finished task.',
    mark: navigationIcons.chart,
  },
  {
    label: 'Accessibility audit',
    href: 'https://research.atlas.example/accessibility-audit',
    title: 'Accessibility audit · keyboard and screen readers',
    description: 'Open findings from the October review, grouped by flow and severity.',
    mark: fileTextIcon,
  },
] as const;

/** Headings of the rendered preview that a Table of contents follows. */
type Outline = readonly MarkdownHeadingTarget[];
const sameOutline = (a: Outline, b: Outline) =>
  a.length === b.length &&
  a.every(
    (heading, index) =>
      heading.element === b[index]!.element &&
      heading.label === b[index]!.label &&
      heading.depth === b[index]!.depth,
  );

/** The editor's engine is installed once per mounted editor; it is released when it disconnects. */
function mountEditor(host: WorkspaceHost, element: Element | undefined) {
  const editor = element as TpTextEditor | undefined;
  if (!editor || editor.engine) return;
  editor.defaultValue = host.view('brief.text', initialBrief);
  editor.layout = {
    toolbar: [
      ['undo', 'redo'],
      ['block-type', 'list-type', 'blockquote'],
      ['bold', 'italic', 'strike', 'code'],
    ],
    selectionToolbar: [],
    blockMenu: [],
    suggestions: [],
    gutter: false,
  };
  editor.engine = createEngine();
}

/** A Mac shortcut hint rendered in a menu item's Shortcut position. */
const shortcut = (...keys: string[]) =>
  html`<tp-kbd-group data-menu-shortcut separator="none" platform="mac"
    >${keys.map((key) => html`<tp-kbd value=${key}></tp-kbd>`)}</tp-kbd-group
  >`;

function download(host: WorkspaceHost, text: string) {
  downloadBlob(host.ownerDocument, new Blob([text], { type: 'text/markdown' }), 'Launch brief.md');
}

/** The release brief: an editor and its live preview side by side, with the document's menus. */
export function renderBrief(host: WorkspaceHost): PageView {
  const text = host.view('brief.text', initialBrief);
  const preview = host.view('brief.preview', true);
  const counting = host.view('brief.wordCount', true);
  const font = host.view<Font>('brief.font', 'sans');
  const headings = host.view<Outline>('brief.outline', []);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const top = Math.min(...headings.map((heading) => heading.depth));
  const editor = () => host.querySelector<TpTextEditor>('#workspace-brief-editor');
  const command = (event: MenuAction) => {
    const value = event.detail.value;
    if (value === 'download') download(host, text);
    else if (value === 'reset') {
      host.setView('brief.text', outline);
      void editor()?.setContent(outline, 'markdown');
      host.notify('Brief reset to a new outline');
    } else if (value === 'invite') host.open('invite');
    else if (value === 'discuss') host.go('activity');
  };
  const own =
    <T>(apply: (value: T) => void) =>
    (event: TpValueChangeEvent<T>) => {
      if (event.target === event.currentTarget) host.accept(event, apply);
    };
  const menus = html`<tp-menubar aria-label="Brief actions" @tp-action=${command}>
    <tp-menu value="file" label="File"
      ><tp-button slot="trigger" variant="ghost" size="sm">File</tp-button
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
      ><tp-button slot="trigger" variant="ghost" size="sm">View</tp-button
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
          label="Preview font"
          .value=${font}
          @tp-value-change=${own<Font>((value) => host.setView('brief.font', value))}
          ><tp-menu-radio-item value="sans">Sans</tp-menu-radio-item
          ><tp-menu-radio-item value="mono">Mono</tp-menu-radio-item></tp-menu-radio-group
        >
      </div></tp-menu
    >
  </tp-menubar>`;
  const description = html`Grounded in the
  ${sources.map(
    (source, index) =>
      html`${index === 0 ? '' : index === sources.length - 1 ? ' and ' : ', '}<tp-citation
          href=${source.href}
          source-title=${source.title}
          description=${source.description}
          ><tp-icon slot="icon" .icon=${source.mark}></tp-icon>${source.label}</tp-citation
        >`,
  )}.`;
  const body = html`<tp-resizable-panel-group
    class="brief-editor"
    .orientation=${host.mobile ? 'vertical' : 'horizontal'}
  >
    <tp-resizable-panel default-size="50%" min-size="25%"
      ><div class="brief-pane">
        <div class="brief-pane-heading workspace-row workspace-between">
          <tp-label for="workspace-brief-editor">Draft</tp-label>
          ${
            counting
              ? html`<span class="workspace-muted workspace-small" role="status"
                  >${words} words</span
                >`
              : nothing
          }
        </div>
        <tp-text-editor
          id="workspace-brief-editor"
          label="Release brief"
          format="markdown"
          placeholder="Describe the problem, audience and success measures"
          ${ref((element) => mountEditor(host, element))}
          @tp-value-change=${(event: Event) => {
            const target = event.currentTarget as TpTextEditor;
            if (event.target !== target) return;
            host.setView('brief.text', target.getContent('markdown') ?? '');
          }}
        ></tp-text-editor></div
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
                    <tp-markdown
                      class="brief-preview"
                      heading-offset="2"
                      id-prefix="workspace-brief-"
                      data-font=${font}
                      .source=${text}
                      @tp-markdown-render=${(event: CustomEvent<MarkdownRenderDetail>) => {
                        const next = event.detail.headings;
                        if (!sameOutline(next, host.view<Outline>('brief.outline', [])))
                          host.setView('brief.outline', next);
                      }}
                    ></tp-markdown>
                    ${
                      host.mobile || headings.length < 2
                        ? nothing
                        : html`<aside class="brief-toc">
                            <tp-table-of-contents label="Sections" navigation="scroll">
                              ${headings.map(
                                (heading) =>
                                  html`<tp-table-of-contents-item
                                    .target=${heading.element}
                                    .depth=${heading.depth - top + 1}
                                    >${heading.label}</tp-table-of-contents-item
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
  </tp-resizable-panel-group>`;
  return { title: 'Release brief', description, actions: menus, body };
}
