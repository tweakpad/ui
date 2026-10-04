import { html, render } from 'lit';
import { boldIcon } from '../../../../src/icons/text-formatting.js';
import { chevronRightIcon } from '../../../../src/icons/chevron-right.js';
import '../../../../src/styles.css';
import { installFamilyAPI } from './api.js';

const built = new URL(location.href).searchParams.has('package');
const library = await (built
  ? import('../../../../dist/index.js')
  : import('../../../../src/index.js'));
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
document.documentElement.dataset.theme = 'dark';
document.body.style.cssText =
  'margin:0;padding:32px;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans);';
const fixture = document.getElementById('fixture')!;
render(
  html`
    <h1>Menu family</h1>
    <p>
      Each example uses the public library components. Verification controls remain outside curated
      Docs.
    </p>
    <div style="display:flex;flex-wrap:wrap;align-items:start;gap:24px">
      <section>
        <h2>Menu</h2>
        <tp-menu id="commands" label="Document actions">
          <tp-button slot="trigger" variant="outline">Document actions</tp-button>
          <div role="group" aria-label="Editing">
            <span data-menu-label>Editing</span>
            <tp-menu-item id="copy-command" value="copy"
              ><tp-icon .icon=${boldIcon} size="var(--tp-icon-size-sm)"></tp-icon> Copy
              <span data-menu-shortcut>⌘C</span></tp-menu-item
            >
            <tp-menu-item disabled value="paste">Paste</tp-menu-item>
            <tp-menu-checkbox-item id="wrap-command" default-checked
              >Word wrap</tp-menu-checkbox-item
            >
          </div>
          <tp-separator></tp-separator>
          <tp-menu-radio-group
            id="density-commands"
            .defaultValue=${'comfortable'}
            aria-label="Density"
          >
            <tp-menu-radio-item value="compact">Compact</tp-menu-radio-item>
            <tp-menu-radio-item value="comfortable">Comfortable</tp-menu-radio-item>
          </tp-menu-radio-group>
          <tp-menu id="share-commands" label="Share document"
            ><tp-button slot="trigger" variant="ghost"
              >Share <tp-icon .icon=${chevronRightIcon} size="var(--tp-icon-size-sm)"></tp-icon
            ></tp-button>
            <tp-menu-item value="email">Email</tp-menu-item
            ><tp-menu-item value="link">Copy link</tp-menu-item>
          </tp-menu>
          <tp-menu-item variant="destructive" value="delete">Delete</tp-menu-item>
        </tp-menu>
      </section>
      <section>
        <h2>Menubar</h2>
        <tp-menubar
          id="bar"
          aria-label="Editor"
          .value=${''}
          .onValueChange=${(event: CustomEvent<{ value: string }>) => {
            (document.getElementById('bar') as { value: string } | null)!.value =
              event.detail.value;
          }}
        >
          <tp-menu value="file" label="File actions"
            ><tp-button slot="trigger" variant="ghost">File</tp-button
            ><tp-menu-item>New document</tp-menu-item><tp-menu-item>Open</tp-menu-item></tp-menu
          >
          <tp-menu value="edit" label="Edit actions"
            ><tp-button slot="trigger" variant="ghost">Edit</tp-button
            ><tp-menu-item>Undo</tp-menu-item
            ><tp-menu-checkbox-item>Show ruler</tp-menu-checkbox-item></tp-menu
          >
        </tp-menubar>
      </section>
      <section>
        <h2>Context Menu</h2>
        <tp-button id="context-target" variant="outline">Context target</tp-button>
        <tp-menu invocation="context" id="context" for="context-target" label="Context actions"
          ><tp-menu-item>Inspect</tp-menu-item
          ><tp-menu-checkbox-item>Pin</tp-menu-checkbox-item></tp-menu
        >
      </section>
      <section>
        <h2>Popover</h2>
        <tp-popover id="settings" label="Document settings"
          ><tp-button slot="trigger" variant="outline">Document settings</tp-button>
          <span slot="title">Document settings</span
          ><span slot="description">Update the document name.</span>
          <tp-field
            ><label slot="label">Name</label><tp-input default-value="Notes"></tp-input
          ></tp-field>
          <tp-button slot="close">Done</tp-button>
        </tp-popover>
      </section>
    </div>
    <section>
      <h2>Navigation Menu</h2>
      <tp-navigation-menu
        id="navigation"
        aria-label="Resources"
        .value=${''}
        .onValueChange=${(event: CustomEvent<{ value: string }>) => {
          (document.getElementById('navigation') as { value: string } | null)!.value =
            event.detail.value;
        }}
      >
        <tp-navigation-menu-item value="learn"
          ><tp-button slot="trigger" variant="ghost">Learn</tp-button>
          <div slot="content">
            <a href="#overview" active>Overview</a><a href="#guides">Guides</a
            ><a href="#examples" close-on-click>Examples</a>
          </div></tp-navigation-menu-item
        >
        <tp-navigation-menu-item value="tools"
          ><tp-button slot="trigger" variant="ghost">Tools</tp-button>
          <div slot="content">
            <a href="#editor">Editor</a><a href="#inspector">Inspector</a>
          </div></tp-navigation-menu-item
        >
        <tp-navigation-menu-item value="docs"
          ><a href="#documentation">Documentation</a></tp-navigation-menu-item
        >
      </tp-navigation-menu>
    </section>
    <tp-button id="after" variant="outline">After the examples</tp-button>
    <div id="portal-container"></div>
    <div id="live-region" role="status"></div>
  `,
  fixture,
);

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const settle = async () => {
  const controls = [...document.querySelectorAll<HTMLElement>('*')].filter(
    (element) => 'updateComplete' in element,
  );
  await Promise.all(
    controls.map(
      (element) => (element as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete,
    ),
  );
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
};
await settle();
Object.assign(window, {
  familyReady: true,
  familyLibrary: library,
  familyEarly: {
    built,
    async open(id: 'commands' | 'settings') {
      const control = byId<InstanceType<typeof library.TpMenu>>(id);
      control.setOpen(true);
      await settle();
      return {
        open: control.open,
        popup: !!control.popupElement,
        presence: control.presenceState,
        icons: [...(control.popupElement?.querySelectorAll('tp-icon') ?? [])].map(
          (icon) => icon.getBoundingClientRect().width,
        ),
      };
    },
    async navigation(value: string) {
      const control = byId<InstanceType<typeof library.TpNavigationMenu>>('navigation');
      control.value = value;
      await settle();
      return { value: control.value, viewport: control.viewportState };
    },
    async options() {
      const control = byId<InstanceType<typeof library.TpPopover>>('settings');
      control.showArrow = true;
      control.sideOffset = ({ anchor }) => anchor.height / 2;
      control.align = 'end';
      control.showBackdrop = true;
      control.container = byId('portal-container');
      control.setOpen(true);
      await settle();
      return {
        open: control.open,
        side: control.resolvedSide,
        align: control.resolvedAlign,
        portal: !!control.portalElement,
        arrow: !!control.portalElement?.shadowRoot?.querySelector('[part~="arrow"]'),
        name: control.popupElement?.getAttribute('aria-labelledby'),
      };
    },
    async closeAll() {
      for (const id of ['commands', 'context', 'settings'])
        byId<InstanceType<typeof library.TpMenu>>(id).setOpen(false);
      byId<InstanceType<typeof library.TpMenubar>>('bar').value = '';
      byId<InstanceType<typeof library.TpNavigationMenu>>('navigation').value = '';
      await settle();
    },
    snapshot() {
      return ['commands', 'context', 'settings', 'bar', 'navigation'].map((id) => {
        const control = byId<
          HTMLElement & { open?: boolean; value?: string; popupElement?: HTMLElement | null }
        >(id);
        return { id, open: control.open, value: control.value, popup: !!control.popupElement };
      });
    },
  },
});
// Source and package builds expose the same public fixture contract. The selected
// module supplies every runtime constructor; their private fields only differ in
// TypeScript's nominal identities across the two declaration paths.
installFamilyAPI(library as unknown as Parameters<typeof installFamilyAPI>[0], built);
