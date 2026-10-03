import { navigationIcons } from '../icons/navigation.js';
import { plusIcon } from '../icons/plus.js';

// The same public composition renders in Storybook, fixtures and displayed copy.
export const navigationPanelExampleMarkup = `
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

export function setupNavigationPanelExample(panel) {
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
