import type { TpStatusDot } from '../../../../src/components/status-dot/index.js';
import type { MotionRequest, TpMotionRequestEvent } from '../../../../src/foundation/motion.js';

/** Contract checks for CL Status dot; run through Chrome DevTools MCP evaluation. */
export async function verifyStatusDot() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  // Timers, not animation frames: a DevTools-driven tab can throttle frames.
  const wait = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
  const settle = async () => {
    for (let n = 0; n < 3; n++) {
      await wait();
      for (const el of document.querySelectorAll<TpStatusDot>('tp-status-dot'))
        await el.updateComplete;
    }
  };
  const diagnostics: string[] = [];
  const collect = (event: Event) =>
    diagnostics.push((event as CustomEvent<{ code: string }>).detail.code);
  document.addEventListener('tp-diagnostic', collect);
  const requests: MotionRequest[] = [];
  const record = (event: Event) => requests.push((event as TpMotionRequestEvent).request);
  document.addEventListener('tp-motion-request', record);

  const root = document.createElement('section');
  root.id = 'api-checks';
  document.querySelector('main')!.append(root);
  root.innerHTML = `
    <tp-status-dot id="a-default"></tp-status-dot>
    <tp-status-dot id="a-tip" label="Boarding"></tp-status-dot>
    <tp-status-dot id="a-shown" label="Running" show-label variant="success"></tp-status-dot>
    <tp-status-dot id="a-quiet" label="Unstable" tooltip="false" variant="warning"></tp-status-dot>
    <tp-status-dot id="a-empty" show-label variant="destructive"></tp-status-dot>
    <tp-status-dot id="a-motion" label="Live" show-label motion="ping"></tp-status-dot>
    <tp-status-dot id="a-claim" label="Claimed" show-label></tp-status-dot>
    <tp-status-dot id="a-state" label="State" show-label></tp-status-dot>
    <div id="a-reduce" motion-policy="reduce"><tp-status-dot id="a-reduced" label="Rest" show-label motion="pulse"></tp-status-dot></div>
    <span style="--tp-status-dot-color: rgb(1, 2, 3)"><tp-status-dot id="a-inherited" label="Inherited" variant="success" show-label></tp-status-dot></span>
    <p id="a-after">after</p>`;
  await settle();
  const get = (id: string) => root.querySelector<TpStatusDot>('#' + id)!;
  const indicator = (el: TpStatusDot) => el.shadowRoot!.querySelector<HTMLElement>('.indicator')!;
  const labelPart = (el: TpStatusDot) =>
    el.shadowRoot!.querySelector<HTMLElement>('[part~="status-dot-label"]');
  const tooltip = (el: TpStatusDot) => el.shadowRoot!.querySelector('tp-tooltip');
  const color = (el: TpStatusDot) => getComputedStyle(indicator(el)).backgroundColor;
  const token = (name: string) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    root.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  };
  const rect = (el: Element) => {
    const box = el.getBoundingClientRect();
    return [box.x, box.y, box.width, box.height].map((n) => Math.round(n * 100) / 100).join();
  };

  // V-01: defaults, reflection and attribute spelling.
  const plain = get('a-default');
  assert(
    plain.variant === 'default' &&
      plain.label === '' &&
      plain.showLabel === false &&
      plain.tooltip === true &&
      plain.motion === 'none',
    'defaults: variant default, empty label, label hidden, tooltip on, motion none',
  );
  plain.variant = 'warning';
  plain.motion = 'pulse';
  plain.showLabel = true;
  await plain.updateComplete;
  assert(
    plain.getAttribute('variant') === 'warning' &&
      plain.getAttribute('motion') === 'pulse' &&
      plain.hasAttribute('show-label'),
    'variant, motion and show-label reflect',
  );
  plain.removeAttribute('show-label');
  plain.setAttribute('variant', 'destructive');
  plain.removeAttribute('motion');
  await plain.updateComplete;
  assert(
    plain.showLabel === false && plain.variant === 'destructive',
    'attributes update properties',
  );
  plain.motion = 'none';
  await plain.updateComplete;
  assert(get('a-quiet').tooltip === false, 'tooltip="false" turns the tooltip off');

  // V-02: variant colors and the neutral secondary.
  const roles: Record<string, string> = {
    default: '--tp-primary',
    secondary: '--tp-muted-foreground',
    success: '--tp-success',
    warning: '--tp-warning',
    destructive: '--tp-destructive',
  };
  for (const [variant, role] of Object.entries(roles)) {
    plain.variant = variant as TpStatusDot['variant'];
    await plain.updateComplete;
    assert(color(plain) === token(role), `${variant} paints ${role}`);
  }
  assert(
    getComputedStyle(indicator(plain)).transitionProperty === 'all' &&
      getComputedStyle(indicator(plain)).transitionDuration === '0s',
    'a variant change applies without a transition',
  );
  plain.setAttribute('variant', 'unknown');
  await plain.updateComplete;
  assert(color(plain) === token('--tp-primary'), 'an unknown variant keeps the default color');
  plain.variant = 'default';
  await plain.updateComplete;

  // V-03: hooks.
  plain.style.setProperty('--tp-status-dot-color', 'rgb(14, 165, 233)');
  plain.style.setProperty('--tp-status-dot-size', '12px');
  await plain.updateComplete;
  const sized = indicator(plain).getBoundingClientRect();
  assert(color(plain) === 'rgb(14, 165, 233)', 'the color hook replaces the variant color');
  assert(sized.width === 12 && sized.height === 12, 'the size hook sets the dot diameter');
  plain.style.removeProperty('--tp-status-dot-color');
  plain.style.removeProperty('--tp-status-dot-size');
  await plain.updateComplete;
  assert(color(get('a-inherited')) === 'rgb(1, 2, 3)', 'the color hook inherits from an ancestor');
  assert(
    indicator(plain).getBoundingClientRect().width === 8,
    'the default dot is the space-2 step (8px)',
  );

  // V-04: semantics per mode.
  const tip = indicator(get('a-tip'));
  assert(
    tip.getAttribute('role') === 'img' &&
      tip.getAttribute('aria-label') === 'Boarding' &&
      tip.getAttribute('tabindex') === '0' &&
      !tip.hasAttribute('aria-hidden') &&
      tooltip(get('a-tip'))?.getAttribute('describes') === 'none',
    'a hidden label names a focusable image-role dot and a describes-none tooltip presents it',
  );
  const shown = get('a-shown');
  assert(
    indicator(shown).getAttribute('aria-hidden') === 'true' &&
      !indicator(shown).hasAttribute('role') &&
      !indicator(shown).hasAttribute('tabindex') &&
      labelPart(shown)?.textContent === 'Running' &&
      !tooltip(shown) &&
      shown.hasAttribute('data-label-shown'),
    'a shown label is text beside a hidden dot, without a tooltip',
  );
  const quiet = indicator(get('a-quiet'));
  assert(
    quiet.getAttribute('role') === 'img' &&
      quiet.getAttribute('aria-label') === 'Unstable' &&
      !quiet.hasAttribute('tabindex') &&
      !tooltip(get('a-quiet')),
    'tooltip off keeps the name and drops the tab stop',
  );
  const empty = get('a-empty');
  assert(
    indicator(empty).getAttribute('aria-hidden') === 'true' &&
      !indicator(empty).hasAttribute('tabindex') &&
      !labelPart(empty) &&
      !tooltip(empty) &&
      !empty.hasAttribute('data-label-shown'),
    'an empty label is decorative',
  );
  assert(
    [...root.querySelectorAll('tp-status-dot')].every(
      (el) =>
        !el.hasAttribute('aria-label') &&
        !el.hasAttribute('role') &&
        !el.shadowRoot!.querySelector('[aria-live],[role="status"]'),
    ),
    'no name on the host and no live region',
  );

  // V-08: geometry.
  assert(
    rect(empty) === rect(indicator(empty)) && rect(get('a-tip')) === rect(indicator(get('a-tip'))),
    'without a shown label the host occupies only the dot',
  );
  // One-line label: its box is one line box.
  const dot = indicator(shown).getBoundingClientRect();
  const text = labelPart(shown)!.getBoundingClientRect();
  assert(
    Math.abs(dot.top + dot.height / 2 - (text.top + text.height / 2)) < 0.6,
    'the dot is centered on the first line of the label',
  );
  const moving = get('a-motion');
  const after = root.querySelector('#a-after')!;
  const before = [rect(moving), rect(indicator(moving)), rect(after)].join('|');
  for (const motion of ['pulse', 'ping', 'none', 'ping'] as const) {
    moving.motion = motion;
    await moving.updateComplete;
    assert(
      [rect(moving), rect(indicator(moving)), rect(after)].join('|') === before,
      `motion ${motion} leaves every box in place`,
    );
  }
  const ring = getComputedStyle(indicator(moving), '::before');
  assert(
    ring.position === 'absolute' && ring.animationName === 'tp-status-dot-ping',
    'the ping ring is an absolute layer on the dot',
  );
  assert(
    getComputedStyle(indicator(moving)).animationDuration === '0s' &&
      ring.animationDuration === '2.24s' &&
      ring.animationIterationCount === 'infinite',
    'ping runs on the ring at the placeholder cadence',
  );
  moving.motion = 'pulse';
  await moving.updateComplete;
  assert(
    getComputedStyle(indicator(moving)).animationName === 'tp-status-dot-pulse' &&
      getComputedStyle(indicator(moving)).animationDuration === '2.24s' &&
      getComputedStyle(indicator(moving), '::before').animationName === 'none',
    'pulse runs on the dot itself',
  );

  // V-10: reduced motion rests the dot.
  const reduced = indicator(get('a-reduced'));
  assert(
    getComputedStyle(reduced).animationName === 'none' && getComputedStyle(reduced).opacity === '1',
    'an ancestor reduce policy rests the pulse at full opacity',
  );
  get('a-reduced').motion = 'ping';
  await get('a-reduced').updateComplete;
  assert(
    getComputedStyle(reduced, '::before').animationName === 'none' &&
      getComputedStyle(reduced, '::before').opacity === '0',
    'an ancestor reduce policy shows no ring',
  );
  moving.motionPolicy = 'reduce';
  await moving.updateComplete;
  assert(
    getComputedStyle(indicator(moving)).animationName === 'none',
    'motion-policy="reduce" on the dot rests it',
  );
  moving.motionPolicy = 'inherit';
  await moving.updateComplete;
  assert(
    getComputedStyle(indicator(moving)).animationName === 'tp-status-dot-pulse',
    'returning to the inherited policy resumes',
  );

  // V-11: the attention role.
  requests.length = 0;
  moving.motion = 'ping';
  await moving.updateComplete;
  const start = requests.find((request) => request.owner === moving);
  assert(
    start &&
      start.role === 'attention' &&
      start.kind === 'ambient' &&
      start.phase === 'start' &&
      start.target === indicator(moving) &&
      start.fromState === 'pulse' &&
      start.toState === 'ping' &&
      start.context['motion'] === 'ping',
    'changing the motion requests the attention start with the motion as context',
  );
  moving.motion = 'none';
  await moving.updateComplete;
  const stop = requests.find((request) => request.owner === moving && request.phase === 'stop');
  assert(stop && stop.context['motion'] === 'ping', 'motion none requests the stop');
  const claim = get('a-claim');
  let played: MotionRequest | null = null;
  const driver = (event: Event) => {
    const motion = event as TpMotionRequestEvent;
    if (motion.request.owner !== claim || motion.request.phase !== 'start') return;
    motion.respondWith({
      play(request) {
        played = request;
        return { finished: new Promise<void>(() => {}), cancel() {} };
      },
    });
  };
  claim.addEventListener('tp-motion-request', driver);
  claim.motion = 'pulse';
  await claim.updateComplete;
  assert(played !== null, 'a driver can claim the attention role');
  assert(
    indicator(claim).hasAttribute('data-tp-motion-driven') &&
      getComputedStyle(indicator(claim)).animationName === 'none',
    'a claimed driver replaces the default pulse',
  );
  claim.removeEventListener('tp-motion-request', driver);
  claim.motion = 'none';
  await claim.updateComplete;
  assert(
    !indicator(claim).hasAttribute('data-tp-motion-driven'),
    'stopping releases the driven mark',
  );

  // V-12: lifecycle.
  requests.length = 0;
  const parent = moving.parentElement!;
  moving.motion = 'ping';
  moving.showLabel = false;
  await moving.updateComplete;
  moving.remove();
  await wait();
  requests.length = 0;
  parent.append(moving);
  await settle();
  assert(
    requests.some(
      (request) =>
        request.owner === moving &&
        request.phase === 'start' &&
        request.context['motion'] === 'ping',
    ),
    'reconnecting restarts the attention role',
  );
  assert(
    tooltip(moving) && indicator(moving).getAttribute('part')?.includes('tooltip-trigger'),
    'reconnecting registers the dot as the tooltip trigger again',
  );

  // V-13: parts and part state.
  const state = get('a-state');
  state.partContracts = {
    'status-dot-indicator': {
      classHook: (partState: Readonly<Record<string, unknown>>) =>
        `is-${String(partState['variant'])}-${String(partState['motion'])}-${partState['showLabel'] ? 'shown' : 'hidden'}`,
    },
  };
  await state.updateComplete;
  assert(
    indicator(state).classList.contains('is-default-none-shown'),
    'part state reports variant, motion and the shown label',
  );
  assert(
    indicator(get('a-tip')).getAttribute('part')?.split(' ').includes('status-dot-indicator') &&
      labelPart(shown)?.getAttribute('part') === 'status-dot-label',
    'indicator and label parts are exposed',
  );

  // V-07: a focused dot keeps focus when its tooltip goes away, and the label stays single.
  const held = get('a-tip');
  indicator(held).focus();
  held.showLabel = true;
  await held.updateComplete;
  await wait();
  assert(
    held.shadowRoot!.activeElement === indicator(held) &&
      indicator(held).getAttribute('tabindex') === '-1' &&
      indicator(held).getAttribute('aria-label') === 'Boarding' &&
      labelPart(held)?.getAttribute('aria-hidden') === 'true' &&
      !tooltip(held),
    'showing the label keeps focus on the named dot and hides the duplicate text',
  );
  indicator(held).blur();
  await wait();
  await held.updateComplete;
  assert(
    !indicator(held).hasAttribute('tabindex') &&
      indicator(held).getAttribute('aria-hidden') === 'true' &&
      !labelPart(held)?.hasAttribute('aria-hidden'),
    'after blur the dot leaves the tab order and the label text is exposed',
  );

  document.removeEventListener('tp-diagnostic', collect);
  document.removeEventListener('tp-motion-request', record);
  assert(diagnostics.length === 0, `no diagnostics (${diagnostics.join(', ') || 'none'})`);
  root.remove();
  return results;
}
