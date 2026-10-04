// Browser assertions executed only through Chrome DevTools MCP evaluate_script.
// Imperative/synthetic checks are explicitly separate from tool-driven input.
import {
  DragDropManager,
  Draggable,
  Droppable,
  Sortable,
  DOMRectangle,
  PointerSensor,
  ActivationConstraint,
} from '../../../../src/foundation/drag-drop/index.ts';
import { cloneFeedback } from '../../../../src/foundation/drag-drop/clone.ts';
import { OwnedStyles, leaseStyle } from '../../../../src/foundation/owned-styles.ts';
import { OwnedPortal } from '../../../../src/foundation/owned-portal.ts';
import { logicalPortalOwner } from '../../../../src/foundation/portal-ownership.ts';
import {
  measureElement,
  frameCoordinates,
  cancelGeometryTransitions,
} from '../../../../src/foundation/drag-drop/dom-geometry.ts';
import { ContentSecurityService } from '../../../../src/foundation/content-security.ts';
import { revealElement } from '../../../../src/foundation/drag-drop/scrolling.ts';
import { css, html } from 'lit';
const delay = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const equal = (actual, expected, message) =>
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`,
  );
async function waitFor(test, message) {
  for (let i = 0; i < 100; i++) {
    if (test()) return;
    await delay(10);
  }
  throw new Error(message);
}
function box(parent, label, style = '') {
  const element = parent.ownerDocument.createElement('div');
  element.textContent = label;
  element.style.cssText = `width:180px;height:48px;box-sizing:border-box;${style}`;
  parent.append(element);
  return element;
}
function createManager(options = {}) {
  return new DragDropManager({
    sensors: [],
    autoScroll: false,
    accessibility: false,
    feedback: 'none',
    dropAnimation: null,
    ...options,
  });
}
async function start(manager, source, point) {
  const shape = measureElement(source.element);
  manager.actions.start({ source, coordinates: point ?? shape.center });
  await waitFor(() => manager.dragOperation.status === 'dragging', 'start did not become ready');
}
async function addList(parent, properties) {
  const list = document.createElement('tp-drag-drop-list');
  Object.assign(list, properties);
  parent.append(list);
  await list.updateComplete;
  await delay();
  return list;
}

export async function runContractChecks() {
  const results = [],
    root = document.createElement('section');
  root.style.cssText =
    'position:fixed;inset:20px;z-index:10000;overflow:auto;background:var(--tp-background);';
  document.body.append(root);
  async function check(ids, title, run) {
    const fixture = document.createElement('div');
    root.append(fixture);
    const cleanup = [];
    try {
      await run(fixture, (fn) => cleanup.push(fn));
      results.push({ ids, title, status: 'passed' });
    } catch (error) {
      results.push({ ids, title, status: 'failed', error: String(error.stack ?? error) });
    } finally {
      for (const release of cleanup.reverse()) release();
      fixture.remove();
    }
  }
  await check(
    'V-01,V-02,V-03,V-04,V-47',
    'Typed identities, duplicate ownership, atomic virtual swaps and retained source ID',
    async (parent, own) => {
      const manager = createManager();
      own(() => manager.destroy());
      const entries = [0, '', 1, '1'].map(
        (id, index) =>
          new Sortable({ id, index: index * 4, element: box(parent, String(id)) }, manager),
      );
      entries.forEach((entry) => entry.register());
      equal(
        [...manager.registry.draggables].map((e) => e.id),
        [0, '', 1, '1'],
        'typed registry',
      );
      const duplicate = new Sortable(
        { id: 0, index: 9, element: box(parent, 'duplicate') },
        manager,
      );
      duplicate.register();
      duplicate.destroy();
      assert(
        manager.registry.draggables.get(0) === entries[0].draggable,
        'duplicate removed winner',
      );
      await start(manager, entries[0].draggable);
      const held = manager.dragOperation.snapshot();
      entries[0].id = '';
      entries[1].id = 0;
      await delay();
      assert(
        manager.dragOperation.source === entries[1].draggable && entries[1].initialIndex === 0,
        'virtual source rebound',
      );
      equal(held.source.id, 0, 'retained snapshot');
      entries[1].id = 1;
      await delay();
      assert(entries[1].id === 0, 'colliding rekey did not preserve both lanes');
      assert(manager.registry.droppables.get(0) === entries[1].droppable, 'partial sortable rekey');
      const destroyed = new Draggable({ id: 'gone', element: box(parent, 'gone') }, manager);
      destroyed.destroy();
      await delay();
      assert(!manager.registry.draggables.has('gone'), 'deferred resurrection');
    },
  );
  await check(
    'V-05,V-06,V-07,V-08,V-09,V-10,V-11,V-12',
    'Start validation, ordered events, final input and renderer generation',
    async (parent, own) => {
      const manager = createManager();
      own(() => manager.destroy());
      const source = new Draggable({ id: 'a', element: box(parent, 'A') }, manager);
      source.register();
      const target = new Droppable({ id: 'b', element: box(parent, 'B') }, manager);
      target.register();
      const names = [];
      for (const n of ['dragstart', 'collision', 'dragover'])
        manager.monitor.addEventListener(n, () => names.push(n));
      const veto = manager.monitor.addEventListener('beforedragstart', (e) => e.preventDefault());
      const controller = manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
      assert(controller.signal.aborted && names.length === 0, 'before-start veto');
      veto();
      await start(manager, source);
      assert(names[0] === 'dragstart', 'initial collision before dragstart');
      const id = manager.dragOperation.id;
      for (const input of [
        { source: 'missing', coordinates: { x: 0, y: 0 } },
        { source, coordinates: { x: NaN, y: 0 } },
      ]) {
        let threw = false;
        try {
          manager.actions.start(input);
        } catch {
          threw = true;
        }
        assert(threw && manager.dragOperation.id === id, 'invalid start mutated operation');
      }
      let moves = 0;
      const un = manager.monitor.addEventListener('dragmove', (e) => {
        moves++;
        e.preventDefault();
      });
      const old = manager.dragOperation.position.current;
      manager.actions.move({ by: { x: 5, y: 5 } });
      equal(manager.dragOperation.position.current, old, 'veto movement');
      manager.actions.move({ to: { x: 50, y: 60 }, by: { x: 1, y: 1 }, propagate: false });
      equal(manager.dragOperation.position.current, { x: 50, y: 60 }, 'to / propagate');
      assert(moves === 1, 'suppressed notification');
      un();
      await manager.actions.stop({ canceled: true });
      let resolve;
      manager.renderer = {
        rendering: new Promise((r) => {
          resolve = r;
        }),
      };
      manager.actions.start({ source, coordinates: { x: 0, y: 0 } }).abort();
      await delay();
      manager.renderer = { rendering: Promise.resolve() };
      await start(manager, source);
      const next = manager.dragOperation.id;
      resolve();
      await delay();
      assert(
        manager.dragOperation.id === next && manager.dragOperation.status === 'dragging',
        'stale renderer continued',
      );
    },
  );
  await check(
    'V-14,V-15,V-16,V-62',
    'Suspension first-settlement and failed animation cleanup',
    async (parent, own) => {
      const manager = createManager({ feedback: 'clone', rootElement: parent });
      own(() => manager.destroy());
      const element = box(parent, 'Source'),
        source = new Draggable({ id: 'a', element }, manager),
        target = new Droppable({ id: 'b', element: box(parent, 'Target') }, manager);
      source.register();
      target.register();
      let handle,
        ends = 0,
        settled = 0;
      manager.monitor.addEventListener('dragend', (e) => {
        ends++;
        handle = e.suspend();
        assert(e.suspend() === handle, 'second suspension handle');
      });
      manager.monitor.addEventListener('settled', () => settled++);
      await start(manager, source);
      await manager.actions.setDropTarget('b');
      const stop = manager.actions.stop();
      await delay();
      assert(manager.pending && manager.feedback.element?.isConnected, 'pending feedback missing');
      assert(!manager.actions.move({ by: { x: 1, y: 1 } }), 'movement during suspension');
      handle.resume();
      handle.abort();
      await stop;
      assert(
        ends === 1 && settled === 1 && manager.dragOperation.status === 'idle',
        'terminal race',
      );
      assert(
        !parent.querySelector('[data-preview]') && !parent.querySelector('[data-div-portal]'),
        'terminal nodes leaked',
      );
      const failing = createManager({
        feedback: 'clone',
        dropAnimation: () => Promise.reject(new Error('animation rejected')),
      });
      own(() => failing.destroy());
      const a = new Draggable({ id: 'a', element }, failing),
        b = new Droppable({ id: 'b', element: target.element }, failing);
      a.register();
      b.register();
      await start(failing, a);
      await failing.actions.setDropTarget('b');
      await failing.actions.stop();
      assert(
        failing.dragOperation.status === 'idle' && !failing.feedback.element,
        'rejected animation stranded feedback',
      );
    },
  );
  await check(
    'V-26,V-45,V-46,V-56,V-68',
    'List option replacement, identity resolver assignment order and external manager lifetime',
    async (parent, own) => {
      const manager = createManager();
      own(() => manager.destroy());
      const a = await addList(parent, {
        manager,
        group: 'a',
        value: [{ key: 'a', label: 'A' }],
        getItemId: (item) => item.key,
        activation: 'item',
      });
      const b = await addList(parent, { manager, group: 'b', defaultValue: [] });
      equal(
        a.value.map((item) => item.key),
        ['a'],
        'value before resolver',
      );
      a.getItemOptions = () => ({ disabled: { draggable: true } });
      await a.updateComplete;
      await delay();
      assert(
        manager.registry.draggables.get('a').disabled &&
          !manager.registry.droppables.get('a').disabled,
        'split flags',
      );
      assert(
        manager.registry.draggables.get('a').handle.getAttribute('aria-disabled') === 'true',
        'native handle disabled semantics',
      );
      a.getItemOptions = undefined;
      await a.updateComplete;
      await delay();
      await start(manager, manager.registry.draggables.get('a'));
      a.value = [{ key: 'new', label: 'New authoritative item' }];
      await a.updateComplete;
      await waitFor(
        () => manager.dragOperation.status === 'idle',
        'external replacement did not cancel',
      );
      equal(
        a.value.map((item) => item.key),
        ['new'],
        'external value rollback',
      );
      a.remove();
      await delay();
      assert(
        !manager.destroyed && b.isConnected && b.containerTarget.registered,
        'external manager destroyed',
      );
    },
  );
  await check(
    'V-33,V-35,V-36,V-38,V-65',
    'Stationary collision invalidation, notification deduplication and layout shifts',
    async (parent, own) => {
      parent.style.cssText = 'position:relative;height:250px';
      const manager = createManager();
      own(() => manager.destroy());
      const source = new Draggable({ id: 'a', element: box(parent, 'A') }, manager);
      source.register();
      const target = new Droppable(
        { id: 'b', element: box(parent, 'B', 'position:absolute;left:250px;top:0') },
        manager,
      );
      target.register();
      let evaluations = 0;
      manager.monitor.addEventListener('collision', () => evaluations++);
      await start(manager, source);
      const position = { ...manager.dragOperation.position.current };
      target.element.style.left = '0px';
      await waitFor(
        () => manager.dragOperation.target === target,
        'stationary layout shift ignored',
      );
      equal(manager.dragOperation.position.current, position, 'layout fabricated input');
      const count = evaluations;
      manager.collisionObserver.forceUpdate();
      assert(evaluations > count, 'same IDs suppressed collision event');
      target.disabled = true;
      await delay();
      assert(manager.dragOperation.target !== target, 'disabled target retained');
      target.disabled = false;
      target.accept = [];
      await delay();
      assert(manager.dragOperation.target !== target, 'rejected target retained');
      target.accept = undefined;
      const veto = manager.monitor.addEventListener('collision', (e) => e.preventDefault());
      await manager.actions.setDropTarget(null);
      manager.collisionObserver.forceUpdate();
      await delay();
      assert(manager.dragOperation.target === null, 'prevent collision selected target');
      veto();
      await manager.actions.stop({ canceled: true });
      const after = evaluations;
      target.element.style.left = '40px';
      await delay(150);
      assert(evaluations === after, 'observer after terminal');
    },
  );
  await check(
    'V-39,V-41,V-42,V-57,V-60',
    'Feedback pickup, authored styles, same-origin frame coordinates and disabled overlays',
    async (parent, own) => {
      for (const mode of ['default', 'clone', 'move', 'none']) {
        const element = box(
          parent,
          mode,
          'translate:3px 5px;transform:scale(1.1);transform-origin:20px 10px',
        );
        const manager = createManager({ feedback: mode, rootElement: parent });
        own(() => manager.destroy());
        const source = new Draggable({ id: mode, element }, manager);
        source.register();
        const before = measureElement(element);
        await start(manager, source, { x: before.left + 4, y: before.top + 3 });
        const current = measureElement(manager.feedback.element ?? element);
        assert(
          Math.abs(current.left - before.left) < 1 && Math.abs(current.top - before.top) < 1,
          `${mode} pickup offset`,
        );
        assert(
          !!manager.feedback.placeholder === (mode === 'default' || mode === 'clone'),
          `${mode} placeholder policy`,
        );
        if (mode !== 'none') element.style.cursor = 'crosshair';
        await manager.actions.stop({ canceled: true });
        assert(
          element.style.translate === '3px 5px' && element.style.transform === 'scale(1.1)',
          `${mode} transform restoration`,
        );
        assert(mode === 'none' || element.style.cursor === 'crosshair', 'consumer style lost');
      }
      const frame = document.createElement('iframe');
      frame.style.cssText =
        'width:300px;height:140px;transform:scale(.8);transform-origin:0 0;border:3px solid';
      parent.append(frame);
      frame.srcdoc =
        '<!doctype html><body style="margin:0"><div style="width:100px;height:40px">Frame source</div></body>';
      await new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
      const child = frame.contentDocument.querySelector('div'),
        rect = new DOMRectangle(child),
        point = frameCoordinates(child, { x: 0, y: 0 });
      assert(
        Math.abs(rect.left - point.x) < 0.01 && Math.abs(rect.top - point.y) < 0.01,
        'frame origins differ',
      );
      assert(Math.abs(rect.width - 80) < 0.2, 'frame scale');
      const manager = createManager({ feedback: 'clone', rootElement: document.body });
      own(() => manager.destroy());
      const source = new Draggable({ id: 'frame', element: child }, manager);
      source.register();
      await start(manager, source);
      await manager.actions.stop({ canceled: true });
      assert(
        child.ownerDocument === frame.contentDocument &&
          child.parentElement === frame.contentDocument.body,
        'cross-document portal restoration',
      );
    },
  );
  await check(
    'V-58,V-59,V-60,V-61,V-69',
    'Clone integrity, multiple proxies, style leases and portal ownership',
    async (parent, own) => {
      const form = document.createElement('form');
      form.innerHTML =
        '<label for="drag-input">Text</label><input id="drag-input" name="text" value="initial"><input type="radio" name="choice" checked><input type="file"><canvas width="2" height="2"></canvas><svg width="20" height="20"><defs><path id="drag-shape" d="M0 0h10v10z"/></defs><use href="#drag-shape"/></svg>';
      parent.append(form);
      form.querySelector('input').value = 'current';
      const canvas = form.querySelector('canvas');
      canvas.getContext('2d').fillStyle = '#ff0000';
      canvas.getContext('2d').fillRect(0, 0, 2, 2);
      const clone = cloneFeedback(form);
      own(clone.dispose);
      parent.append(clone.element);
      assert(clone.element.querySelector('input').value === 'current', 'native value clone');
      assert(form.querySelector('[type=radio]').checked, 'clone changed real radio');
      assert(
        clone.element.querySelector('[type=radio]').name !== 'choice',
        'radio name not isolated',
      );
      assert(!clone.element.querySelector('[type=file]').value, 'file clone value');
      assert(
        clone.element.querySelector('canvas').getContext('2d').getImageData(0, 0, 1, 1).data[0] ===
          255,
        'canvas pixels lost',
      );
      assert(
        clone.element.querySelector('label').htmlFor === clone.element.querySelector('input').id,
        'label rewrite',
      );
      assert(
        clone.element.querySelector('use').getAttribute('href') ===
          '#' + clone.element.querySelector('path').id,
        'SVG rewrite',
      );
      assert(
        new Set([...parent.querySelectorAll('[id]')].map((e) => e.id)).size ===
          parent.querySelectorAll('[id]').length,
        'duplicate IDs',
      );
      const element = box(parent, 'proxy'),
        nested = box(element, 'nested', 'width:30px;height:20px');
      const manager = createManager({ feedback: 'clone', rootElement: parent });
      own(() => manager.destroy());
      const source = new Draggable({ id: 'a', element }, manager),
        d1 = new Droppable({ id: 'one', element: nested }, manager),
        d2 = new Droppable({ id: 'two', element: nested }, manager);
      source.register();
      d1.register();
      d2.register();
      await start(manager, source);
      assert(
        d1.proxy && d1.proxy === d2.proxy && d1.proxy !== nested,
        'shared element proxy not applied',
      );
      await manager.actions.stop({ canceled: true });
      assert(d1.proxy === null && d2.proxy === null, 'proxy restoration');
      element.style.setProperty('cursor', 'help', 'important');
      const styles = new OwnedStyles(element);
      styles.set('cursor', 'grabbing');
      element.style.cursor = 'crosshair';
      styles.dispose();
      assert(element.style.cursor === 'crosshair', 'new authored write lost');
      const releaseA = leaseStyle(element, 'user-select', 'none'),
        releaseB = leaseStyle(element, 'user-select', 'none');
      releaseA();
      assert(element.style.userSelect === 'none', 'early lease removal');
      releaseB();
      assert(!element.style.userSelect, 'last lease retained');
      const portal = new OwnedPortal(
          element,
          css`
            :host {
              display: contents;
            }
          `,
        ),
        projection = document.createElement('span');
      element.append(projection);
      assert(
        portal.update(parent, html`<slot></slot>`, { projectedNodes: [projection] }),
        'portal failed',
      );
      parent.append(projection);
      portal.clear();
      assert(projection.parentNode === parent, 'portal overwrote consumer reparent');
    },
  );
  await check(
    'V-47,V-52,V-53',
    'Standalone optimistic sorting and coherent cancel restoration',
    async (parent, own) => {
      const manager = createManager();
      own(() => manager.destroy());
      const entries = ['a', 'b', 'c'].map(
        (id, index) =>
          new Sortable(
            { id, index: index * 3, group: '', element: box(parent, id), transition: null },
            manager,
          ),
      );
      entries.forEach((e) => e.register());
      await start(manager, entries[0].draggable);
      manager.actions.move({ to: measureElement(entries[2].element).center });
      await manager.actions.setDropTarget('c');
      await delay();
      equal(
        [...parent.children].map((e) => e.textContent),
        ['b', 'c', 'a'],
        'plain DOM preview',
      );
      assert(
        entries[0].initialIndex === 0 && entries[2].initialIndex === 6,
        'sparse initial indices lost',
      );
      await manager.actions.stop({ canceled: true });
      equal(
        [...parent.children].map((e) => e.textContent),
        ['a', 'b', 'c'],
        'plain DOM rollback',
      );
      equal(
        entries.map((e) => e.index),
        [0, 3, 6],
        'sparse rollback',
      );
    },
  );

  await check(
    'V-52,V-53,V-54,V-55,V-56',
    'Controlled conservation, stale projections and unrelated disconnect',
    async (parent, own) => {
      const manager = createManager();
      own(() => manager.destroy());
      const a = await addList(parent, { manager, group: 'one', value: [{ id: 'a' }, { id: 'b' }] });
      const b = await addList(parent, { manager, group: 'two', value: [] });
      let commitSnapshots = [],
        proposals = [];
      for (const list of [a, b]) {
        list.addEventListener('tp-value-change', (event) => {
          proposals.push([a.value.map((x) => x.id), b.value.map((x) => x.id)]);
          list.value = event.detail.value.map((item) => ({ ...item, normalized: true }));
        });
        list.addEventListener('tp-value-commit', () =>
          commitSnapshots.push([a.value.map((x) => x.id), b.value.map((x) => x.id)]),
        );
      }
      assert(a.moveItem('a', { list: b, index: 0 }) === 'accepted', 'controlled transfer rejected');
      equal(
        proposals,
        [
          [['a', 'b'], []],
          [['a', 'b'], []],
        ],
        'proposal publication timing',
      );
      equal(
        commitSnapshots,
        [
          [['b'], ['a']],
          [['b'], ['a']],
        ],
        'atomic commit publication',
      );
      const unrelated = await addList(parent, {
        manager,
        group: 'unrelated',
        defaultValue: ['other'],
      });
      await start(manager, manager.registry.draggables.get('b'));
      unrelated.remove();
      await delay();
      assert(manager.dragOperation.status === 'dragging', 'unrelated disconnect canceled source');
      await manager.actions.stop({ canceled: true });
      const held = a.value;
      await start(manager, manager.registry.draggables.get('b'));
      const target = manager.registry.droppables.get('a');
      const release = manager.monitor.addEventListener('dragover', (event) =>
        event.preventDefault(),
      );
      await manager.actions.setDropTarget(target.id);
      await delay();
      equal(a.previewValue, held, 'prevented over projected');
      assert(manager.dragOperation.target === target, 'over veto erased selected target');
      release();
      await manager.actions.stop({ canceled: true });
      let resume;
      manager.renderer = {
        rendering: new Promise((resolve) => {
          resume = resolve;
        }),
      };
      const controller = manager.actions.start({
        source: 'b',
        coordinates: measureElement(manager.registry.draggables.get('b').element).center,
      });
      a.value = [{ id: 'new' }];
      await a.updateComplete;
      resume();
      await delay();
      assert(controller.signal.aborted, 'external replacement survived pending renderer');
      equal(
        a.value.map((x) => x.id),
        ['new'],
        'stale rollback',
      );
    },
  );
  await check(
    'V-39,V-40,V-61,V-62',
    'Negative ancestor pickup, fractional table widths and motion policy',
    async (parent, own) => {
      parent.style.cssText = 'transform:scale(-.8,1.2);transform-origin:200px 0';
      const element = box(
        parent,
        'Transformed source',
        'width:180.5px;translate:3px 4px;transition:opacity 2s,transform 2s',
      );
      const manager = createManager({ feedback: 'clone', rootElement: document.body });
      own(() => manager.destroy());
      const source = new Draggable({ id: 'scaled', element }, manager);
      source.register();
      const before = measureElement(element);
      await start(manager, source, { x: before.left + 3, y: before.top + 5 });
      const picked = measureElement(manager.feedback.element);
      assert(
        Math.abs(before.left - picked.left) < 1 &&
          Math.abs(before.top - picked.top) < 1 &&
          Math.abs(before.width - picked.width) < 1,
        'negative ancestor pickup drift',
      );
      manager.actions.move({ by: { x: 20, y: 10 } });
      const moved = measureElement(manager.feedback.element);
      assert(Math.abs(moved.left - before.left - 20) < 1, 'negative scale movement direction');
      await manager.actions.stop({ canceled: true });
      assert(element.style.transition.includes('opacity'), 'unrelated transition erased');
      parent.style.transform = 'none';
      const table = document.createElement('table');
      table.style.width = '333.5px';
      table.innerHTML =
        '<tbody><tr><td>One long column</td><td>Two</td></tr><tr><td>Three</td><td>Four</td></tr></tbody>';
      parent.append(table);
      const row = table.rows[0];
      const widths = [...row.cells].map((cell) => cell.getBoundingClientRect().width);
      const tableManager = createManager({ feedback: 'clone' });
      own(() => tableManager.destroy());
      const rowSource = new Draggable({ id: 'row', element: row }, tableManager);
      rowSource.register();
      await start(tableManager, rowSource);
      const preview = tableManager.feedback.placeholder;
      assert(preview.localName === 'tr', 'table clone anatomy');
      const previewWidths = [...preview.cells].map((cell) => cell.getBoundingClientRect().width);
      assert(
        previewWidths.every((width, index) => Math.abs(width - widths[index]) < 1),
        'fractional columns changed',
      );
      const sibling = table.insertRow(0);
      sibling.insertCell().textContent = 'Inserted while dragging';
      await tableManager.actions.stop({ canceled: true });
      assert(
        row.parentElement === table.tBodies[0] && !table.querySelector('[data-preview]'),
        'table restoration after sibling insertion',
      );
      assert(
        [...row.cells].every((cell) => !cell.style.width),
        'table styles retained',
      );
      element.setAttribute('motion-policy', 'reduce');
      const reduced = createManager({ feedback: 'clone', dropAnimation: { duration: 9000 } });
      own(() => reduced.destroy());
      const dr = new Draggable({ id: 'reduce', element }, reduced);
      dr.register();
      const reducedTarget = new Droppable({ id: 'reduce-target', element }, reduced);
      reducedTarget.register();
      await start(reduced, dr);
      await reduced.actions.setDropTarget(reducedTarget.id);
      const started = performance.now();
      await reduced.actions.stop();
      assert(performance.now() - started < 250, 'motion policy waited for duration');
    },
  );
  await check(
    'V-63,V-64,V-65',
    'Nested edge scrolling, live zero thresholds and keyboard reveal',
    async (parent, own) => {
      const outer = box(parent, '', 'height:160px;overflow:auto;width:220px'),
        spacer = box(outer, '', 'height:60px'),
        inner = box(outer, '', 'height:100px;overflow:auto;width:200px'),
        content = box(inner, '', 'height:600px'),
        element = box(content, 'Scroll source'),
        tail = box(outer, '', 'height:300px');
      void spacer;
      void tail;
      const manager = createManager({ autoScroll: true });
      own(() => manager.destroy());
      const source = new Draggable({ id: 'scroll', element }, manager);
      source.register();
      await start(manager, source);
      const bounds = measureElement(inner);
      manager.actions.move({ to: { x: bounds.center.x, y: bounds.bottom - 1 } });
      await waitFor(() => inner.scrollTop > 0, 'inner did not scroll');
      assert(outer.scrollTop === 0, 'outer scrolled before inner boundary');
      inner.scrollTop = inner.scrollHeight;
      await waitFor(() => outer.scrollTop > 0, 'outer did not continue at inner boundary');
      manager.options.autoScroll = { threshold: 0 };
      await delay(30);
      const old = [outer.scrollTop, inner.scrollTop];
      await delay(100);
      equal([outer.scrollTop, inner.scrollTop], old, 'zero threshold still scrolled');
      await manager.actions.stop({ canceled: true });
      const after = [outer.scrollTop, inner.scrollTop];
      await delay(150);
      equal([outer.scrollTop, inner.scrollTop], after, 'trailing scroll');
      const last = box(content, 'Last', 'margin-top:450px');
      outer.scrollTop = 0;
      inner.scrollTop = 0;
      revealElement(last, { block: 'nearest', inline: 'none' });
      assert(inner.scrollTop > 0, 'keyboard reveal ignored inner offset');
    },
  );
  await check(
    'V-66,V-67,V-69,V-70',
    'Announcements, description token ownership, CSP and independent managers',
    async (parent, own) => {
      const policy = new ContentSecurityService(parent, { nonce: 'drag-test' });
      own(() => policy.dispose());
      const element = document.createElement('button');
      element.textContent = 'Accessible source';
      element.setAttribute('aria-describedby', 'authored');
      parent.append(element);
      const description = document.createElement('span');
      description.id = 'authored';
      description.textContent = 'Authored help';
      parent.append(description);
      const manager = createManager({
        accessibility: { debounce: 40 },
        announcements: {
          dragstart: () => 'Start now',
          dragmove: () => 'Stale movement',
          dragend: (e) => (e.canceled ? 'Canceled now' : 'Dropped now'),
        },
      });
      own(() => manager.destroy());
      const source = new Draggable({ id: 'a', element }, manager);
      source.register();
      await delay();
      assert(
        element.getAttribute('aria-describedby').includes('authored'),
        'authored description lost',
      );
      assert(
        !element.hasAttribute('aria-pressed') && !element.hasAttribute('aria-grabbed'),
        'false toggle semantics',
      );
      assert(document.querySelector('style[nonce="drag-test"]'), 'generated style lacks nonce');
      await start(manager, source);
      manager.actions.move({ by: { x: 1, y: 1 } });
      await manager.actions.stop({ canceled: true });
      await delay(80);
      assert(
        [...document.querySelectorAll('[role=status]')].some(
          (e) => e.textContent === 'Canceled now',
        ),
        'stale or missing terminal announcement',
      );
      element.setAttribute('aria-describedby', element.getAttribute('aria-describedby') + ' later');
      source.unregister();
      assert(
        element.getAttribute('aria-describedby') === 'authored later',
        'description token cleanup',
      );
      source.register();
      policy.update({ disableStyleElements: true });
      await delay();
      assert(
        !document.querySelector('style[nonce="drag-test"]'),
        'disabled generated style retained',
      );
      const other = createManager();
      own(() => other.destroy());
      const otherSource = new Draggable({ id: 'a', element: box(parent, 'Independent') }, other);
      otherSource.register();
      await start(manager, source);
      await start(other, otherSource);
      manager.destroy();
      assert(
        other.dragOperation.status === 'dragging',
        'destroying manager canceled unrelated manager',
      );
      await other.actions.stop({ canceled: true });
    },
  );

  await check(
    'V-13,V-18,V-19,V-20,V-22,V-23,V-24,V-25,V-26',
    'Synthetic pointer ownership, delay defaults and cancellation branches (not device input)',
    async (parent, own) => {
      const body = document.body,
        originalCapture = body.setPointerCapture,
        originalHas = body.hasPointerCapture,
        originalRelease = body.releasePointerCapture;
      const captured = new Set();
      body.setPointerCapture = (id) => {
        captured.add(id);
      };
      body.hasPointerCapture = (id) => captured.has(id);
      body.releasePointerCapture = (id) => {
        captured.delete(id);
      };
      own(() => {
        body.setPointerCapture = originalCapture;
        body.hasPointerCapture = originalHas;
        body.releasePointerCapture = originalRelease;
      });
      const element = box(parent, 'Pointer source'),
        handle = document.createElement('button'),
        action = document.createElement('button');
      handle.textContent = 'Handle';
      action.textContent = 'Other action';
      element.append(handle, action);
      const manager = createManager({
        sensors: [PointerSensor.configure({ activatorElements: [element, handle] })],
      });
      own(() => manager.destroy());
      const source = new Draggable({ id: 'pointer', element, handle }, manager);
      source.register();
      const send = (target, type, options = {}) => {
        const event = new PointerEvent(type, {
          bubbles: true,
          composed: true,
          cancelable: true,
          isPrimary: true,
          pointerId: 7,
          pointerType: 'mouse',
          button: 0,
          clientX: 30,
          clientY: 30,
          ...options,
        });
        target.dispatchEvent(event);
        return event;
      };
      send(handle, 'pointerdown', { button: 2 });
      send(handle, 'pointerdown', { isPrimary: false });
      send(action, 'pointerdown');
      assert(manager.dragOperation.status === 'idle', 'ineligible pointer activated');
      const down = send(handle, 'pointerdown');
      await waitFor(
        () => manager.dragOperation.status === 'dragging',
        'mouse handle did not activate',
      );
      assert(down.defaultPrevented && captured.has(7), 'activation ownership');
      send(document, 'pointermove', { pointerId: 8, clientX: 500 });
      send(document, 'pointerup', { pointerId: 8 });
      send(document, 'pointercancel', { pointerId: 8 });
      assert(manager.dragOperation.status === 'dragging', 'second pointer ended first');
      equal(manager.dragOperation.position.current, { x: 30, y: 30 }, 'second pointer moved first');
      let terminal;
      manager.monitor.addEventListener('dragend', (event) => {
        terminal = event.operation.position.current;
      });
      send(document, 'pointermove', { clientX: 75, clientY: 90 });
      send(document, 'pointerup', { clientX: 75, clientY: 90 });
      const click = send(handle, 'click');
      assert(click.defaultPrevented, 'owned click not suppressed');
      await waitFor(() => manager.dragOperation.status === 'idle', 'pointer drop did not settle');
      equal(terminal, { x: 75, y: 90 }, 'final frame was not flushed');
      assert(!captured.size, 'capture retained');
      await delay();
      assert(!send(handle, 'click').defaultPrevented, 'ordinary later click suppressed');
      send(handle, 'pointerdown', { pointerType: 'touch' });
      await delay(30);
      assert(manager.dragOperation.status === 'idle', 'touch activated immediately');
      send(document, 'pointerup', { pointerType: 'touch' });
      await delay(270);
      assert(manager.dragOperation.status === 'idle', 'released delay activated later');
      send(handle, 'pointerdown', { pointerType: 'touch' });
      await delay(270);
      assert(manager.dragOperation.status === 'dragging', 'touch 250ms branch did not activate');
      send(document, 'pointercancel', { pointerType: 'touch' });
      await waitFor(() => manager.dragOperation.status === 'idle', 'cancel branch stranded drag');
      send(element, 'pointerdown');
      send(document, 'pointermove', { clientX: 35, clientY: 30 });
      await delay(20);
      assert(manager.dragOperation.status === 'idle', 'distance equality activated');
      send(document, 'pointermove', { clientX: 36, clientY: 30 });
      await waitFor(
        () => manager.dragOperation.status === 'dragging',
        'distance greater-than did not activate',
      );
      send(body, 'lostpointercapture');
      await waitFor(() => manager.dragOperation.status === 'idle', 'lost capture stranded drag');
      send(element, 'pointerdown');
      await delay(150);
      assert(manager.dragOperation.status === 'idle', 'ordinary delay activated before 200ms');
      await delay(75);
      assert(manager.dragOperation.status === 'dragging', 'ordinary 200ms delay did not activate');
      send(document, 'pointercancel');
      await waitFor(() => manager.dragOperation.status === 'idle', 'ordinary cancel');
      const input = document.createElement('input');
      parent.append(input);
      const inputSource = new Draggable(
        { id: 'input', element: input, sensors: [PointerSensor.configure()] },
        manager,
      );
      inputSource.register();
      send(input, 'pointerdown');
      await delay(150);
      assert(manager.dragOperation.status === 'idle', 'eligible input activated early');
      await delay(75);
      assert(
        manager.dragOperation.source === inputSource && manager.dragOperation.status === 'dragging',
        'eligible input delay failed',
      );
      send(document, 'pointercancel');
      await waitFor(() => manager.dragOperation.status === 'idle', 'input cancel');
      send(input, 'pointerdown');
      inputSource.destroy();
      await delay(225);
      assert(manager.dragOperation.status === 'idle', 'destroyed pending input activated later');
      body.setPointerCapture = () => {
        throw new Error('capture failure');
      };
      send(handle, 'pointerdown');
      await delay();
      assert(
        manager.dragOperation.status === 'idle' && !manager.feedback.element,
        'capture throw cleanup',
      );
    },
  );

  await check(
    'V-26,V-40,V-43,V-62',
    'Live feedback root replacement and standalone idle motion driver',
    async (parent, own) => {
      const first = box(parent, 'Root one', 'height:100px'),
        second = box(parent, 'Root two', 'height:100px'),
        element = box(first, 'Movable');
      const manager = createManager({ feedback: 'clone', rootElement: first });
      own(() => manager.destroy());
      const source = new Draggable({ id: 'root', element }, manager);
      source.register();
      await start(manager, source);
      manager.actions.move({ by: { x: 14, y: 7 } });
      const before = measureElement(element);
      source.update({ rootElement: second });
      const after = measureElement(element);
      assert(
        second.contains(element) && !first.querySelector('[data-div-portal]'),
        'root did not replace portal',
      );
      assert(
        Math.abs(before.left - after.left) < 1 && Math.abs(before.top - after.top) < 1,
        'root replacement moved feedback',
      );
      await manager.actions.stop({ canceled: true });
      assert(
        element.parentNode === first && !second.querySelector('[data-div-portal]'),
        'replacement restoration',
      );
      const lane = box(parent, '', 'height:160px'),
        a = box(lane, 'A'),
        b = box(lane, 'B');
      const idle = createManager();
      own(() => idle.destroy());
      const sa = new Sortable(
          { id: 'idle-a', index: 0, element: a, transition: { idle: true, duration: 400 } },
          idle,
        ),
        sb = new Sortable({ id: 'idle-b', index: 1, element: b, transition: { idle: true } }, idle);
      sa.register();
      sb.register();
      await delay();
      const roles = [];
      lane.addEventListener('tp-motion-request', (event) => {
        roles.push(event.request.role);
        event.respondWith({ play: () => ({ finished: Promise.resolve(), cancel() {} }) });
      });
      a.style.translate = '3px 4px';
      lane.append(a);
      idle.registry.coordinator.batch(() => {
        sa.index = 1;
        sb.index = 0;
      });
      await delay();
      assert(roles.includes('sort-displacement'), 'idle reorder did not use shared motion owner');
      assert(a.style.translate === '3px 4px', 'idle animation erased authored translate');
    },
  );
  await check(
    'V-16,V-17,V-22,V-26,V-43',
    'Custom constraint failure cleanup and live modifier replacement',
    async (parent, own) => {
      const element = box(parent, 'Custom activation');
      const manager = createManager();
      own(() => manager.destroy());
      let aborted = 0;
      class Failing extends ActivationConstraint {
        onEvent(event) {
          if (event.type === 'pointermove') throw new Error('Custom movement failed');
        }
        abort() {
          aborted++;
        }
      }
      const source = new Draggable(
        {
          id: 'custom',
          element,
          sensors: [PointerSensor.configure({ activationConstraints: [() => new Failing({})] })],
        },
        manager,
      );
      source.register();
      const send = (target, type) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            composed: true,
            isPrimary: true,
            button: 0,
            pointerId: 83,
            pointerType: 'mouse',
            clientX: 40,
            clientY: 40,
          }),
        );
      send(element, 'pointerdown');
      send(document, 'pointermove');
      assert(
        aborted === 1 && manager.dragOperation.status === 'idle',
        'throwing custom constraint retained gesture',
      );
      send(element, 'pointerdown');
      send(document, 'pointerup');
      assert(aborted === 2, 'gesture was not available after failure');
      source.sensors = [];
      let disposed = 0;
      source.modifiers = [
        () => ({ apply: ({ transform }) => ({ x: transform.x, y: 0 }), destroy: () => disposed++ }),
      ];
      await start(manager, source);
      manager.actions.move({ by: { x: 10, y: 10 } });
      equal(manager.dragOperation.transform, { x: 10, y: 0 }, 'first modifier');
      source.modifiers = [
        () => ({ apply: ({ transform }) => ({ x: 0, y: transform.y }), destroy: () => disposed++ }),
      ];
      assert(disposed === 1, 'old modifier not released on replacement');
      manager.actions.move({ by: { x: 10, y: 10 } });
      assert(manager.dragOperation.transform.x === 0, 'replacement modifier not used');
      await manager.actions.stop({ canceled: true });
      assert(disposed === 2, 'replacement modifier retained after end');
    },
  );
  await check(
    'V-40,V-52,V-53',
    'Active geometry transitions and stale standalone renderer projections',
    async (parent, own) => {
      const element = box(
        parent,
        'Transition',
        'translate:0px 0px;opacity:1;transition:translate 2s linear, opacity 2s linear',
      );
      element.getBoundingClientRect();
      element.style.translate = '100px 0px';
      element.style.opacity = '.5';
      await delay(70);
      assert(
        element.getAnimations().some((a) => a.transitionProperty === 'translate'),
        'no actual geometry CSS transition',
      );
      const resting = measureElement(element);
      cancelGeometryTransitions(element);
      assert(
        !element.getAnimations().some((a) => a.transitionProperty === 'translate') &&
          element.getAnimations().some((a) => a.transitionProperty === 'opacity'),
        'selective transition cancellation',
      );
      const settled = measureElement(element);
      assert(
        Math.abs(resting.left - settled.left) < 1,
        'resting geometry included transition progress',
      );
      const manager = createManager();
      own(() => manager.destroy());
      const lane = box(parent, '', 'height:160px');
      const entries = ['a', 'b', 'c'].map(
        (id, index) =>
          new Sortable(
            { id, index, group: 'first', element: box(lane, id), transition: null },
            manager,
          ),
      );
      entries.forEach((e) => e.register());
      await start(manager, entries[0].draggable);
      let release;
      manager.renderer = {
        rendering: new Promise((r) => {
          release = r;
        }),
      };
      const pending = manager.actions.setDropTarget('c');
      entries[0].setMembership(7, 'authoritative');
      release();
      await pending;
      await delay();
      equal(
        [...lane.children].map((e) => e.textContent),
        ['a', 'b', 'c'],
        'stale projection moved DOM',
      );
      assert(
        entries[0].index === 7 && entries[0].group === 'authoritative',
        'stale projection overwrote membership',
      );
      await manager.actions.stop({ canceled: true });
      assert(entries[0].index === 7, 'rollback overwrote authoritative membership');
    },
  );
  await check(
    'V-02,V-54,V-55,V-56',
    'Atomic mixed-lane rejection, duplicate destination and suspended invalidation',
    async (parent, own) => {
      const manager = createManager();
      own(() => manager.destroy());
      const a = await addList(parent, { manager, group: 'a', defaultValue: ['a', 'b'] });
      const b = await addList(parent, { manager, group: 'b', value: [] });
      let commits = 0;
      parent.addEventListener('tp-value-commit', () => commits++);
      const original = a.value;
      assert(
        a.moveItem('a', { list: b, index: 0 }) === 'rejected',
        'missing controlled acknowledgment accepted',
      );
      assert(a.value === original && !b.value.length && !commits, 'partial mixed publication');
      const incompatible = () => {
        b.value = ['wrong'];
      };
      b.addEventListener('tp-value-change', incompatible);
      assert(
        a.moveItem('a', { list: b, index: 0 }) === 'rejected',
        'incompatible controlled acknowledgment accepted',
      );
      b.removeEventListener('tp-value-change', incompatible);
      assert(
        a.value === original && !b.value.length && !commits,
        'incompatible acknowledgment leaked',
      );
      const ack = (e) => {
        b.value = e.detail.value;
      };
      b.addEventListener('tp-value-change', ack);
      const veto = (e) => e.preventDefault();
      a.addEventListener('tp-value-change', veto);
      assert(a.moveItem('a', { list: b, index: 0 }) === 'rejected', 'veto accepted');
      a.removeEventListener('tp-value-change', veto);
      assert(a.value === original && !b.value.length && !commits, 'veto partially published');
      assert(a.moveItem('a', { list: b, index: 0 }) === 'accepted', 'mixed lane transfer failed');
      equal([a.value, b.value], [['b'], ['a']], 'mixed lane final arrays');
      b.value = ['b'];
      await b.updateComplete;
      assert(
        a.moveItem('b', { list: b, index: 0 }) === 'rejected',
        'duplicate destination accepted',
      );
      b.value = [];
      await b.updateComplete;
      await start(manager, manager.registry.draggables.get('b'));
      const target =
        manager.registry.droppables.get(b.group) ??
        [...manager.registry.droppables].find(
          (e) => e.element === b.shadowRoot.querySelector('ol'),
        );
      await manager.actions.setDropTarget(target.id);
      let suspension;
      const unsub = manager.monitor.addEventListener('dragend', (event) => {
        suspension = event.suspend();
      });
      const stopping = manager.actions.stop();
      await delay();
      assert(suspension, 'no suspension');
      a.readOnly = true;
      await a.updateComplete;
      await delay();
      suspension.resume();
      await stopping;
      equal([a.value, b.value], [['b'], []], 'read-only suspension committed stale value');
      unsub();
    },
  );
  await check(
    'V-38,V-41,V-42,V-64,V-65',
    'Live frame scale and negative-scale scrolling with intent reversal',
    async (parent, own) => {
      const frame = document.createElement('iframe');
      frame.style.cssText =
        'width:240px;height:150px;transform-origin:0 0;transform:scale(.8);border:0';
      frame.srcdoc = '<div style="width:80px;height:40px;margin:10px">Frame target</div>';
      parent.append(frame);
      await new Promise((r) => frame.addEventListener('load', r, { once: true }));
      const manager = createManager();
      own(() => manager.destroy());
      const element = box(parent, 'Source');
      const source = new Draggable({ id: 'frame-source', element }, manager);
      const target = new Droppable(
        { id: 'frame-target', element: frame.contentDocument.querySelector('div') },
        manager,
      );
      source.register();
      target.register();
      await start(manager, source);
      const first = target.refreshShape();
      frame.style.transform = 'scale(1.2)';
      await delay(150);
      const second = target.shape;
      assert(
        Math.abs(second.width - first.width * 1.5) < 1,
        'frame scale did not invalidate target',
      );
      await manager.actions.stop({ canceled: true });
      frame.remove();
      const scroll = box(
        parent,
        '',
        'height:120px;width:220px;overflow:auto;transform:scaleY(-1);transform-origin:center',
      );
      const content = box(scroll, '', 'height:600px'),
        child = box(content, 'Negative scroll source');
      scroll.scrollTop = 100;
      const scrolling = createManager({ autoScroll: true });
      own(() => scrolling.destroy());
      const drag = new Draggable({ id: 'negative-scroll', element: child }, scrolling);
      drag.register();
      const bounds = measureElement(scroll);
      await start(scrolling, drag, bounds.center);
      scrolling.actions.move({ to: { x: bounds.center.x, y: bounds.bottom - 1 } });
      await waitFor(() => scroll.scrollTop < 100, 'negative scale did not invert scroll');
      const previous = scroll.scrollTop;
      scrolling.actions.move({ to: { x: bounds.center.x, y: bounds.top + 1 } });
      await waitFor(
        () => scroll.scrollTop > previous,
        'opposite pointer intent did not unlock reverse scroll',
      );
      await scrolling.actions.stop({ canceled: true });
      const end = scroll.scrollTop;
      await delay(80);
      assert(scroll.scrollTop === end, 'scroll continued after cancel');
    },
  );
  await check(
    'V-14,V-16,V-62,V-70',
    'Removal during drop animation and replacement announcement callbacks',
    async (parent, own) => {
      const element = box(parent, 'Animated source'),
        targetElement = box(parent, 'Target');
      let release;
      const manager = createManager({
        feedback: 'clone',
        accessibility: { debounce: 10 },
        announcements: { dragend: () => 'Decision completed before animation' },
        dropAnimation: () =>
          new Promise((r) => {
            release = r;
          }),
      });
      own(() => manager.destroy());
      const source = new Draggable({ id: 'animated', element }, manager),
        target = new Droppable({ id: 'target', element: targetElement }, manager);
      source.register();
      target.register();
      await start(manager, source);
      await manager.actions.setDropTarget(target.id);
      const stopping = manager.actions.stop();
      await waitFor(() => !!release, 'custom animation did not start');
      assert(
        [...document.querySelectorAll('[role=status]')].some(
          (e) => e.textContent === 'Decision completed before animation',
        ),
        'terminal announcement waited for visual completion',
      );
      element.remove();
      source.destroy();
      release();
      await stopping;
      assert(
        manager.dragOperation.status === 'idle' && !manager.feedback.element,
        'removal stranded animation',
      );
      const replacement = box(parent, 'New source');
      const a11y = createManager({
        accessibility: { debounce: 10 },
        announcements: { dragstart: () => 'Old callback' },
      });
      own(() => a11y.destroy());
      const next = new Draggable({ id: 'next', element: replacement }, a11y);
      next.register();
      next.update({ announcements: { dragstart: () => 'Latest callback' } });
      await start(a11y, next);
      assert(
        [...document.querySelectorAll('[role=status]')].some(
          (e) => e.textContent === 'Latest callback',
        ),
        'stale announcement callback',
      );
      await a11y.actions.stop({ canceled: true });
    },
  );
  await check(
    'V-39,V-60,V-62,V-71',
    'RTL portal inheritance, scoped tokens and public reduced-motion ownership',
    async (parent, own) => {
      const manager = createManager({ feedback: 'default', dropAnimation: { duration: 9000 } });
      own(() => manager.destroy());
      const list = await addList(parent, {
        manager,
        defaultValue: ['One', 'Two'],
        dir: 'rtl',
        motionPolicy: 'reduce',
        size: 'default',
      });
      list.style.setProperty('--tp-space-2', '17px');
      const source = manager.registry.draggables.get('One'),
        original = source.element,
        originParent = original.parentElement;
      const originalStyle = original.getAttribute('style');
      const roles = [];
      list.addEventListener('tp-motion-request', (e) =>
        roles.push({
          role: e.request.role,
          reduced: e.request.reducedMotion,
          owner: e.request.owner,
        }),
      );
      const bounds = measureElement(original);
      manager.actions.start({ source, coordinates: bounds.center, input: 'keyboard' });
      await waitFor(() => manager.dragOperation.status === 'dragging', 'list start');
      assert(
        getComputedStyle(original).direction === 'rtl' &&
          getComputedStyle(original).listStyleType === 'none',
        'portal lost RTL or row appearance',
      );
      assert(
        getComputedStyle(original).getPropertyValue('--tp-space-2').trim() === '17px',
        'portal lost scoped token',
      );
      assert(logicalPortalOwner(original) === originParent, 'portal logical ancestry cycle');
      manager.actions.move({ by: { x: 0, y: 20 } });
      assert(
        roles.some((r) => r.role === 'keyboard-feedback' && r.reduced && r.owner === list),
        'public motion owner lost',
      );
      await manager.actions.setDropTarget('Two');
      const before = performance.now();
      await manager.actions.stop();
      assert(performance.now() - before < 500, 'list inherited reduced motion ignored');
      assert(!original.style.inset, 'feedback leaked shorthand declarations');
      assert(
        !originalStyle || original.getAttribute('style') === originalStyle,
        'feedback changed authored style',
      );
    },
  );
  root.remove();
  return results;
}
