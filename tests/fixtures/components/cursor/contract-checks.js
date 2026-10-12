/**
 * Cursor contract checks (API evidence through the public surface). Run in the fixture page:
 * `await cursorContract.run()` resolves a report and rejects with the failing keys. Pointer
 * input here is constructed (see fixture.ts); real pointer evidence comes from Chrome DevTools
 * MCP hover and click.
 */
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const frames = async (count) => {
  for (let index = 0; index < count; index++) await frame();
};
const fx = () => window.cursorFixture;
/** Lets the fast opacity and size transitions finish before computed styles are read. */
const transitions = () => new Promise((resolve) => setTimeout(resolve, 400));
const nativePart = (host) =>
  host.shadowRoot.querySelector('button, textarea, input, [part~="control"]') ?? host;
const surfaceOf = (element) => element.shadowRoot.querySelector('[part~="surface"]');
const contentOf = (element) => element.shadowRoot.querySelector('[part~="content"]');
const centerOf = (element) => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};
const near = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;

async function mount(attributes = '', inner = '') {
  const host = document.querySelector('#host');
  host.innerHTML = `<tp-cursor ${attributes}>${inner}</tp-cursor>`;
  const element = host.firstElementChild;
  const events = [];
  for (const type of ['tp-cursor-state-change', 'tp-cursor-follow-change', 'tp-diagnostic', 'tp-motion-request'])
    element.addEventListener(type, (event) => events.push({ type, detail: event.detail, event }));
  await element.updateComplete;
  return { element, events };
}
/** Engages a mounted cursor with a mouse move at a point and lets it place itself. */
async function engage(element, x = 200, y = 200) {
  fx().movePointer(x, y, 'mouse');
  await frames(2);
  return element.following;
}
async function settle(element, limit = 400) {
  for (let index = 0; index < limit; index++) {
    await frame();
    if (!element.hasAttribute('data-moving')) break;
  }
  return !element.hasAttribute('data-moving');
}
const $ = (selector) => document.querySelector(selector);

const checks = {
  async defaultsAndReflection() {
    const { element } = await mount();
    const zone = $('#view-zone');
    const ok =
      element.stiffness === 170 && element.damping === 26 && element.mass === 1 &&
      element.restSpeed === 1 && element.restDelta === 0.1 && element.scope === 'document' &&
      element.hideNative === true && element.following === false && element.state === null &&
      element.zone === null && element.pressed === false && element.stuck === false &&
      zone.state === 'view' && zone.stick === 'none' && zone.native === false && zone.for === '' &&
      zone.stiffness === null && $('#stick-center').stick === 'center' && $('#native-zone').native === true;
    element.scope = 'region';
    await element.updateComplete;
    return ok && element.getAttribute('scope') === 'region';
  },
  async gating() {
    const { element, events } = await mount();
    fx().movePointer(300, 300, 'touch');
    await frames(2);
    const touchNever = !element.following && !element.hasAttribute('data-following');
    const followed = await engage(element, 300, 300);
    const marker = element.hasAttribute('data-following') && !element.hasAttribute('data-outside');
    fx().movePointer(310, 300, 'touch');
    await frames(2);
    const stopped = !element.following;
    const resumed = await engage(element, 320, 300);
    const reasons = events
      .filter((e) => e.type === 'tp-cursor-follow-change')
      .map((e) => `${e.detail.value}:${e.detail.reason}`)
      .join(',');
    return touchNever && followed && marker && stopped && resumed && reasons === 'true:pointer,false:pointer,true:pointer';
  },
  async outsideAndRegionScope() {
    const { element } = await mount();
    await engage(element, 200, 200);
    fx().leave();
    await frame();
    const outside = element.hasAttribute('data-outside') && !document.documentElement.hasAttribute('data-tp-cursor-hidden');
    await engage(element, 210, 200);
    const back = !element.hasAttribute('data-outside') && document.documentElement.hasAttribute('data-tp-cursor-hidden');
    element.remove();
    const { element: region } = await mount('scope="region"');
    const host = $('#host');
    host.style.minBlockSize = '80px';
    const inside = centerOf(host);
    fx().movePointer(inside.x, inside.y, 'mouse', host);
    await frames(2);
    const regionFollows = region.following && !region.hasAttribute('data-outside') && host.hasAttribute('data-tp-cursor-hidden');
    fx().movePointer(5, 5, 'mouse', document.body);
    await frames(2);
    const regionOutside = region.hasAttribute('data-outside') && !host.hasAttribute('data-tp-cursor-hidden');
    host.style.minBlockSize = '';
    return outside && back && regionFollows && regionOutside;
  },
  async followerSeries() {
    const { element } = await mount();
    await engage(element, 100, 100);
    const placed = near(element.position.x, 100) && near(element.position.y, 100);
    fx().movePointer(500, 400, 'mouse');
    const samples = await fx().sampleFollow(element, 12);
    const moving = samples.slice(0, 6).every((s) => s.moving) && samples.every((s, i, all) => i === 0 || s.x >= all[i - 1].x - 0.01);
    const velocity = samples.some((s) => s.vx > 100) && samples.some((s) => s.cssVelocity > 100);
    const settled = await settle(element);
    const exact = element.position.x === 500 && element.position.y === 400 && element.velocity.x === 0 &&
      element.style.getPropertyValue('--tp-cursor-x') === '500px' && element.style.getPropertyValue('--tp-cursor-velocity-x') === '0';
    return placed && moving && velocity && settled && exact && !element.hasAttribute('data-moving');
  },
  async reversalKeepsVelocity() {
    const { element } = await mount();
    await engage(element, 100, 100);
    fx().movePointer(600, 100, 'mouse');
    await frames(4);
    const before = element.velocity.x;
    fx().movePointer(-100, 100, 'mouse');
    const after = element.velocity.x;
    await frame();
    const next = element.velocity.x;
    return before > 50 && after === before && next < before && next > -before;
  },
  async reducedMotionSnaps() {
    const { element } = await mount('motion-policy="reduce"');
    await engage(element, 100, 100);
    fx().movePointer(700, 500, 'mouse');
    await frames(2);
    return element.position.x === 700 && element.position.y === 500 && element.velocity.x === 0 &&
      !element.hasAttribute('data-moving') && element.style.getPropertyValue('--tp-cursor-velocity-x') === '0';
  },
  async leaseSharedAndOptional() {
    const html = document.documentElement;
    const { element } = await mount();
    await engage(element);
    await frame();
    const held = html.hasAttribute('data-tp-cursor-hidden');
    const second = document.createElement('tp-cursor');
    $('#scratch').append(second);
    await second.updateComplete;
    await engage(second, 220, 200);
    element.remove();
    await frame();
    const stillHeld = html.hasAttribute('data-tp-cursor-hidden');
    second.remove();
    await frame();
    const released = !html.hasAttribute('data-tp-cursor-hidden');
    const { element: overlay } = await mount('hide-native="false"');
    await engage(overlay);
    const never = overlay.following && !html.hasAttribute('data-tp-cursor-hidden');
    return held && stillHeld && released && never;
  },
  async leaseReachesShadowParts() {
    const { element } = await mount();
    await engage(element);
    const button = nativePart($('#view-button'));
    const hidden = getComputedStyle(button).cursor === 'none' && getComputedStyle($('#view-button')).cursor === 'none';
    const area = nativePart($('#native-area'));
    const restored = getComputedStyle(area).cursor !== 'none' && getComputedStyle($('#native-area')).cursor !== 'none';
    element.remove();
    await frame();
    const back = getComputedStyle(button).cursor === 'pointer';
    return hidden && restored && back;
  },
  async zoneStateAndEvents() {
    const { element, events } = await mount();
    await engage(element);
    const zone = $('#view-zone');
    fx().enterZone(zone);
    await frame();
    const entered = element.state === 'view' && element.zone === zone && element.getAttribute('data-cursor-state') === 'view' &&
      zone.hasAttribute('data-hovered') && zone.hovered;
    const change = events.find((e) => e.type === 'tp-cursor-state-change');
    const detail = change && change.detail.value === 'view' && change.detail.previousValue === null && change.detail.zone === zone &&
      change.detail.reason === 'hover' && change.event.cancelable;
    const motion = events.some((e) => e.type === 'tp-motion-request' && e.event.request.role === 'state' && e.event.request.context.state === 'view');
    fx().leaveZone(zone);
    await frame();
    const left = element.state === null && !element.hasAttribute('data-cursor-state') && !zone.hasAttribute('data-hovered');
    return entered && detail && motion && left;
  },
  async innermostAndFor() {
    const { element } = await mount('id="contract-root"');
    await engage(element);
    fx().enterZone($('#outer-zone'));
    fx().enterZone($('#inner-zone'));
    await frame();
    const inner = element.state === 'inner';
    fx().leaveZone($('#inner-zone'));
    await frame();
    const outer = element.state === 'outer';
    fx().leaveZone($('#outer-zone'));
    await frame();
    fx().enterZone($('#ring-zone'));
    await frame();
    const foreign = element.state === null;
    fx().leaveZone($('#ring-zone'));
    $('#scratch').innerHTML = '<tp-cursor-zone id="own-zone" for="contract-root" state="own"><span>x</span></tp-cursor-zone><tp-cursor-zone id="lost-zone" for="nobody" state="lost"><span>y</span></tp-cursor-zone>';
    const own = $('#own-zone');
    await own.updateComplete;
    fx().enterZone(own);
    await frame();
    const addressed = element.state === 'own';
    fx().leaveZone(own);
    own.disabled = true;
    await own.updateComplete;
    fx().enterZone(own);
    await frame();
    const disabled = element.state === null;
    fx().leaveZone(own);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const diagnostics = window.cursorFixture.diagnostics.some((d) => d.code === 'cursor-zone-no-root');
    $('#scratch').innerHTML = '';
    return inner && outer && foreign && addressed && disabled && diagnostics;
  },
  async adoptionAndTemplate() {
    const { element } = await mount();
    await engage(element);
    const zone = $('#view-zone');
    const surface = surfaceOf(element);
    const content = contentOf(element);
    const markBefore = content.hasAttribute('data-tp-mark');
    fx().enterZone(zone);
    await frame();
    await transitions();
    const adopted = surface.style.getPropertyValue('--tp-cursor-size') === '4rem' &&
      surface.style.getPropertyValue('--tp-cursor-color') === 'rgb(220 38 38)' && getComputedStyle(surface).opacity === '0.9';
    const cloned = content.hasAttribute('data-tp-clone') && !!content.querySelector('.clone tp-badge') && !content.hasAttribute('data-tp-mark');
    fx().leaveZone(zone);
    await frame();
    const restored = surface.style.getPropertyValue('--tp-cursor-size') === '' && !content.querySelector('.clone tp-badge') && content.hasAttribute('data-tp-mark');
    return markBefore && adopted && cloned && restored;
  },
  async nativePassthrough() {
    const { element } = await mount();
    await engage(element);
    const zone = $('#native-zone');
    fx().enterZone(zone);
    await frame();
    await transitions();
    const native = element.hasAttribute('data-native') && getComputedStyle(surfaceOf(element)).opacity === '0';
    fx().leaveZone(zone);
    await frame();
    return native && !element.hasAttribute('data-native');
  },
  async stickCenterAndBounds() {
    const { element } = await mount();
    await engage(element, 50, 50);
    const centerZone = $('#stick-center');
    fx().enterZone(centerZone);
    await frame();
    await settle(element);
    const target = centerOf($('#center-button'));
    const centered = near(element.position.x, target.x) && near(element.position.y, target.y) && element.stuck && !element.hasAttribute('data-stuck');
    fx().leaveZone(centerZone);
    const boundsZone = $('#stick-bounds');
    fx().enterZone(boundsZone);
    await frame();
    const rect = $('#bounds-button').getBoundingClientRect();
    const bounds = element.hasAttribute('data-stuck') && near(parseFloat(element.style.getPropertyValue('--tp-cursor-stuck-width')), rect.width) &&
      near(parseFloat(element.style.getPropertyValue('--tp-cursor-stuck-height')), rect.height);
    const button = $('#bounds-button');
    button.style.inlineSize = `${Math.round(rect.width) + 60}px`;
    await frames(3);
    const resized = near(parseFloat(element.style.getPropertyValue('--tp-cursor-stuck-width')), rect.width + 60, 2);
    button.style.inlineSize = '';
    fx().leaveZone(boundsZone);
    await frame();
    const released = !element.hasAttribute('data-stuck') && element.style.getPropertyValue('--tp-cursor-stuck-width') === '' && !element.stuck;
    return centered && bounds && resized && released;
  },
  async zonePhysicsOverride() {
    const { element } = await mount();
    const travel = async () => {
      fx().movePointer(100, 100, 'mouse');
      await settle(element);
      fx().movePointer(600, 100, 'mouse');
      await frame();
      let count = 0;
      while (element.hasAttribute('data-moving') && count < 400) { await frame(); count++; }
      return count;
    };
    await engage(element, 100, 100);
    const plain = await travel();
    const zone = $('#heavy-zone');
    fx().enterZone(zone);
    await frame();
    const heavy = await travel();
    fx().leaveZone(zone);
    await frame();
    const restored = await travel();
    return plain > 10 && heavy < plain * 0.7 && restored > heavy;
  },
  async pressed() {
    const { element } = await mount();
    await engage(element);
    await settle(element);
    const surface = surfaceOf(element);
    const center = () => {
      const rect = surface.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    const rest = center();
    fx().press('mouse');
    const down = element.pressed && element.hasAttribute('data-pressed');
    await transitions();
    const pressedCenter = center();
    const scaled = getComputedStyle(contentOf(element)).scale === '0.85';
    // Pressing scales the content in place; the cursor never moves.
    const still = near(pressedCenter.x, rest.x, 0.5) && near(pressedCenter.y, rest.y, 0.5);
    fx().release();
    const up = !element.pressed && !element.hasAttribute('data-pressed');
    fx().press('touch');
    const touch = !element.pressed;
    fx().release();
    return down && up && touch && scaled && still;
  },
  async programmaticStateAndCancel() {
    const { element, events } = await mount();
    await engage(element);
    element.setState('custom');
    const lastChange = events.filter((e) => e.type === 'tp-cursor-state-change').at(-1);
    const set = element.state === 'custom' && element.getAttribute('data-cursor-state') === 'custom' &&
      lastChange.detail.value === 'custom' && lastChange.detail.reason === 'programmatic';
    fx().enterZone($('#drag-zone'));
    await frame();
    const replaced = element.state === 'drag';
    fx().leaveZone($('#drag-zone'));
    await frame();
    const cleared = element.state === null;
    element.setState('kept');
    fx().enterZone($('#native-zone'));
    fx().leaveZone($('#native-zone'));
    await frame();
    const persists = element.state === 'kept';
    element.setState(null);
    element.addEventListener('tp-cursor-state-change', (event) => event.preventDefault(), { once: true });
    fx().enterZone($('#drag-zone'));
    await frame();
    const vetoed = element.state === null && element.zone === null;
    fx().leaveZone($('#drag-zone'));
    await frame();
    return set && replaced && cleared && persists && vetoed;
  },
  async disabledReleases() {
    const { element, events } = await mount();
    await engage(element);
    fx().enterZone($('#view-zone'));
    await frame();
    element.disabled = true;
    await element.updateComplete;
    await frame();
    await transitions();
    const off = !element.following && !document.documentElement.hasAttribute('data-tp-cursor-hidden') && element.state === null &&
      getComputedStyle(surfaceOf(element)).opacity === '0' && events.some((e) => e.type === 'tp-cursor-follow-change' && e.detail.reason === 'disabled');
    fx().movePointer(250, 250, 'mouse');
    await frames(2);
    const ignored = !element.following;
    element.disabled = false;
    await element.updateComplete;
    await frame();
    const back = element.following;
    fx().leaveZone($('#view-zone'));
    return off && ignored && back;
  },
  async lifecycle() {
    const { element } = await mount();
    await engage(element);
    const surface = surfaceOf(element);
    const open = surface.matches(':popover-open');
    const parent = element.parentElement;
    element.remove();
    await frame();
    const closed = !surface.matches(':popover-open') && !document.documentElement.hasAttribute('data-tp-cursor-hidden') && !element.following;
    parent.append(element);
    await element.updateComplete;
    await frame();
    const reopened = surface.matches(':popover-open');
    const resumed = await engage(element, 260, 260);
    return open && closed && reopened && resumed && document.documentElement.hasAttribute('data-tp-cursor-hidden');
  },
  async accessibility() {
    const { element } = await mount();
    await engage(element);
    const surface = surfaceOf(element);
    const style = getComputedStyle(surface);
    return surface.getAttribute('aria-hidden') === 'true' && surface.matches(':popover-open') && style.pointerEvents === 'none' &&
      style.position === 'fixed' && surface.tabIndex === -1 && getComputedStyle(element).display === 'contents';
  },
  async interactiveTemplate() {
    const { element } = await mount();
    await engage(element);
    $('#scratch').innerHTML = '<tp-cursor-zone id="bad-zone" state="bad"><template><button>No</button></template><span>z</span></tp-cursor-zone>';
    const zone = $('#bad-zone');
    await zone.updateComplete;
    fx().enterZone(zone);
    await frame();
    const content = contentOf(element);
    const inert = content.querySelector('.clone button')?.inert === true;
    const reported = window.cursorFixture.diagnostics.some((d) => d.code === 'cursor-interactive-template');
    fx().leaveZone(zone);
    $('#scratch').innerHTML = '';
    return inert && reported;
  },
  async layoutStability() {
    const scratch = $('#scratch');
    scratch.innerHTML = '<p>before</p><tp-button id="wrap-me">Wrap me</tp-button><p id="after">after</p>';
    const button = $('#wrap-me');
    await button.updateComplete;
    await frame();
    const before = button.getBoundingClientRect();
    const afterBefore = $('#after').getBoundingClientRect();
    const zone = document.createElement('tp-cursor-zone');
    zone.state = 'wrapped';
    button.replaceWith(zone);
    zone.append(button);
    await zone.updateComplete;
    await frame();
    const after = button.getBoundingClientRect();
    const afterAfter = $('#after').getBoundingClientRect();
    const cursor = document.createElement('tp-cursor');
    scratch.prepend(cursor);
    await cursor.updateComplete;
    await frame();
    const afterCursor = button.getBoundingClientRect();
    const contents = getComputedStyle(zone).display === 'contents';
    scratch.innerHTML = '';
    return before.top === after.top && before.left === after.left && afterBefore.top === afterAfter.top &&
      afterCursor.top === after.top && contents;
  },
};

window.cursorContract = {
  checks,
  async run(only) {
    const report = {};
    // The page's own cursors would hold the lease and react to the constructed input.
    const pageCursors = [...document.querySelectorAll('tp-cursor')].filter((cursor) => !cursor.closest('#host, #scratch'));
    for (const cursor of pageCursors) cursor.disabled = true;
    // Chrome replays the real pointer position shortly after a load; let that pass first.
    await new Promise((resolve) => setTimeout(resolve, 400));
    await frame();
    for (const [key, check] of Object.entries(checks)) {
      if (only && !only.includes(key)) continue;
      try {
        report[key] = await check();
      } catch (error) {
        report[key] = `threw: ${error?.message ?? error}`;
      }
      document.querySelector('#host').replaceChildren();
      document.querySelector('#scratch').replaceChildren();
      for (const zone of document.querySelectorAll('tp-cursor-zone[data-hovered]')) window.cursorFixture.leaveZone(zone);
      await frame();
    }
    for (const cursor of pageCursors) cursor.disabled = false;
    const failing = Object.entries(report).filter(([, value]) => value !== true).map(([key]) => key);
    if (failing.length) throw new Error(`Failing: ${failing.join(', ')} ${JSON.stringify(report)}`);
    return report;
  },
};
