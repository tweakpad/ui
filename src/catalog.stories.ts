import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { plusIcon } from './icons/plus.js';

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

const meta = {
  title: 'Tweakpad UI/Complete catalog',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
  render: () => html`
    <style>
      main {
        width: min(90rem, 100%);
      }
      h1 {
        margin: 0 0 1.25rem;
        font-size: 1.5rem;
      }
      .catalog {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
        gap: 1rem;
      }
      .example {
        display: grid;
        gap: 0.65rem;
        align-content: start;
        padding: 1rem;
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-md);
      }
      .example > h2 {
        margin: 0;
        font-size: 0.9rem;
        color: var(--tp-muted-foreground);
      }
      .surface-demo {
        min-height: 5rem;
        padding: 0.75rem;
        background: var(--tp-card);
        border-radius: var(--tp-radius-sm);
      }
      tp-skeleton {
        height: 1.25rem;
      }
      tp-scroll-area {
        height: 8rem;
      }
    </style>
    <main>
      <h1>Tweakpad UI complete catalog</h1>
      <div class="catalog">
        <section class="example">
          <h2>Accordion</h2>
          <tp-accordion>
            <tp-accordion-item value="section" heading-level="3">
              <span slot="label">Section</span>
              <p>Here is the short summary.</p>
              <p>
                Open another item to watch the panel contract around content with a different text
                length.
              </p>
            </tp-accordion-item>
            <tp-accordion-item value="unavailable" heading-level="3" disabled>
              <span slot="label">Unavailable section</span>
              <p>This section is not available yet.</p>
            </tp-accordion-item>
          </tp-accordion>
        </section>
        <section class="example">
          <h2>Button</h2>
          <tp-button>Continue</tp-button>
        </section>
        <section class="example">
          <h2>Icon</h2>
          <tp-icon .icon=${plusIcon} label="Add"></tp-icon>
        </section>
        <section class="example">
          <h2>Checkbox</h2>
          <tp-checkbox>Remember me</tp-checkbox>
        </section>
        <section class="example">
          <h2>Collapsible</h2>
          <tp-collapsible
            ><span slot="label">Details</span>
            <p>Collapsible content</p></tp-collapsible
          >
        </section>
        <section class="example">
          <h2>Radio group</h2>
          <tp-radio-group value="one"
            ><button value="one">One</button><button value="two">Two</button></tp-radio-group
          >
        </section>
        <section class="example">
          <h2>Switch</h2>
          <tp-switch>Notifications</tp-switch>
        </section>
        <section class="example">
          <h2>Tabs</h2>
          <tp-tabs value="one"
            ><button slot="tab" value="one">One</button><button slot="tab" value="two">Two</button>
            <div slot="panel">First panel</div>
            <div slot="panel">Second panel</div></tp-tabs
          >
        </section>
        <section class="example">
          <h2>Toggle</h2>
          <tp-toggle>Bold</tp-toggle>
        </section>
        <section class="example">
          <h2>Toggle group</h2>
          <tp-toggle-group
            ><button value="left">Left</button
            ><button value="center">Center</button></tp-toggle-group
          >
        </section>
        <section class="example">
          <h2>Calendar</h2>
          <tp-calendar
            label="Appointment date"
            name="appointment"
            default-value="2026-09-15"
            default-displayed-month="2026-09-01"
            min="2026-09-01"
            max="2026-10-31"
            week-starts-on="1"
          ></tp-calendar>
        </section>
        <section class="example">
          <h2>Field</h2>
          <tp-field label="Email" description="Used for receipts"
            ><tp-input type="email"></tp-input
          ></tp-field>
        </section>
        <section class="example">
          <h2>Form</h2>
          <tp-form
            ><tp-input name="name" label="Name" placeholder="Name"></tp-input
            ><tp-button type="submit" name="intent" value="save">Submit</tp-button
            ><tp-button type="reset">Reset</tp-button></tp-form
          >
        </section>
        <section class="example">
          <h2>Input</h2>
          <tp-input label="Search" placeholder="Search"></tp-input>
        </section>
        <section class="example">
          <h2>Input group</h2>
          <tp-input-group
            ><span slot="prefix">$</span><tp-input label="Amount" value="42"></tp-input
            ><span slot="suffix">USD</span></tp-input-group
          >
        </section>
        <section class="example">
          <h2>Native select</h2>
          <tp-native-select
            ><optgroup label="Product">
              <option value="design">Design</option>
              <option value="engineering">Engineering</option>
            </optgroup>
            <optgroup label="Operations" disabled>
              <option value="finance">Finance</option>
            </optgroup></tp-native-select
          >
        </section>
        <section class="example">
          <h2>One-time code field</h2>
          <tp-otp-field value="123"></tp-otp-field>
        </section>
        <section class="example">
          <h2>Questionnaire</h2>
          <tp-questionnaire
            shortcut-mode="letters"
            .questions=${questionnaireQuestions}
            .defaultValue=${{ role: 'design' }}
          ></tp-questionnaire>
        </section>
        <section class="example">
          <h2>Slider</h2>
          <tp-slider label="Budget" name="budget" default-value="20 60"></tp-slider>
        </section>
        <section class="example">
          <h2>Text area</h2>
          <tp-text-area label="Message" placeholder="Write a message"></tp-text-area>
        </section>
        <section class="example">
          <h2>Combobox</h2>
          <tp-combobox placeholder="Choose"
            ><span value="alpha">Alpha</span><span value="beta">Beta</span></tp-combobox
          >
        </section>
        <section class="example">
          <h2>Command palette</h2>
          <tp-button>Press ⌘K</tp-button
          ><tp-command-palette
            ><span value="new">New document</span
            ><span value="open">Open document</span></tp-command-palette
          >
        </section>
        <section class="example">
          <h2>Select</h2>
          <tp-select placeholder="Choose"
            ><span value="small">Small</span><span value="large">Large</span></tp-select
          >
        </section>
        <section class="example">
          <h2>Alert dialog</h2>
          <tp-alert-dialog label="Delete item"
            ><tp-button slot="trigger">Delete</tp-button>
            <p>This cannot be undone.</p></tp-alert-dialog
          >
        </section>
        <section class="example">
          <h2>Dialog</h2>
          <tp-dialog label="Settings"
            ><tp-button slot="trigger">Settings</tp-button>
            <p>Dialog content</p></tp-dialog
          >
        </section>
        <section class="example">
          <h2>Drawer</h2>
          <tp-drawer label="Drawer"
            ><tp-button slot="trigger">Open drawer</tp-button>
            <p>Drawer content</p></tp-drawer
          >
        </section>
        <section class="example">
          <h2>Popover</h2>
          <tp-popover label="Options"
            ><tp-button slot="trigger">Options</tp-button>
            <p>Popover content</p></tp-popover
          >
        </section>
        <section class="example">
          <h2>Preview card</h2>
          <tp-preview-card
            ><a slot="trigger" href="#preview">Preview</a>
            <p>Preview content</p></tp-preview-card
          >
        </section>
        <section class="example">
          <h2>Side panel</h2>
          <tp-side-panel label="Inspector"
            ><tp-button slot="trigger">Inspect</tp-button>
            <p>Inspector content</p></tp-side-panel
          >
        </section>
        <section class="example">
          <h2>Tooltip</h2>
          <tp-tooltip><tp-button slot="trigger">Hover me</tp-button>Helpful information</tp-tooltip>
        </section>
        <section class="example">
          <h2>Breadcrumb</h2>
          <tp-breadcrumb
            ><span><a href="#home">Home</a></span
            ><span><a href="#library">Library</a></span
            ><span>Current</span></tp-breadcrumb
          >
        </section>
        <section class="example">
          <h2>Context menu</h2>
          <div class="surface-demo">
            Right-click this area<tp-context-menu
              ><button value="copy">Copy</button
              ><button value="paste">Paste</button></tp-context-menu
            >
          </div>
        </section>
        <section class="example">
          <h2>Menu</h2>
          <tp-menu
            ><button value="edit">Edit</button><button value="duplicate">Duplicate</button></tp-menu
          >
        </section>
        <section class="example">
          <h2>Menubar</h2>
          <tp-menubar
            ><button value="file">File</button><button value="edit">Edit</button></tp-menubar
          >
        </section>
        <section class="example">
          <h2>Navigation menu</h2>
          <tp-navigation-menu
            ><a value="docs" href="#docs">Docs</a
            ><a value="examples" href="#examples">Examples</a></tp-navigation-menu
          >
        </section>
        <section class="example">
          <h2>Pagination</h2>
          <tp-pagination page="4" pages="12"></tp-pagination>
        </section>
        <section class="example">
          <h2>Avatar</h2>
          <tp-avatar fallback="IV" alt="Ivan"></tp-avatar>
        </section>
        <section class="example">
          <h2>Carousel</h2>
          <tp-carousel
            ><div class="surface-demo">Slide one</div>
            <div class="surface-demo">Slide two</div></tp-carousel
          >
        </section>
        <section class="example">
          <h2>Data visualization</h2>
          <tp-data-visualization label="Quarterly trend" description="Values increased each quarter"
            ><div class="surface-demo">▁ ▃ ▅ █</div>
            <table slot="table">
              <tr>
                <th>Quarter</th>
                <th>Value</th>
              </tr>
              <tr>
                <td>Q4</td>
                <td>80</td>
              </tr>
            </table></tp-data-visualization
          >
        </section>
        <section class="example">
          <h2>Message scroller</h2>
          <tp-message-scroller
            ><tp-message author="Ada">Hello</tp-message
            ><tp-message author="Lin">Welcome</tp-message></tp-message-scroller
          >
        </section>
        <section class="example">
          <h2>Progress</h2>
          <tp-progress value="65"></tp-progress>
        </section>
        <section class="example">
          <h2>Resizable panel group</h2>
          <tp-resizable-panel-group style="height:8rem"
            ><div class="surface-demo">A</div>
            <div class="surface-demo">B</div></tp-resizable-panel-group
          >
        </section>
        <section class="example">
          <h2>Scroll area</h2>
          <tp-scroll-area
            ><p>Scrollable content</p>
            <p>More content</p>
            <p>More content</p>
            <p>More content</p></tp-scroll-area
          >
        </section>
        <section class="example">
          <h2>Separator</h2>
          <span>Above</span><tp-separator></tp-separator><span>Below</span>
        </section>
        <section class="example">
          <h2>Spinner</h2>
          <tp-spinner></tp-spinner>
        </section>
        <section class="example">
          <h2>Toast</h2>
          <tp-toast open duration="0">Changes saved</tp-toast>
        </section>
        <section class="example">
          <h2>Alert</h2>
          <tp-alert title="Update available">Restart to install it.</tp-alert>
        </section>
        <section class="example">
          <h2>Aspect-ratio box</h2>
          <tp-aspect-ratio><div class="surface-demo">16:9</div></tp-aspect-ratio>
        </section>
        <section class="example">
          <h2>Attachment</h2>
          <tp-attachment filename="report.pdf" size="245760" removable></tp-attachment>
        </section>
        <section class="example">
          <h2>Badge</h2>
          <tp-badge variant="accent">New</tp-badge>
        </section>
        <section class="example">
          <h2>Bubble</h2>
          <tp-bubble side="end">Hello there</tp-bubble>
        </section>
        <section class="example">
          <h2>Button group</h2>
          <tp-button-group><tp-button>Back</tp-button><tp-button>Next</tp-button></tp-button-group>
        </section>
        <section class="example">
          <h2>Card</h2>
          <tp-card>
            <h3 slot="header">Project access</h3>
            <p slot="description">Review permissions before sharing.</p>
            <p>Invite your teammates to collaborate on this project.</p>
            <tp-button slot="footer" size="sm">Continue</tp-button>
          </tp-card>
        </section>
        <section class="example">
          <h2>Empty state</h2>
          <tp-empty-state title="No results" description="Try a different query."></tp-empty-state>
        </section>
        <section class="example">
          <h2>Key hint</h2>
          <tp-key-hint>⌘ K</tp-key-hint>
        </section>
        <section class="example">
          <h2>Label</h2>
          <tp-label id="catalog-name-label" for="catalog-name">Name</tp-label
          ><tp-input id="catalog-name"></tp-input>
        </section>
        <section class="example">
          <h2>List item</h2>
          <tp-list-item description="Secondary text" selected>Primary text</tp-list-item>
        </section>
        <section class="example">
          <h2>Marker</h2>
          <tp-marker tone="success" label="Online"></tp-marker>
        </section>
        <section class="example">
          <h2>Message</h2>
          <tp-message author="Ada" timestamp="10:42">A complete message.</tp-message>
        </section>
        <section class="example">
          <h2>Skeleton</h2>
          <tp-skeleton animated></tp-skeleton>
        </section>
        <section class="example">
          <h2>Table</h2>
          <tp-table
            ><table>
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
            </table></tp-table
          >
        </section>
        <section class="example">
          <h2>Navigation panel</h2>
          <tp-navigation-panel style="height:12rem"
            ><strong slot="header">Tweakpad</strong><a href="#home">Home</a
            ><a href="#settings">Settings</a></tp-navigation-panel
          >
        </section>
      </div>
    </main>
  `,
};

export const StatesAndMotion: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        grid-template-columns: repeat(3, minmax(10rem, 1fr));
        gap: 1rem;
        align-items: center;
      }
    </style>
    <main>
      <h1>Component states and motion</h1>
      <div class="matrix">
        <tp-button>Default</tp-button><tp-button disabled>Disabled</tp-button
        ><tp-button aria-busy="true">Loading</tp-button>
        <tp-input label="Valid value" value="Valid"></tp-input
        ><tp-input label="Read-only value" value="Read only" readonly></tp-input
        ><tp-input label="Invalid value" value="Invalid" invalid></tp-input>
        <tp-checkbox checked>Checked</tp-checkbox><tp-checkbox indeterminate>Mixed</tp-checkbox
        ><tp-checkbox disabled>Disabled</tp-checkbox> <tp-switch checked>On</tp-switch
        ><tp-switch>Off</tp-switch><tp-switch disabled>Disabled</tp-switch>
        <tp-progress label="First progress" value="25"></tp-progress
        ><tp-progress label="Second progress" value="70"></tp-progress
        ><tp-progress label="Indeterminate progress"></tp-progress>
        <tp-skeleton animated></tp-skeleton><tp-spinner></tp-spinner
        ><tp-toast open duration="0">Visible toast</tp-toast>
      </div>
    </main>
  `,
};
