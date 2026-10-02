import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const engine = process.env.BROWSER ?? 'chromium';
const browser = await { chromium, firefox, webkit }[engine].launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(
    `${process.env.STORYBOOK_URL ?? 'http://localhost:6006'}/iframe.html?id=components-button--default&viewMode=story`,
  );
  await page.locator('tp-button').waitFor();
  const results = await page.evaluate(async () => {
    const api = await import('/src/presentation/index.ts');
    const results = {};
    const host = document.createElement('div');
    document.body.append(host);
    const settle = async (...elements) => {
      for (let i = 0; i < 3; i++) {
        await Promise.all(elements.map((element) => element.updateComplete));
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    };
    host.innerHTML = `<tp-card><h2 slot="header">Title</h2><p>Body</p><button slot="footer">Action</button></tp-card><tp-button>Keep focus</tp-button>`;
    const card = host.querySelector('tp-card');
    const button = host.querySelector('tp-button');
    button.motionPolicy = 'reduce';
    await settle(card, button);
    const root = card.shadowRoot.querySelector('[part="card"]');
    const initial = getComputedStyle(root);
    const border = initial.border;
    const background = initial.backgroundColor;
    const width = root.getBoundingClientRect().width;
    card.elevated = true;
    await settle(card);
    results.shadowOnly =
      getComputedStyle(root).border === border &&
      getComputedStyle(root).backgroundColor === background &&
      root.getBoundingClientRect().width === width &&
      getComputedStyle(root).boxShadow !== 'none';
    const defaultPadding = getComputedStyle(
      card.shadowRoot.querySelector('[part="card-content"]'),
    ).paddingBlockStart;
    card.partPresentation = { 'card-content': { styleHook: { 'padding-inline-start': '31px' } } };
    await settle(card);
    const body = card.shadowRoot.querySelector('[part="card-content"]');
    const bodyStyle = getComputedStyle(body);
    results.partialPaddingOverride =
      bodyStyle.paddingInlineStart === '31px' &&
      bodyStyle.paddingBlockStart === defaultPadding &&
      bodyStyle.paddingInlineEnd === defaultPadding;
    const native = button.shadowRoot.querySelector('button');
    button.focus();
    let clicks = 0;
    button.addEventListener('click', () => clicks++);
    const swapped = {
      ...api.defaultPresentationDictionary,
      'button-variant-default': [{ declarations: { background: 'rgb(1, 2, 3)' } }],
    };
    api.setPresentationDictionary(swapped);
    results.dictionarySwap =
      button.shadowRoot.querySelector('button') === native &&
      button.shadowRoot.activeElement === native &&
      getComputedStyle(native).backgroundColor === 'rgb(1, 2, 3)';
    native.click();
    results.eventsPreserved = clicks === 1;
    api.setPresentationDictionary({});
    results.noDictionaryFallback =
      getComputedStyle(native).backgroundColor !== 'rgb(1, 2, 3)' &&
      getComputedStyle(root).boxShadow === 'none';
    api.setPresentationDictionary(api.defaultPresentationDictionary);

    host.innerHTML = `<tp-checkbox indeterminate></tp-checkbox><tp-switch size="sm" checked></tp-switch><tp-tabs><button slot="tab" value="a">A</button><button slot="tab" value="b">B</button><div slot="panel" value="b">B panel</div><div slot="panel" value="a">A panel</div></tp-tabs>`;
    const checkbox = host.querySelector('tp-checkbox');
    const sw = host.querySelector('tp-switch');
    const tabs = host.querySelector('tp-tabs');
    await settle(checkbox, sw, tabs);
    checkbox.shadowRoot.querySelector('input').click();
    await settle(checkbox);
    results.indeterminateOwned =
      checkbox.indeterminate && checkbox.shadowRoot.querySelector('input').indeterminate;
    const track = sw.shadowRoot.querySelector('.track');
    const thumb = sw.shadowRoot.querySelector('.thumb');
    const sm = track.getBoundingClientRect().width;
    sw.size = 'default';
    await settle(sw);
    results.switchSize = track.getBoundingClientRect().width > sm;
    sw.dir = 'rtl';
    await settle(sw);
    results.switchRtl =
      thumb.getBoundingClientRect().left >= track.getBoundingClientRect().left &&
      thumb.getBoundingClientRect().right <= track.getBoundingClientRect().right;
    tabs.value = 'a';
    await settle(tabs);
    results.tabValuePairing =
      !tabs.querySelector('[slot="panel"][value="a"]').hidden &&
      tabs.querySelector('[slot="panel"][value="b"]').hidden;

    host.innerHTML = `<tp-select><span value="a" disabled>A</span><span value="b">B</span><span value="c">C</span></tp-select><tp-combobox><span value="a" disabled>A</span><span value="b">B</span></tp-combobox>`;
    const select = host.querySelector('tp-select');
    const combo = host.querySelector('tp-combobox');
    await settle(select, combo);
    results.selectNativeTrigger =
      !!select.shadowRoot.querySelector('button[role="combobox"]') &&
      !select.shadowRoot.querySelector('input');
    const trigger = select.shadowRoot.querySelector('[role="combobox"]');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle(select);
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(select);
    results.disabledOptionIndex = select.value === 'b' && !select.open;
    select.open = true;
    await settle(select);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await settle(select);
    results.directOpenOutsideClose = !select.open;
    select.readOnly = true;
    trigger.click();
    await settle(select);
    select.shadowRoot.querySelector('[role="option"][id="option-2"]').click();
    results.readOnlyInspect = select.open && select.value === 'b';
    select.open = false;

    host.innerHTML = `<tp-menu><button slot="trigger">Actions</button><button value="go">Go</button><button value="check" role="menuitemcheckbox" aria-checked="false">Check</button><a href="#local" value="link">Link</a></tp-menu>`;
    const menu = host.querySelector('tp-menu');
    await settle(menu);
    results.menuClosedDefault = !menu.open && menu.shadowRoot.querySelector('[role="menu"]').hidden;
    menu.trigger.click();
    await settle(menu);
    const check = menu.querySelector('[value="check"]');
    check.click();
    await settle(menu);
    results.menuCheckboxPolicy = menu.open && check.getAttribute('aria-checked') === 'true';
    const cancel = (event) => event.preventDefault();
    menu.addEventListener('tp-action', cancel);
    check.click();
    results.menuCancellation = check.getAttribute('aria-checked') === 'true' && menu.open;
    menu.removeEventListener('tp-action', cancel);
    menu.querySelector('[value="go"]').click();
    await settle(menu);
    results.menuCommandClose = !menu.open;
    menu.open = true;
    await settle(menu);
    menu
      .querySelector('[value="go"]')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
    results.menuEnd = document.activeElement === menu.querySelector('[value="link"]');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(menu);
    results.menuEscape = !menu.open && document.activeElement === menu.trigger;

    host.innerHTML = `<tp-menubar><tp-menu value="a"><button slot="trigger">A</button><button value="one">One</button></tp-menu><tp-menu value="b"><button slot="trigger">B</button><button value="two">Two</button></tp-menu></tp-menubar>`;
    const bar = host.querySelector('tp-menubar');
    const [a, b] = bar.querySelectorAll('tp-menu');
    await settle(bar, a, b);
    a.setOpen(true);
    await settle(bar, a, b);
    b.addEventListener('tp-open-change', cancel);
    b.setOpen(true);
    await settle(bar, a, b);
    results.menubarAtomicCancellation = a.open && !b.open && bar.value === 'a';

    host.innerHTML = `<tp-input-group><span slot="prefix">URL</span><tp-input></tp-input><tp-button slot="action">Go</tp-button><tp-button slot="action" variant="outline" size="sm">Explicit</tp-button></tp-input-group><tp-table><table><tbody><tr><td>Native cell</td></tr></tbody></table></tp-table>`;
    const group = host.querySelector('tp-input-group');
    const input = group.querySelector('tp-input');
    const actions = group.querySelectorAll('tp-button');
    const table = host.querySelector('tp-table');
    await settle(group, input, ...actions, table);
    group.actionVariant = 'secondary';
    group.actionSize = 'icon-xs';
    await settle(group, ...actions);
    results.actionInheritance =
      actions[0].variant === 'secondary' &&
      actions[0].size === 'icon-xs' &&
      actions[1].variant === 'outline' &&
      actions[1].size === 'sm';
    results.inputSingleBoundary =
      getComputedStyle(input.shadowRoot.querySelector('input')).borderWidth === '0px';
    results.nativeTableStyle =
      parseFloat(getComputedStyle(table.querySelector('td')).paddingInlineStart) > 0 &&
      table.querySelector('table').localName === 'table';
    host.innerHTML = `<tp-accordion variant="outline"><tp-accordion-item value="a"><span slot="label">A</span>Body</tp-accordion-item><tp-accordion-item value="b"><span slot="label">B</span>Body B</tp-accordion-item></tp-accordion>`;
    const accordion = host.querySelector('tp-accordion');
    const accordionItems = [...accordion.children];
    await settle(accordion, ...accordionItems);
    const accordionTrigger = accordionItems[0].triggerElement;
    accordion.partPresentation = {
      'accordion-trigger': { styleHook: { 'padding-inline-start': '37px' } },
    };
    await settle(accordion);
    results.crossShadowPartOverride =
      getComputedStyle(accordionTrigger).paddingInlineStart === '37px';
    accordion.partPresentation = {};
    api.setPresentationDictionary({
      ...api.defaultPresentationDictionary,
      'accordion-trigger': [{ declarations: { 'padding-inline-start': '29px' } }],
    });
    results.crossShadowDictionary =
      getComputedStyle(accordionTrigger).paddingInlineStart === '29px';
    api.setPresentationDictionary(api.defaultPresentationDictionary);
    const accordionParent = accordion.parentNode;
    accordion.remove();
    accordionParent.append(accordion);
    await settle(accordion, ...accordionItems);
    results.accordionReconnect = accordionItems[0].collapsibleElement.open;

    host.innerHTML = `<tp-menu><button slot="trigger">Parent</button><button value="first">First</button><tp-menu><button slot="trigger">Child</button><button value="child">Command</button></tp-menu></tp-menu>`;
    const parentMenu = host.querySelector('tp-menu');
    const childMenu = parentMenu.querySelector('tp-menu');
    await settle(parentMenu, childMenu);
    parentMenu.setOpen(true);
    await settle(parentMenu);
    childMenu.trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    );
    await settle(parentMenu, childMenu);
    results.submenuForward =
      parentMenu.open &&
      childMenu.open &&
      document.activeElement === childMenu.querySelector('[value="child"]');
    childMenu
      .querySelector('[value="child"]')
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }),
      );
    await settle(parentMenu, childMenu);
    results.submenuBackward =
      parentMenu.open && !childMenu.open && document.activeElement === childMenu.trigger;
    childMenu.setOpen(true);
    await settle(childMenu);
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await settle(parentMenu, childMenu);
    results.submenuEscapeIsolation = parentMenu.open && !childMenu.open;
    parentMenu
      .querySelector('[value="first"]')
      .dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, composed: true, pointerType: 'mouse' }),
      );
    results.menuHoverPaint =
      parentMenu.querySelector('[value="first"]').hasAttribute('data-highlighted') &&
      getComputedStyle(parentMenu.querySelector('[value="first"]')).backgroundColor !==
        'rgba(0, 0, 0, 0)';

    host.innerHTML = `<tp-navigation-menu><li value="products"><button slot="trigger">Products</button><div slot="content"><a href="#product">Product</a></div></li><li><a href="#about">About</a></li></tp-navigation-menu>`;
    const navigation = host.querySelector('tp-navigation-menu');
    await settle(navigation);
    const navigationTrigger = navigation.querySelector('button');
    const navigationContent = navigation.querySelector('[slot="content"]');
    navigationTrigger.click();
    await settle(navigation);
    results.navigationDisclosure =
      navigation.value === 'products' &&
      !navigationContent.hidden &&
      navigationTrigger.getAttribute('aria-expanded') === 'true';
    results.navigationNativeLinks = [...navigation.querySelectorAll('a')].every(
      (link) => !link.hasAttribute('role') && link.tabIndex === 0,
    );
    navigation.querySelector('a').focus();
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await settle(navigation);
    results.navigationEscape =
      !navigation.value && navigationContent.hidden && document.activeElement === navigationTrigger;

    host.innerHTML = `<tp-tooltip><button slot="trigger" aria-describedby="existing">Help</button>Description</tp-tooltip>`;
    const tooltip = host.querySelector('tp-tooltip');
    const oldTrigger = tooltip.querySelector('button');
    tooltip.motionPolicy = 'reduce';
    tooltip.open = true;
    await settle(tooltip);
    const newTrigger = document.createElement('button');
    newTrigger.slot = 'trigger';
    newTrigger.textContent = 'Replacement';
    oldTrigger.replaceWith(newTrigger);
    await settle(tooltip);
    results.tooltipTriggerReplacement =
      oldTrigger.getAttribute('aria-describedby') === 'existing' &&
      Boolean(newTrigger.getAttribute('aria-describedby'));
    tooltip.remove();
    results.tooltipDisconnectDescription = !newTrigger.hasAttribute('aria-describedby');

    host.innerHTML = `<tp-toggle-group><tp-toggle value="a" variant="outline" size="sm">A</tp-toggle></tp-toggle-group>`;
    const toggles = host.querySelector('tp-toggle-group');
    const toggle = host.querySelector('tp-toggle');
    await settle(toggles, toggle);
    toggle.remove();
    await settle(toggles, toggle);
    results.toggleMemberRestoration =
      toggle.variant === 'outline' && toggle.size === 'sm' && toggle.selectionOwner === null;
    host.remove();
    return results;
  });
  console.log(results);
  for (const [name, passed] of Object.entries(results))
    assert.equal(passed, true, `${engine}: ${name}`);
  console.log(`${engine}: ${Object.keys(results).length} focused repair checks passed`);
} finally {
  await browser.close();
}
