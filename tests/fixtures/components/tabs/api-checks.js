// Loaded only by a Chrome DevTools MCP evaluation; no browser driver or simulated input.
export async function run() {
  const results = [];
  const frame = () => new Promise(requestAnimationFrame);
  const settle = async () => {
    await frame();
    await frame();
  };
  const until = async (condition) => {
    const deadline = performance.now() + 2000;
    while (!condition() && performance.now() < deadline) await frame();
  };
  const check = (name, condition, detail) => {
    results.push({ name, passed: Boolean(condition), ...(detail ? { detail } : {}) });
  };
  const make = async (props = {}) => {
    const root = document.createElement('tp-tabs');
    Object.assign(root, props);
    root.innerHTML =
      ['a', 'b', 'c']
        .map(
          (v) =>
            `<button slot="tab" value="${v}">${v}</button><div slot="panel" value="${v}">${v} panel</div>`,
        )
        .join('') + '<span slot="indicator"></span>';
    document.querySelector('#dynamic').append(root);
    await settle();
    return root;
  };
  const events = [];
  const controlled = await make({ value: 'a' });
  controlled.onValueChange = (e) => events.push(e);
  controlled.setValue('b');
  check(
    'controlled proposal does not commit or change direction',
    controlled.value === 'a' && controlled.activationDirection === 'none',
  );
  controlled.onValueChange = (e) => {
    controlled.value = e.detail.value;
    e.preventDefault();
  };
  controlled.setValue('b');
  check(
    'canceled synchronous owner update rolls back',
    controlled.value === 'a' && controlled.activationDirection === 'none',
  );
  controlled.onValueChange = (e) => {
    controlled.value = e.detail.value;
  };
  controlled.setValue('b');
  check('controlled owner accepts', controlled.value === 'b');
  controlled.value = 'absent';
  await settle();
  check(
    'controlled missing selects none and retains entry',
    controlled.querySelectorAll('[aria-selected=true]').length === 0 &&
      controlled.querySelector('[tabindex="0"]').value === 'a',
  );
  controlled.value = null;
  await settle();
  check('empty selection indicator hidden', controlled.querySelector('[slot=indicator]').hidden);
  controlled.renderBeforeActivation = true;
  await settle();
  check(
    'renderBeforeActivation independent',
    !controlled.querySelector('[slot=indicator]').hidden &&
      !controlled.querySelector('[slot=indicator]').hasAttribute('data-active'),
  );
  controlled.remove();

  const root = await make({ defaultValue: 'b' }),
    tabs = [...root.querySelectorAll('[slot=tab]')],
    panels = [...root.panels];
  root.onValueChange = (e) => {
    events.push(e);
    e.preventDefault();
  };
  tabs[1].remove();
  await settle();
  check(
    'removed middle tab selects successor noncancelably',
    root.value === 'c' &&
      events.at(-1).detail.reason === 'missing' &&
      !events.at(-1).cancelable &&
      !events.at(-1).defaultPrevented,
  );
  tabs[2].disabled = true;
  await settle();
  check(
    'disabled last selects predecessor',
    root.value === 'a' && events.at(-1).detail.reason === 'disabled',
  );
  tabs[0].disabled = true;
  await settle();
  check('all disabled becomes empty', root.value === null && !root.querySelector('[tabindex="0"]'));
  tabs[0].disabled = false;
  root.onValueChange = undefined;
  root.setValue('a');
  const duplicate = tabs[0].cloneNode(true);
  root.append(duplicate);
  await settle();
  check(
    'duplicate excluded',
    duplicate.getAttribute('role') === 'presentation' &&
      duplicate.tabIndex === -1 &&
      root.querySelectorAll('[aria-selected=true]').length === 1,
  );
  duplicate.value = 'd';
  await settle();
  check(
    'renamed duplicate becomes usable',
    duplicate.getAttribute('role') === 'tab' && !duplicate.hasAttribute('aria-disabled'),
  );
  tabs[0].id = 'authored-tab';
  panels[0].id = 'authored-panel';
  await settle();
  check(
    'authored IDs and live relationships',
    tabs[0].getAttribute('aria-controls') === 'authored-panel' &&
      panels[0].getAttribute('aria-labelledby') === 'authored-tab',
  );
  const detached = panels[1];
  detached.remove();
  await settle();
  check('removing stored panel unregisters it', !root.panels.includes(detached));
  const panelCount = root.panels.length;
  root.remove();
  check(
    'disconnect restores authored panels and clears owned attributes',
    root.querySelectorAll('[slot=panel]').length === panelCount &&
      !tabs[0].hasAttribute('role') &&
      tabs[0].id === 'authored-tab',
  );
  document.querySelector('#dynamic').append(root);
  await settle();
  check(
    'reconnect preserves selection and exactly one selected panel',
    root.value === 'a' && root.panels.filter((p) => p.isConnected && !p.hidden).length === 1,
  );
  root.remove();

  const motion = await make({ defaultValue: 'a' });
  motion.classList.add('motion');
  await settle();
  const original = motion.panels[0];
  const completed = [];
  original.addEventListener('tp-presence-complete', (e) => completed.push(e.detail.present));
  motion.setValue('b');
  check(
    'motion exit remains mounted but inert',
    original.isConnected && original.inert && original.hasAttribute('data-ending-style'),
  );
  motion.setValue('a');
  await until(() => completed.includes(true));
  check(
    'exit reversal preserves same node and active presence',
    original.isConnected &&
      !original.hidden &&
      !original.inert &&
      !original.hasAttribute('data-ending-style') &&
      motion.panels[0] === original,
  );
  motion.setValue('b');
  await until(() => !original.isConnected);
  check(
    'exit completion unmounts and notifies once',
    !original.isConnected && completed.filter((x) => !x).length === 1,
    [...completed],
  );
  original.keepMounted = true;
  motion.refresh();
  await settle();
  check(
    'retention property remounts hidden inert panel',
    original.isConnected && original.hidden && original.inert,
  );
  motion.setValue('a');
  await settle();
  motion.setValue('b');
  motion.remove();
  await new Promise((r) => setTimeout(r, 180));
  check(
    'disconnect cancels pending exit and restores nodes',
    original.parentNode === motion && !original.hidden && !original.inert,
  );

  const objects = await make({ value: null });
  const one = {},
    two = {};
  const members = [...objects.querySelectorAll('[slot=tab]')];
  const objectPanels = objects.panels;
  Object.defineProperty(members[0], 'value', { value: one, writable: true });
  Object.defineProperty(members[1], 'value', { value: two, writable: true });
  objectPanels[0].value = one;
  objectPanels[1].value = two;
  objects.value = two;
  objects.refresh();
  await settle();
  check(
    'comparable member identity',
    objects.value === two &&
      members[1].getAttribute('aria-selected') === 'true' &&
      objectPanels[1].isConnected,
  );
  objects.remove();
  const disabledRoot = await make();
  const enabledTab = disabledRoot.querySelector('[slot=tab]');
  disabledRoot.disabled = true;
  await settle();
  check(
    'root disabled is exposed on every tab',
    [...disabledRoot.querySelectorAll('[role=tab]')].every(
      (t) => t.getAttribute('aria-disabled') === 'true' && t.tabIndex === -1,
    ),
  );
  disabledRoot.disabled = false;
  await settle();
  check(
    'root reenable restores authored disabled semantics',
    !enabledTab.hasAttribute('aria-disabled') && enabledTab.tabIndex === 0,
  );
  const custom = document.createElement('div');
  custom.slot = 'tab';
  custom.value = 'synthetic';
  custom.nativeAction = false;
  custom.disabled = true;
  custom.textContent = 'Disabled synthetic';
  disabledRoot.append(custom);
  await settle();
  check(
    'synthetic disabled property has ARIA and no entry',
    custom.getAttribute('aria-disabled') === 'true' && custom.tabIndex === -1,
  );
  custom.disabled = false;
  disabledRoot.refresh();
  await settle();
  check('synthetic property reenable clears owned ARIA', !custom.hasAttribute('aria-disabled'));
  disabledRoot.remove();
  return results;
}
