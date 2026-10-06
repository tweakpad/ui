import { dataVisualizationExample } from './data-visualization.examples.js';
import { renderFormExample } from './form.examples.js';
import { skeletonProfile } from './skeleton.examples.js';
import {
  renderBubbleExample,
  renderEmptyStateExample,
  renderAspectRatioExample,
} from './presentation-primitives.examples.js';
import { html } from 'lit';
import type { TemplateResult } from 'lit';
import type { catalog } from '../catalog.js';
import { plusIcon } from '../icons/plus.js';

export type CatalogTag = (typeof catalog)[number][1];

/** Repository-generated sample media (see `assets/media/README.md`). */
export const sampleVideo = new URL('./assets/media/sample-video.mp4', import.meta.url).href;
export const samplePoster = new URL('./assets/media/poster.jpg', import.meta.url).href;
export const sampleAudio = new URL('./assets/media/sample-audio.m4a', import.meta.url).href;
export const sampleCaptionsEn = new URL('./assets/media/captions-en.vtt', import.meta.url).href;
export const sampleCaptionsEs = new URL('./assets/media/captions-es.vtt', import.meta.url).href;
export const sampleChapters = new URL('./assets/media/chapters.vtt', import.meta.url).href;
export const sampleThumbnails = new URL('./assets/media/thumbnails.vtt', import.meta.url).href;

const questionnaireQuestions = [
  {
    name: 'role',
    title: 'What is your role?',
    description: 'Choose the option that best matches your work.',
    kind: 'single' as const,
    required: true,
    choices: [
      { value: 'design', label: 'Design' },
      { value: 'engineering', label: 'Engineering' },
    ],
  },
  {
    name: 'tools',
    title: 'Which tools do you use?',
    kind: 'multiple' as const,
    skippable: true,
    choices: [
      { value: 'editor', label: 'Editor' },
      { value: 'terminal', label: 'Terminal' },
    ],
  },
  {
    name: 'name',
    title: 'What should we call you?',
    kind: 'text' as const,
    required: true,
    minLength: 2,
    placeholder: 'Name',
  },
];

const examples = {
  'tp-drag-drop-list': () =>
    html`<tp-drag-drop-list
      label="Project stages"
      .defaultValue=${['Research', 'Design', 'Review']}
      variant="outline"
    ></tp-drag-drop-list>`,
  'tp-accordion': () => html`
    <tp-accordion variant="outline">
      <tp-accordion-item value="account" heading-level="2">
        <span slot="label">Account settings</span>
        <p>Your profile starts here.</p>
        <p>
          Manage the details shown to your team and review the recovery options for your account.
        </p>
      </tp-accordion-item>
      <tp-accordion-item value="unavailable" heading-level="2" disabled>
        <span slot="label">Unavailable section</span>
        <p>This section is not available yet.</p>
      </tp-accordion-item>
    </tp-accordion>
  `,
  'tp-button': () => html`<tp-button>Continue</tp-button>`,
  'tp-checkbox': () => html`<tp-checkbox default-checked>Remember me</tp-checkbox>`,
  'tp-collapsible': () => html`
    <tp-collapsible open>
      <span slot="label">Project details</span>
      <p>Created today and shared with three collaborators.</p>
    </tp-collapsible>
  `,
  'tp-radio-group': () => html`
    <tp-radio-group default-value="weekly" aria-label="Digest frequency">
      <tp-radio-group-item value="daily">Daily</tp-radio-group-item>
      <tp-radio-group-item value="weekly">Weekly</tp-radio-group-item>
      <tp-radio-group-item value="never">Never</tp-radio-group-item>
    </tp-radio-group>
  `,
  'tp-switch': () => html`<tp-switch default-checked>Notifications</tp-switch>`,
  'tp-tabs': () => html`
    <tp-tabs default-value="overview">
      <button slot="tab" value="overview">Overview</button>
      <button slot="tab" value="activity">Activity</button>
      <div slot="panel" value="overview">Project overview</div>
      <div slot="panel" value="activity">Recent activity</div>
    </tp-tabs>
  `,
  'tp-toggle': () => html`<tp-toggle default-pressed>Bold</tp-toggle>`,
  'tp-toggle-group': () => html`
    <tp-toggle-group default-value='["center"]'>
      <tp-toggle value="left">Left</tp-toggle>
      <tp-toggle value="center">Center</tp-toggle>
      <tp-toggle value="right">Right</tp-toggle>
    </tp-toggle-group>
  `,
  'tp-calendar': () => html`
    <tp-calendar
      label="Appointment date"
      name="appointment"
      default-value="2026-09-15"
      default-displayed-month="2026-09-01"
      min="2026-09-01"
      max="2026-10-31"
      week-starts-on="1"
    ></tp-calendar>
  `,
  'tp-field': () => html`
    <tp-field label="Email" description="Used for receipts">
      <tp-input name="email" type="email"></tp-input>
    </tp-field>
  `,
  'tp-form': () => renderFormExample(),
  'tp-input': () => html`<tp-input label="Search" placeholder="Search projects"></tp-input>`,
  'tp-input-group': () => html`
    <tp-input-group>
      <span slot="prefix">$</span>
      <tp-input label="Amount" value="42"></tp-input>
      <span slot="suffix">USD</span>
    </tp-input-group>
  `,
  'tp-native-select': () => html`
    <tp-native-select label="Team">
      <optgroup label="Product">
        <option value="design">Design</option>
        <option value="engineering">Engineering</option>
      </optgroup>
      <optgroup label="Operations" disabled>
        <option value="finance">Finance</option>
      </optgroup>
    </tp-native-select>
  `,
  'tp-otp-field': () => html`<tp-otp-field value="123" length="6"></tp-otp-field>`,
  'tp-questionnaire': () => html`
    <tp-questionnaire
      shortcut-mode="letters"
      .questions=${questionnaireQuestions}
      .defaultValue=${{ role: 'design' }}
    ></tp-questionnaire>
  `,
  'tp-slider': () => html`
    <tp-slider label="Budget" name="budget" default-value="20 60"></tp-slider>
  `,
  'tp-text-area': () => html`
    <tp-text-area label="Message" placeholder="Write a message"></tp-text-area>
  `,
  'tp-command-palette': () => html`
    <tp-command-palette label="Commands" inline>
      <option value="new">New document</option>
      <option value="open">Open document</option>
    </tp-command-palette>
  `,
  'tp-select': () => html`
    <tp-select label="Size" placeholder="Choose a size">
      <span value="small">Small</span>
      <span value="large">Large</span>
    </tp-select>
  `,
  'tp-alert-dialog': () => html`
    <tp-alert-dialog
      label="Delete project?"
      description="This permanently deletes the project and its files. This action cannot be undone."
    >
      <tp-button slot="trigger" variant="outline">Delete project</tp-button>
      <tp-button slot="cancel" variant="outline">Cancel</tp-button>
      <tp-button
        slot="confirm"
        variant="destructive"
        @click=${(event: Event) => {
          const dialog = (event.currentTarget as HTMLElement).closest('tp-alert-dialog');
          (
            dialog as HTMLElement & { setOpen(open: boolean, reason: string, event: Event): void }
          ).setOpen(false, 'close-action', event);
        }}
        >Delete project</tp-button
      >
    </tp-alert-dialog>
  `,
  'tp-dialog': () => html`
    <tp-dialog label="Settings" description="Review your workspace settings.">
      <tp-button slot="trigger" variant="outline">Open settings</tp-button>
      <tp-button slot="close" variant="outline">Close settings</tp-button>
    </tp-dialog>
  `,
  'tp-drawer': () => html`
    <tp-drawer label="Navigation">
      <tp-button slot="trigger">Open drawer</tp-button>
      <h2>Navigation</h2>
      <a href="#projects">Projects</a>
    </tp-drawer>
  `,
  'tp-popover': () => html`
    <tp-popover label="Actions">
      <tp-button slot="trigger">Open actions</tp-button>
      <p>Choose an action for this project.</p>
    </tp-popover>
  `,
  'tp-preview-card': () => html`
    <tp-preview-card>
      <a slot="trigger" href="#preview">Preview project</a>
      <strong>Project Alpha</strong>
      <p>Updated <tp-time .datetime=${Date.now() - 5 * 60_000}></tp-time>.</p>
    </tp-preview-card>
  `,
  'tp-tooltip': () => html`
    <tp-tooltip>
      <tp-button slot="trigger">Hover or focus me</tp-button>
      Helpful information
    </tp-tooltip>
  `,
  'tp-breadcrumb': () => html`
    <tp-breadcrumb>
      <span><a href="#home">Home</a></span>
      <span><a href="#library">Library</a></span>
      <span>Current</span>
    </tp-breadcrumb>
  `,
  'tp-menu': () => html`
    <tp-menu aria-label="Document actions">
      <tp-button slot="trigger" variant="outline">Document actions</tp-button>
      <button value="edit">Edit</button>
      <button value="duplicate">Duplicate</button>
    </tp-menu>
  `,
  'tp-menubar': () => html`
    <tp-menubar aria-label="Application menu">
      <tp-menu value="file"
        ><button slot="trigger">File</button><button value="new">New</button
        ><button value="open">Open</button></tp-menu
      >
      <tp-menu value="edit"
        ><button slot="trigger">Edit</button><button value="copy">Copy</button
        ><button value="paste">Paste</button></tp-menu
      >
      <tp-menu value="view"
        ><button slot="trigger">View</button
        ><button role="menuitemcheckbox" aria-checked="false" value="grid">Grid</button></tp-menu
      >
    </tp-menubar>
  `,
  'tp-navigation-menu': () => html`
    <tp-navigation-menu aria-label="Primary navigation">
      <li value="docs"><a href="#docs">Docs</a></li>
      <li value="examples"><a href="#examples">Examples</a></li>
    </tp-navigation-menu>
  `,
  'tp-pagination': () =>
    html`<tp-pagination label="Results pages" page="4" pages="12"></tp-pagination>`,
  'tp-avatar': () => html`<tp-avatar fallback="IV" alt="Ivan V." size="default"></tp-avatar>`,
  'tp-carousel': () => html`
    <tp-carousel label="Numbered slides">
      ${Array.from(
        { length: 5 },
        (_, index) => html` <tp-card section-colors="off"><span>${index + 1}</span></tp-card> `,
      )}
    </tp-carousel>
  `,
  'tp-data-visualization': () => dataVisualizationExample(),
  'tp-message-scroller': () => html`
    <tp-message-scroller>
      <tp-message-scroller-item message-id="1"
        ><tp-message author="Ada"
          ><tp-bubble>Hello</tp-bubble></tp-message
        ></tp-message-scroller-item
      >
      <tp-message-scroller-item message-id="2"
        ><tp-message align="end" author="Lin"
          ><tp-bubble align="end">Welcome</tp-bubble></tp-message
        ></tp-message-scroller-item
      >
      <tp-message-scroller-item message-id="3"
        ><tp-message author="Ada"
          ><tp-bubble>Ready to begin?</tp-bubble></tp-message
        ></tp-message-scroller-item
      >
    </tp-message-scroller>
  `,
  'tp-progress': () => html`<tp-progress label="Upload progress" value="65"></tp-progress>`,
  'tp-resizable-panel-group': () => html`
    <tp-resizable-panel-group>
      <div>Explorer</div>
      <div>Editor</div>
    </tp-resizable-panel-group>
  `,
  'tp-scroll-area': () => html`
    <tp-scroll-area>
      <p>Scrollable content</p>
      <p>More content</p>
      <p>More content</p>
      <p>More content</p>
      <p>More content</p>
    </tp-scroll-area>
  `,
  'tp-separator': () => html`
    <div><span>Above</span><tp-separator></tp-separator><span>Below</span></div>
  `,
  'tp-spinner': () => html`<tp-spinner label="Loading projects"></tp-spinner>`,
  'tp-toast': () => html`<tp-toast open duration="persistent" dismissible>Changes saved</tp-toast>`,
  'tp-alert': () => html` <tp-alert title="Update available">Restart to install it.</tp-alert> `,
  'tp-aspect-ratio': () => renderAspectRatioExample(),
  'tp-attachment': () => html`
    <tp-attachment filename="report.pdf" file-size="245760" removable></tp-attachment>
  `,
  'tp-badge': () => html`<tp-badge variant="default">New</tp-badge>`,
  'tp-bubble': () => renderBubbleExample(),
  'tp-button-group': () => html`
    <tp-button-group>
      <tp-button variant="outline">Back</tp-button>
      <tp-button variant="outline">Next</tp-button>
    </tp-button-group>
  `,
  'tp-card': () => html`
    <tp-card>
      <h3 slot="header">Project access</h3>
      <p slot="description">Review permissions before sharing.</p>
      <p>Invite your teammates to collaborate on this project.</p>
      <tp-button slot="footer" size="sm">Continue</tp-button>
    </tp-card>
  `,
  'tp-empty-state': () => renderEmptyStateExample(),
  'tp-icon': () => html`<tp-icon .icon=${plusIcon} label="Add"></tp-icon>`,
  'tp-key-hint': () =>
    html`<tp-key-hint-group separator="none" platform="mac"
      ><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="K"></tp-key-hint
    ></tp-key-hint-group>`,
  'tp-label': () => html`
    <div>
      <tp-label id="story-name-label" for="story-name">Name</tp-label>
      <tp-input id="story-name"></tp-input>
    </div>
  `,
  'tp-list-item': () => html`
    <tp-list-item description="Secondary text" selected>Primary text</tp-list-item>
  `,
  'tp-marker': () => html`<tp-marker tone="success" label="Online"></tp-marker>`,
  'tp-message': () => html`
    <tp-message author="Ada" .timestamp=${Date.now() - 2 * 60_000}>A complete message.</tp-message>
  `,
  'tp-time': () => html`<tp-time .datetime=${Date.now() - 5 * 60_000}></tp-time>`,
  'tp-skeleton': skeletonProfile,
  'tp-table': () => html`
    <tp-table>
      <table>
        <caption>
          Build status
        </caption>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Build</td>
            <td>Passing</td>
          </tr>
        </tbody>
      </table>
    </tp-table>
  `,
  'tp-navigation-panel': () => html`
    <tp-navigation-panel>
      <strong slot="header">Tweakpad</strong>
      <a href="#home">Home</a>
      <a href="#settings">Settings</a>
      <small slot="footer">Version 1</small>
    </tp-navigation-panel>
  `,
  'tp-media-player': () => html`
    <tp-media-player content-title="Sample clip" poster=${samplePoster}>
      <video
        src=${sampleVideo}
        width="1280"
        height="720"
        preload="metadata"
        playsinline
        crossorigin="anonymous"
      >
        <track kind="captions" srclang="en" label="English" src=${sampleCaptionsEn} />
        <track kind="captions" srclang="es" label="Español" src=${sampleCaptionsEs} />
        <track kind="chapters" srclang="en" src=${sampleChapters} />
        <track kind="metadata" label="thumbnails" src=${sampleThumbnails} />
      </video>
      <tp-media-video-layout></tp-media-video-layout>
    </tp-media-player>
  `,
  // Without an engine the map shows its empty status; see the Map stories for engines.
  'tp-map': () => html`
    <tp-map label="Lisbon" default-center="38.7223,-9.1393" default-zoom="12">
      <tp-map-pin value="lisbon" latitude="38.7223" longitude="-9.1393" label="Lisbon"></tp-map-pin>
    </tp-map>
  `,
} satisfies Record<CatalogTag, () => TemplateResult>;

export function renderComponentExample(tagName: CatalogTag): TemplateResult {
  return examples[tagName]();
}

export const componentStoryTags = Object.keys(examples) as CatalogTag[];
