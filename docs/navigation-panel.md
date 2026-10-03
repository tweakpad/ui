# Navigation Panel

`<tp-navigation-panel>` presents persistent navigation beside primary content in wide mode and uses the actual Drawer in compact mode. A transparent `provider` owns the wide preference, compact-open state and injected application policies. Foundation §19.17 and Component Library `ucl23-navigation-panel` govern the component.

```js
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { navigationIcons } from '@tweakpad/ui/icons/navigation';
import { plusIcon } from '@tweakpad/ui/icons/plus';

// The same public composition renders in Storybook, fixtures and displayed copy.
const navigationPanelExampleMarkup = `
<tp-navigation-panel expanded label="Workspace navigation" collapse-mode="compact" wide-width="calc(var(--tp-spacing) * 80)">
  <tp-navigation-panel-trigger data-example-icon="panel"></tp-navigation-panel-trigger>
  <tp-navigation-panel-header>
    <tp-navigation-panel-menu><tp-navigation-panel-item>
      <tp-menu data-example-menu="teams" label="Teams" side-offset="16">
        <tp-navigation-panel-action slot="trigger" size="lg" tooltip="Switch team" aria-label="Switch team">
          <tp-avatar slot="icon-start" size="sm" fallback="AC" alt="Acme Inc" data-team-avatar></tp-avatar>
          <span data-team-name>Acme Inc</span><br><small data-team-plan>Enterprise</small>
          <tp-icon slot="icon-end" data-example-icon="selector"></tp-icon>
        </tp-navigation-panel-action>
        <div role="group" aria-label="Teams">
          <span data-menu-label>Teams</span>
          <tp-menu-item value="acme-inc" label="Acme Inc"><tp-icon data-example-icon="frame"></tp-icon> Acme Inc <tp-key-hint data-menu-shortcut>⌘1</tp-key-hint></tp-menu-item>
          <tp-menu-item value="acme-corp" label="Acme Corp."><tp-icon data-example-icon="chart"></tp-icon> Acme Corp. <tp-key-hint data-menu-shortcut>⌘2</tp-key-hint></tp-menu-item>
          <tp-menu-item value="studio" label="Studio"><tp-icon data-example-icon="terminal"></tp-icon> Studio <tp-key-hint data-menu-shortcut>⌘3</tp-key-hint></tp-menu-item>
        </div>
        <tp-separator></tp-separator>
        <tp-menu-item value="add-team"><tp-icon data-example-icon="plus"></tp-icon> Add team</tp-menu-item>
      </tp-menu>
    </tp-navigation-panel-item></tp-navigation-panel-menu>
  </tp-navigation-panel-header>
  <tp-navigation-panel-content>
    <tp-navigation-panel-group>
      <tp-navigation-panel-group-label>Platform</tp-navigation-panel-group-label>
      <tp-navigation-panel-menu>
        <tp-navigation-panel-item><tp-collapsible default-open>
          <tp-icon slot="leading" data-example-icon="terminal"></tp-icon><span slot="label">Playground</span>
          <tp-navigation-panel-submenu>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#history">History</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#starred">Starred</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#playground-settings">Settings</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
          </tp-navigation-panel-submenu>
        </tp-collapsible></tp-navigation-panel-item>
        <tp-navigation-panel-item><tp-collapsible>
          <tp-icon slot="leading" data-example-icon="models"></tp-icon><span slot="label">Models</span>
          <tp-navigation-panel-submenu>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#genesis">Genesis</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#explorer">Explorer</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
          </tp-navigation-panel-submenu>
        </tp-collapsible></tp-navigation-panel-item>
        <tp-navigation-panel-item><tp-collapsible>
          <tp-icon slot="leading" data-example-icon="book"></tp-icon><span slot="label">Documentation</span>
          <tp-navigation-panel-submenu>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#introduction">Introduction</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#get-started">Get started</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
          </tp-navigation-panel-submenu>
        </tp-collapsible></tp-navigation-panel-item>
        <tp-navigation-panel-item><tp-collapsible>
          <tp-icon slot="leading" data-example-icon="settings"></tp-icon><span slot="label">Settings</span>
          <tp-navigation-panel-submenu>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#team">Team</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#billing">Billing</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
            <tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#limits">Limits</tp-navigation-panel-sublink></tp-navigation-panel-subitem>
          </tp-navigation-panel-submenu>
        </tp-collapsible></tp-navigation-panel-item>
      </tp-navigation-panel-menu>
    </tp-navigation-panel-group>
    <tp-navigation-panel-group>
      <tp-navigation-panel-group-label>Projects</tp-navigation-panel-group-label>
      <tp-navigation-panel-menu>
        <tp-navigation-panel-item>
          <tp-navigation-panel-link href="#design" tooltip="Design Engineering" data-example-icon="frame">Design Engineering</tp-navigation-panel-link>
          <tp-menu data-example-menu="design" label="Design Engineering actions">
            <tp-navigation-panel-action slot="trigger" show-on-hover size="icon" aria-label="Design Engineering actions" data-example-icon="more"></tp-navigation-panel-action>
            <tp-menu-item value="view-design"><tp-icon data-example-icon="folder"></tp-icon> View project</tp-menu-item>
            <tp-menu-item value="share-design"><tp-icon data-example-icon="share"></tp-icon> Share project</tp-menu-item>
            <tp-separator></tp-separator>
            <tp-menu-item value="delete-design" variant="destructive"><tp-icon data-example-icon="trash"></tp-icon> Delete project</tp-menu-item>
          </tp-menu>
        </tp-navigation-panel-item>
        <tp-navigation-panel-item>
          <tp-navigation-panel-link href="#sales" tooltip="Sales & Marketing" data-example-icon="chart">Sales &amp; Marketing</tp-navigation-panel-link>
          <tp-menu data-example-menu="sales" label="Sales & Marketing actions">
            <tp-navigation-panel-action slot="trigger" show-on-hover size="icon" aria-label="Sales & Marketing actions" data-example-icon="more"></tp-navigation-panel-action>
            <tp-menu-item value="view-sales"><tp-icon data-example-icon="folder"></tp-icon> View project</tp-menu-item>
            <tp-menu-item value="share-sales"><tp-icon data-example-icon="share"></tp-icon> Share project</tp-menu-item>
            <tp-separator></tp-separator>
            <tp-menu-item value="delete-sales" variant="destructive"><tp-icon data-example-icon="trash"></tp-icon> Delete project</tp-menu-item>
          </tp-menu>
        </tp-navigation-panel-item>
        <tp-navigation-panel-item><tp-navigation-panel-link href="#travel" tooltip="Travel" data-example-icon="map">Travel</tp-navigation-panel-link></tp-navigation-panel-item>
        <tp-navigation-panel-item>
          <tp-menu data-example-menu="more" label="More projects">
            <tp-navigation-panel-action slot="trigger" tooltip="More projects" data-example-icon="more">More</tp-navigation-panel-action>
            <tp-menu-item value="all-projects"><tp-icon data-example-icon="folder"></tp-icon> All projects</tp-menu-item>
            <tp-menu-item value="new-project"><tp-icon data-example-icon="plus"></tp-icon> New project</tp-menu-item>
          </tp-menu>
        </tp-navigation-panel-item>
      </tp-navigation-panel-menu>
    </tp-navigation-panel-group>
  </tp-navigation-panel-content>
  <tp-navigation-panel-footer>
    <tp-navigation-panel-menu><tp-navigation-panel-item>
      <tp-menu data-example-menu="account" label="Account" side-offset="16">
        <tp-navigation-panel-action slot="trigger" size="lg" tooltip="Account" aria-label="Account: Alex Morgan">
          <tp-avatar slot="icon-start" size="sm" fallback="AM" alt="Alex Morgan"></tp-avatar>
          <span>Alex Morgan</span><br><small>alex@example.com</small>
          <tp-icon slot="icon-end" data-example-icon="selector"></tp-icon>
        </tp-navigation-panel-action>
        <div role="group" aria-label="Alex Morgan"><div data-menu-label><tp-avatar aria-hidden="true" size="sm" fallback="AM" alt="Alex Morgan"></tp-avatar><span>Alex Morgan<br><small>alex@example.com</small></span></div></div>
        <tp-separator></tp-separator>
        <tp-menu-item value="upgrade"><tp-icon data-example-icon="sparkle"></tp-icon> Upgrade to Pro</tp-menu-item>
        <tp-separator></tp-separator>
        <div role="group" aria-label="Account settings">
          <tp-menu-item value="account"><tp-icon data-example-icon="account"></tp-icon> Account</tp-menu-item>
          <tp-menu-item value="billing"><tp-icon data-example-icon="card"></tp-icon> Billing</tp-menu-item>
          <tp-menu-item value="notifications"><tp-icon data-example-icon="bell"></tp-icon> Notifications</tp-menu-item>
        </div>
        <tp-separator></tp-separator>
        <tp-menu-item value="logout"><tp-icon data-example-icon="logout"></tp-icon> Log out</tp-menu-item>
      </tp-menu>
    </tp-navigation-panel-item></tp-navigation-panel-menu>
  </tp-navigation-panel-footer>
  <tp-navigation-panel-inset>
    <h1>Workspace overview</h1>
    <p>Explore the platform, switch teams, and manage projects from the navigation panel.</p>
    <p role="status" data-example-status>Acme Inc workspace</p>
  </tp-navigation-panel-inset>
</tp-navigation-panel>`;

function setupNavigationPanelExample(panel) {
  const menus = [...panel.querySelectorAll('tp-menu')];
  const account = menus.find((menu) => menu.dataset.exampleMenu === 'account');
  account.partPresentation = {
    ...account.partPresentation,
    'menu-label': {
      styleHook: { display: 'flex', 'align-items': 'center', gap: 'var(--tp-space-2)' },
    },
  };
  // Menu retains authored commands in its public Portal even while closed.
  for (const root of [panel, ...menus.map((menu) => menu.portalElement).filter(Boolean)])
    for (const element of root.querySelectorAll('[data-example-icon]'))
      element.icon =
        element.dataset.exampleIcon === 'plus'
          ? plusIcon
          : navigationIcons[element.dataset.exampleIcon];
  const status = panel.querySelector('[data-example-status]');
  const teams = {
    'acme-inc': ['Acme Inc', 'Enterprise', 'AC'],
    'acme-corp': ['Acme Corp.', 'Startup', 'AC'],
    studio: ['Studio', 'Free', 'ST'],
  };
  const action = (event) => {
    const choice = teams[event.detail.value];
    if (choice) {
      panel.querySelector('[data-team-name]').textContent = choice[0];
      panel.querySelector('[data-team-plan]').textContent = choice[1];
      const avatar = panel.querySelector('[data-team-avatar]');
      avatar.alt = choice[0];
      avatar.fallback = choice[2];
      status.textContent = `${choice[0]} workspace`;
    } else status.textContent = `Selected: ${event.detail.value}`;
  };
  panel.addEventListener('tp-action', action);
  let previousCompact = panel.provider.compact;
  const unsubscribe = panel.provider.subscribe((state) => {
    for (const menu of menus) {
      menu.placement = state.compact
        ? 'bottom end'
        : `inline-end ${menu.dataset.exampleMenu === 'account' ? 'end' : 'start'}`;
      // Compact boundaries/collapse retire transient menus, preserving disclosure and entity state.
      if (state.compact !== previousCompact || (state.collapsed && !state.compact)) menu.close();
    }
    previousCompact = state.compact;
  });
  for (const menu of menus)
    menu.placement = panel.provider.compact
      ? 'bottom end'
      : `inline-end ${menu.dataset.exampleMenu === 'account' ? 'end' : 'start'}`;
  return () => {
    unsubscribe();
    panel.removeEventListener('tp-action', action);
  };
}

const example = document.createElement('div');
document.body.append(example);
example.innerHTML = navigationPanelExampleMarkup;
const panel = example.querySelector('tp-navigation-panel');
panel.compact = false;
await panel.updateComplete;
setupNavigationPanelExample(panel);
panel.addEventListener('tp-value-change', (event) => {
  if (event.target === panel && !event.defaultPrevented && !event.detail.cancelled)
    panel.expanded = event.detail.value;
});
```

Constituent Header, Footer, Trigger, ResizeRail and Inset elements are routed to their named regions when authored directly beneath the Root. Existing `slot="header"`, `slot="footer"`, `slot="trigger"`, `slot="resize-rail"` and `slot="inset"` compositions remain available. Default content belongs to the navigation content region. These elements retain their identity and form ancestry when modes change.

## Organized navigation composition

The canonical example follows shadcn sidebar-07 organization: a team switcher in
Header, a Platform group with independent disclosures, a Projects group with
native destinations and separate command menus, and an account menu in Footer.
It uses Tweakpad recipes and theme; the supplied screenshots govern organization,
not paint. Sample commands update the status message without account operations
or data deletion. The example sets wideWidth to 80 spacing units to accommodate
identity rows and actions; the public default remains unchanged.

Compose the existing tp-collapsible inside tp-navigation-panel-item. Its leading
slot accepts tp-icon, label supplies naming text, and default content contains
Submenu/Subitem/Sublink. Collapsible owns its independent open state, indicator,
Trigger relationships, measurement and presence. Panel collapse suppresses its
nested content visually while retaining open state and the trigger's accessible
name. Nested destinations remain native links with ordinary Tab navigation.

An actual tp-menu may be the primary Item content (team/account/More), or an
accessory beside a direct Link (project actions). Put the actual Panel Action in
its trigger slot. Item reserves the accessory target; show-on-hover affects only
visibility. Menu owns keyboard/typeahead, dismissal and portal behavior. The
composition chooses inline-end/start in wide mode (account uses inline-end/end)
and bottom/end in compact mode using Provider's shared state. Transient menus
close at collapse/mode boundaries; disclosure and entity identity persist. Avatar,
Icon, MenuItem, KeyHint and Separator are the existing public components.

Inside the compact modal Drawer, the shared anchored surface mounts its implicit
portal in the nearest native modal branch. Explicit Menu container configuration
still takes precedence. Closing restores focus before the popup becomes inert;
removing the Panel releases its menus and their portals. Reconnection retains
constituent identities and disclosure state.

## State and properties

| Property                                  | Attribute                    | Values / default                                                                  |
| ----------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `expanded`                                | `expanded`                   | Optional controlled wide Boolean; accepted wide state defaults to `true`          |
| `defaultExpanded`                         | `default-expanded`           | Uncontrolled initial wide Boolean, `true`                                         |
| `compact`                                 | `compact`                    | Explicit responsive Boolean, or leave absent and supply `responsiveAdapter`       |
| `compactOpen`                             | `compact-open`               | Imperative compact-open Boolean, initially `false`; separate from wide preference |
| `collapseMode`                            | `collapse-mode`              | `off-canvas` (default), `compact`, `none`                                         |
| `side`                                    | `side`                       | `inline-start` (default), `inline-end`; resolves with inherited direction         |
| `variant`                                 | `variant`                    | `integrated` (default), `floating`, `inset`; appearance only                      |
| `wideWidth`                               | `wide-width`                 | Positive CSS extent or positive numeric pixels; default `64 * --tp-spacing`       |
| `compactWidth`                            | `compact-width`              | Positive CSS extent or positive numeric pixels; default `72 * --tp-spacing`       |
| `label`                                   | `label`                      | Navigation and compact-dialog accessible name, `Primary`                          |
| `motionPolicy`                            | `motion-policy`              | Existing `inherit`, `normal`, `reduce` policy                                     |
| `responsiveAdapter`                       | property only                | Optional observing application adapter; no built-in breakpoint                    |
| `shortcutAdapter`, `shortcut`             | property only                | Optional scoped registration adapter and key/modifier binding                     |
| `persistenceAdapter`, `persistenceKey`    | property / `persistence-key` | Optional wide-preference load/save capability and key                             |
| `onExpandedChange`, `onCompactOpenChange` | property only                | Cancelable proposal callbacks                                                     |

Supply either `expanded` or `defaultExpanded`. A controlled owner accepts a proposal by publishing the desired `expanded` value during its callback; getters and subscribers expose the accepted value. `setExpanded(value)`, `setCompactOpen(value)` and `toggle()` propose through the same owners. `provider.subscribe(callback)` observes committed snapshots and returns cleanup. The snapshot includes `expanded`, `collapsed`, `compact`, `compactOpen`, `side`, `collapseMode` and `variant`.

Wide proposals use `tp-value-change`; compact proposals use `tp-open-change`. `preventDefault()` rejects a proposal. Component initiating handlers use the existing separate `preventComponentHandling()` channel. Required boundary teardown closes compact mode even when an application rejects ordinary close preferences; Drawer releases its modal/focus/presence ownership before the navigation projection returns to wide mode.

`off-canvas` removes collapsed wide navigation from interaction. `compact` keeps a narrow icon rail and preserves destination names. `none` makes wide toggling inert; compact mode still uses the modal Drawer. Returning to compact starts closed. Legacy `open` maps to compact-open state; `collapsed` maps to the inverse wide preference.

## Injected policies

A responsive adapter implements `observe(host, publishCompact) => cleanup`. It owns its breakpoint and observation environment. Explicit `compact` takes precedence. The Root subscribes once; descendants never install their own media queries.

A shortcut adapter implements `register(host, binding, handler) => cleanup`. A binding supplies `key` and optional `ctrlKey`, `metaKey`, `altKey`, `shiftKey` and `allowEditable` (default `false`). Registration is scoped by the adapter. The component ignores repeated, canceled and nonmatching keys, excludes editable input unless opted in, and prevents the host default only after an accepted toggle. No global shortcut is installed by default.

A persistence adapter implements `load(key)` and `save(key, expanded)`, synchronously or with Promises. Only the wide preference is loaded or saved. Controlled input takes precedence. A late load cannot overwrite an accepted session edit; disconnect or adapter replacement invalidates pending callbacks. Failures produce diagnostics and leave the accepted state usable. No cookie, localStorage or other storage write occurs without an injected adapter.

## Constituents

| Element                                                       | Role and independent options                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `tp-navigation-panel-trigger`                                 | Actual Button; named toggle, default ghost/icon-sm; standard Button options                                             |
| `tp-navigation-panel-resize-rail`                             | Actual Button edge affordance; same toggle, native tab index `-1`; no draggable width model                             |
| `tp-navigation-panel-inset`                                   | Primary semantic main region                                                                                            |
| `tp-navigation-panel-header`, `-content`, `-footer`           | Independent optional layout regions                                                                                     |
| `tp-navigation-panel-group`, `-group-label`, `-group-content` | Native grouping anatomy; label remains separately configurable                                                          |
| `tp-navigation-panel-group-action`                            | Actual Button; provide a label and optional icon                                                                        |
| `tp-navigation-panel-menu`, `-item`                           | Native list and item anatomy                                                                                            |
| `tp-navigation-panel-link`                                    | Actual Button native `href` channel; authored destination, `active`, inherited variant/size options, optional `tooltip` |
| `tp-navigation-panel-action`                                  | Actual Button command; inherited form/action/size/variant options, `active`, optional `showOnHover`                     |
| `tp-navigation-panel-badge`                                   | Actual Badge with navigation composition                                                                                |
| `tp-navigation-panel-loading-placeholder`                     | Actual Skeleton text; `showIcon` defaults to `false`; width is stable for its lifetime                                  |
| `tp-navigation-panel-submenu`, `-subitem`, `-sublink`         | Native nested list, item and actual link; Sublink inherits size/active options                                          |
| `tp-navigation-panel-input`                                   | Actual Input with its complete Field/form/editing behavior                                                              |
| `tp-navigation-panel-separator`                               | Actual decorative Separator                                                                                             |

Links preserve native navigation attributes; author `href` on Link and Sublink. Triggers, rails, group actions and commands use the action channel and omit `href`. Tooltip string or Lit content uses the actual Tooltip and is enabled only for collapsed wide `compact` presentation; rich descriptive Icon or KeyHint content remains supported. Controls and fields reuse their existing component's applicable public API and terminal customization hooks.

## Public parts and customization

The 22 visual parts are `navigation-panel`, `navigation-panel-trigger`, `navigation-panel-resize-rail`, `navigation-panel-inset`, `navigation-panel-header`, `navigation-panel-content`, `navigation-panel-footer`, `navigation-panel-group`, `navigation-panel-group-label`, `navigation-panel-group-action`, `navigation-panel-group-content`, `navigation-panel-menu`, `navigation-panel-item`, `navigation-panel-link`, `navigation-panel-action`, `navigation-panel-badge`, `navigation-panel-loading-placeholder`, `navigation-panel-submenu`, `navigation-panel-subitem`, `navigation-panel-sublink`, `navigation-panel-input`, and `navigation-panel-separator`. Each has `-variant-integrated`, `-variant-floating`, and `-variant-inset` presentation keys. Provider is transparent and creates no public host.

Root `partContracts[partName]` supports `renderDelegate`, `hostProperties`, `classHook`, `styleHook`, `content` and `elementReference`. Delegates must apply the supplied `bind` to their actual semantic target. Root hooks receive the same committed Provider snapshot used by navigation markers. Constituents retain terminal local contracts through their native owner part (`button`, `input`, `badge`, `root` for Separator, or their canonical layout part); these local hooks retain the native owner's value/variant/disabled state. Owned semantics, action/focus behavior and state survive neutral hooks.

Wide width and compact width use existing spacing roles rather than new palette or width tokens. The narrow rail respects the existing minimum target role. Appearance maps the local shadcn Base sidebar and Nova preset to the library's existing background/foreground/accent/border/ring roles and actual Button/Input/Badge/Skeleton/Separator/Tooltip recipes. Modal composition retains Drawer dismissal and accessible close behavior.

Wide navigation stays in document flow and sticks to the viewport while the primary region scrolls. Header and footer keep their natural height; Content fills the remaining height and scrolls independently. Links and actions fill their group. The collapsed rail includes space for the minimum target size and group padding. Compact navigation fills the actual Drawer body, preserving the same controls and form state.

Large Actions fit two-line team and user labels with balanced vertical padding, centering the text, Avatar and trailing Icon within the highlighted row. Collapsed rail icons and Avatars share a horizontal center. Header/footer and Action spacing remain customizable through their existing presentation keys.

In wide mode, the toolbar Toggle centers vertically with the actual Header, including changes to its height. Expanded Submenu borders follow the center of their parent leading Icon in both directions. The example's team and account menus use a 16px trigger gap to clear the panel edge.

An Item aligns its badge and trailing actions with the primary row, even when a Submenu follows it. The first Link or Action is the primary target; additional Actions are trailing controls. `showOnHover` controls visibility independently of placement. Long primary labels reserve accessory space and truncate without shrinking their clickable target. Links and commands share the same text size. The optional ResizeRail occupies its own minimum-size lane between navigation and primary content so it cannot intercept either region's controls. Inset supplies default content padding through its replaceable recipe.

Icon-sized Actions center their icon with zero padding, independently of the primary Link's reserved accessory space. Menu labels occupy their own row and shortcut hints align to the logical trailing edge. The compact Drawer reserves space above navigation for its existing close Button, keeping dismissal separate from the team switcher.
