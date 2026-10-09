# Navigation Panel

`<tp-navigation-panel>` presents persistent navigation beside primary content in wide mode and uses the actual Drawer in compact mode. A transparent `provider` owns the wide preference, compact-open state and injected application policies. Foundation §19.17 and Component Library `ucl23-navigation-panel` govern the component.

```html
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-navigation-panel label="Workspace navigation" collapse-mode="compact">
  <tp-navigation-panel-trigger></tp-navigation-panel-trigger>
  <tp-navigation-panel-content>
    <tp-navigation-panel-group>
      <tp-navigation-panel-group-label>Projects</tp-navigation-panel-group-label>
      <tp-navigation-panel-menu>
        <tp-navigation-panel-item>
          <tp-navigation-panel-link href="#design" active
            >Design Engineering</tp-navigation-panel-link
          >
        </tp-navigation-panel-item>
        <tp-navigation-panel-item>
          <tp-navigation-panel-link href="#sales">Sales &amp; Marketing</tp-navigation-panel-link>
        </tp-navigation-panel-item>
      </tp-navigation-panel-menu>
    </tp-navigation-panel-group>
  </tp-navigation-panel-content>
  <tp-navigation-panel-inset>
    <h1>Workspace overview</h1>
  </tp-navigation-panel-inset>
</tp-navigation-panel>
```

The complete organized composition (team switcher, disclosure groups, project menus and account footer) is the Storybook example's own module, `src/stories/navigation-panel-example.js`; its Docs page shows that source as copyable code.

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

Large Action labels use `--tp-leading-tight` to keep both identity lines close together at the row's vertical center.

In wide mode, the toolbar Toggle centers vertically with the actual Header, including changes to its height. Expanded Submenu borders follow the center of their parent leading Icon in both directions. Team and account menus use the shared theme-derived popup separation. Invisible collapsed group labels do not intercept pointer input.

An Item aligns its badge and trailing actions with the primary row, even when a Submenu follows it. The first Link or Action is the primary target; additional Actions are trailing controls. `showOnHover` controls visibility independently of placement. Long primary labels reserve accessory space and truncate without shrinking their clickable target. Links and commands share the same text size. The optional ResizeRail occupies its own minimum-size lane between navigation and primary content so it cannot intercept either region's controls. Inset supplies default content padding through its replaceable recipe.

Icon-sized Actions center their icon with zero padding, independently of the primary Link's reserved accessory space. Menu labels occupy their own row and shortcut hints align to the logical trailing edge. The compact Drawer reserves space above navigation for its existing close Button, keeping dismissal separate from the team switcher.
