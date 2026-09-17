import { html } from 'lit';
import type { TemplateResult } from 'lit';
import { catalogEntries } from '../catalog.js';
import type { catalog } from '../catalog.js';
import { plusIcon } from '../icons/plus.js';

export type CatalogTag = (typeof catalog)[number][1];

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
  'tp-checkbox': () => html`<tp-checkbox checked>Remember me</tp-checkbox>`,
  'tp-collapsible': () => html`
    <tp-collapsible open>
      <span slot="trigger">Project details</span>
      <p>Created today and shared with three collaborators.</p>
    </tp-collapsible>
  `,
  'tp-radio-group': () => html`
    <tp-radio-group value="weekly" aria-label="Digest frequency">
      <button value="daily">Daily</button>
      <button value="weekly">Weekly</button>
      <button value="never">Never</button>
    </tp-radio-group>
  `,
  'tp-switch': () => html`<tp-switch checked>Notifications</tp-switch>`,
  'tp-tabs': () => html`
    <tp-tabs value="overview">
      <button slot="tab" value="overview">Overview</button>
      <button slot="tab" value="activity">Activity</button>
      <div slot="panel">Project overview</div>
      <div slot="panel">Recent activity</div>
    </tp-tabs>
  `,
  'tp-toggle': () => html`<tp-toggle pressed>Bold</tp-toggle>`,
  'tp-toggle-group': () => html`
    <tp-toggle-group value="center">
      <button value="left">Left</button>
      <button value="center">Center</button>
      <button value="right">Right</button>
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
  'tp-form': () => html`
    <tp-form>
      <tp-field label="Name"><tp-input name="name" required></tp-input></tp-field>
      <tp-button type="submit" name="intent" value="save">Save</tp-button>
      <tp-button type="reset">Reset</tp-button>
    </tp-form>
  `,
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
  'tp-combobox': () => html`
    <tp-combobox label="Framework" placeholder="Choose a framework">
      <span value="lit">Lit</span>
      <span value="react">React</span>
      <span value="vue">Vue</span>
    </tp-combobox>
  `,
  'tp-command-palette': () => html`
    <tp-command-palette label="Commands" open>
      <span value="new">New document</span>
      <span value="open">Open document</span>
    </tp-command-palette>
  `,
  'tp-select': () => html`
    <tp-select label="Size" placeholder="Choose a size">
      <span value="small">Small</span>
      <span value="large">Large</span>
    </tp-select>
  `,
  'tp-alert-dialog': () => html`
    <tp-alert-dialog label="Delete project">
      <tp-button slot="trigger">Delete project</tp-button>
      <h2>Delete project?</h2>
      <p>This action cannot be undone.</p>
    </tp-alert-dialog>
  `,
  'tp-dialog': () => html`
    <tp-dialog label="Settings">
      <tp-button slot="trigger">Open settings</tp-button>
      <h2>Settings</h2>
      <p>Update project preferences.</p>
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
      <p>Updated five minutes ago.</p>
    </tp-preview-card>
  `,
  'tp-side-panel': () => html`
    <tp-side-panel label="Inspector">
      <tp-button slot="trigger">Open inspector</tp-button>
      <h2>Inspector</h2>
      <p>Object properties</p>
    </tp-side-panel>
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
  'tp-context-menu': () => html`
    <div class="surface-demo">
      Right-click this area
      <tp-context-menu>
        <button value="copy">Copy</button>
        <button value="paste">Paste</button>
      </tp-context-menu>
    </div>
  `,
  'tp-menu': () => html`
    <tp-menu aria-label="Document actions">
      <button value="edit">Edit</button>
      <button value="duplicate">Duplicate</button>
    </tp-menu>
  `,
  'tp-menubar': () => html`
    <tp-menubar aria-label="Application menu">
      <button value="file">File</button>
      <button value="edit">Edit</button>
      <button value="view">View</button>
    </tp-menubar>
  `,
  'tp-navigation-menu': () => html`
    <tp-navigation-menu aria-label="Primary navigation">
      <a value="docs" href="#docs">Docs</a>
      <a value="examples" href="#examples">Examples</a>
    </tp-navigation-menu>
  `,
  'tp-pagination': () =>
    html`<tp-pagination label="Results pages" page="4" pages="12"></tp-pagination>`,
  'tp-avatar': () => html`<tp-avatar fallback="IV" alt="Ivan V." size="48"></tp-avatar>`,
  'tp-carousel': () => html`
    <tp-carousel label="Featured projects">
      <div class="surface-demo">Project one</div>
      <div class="surface-demo">Project two</div>
      <div class="surface-demo">Project three</div>
    </tp-carousel>
  `,
  'tp-data-visualization': () => html`
    <tp-data-visualization label="Quarterly trend" description="Values increased each quarter">
      <div class="chart-demo" aria-hidden="true">▁ ▃ ▅ █</div>
      <table slot="table">
        <caption>
          Quarterly values
        </caption>
        <thead>
          <tr>
            <th>Quarter</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Q4</td>
            <td>80</td>
          </tr>
        </tbody>
      </table>
    </tp-data-visualization>
  `,
  'tp-message-scroller': () => html`
    <tp-message-scroller>
      <tp-message author="Ada">Hello</tp-message>
      <tp-message author="Lin">Welcome</tp-message>
      <tp-message author="Ada">Ready to begin?</tp-message>
    </tp-message-scroller>
  `,
  'tp-progress': () => html`<tp-progress label="Upload progress" value="65"></tp-progress>`,
  'tp-resizable-panel-group': () => html`
    <tp-resizable-panel-group class="panel-demo">
      <div class="surface-demo">Explorer</div>
      <div class="surface-demo">Editor</div>
    </tp-resizable-panel-group>
  `,
  'tp-scroll-area': () => html`
    <tp-scroll-area class="scroll-demo">
      <p>Scrollable content</p>
      <p>More content</p>
      <p>More content</p>
      <p>More content</p>
      <p>More content</p>
    </tp-scroll-area>
  `,
  'tp-separator': () => html`
    <div class="stack"><span>Above</span><tp-separator></tp-separator><span>Below</span></div>
  `,
  'tp-spinner': () => html`<tp-spinner label="Loading projects"></tp-spinner>`,
  'tp-toast': () => html`<tp-toast open duration="0" dismissible>Changes saved</tp-toast>`,
  'tp-alert': () => html`
    <tp-alert title="Update available" dismissible>Restart to install it.</tp-alert>
  `,
  'tp-aspect-ratio': () => html`
    <tp-aspect-ratio><div class="surface-demo centered">16:9</div></tp-aspect-ratio>
  `,
  'tp-attachment': () => html`
    <tp-attachment filename="report.pdf" size="245760" removable></tp-attachment>
  `,
  'tp-badge': () => html`<tp-badge variant="accent">New</tp-badge>`,
  'tp-bubble': () => html`<tp-bubble side="end">Hello there</tp-bubble>`,
  'tp-button-group': () => html`
    <tp-button-group><tp-button>Back</tp-button><tp-button>Next</tp-button></tp-button-group>
  `,
  'tp-card': () => html`
    <tp-card>
      <strong slot="header">Card title</strong>
      <p>Card content</p>
      <tp-button slot="footer">Action</tp-button>
    </tp-card>
  `,
  'tp-empty-state': () => html`
    <tp-empty-state title="No results" description="Try a different query.">
      <tp-button slot="actions">Clear filters</tp-button>
    </tp-empty-state>
  `,
  'tp-icon': () => html`<tp-icon .icon=${plusIcon} label="Add"></tp-icon>`,
  'tp-key-hint': () => html`<tp-key-hint>⌘ K</tp-key-hint>`,
  'tp-label': () => html`
    <div class="stack">
      <tp-label id="story-name-label" for="story-name">Name</tp-label>
      <tp-input id="story-name"></tp-input>
    </div>
  `,
  'tp-list-item': () => html`
    <tp-list-item description="Secondary text" selected>Primary text</tp-list-item>
  `,
  'tp-marker': () => html`<tp-marker tone="success" label="Online"></tp-marker>`,
  'tp-message': () => html`
    <tp-message author="Ada" timestamp="10:42">A complete message.</tp-message>
  `,
  'tp-skeleton': () => html`<tp-skeleton class="skeleton-demo" animated></tp-skeleton>`,
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
    <tp-navigation-panel class="navigation-demo">
      <strong slot="header">Tweakpad</strong>
      <a href="#home">Home</a>
      <a href="#settings">Settings</a>
      <small slot="footer">Version 1</small>
    </tp-navigation-panel>
  `,
} satisfies Record<CatalogTag, () => TemplateResult>;

export function renderComponentExample(tagName: CatalogTag): TemplateResult {
  const entry = catalogEntries.find((candidate) => candidate.tagName === tagName);
  return html`
    <style>
      .story {
        display: grid;
        gap: 1rem;
        width: min(42rem, calc(100vw - 4rem));
      }

      .story > h1 {
        margin: 0;
        font-size: 1.25rem;
      }

      .stack {
        display: grid;
        gap: 0.75rem;
      }

      .surface-demo {
        min-height: 5rem;
        padding: 0.75rem;
        border-radius: var(--tp-radius-sm);
        background: var(--tp-card);
      }

      .centered {
        display: grid;
        place-items: center;
      }

      .chart-demo {
        font-size: 3rem;
        letter-spacing: 0.2em;
      }

      .panel-demo {
        height: 12rem;
      }

      .scroll-demo {
        height: 10rem;
      }

      .skeleton-demo {
        width: 18rem;
        height: 1.25rem;
      }

      .navigation-demo {
        height: 18rem;
      }
    </style>
    <main class="story">
      <h1>${entry?.name ?? tagName}</h1>
      ${examples[tagName]()}
    </main>
  `;
}

export const componentStoryTags = Object.keys(examples) as CatalogTag[];
