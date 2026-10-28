import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Menu opening focus', () => {
  it('focuses its popup without the focus ring when no item is highlighted', () => {
    const source = readFileSync(new URL('./menu.ts', import.meta.url), 'utf8');
    const opening = source.slice(source.indexOf('protected override focusOnOpen'));
    const body = opening.slice(0, opening.indexOf('\n  }\n'));
    expect(body).toContain('this.popup?.focus({ preventScroll: true, focusVisible: false })');
  });
});

describe('Menu focus guards (aria-required-children)', () => {
  it('a submenu renders no guard after its trigger, a root menu keeps it', async () => {
    const { TpMenu } = await import('./menu.js');
    if (!customElements.get('tp-menu-guard-unit'))
      customElements.define('tp-menu-guard-unit', class extends TpMenu {});
    type Guarded = InstanceType<typeof TpMenu> & { readonly rendersTriggerGuard: boolean };
    const create = () => {
      const menu = new (customElements.get('tp-menu-guard-unit')!)() as Guarded;
      // Open, as an opened menu reports it.
      Object.defineProperty(menu, 'open', { get: () => true });
      return menu;
    };
    const root = create();
    root.modal = false;
    expect(root.parentMenu).toBeNull();
    expect(root.rendersTriggerGuard).toBe(true);
    // The parent menu owns Tab and holds the submenu's trigger among its items.
    const submenu = create();
    Object.defineProperty(submenu, 'parentMenu', { get: () => root });
    expect(submenu.rendersTriggerGuard).toBe(false);
    // A menubar menu: its trigger is an item of the menubar.
    const barMenu = create();
    barMenu.modal = false;
    expect(barMenu.rendersTriggerGuard).toBe(true);
    barMenu.setMenuBar({ modal: false, disabled: false } as Parameters<
      typeof barMenu.setMenuBar
    >[0]);
    expect(barMenu.rendersTriggerGuard).toBe(false);
    // A modal root menu traps Tab and renders no guard either.
    root.modal = true;
    expect(root.rendersTriggerGuard).toBe(false);
  });
});

describe('Menu Tab out of a menubar', () => {
  it('passes over the menubar triggers, so that Tab leaves the menubar as one stop', async () => {
    const { TpMenu } = await import('./menu.js');
    if (!customElements.get('tp-menu-bar-tab-unit'))
      customElements.define('tp-menu-bar-tab-unit', class extends TpMenu {});
    type Passing = InstanceType<typeof TpMenu> & {
      focusOutsidePasses(element: HTMLElement): boolean;
    };
    const menu = new (customElements.get('tp-menu-bar-tab-unit')!)() as Passing;
    const bar = { nodeType: 1, parentNode: null } as unknown as HTMLElement;
    const trigger = { nodeType: 1, parentNode: bar } as unknown as HTMLElement;
    const outside = { nodeType: 1, parentNode: null } as unknown as HTMLElement;
    expect(menu.focusOutsidePasses(trigger)).toBe(false);
    menu.setMenuBar({ interactionElement: bar, modal: false, disabled: false } as Parameters<
      typeof menu.setMenuBar
    >[0]);
    expect(menu.focusOutsidePasses(trigger)).toBe(true);
    expect(menu.focusOutsidePasses(outside)).toBe(false);
  });
});
