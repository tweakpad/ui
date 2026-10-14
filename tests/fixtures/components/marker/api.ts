import { html } from 'lit';
import type { TpMarker } from '../../../../src/components/marker/index.js';
import type { MotionRequest, TpMotionRequestEvent } from '../../../../src/foundation/motion.js';

/** Shimmer contract checks for CL Marker and §15.8; run through Chrome DevTools MCP. */
export async function verifyMarker() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  const frame = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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
    <tp-marker id="a-off">Exporting the layers</tp-marker>
    <tp-marker id="a-on" shimmer>Exporting the layers</tp-marker>
    <tp-marker id="a-toggle">Exporting the layers</tp-marker>
    <div dir="rtl"><tp-marker id="a-rtl" shimmer>Exporting the layers</tp-marker></div>
    <tp-marker id="a-claim">Exporting the layers</tp-marker>
    <tp-marker id="a-state">Exporting the layers</tp-marker>
    <div id="a-region"><tp-marker id="a-policy" shimmer>Exporting the layers</tp-marker></div>`;
  const get = (id: string) => root.querySelector<TpMarker>(`#${id}`)!;
  const content = (marker: TpMarker) =>
    marker.shadowRoot!.querySelector<HTMLElement>('[part~="marker-content"]')!;
  const sweeps = (marker: TpMarker) =>
    content(marker)
      .getAnimations()
      .filter((animation) => (animation as CSSAnimation).animationName === 'tp-shimmer');
  for (const marker of root.querySelectorAll<TpMarker>('tp-marker')) await marker.updateComplete;
  await frame();

  // V-01 / V-02: property, attribute, paint and layout neutrality.
  const off = get('a-off');
  const on = get('a-on');
  const toggle = get('a-toggle');
  assert(off.shimmer === false && !off.hasAttribute('shimmer'), 'shimmer defaults to false');
  const paint = getComputedStyle(content(on));
  assert(paint.backgroundClip === 'text', 'shimmering content clips its background to the text');
  assert(paint.webkitTextFillColor === 'rgba(0, 0, 0, 0)', 'shimmering text fill is transparent');
  assert(
    /^linear-gradient\(110deg/u.test(paint.backgroundImage),
    'gradient tilts by 90deg + 20deg',
  );
  assert(paint.backgroundRepeat === 'no-repeat', 'gradient does not repeat');
  assert(
    /^calc\(200% \+ [\d.]+px\) 100%$/u.test(paint.backgroundSize),
    'gradient spans 200% + spread',
  );
  assert(
    getComputedStyle(content(off)).backgroundImage === 'none',
    'plain content has no gradient',
  );
  const box = (marker: TpMarker) => {
    const rect = content(marker).getBoundingClientRect();
    return `${rect.width}x${rect.height}`;
  };
  assert(box(on) === box(off), 'shimmer does not change the content box');
  toggle.setAttribute('shimmer', '');
  await toggle.updateComplete;
  assert(toggle.shimmer === true && sweeps(toggle).length === 1, 'the attribute turns shimmer on');
  toggle.shimmer = false;
  await toggle.updateComplete;
  assert(!toggle.hasAttribute('shimmer'), 'the property reflects to the attribute');
  assert(
    sweeps(toggle).length === 0 &&
      getComputedStyle(content(toggle)).webkitTextFillColor !== 'rgba(0, 0, 0, 0)',
    'clearing shimmer restores ordinary text',
  );

  // V-05: cadence and reading direction.
  const [sweep] = sweeps(on);
  const timing = sweep!.effect!.getComputedTiming();
  assert(
    timing.duration === 2240 && timing.iterations === Infinity,
    'default sweep: 2240ms, endless',
  );
  assert(sweep!.effect!.getTiming().easing === 'linear', 'the sweep is linear');
  const rtl = get('a-rtl');
  const positionAt = (marker: TpMarker, progress: number) => {
    const animation = sweeps(marker)[0]!;
    animation.pause();
    animation.currentTime = 2240 * progress;
    const position = getComputedStyle(content(marker)).backgroundPositionX;
    animation.play();
    return Number.parseFloat(position);
  };
  assert(Math.abs(positionAt(on, 0.25) - 75) < 0.5, 'left-to-right sweep moves 100% → 0%');
  assert(Math.abs(positionAt(rtl, 0.25) - 25) < 0.5, 'right-to-left sweep moves 0% → 100%');

  // V-06 / V-07: hooks, play once and replay.
  on.style.setProperty('--tp-shimmer-duration', '0.5s');
  on.style.setProperty('--tp-shimmer-direction', 'reverse');
  on.style.setProperty('--tp-shimmer-color', 'rgb(255, 0, 0)');
  on.style.setProperty('--tp-shimmer-angle', '0deg');
  on.style.setProperty('--tp-shimmer-spread', '10px');
  const tuned = getComputedStyle(content(on));
  assert(sweeps(on)[0]!.effect!.getComputedTiming().duration === 500, 'duration hook applies');
  assert(
    sweeps(on)[0]!.effect!.getComputedTiming().direction === 'reverse',
    'direction hook applies',
  );
  assert(tuned.backgroundImage.includes('rgb(255, 0, 0) 50%'), 'color hook sets the highlight');
  assert(tuned.backgroundImage.startsWith('linear-gradient(90deg'), 'angle hook tilts the band');
  assert(tuned.backgroundSize === 'calc(200% + 20px) 100%', 'spread hook sizes the band');
  on.removeAttribute('style');
  const region = root.querySelector<HTMLElement>('#a-region')!;
  region.style.setProperty('--tp-shimmer-duration', '3s');
  assert(
    sweeps(get('a-policy'))[0]!.effect!.getComputedTiming().duration === 3000,
    'hooks inherit from an ancestor',
  );
  region.removeAttribute('style');
  on.style.setProperty('--tp-shimmer-iterations', '1');
  on.style.setProperty('--tp-shimmer-duration', '0.2s');
  on.shimmer = false;
  on.shimmer = true;
  await on.updateComplete;
  const once = sweeps(on)[0];
  assert(once?.effect?.getComputedTiming().iterations === 1, 'iterations hook plays one sweep');
  await once!.finished;
  assert(sweeps(on).length === 0, 'a single sweep finishes');
  assert(
    getComputedStyle(content(on)).backgroundPositionX === '0%',
    'a finished sweep rests with the band past the text',
  );
  on.shimmer = false;
  on.shimmer = true;
  await on.updateComplete;
  assert(sweeps(on).length === 1, 'clearing and setting shimmer in one frame replays the sweep');
  await frame();
  on.shimmer = false;
  await on.updateComplete;
  await frame();
  on.shimmer = true;
  await on.updateComplete;
  assert(sweeps(on).length === 1, 'setting shimmer in a later frame replays the sweep');
  on.removeAttribute('style');

  // V-08: reduced motion through the policy attribute, on the Marker and on an ancestor.
  const policy = get('a-policy');
  policy.setAttribute('motion-policy', 'reduce');
  const reduced = getComputedStyle(content(policy));
  assert(
    sweeps(policy).length === 0 &&
      reduced.backgroundImage === 'none' &&
      reduced.webkitTextFillColor === reduced.color,
    'reduce on the Marker renders ordinary text without a sweep',
  );
  policy.removeAttribute('motion-policy');
  assert(sweeps(policy).length === 1, 'leaving reduce resumes the sweep');
  region.setAttribute('motion-policy', 'reduce');
  assert(sweeps(policy).length === 0, 'reduce on an ancestor stops the sweep');
  policy.setAttribute('motion-policy', 'normal');
  assert(sweeps(policy).length === 1, 'normal on the Marker opts back in');
  policy.removeAttribute('motion-policy');
  region.removeAttribute('motion-policy');

  // V-09: the shimmer ambient motion role.
  const claim = get('a-claim');
  requests.length = 0;
  claim.shimmer = true;
  await claim.updateComplete;
  const start = requests.find((request) => request.owner === claim);
  assert(
    start?.role === 'shimmer' &&
      start.kind === 'ambient' &&
      start.phase === 'start' &&
      start.target === content(claim) &&
      Object.keys(start.context).length === 0,
    'setting shimmer requests the ambient start on Content with no context',
  );
  requests.length = 0;
  claim.shimmer = false;
  await claim.updateComplete;
  assert(
    requests.some((request) => request.owner === claim && request.phase === 'stop'),
    'clearing shimmer requests the ambient stop',
  );
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
  claim.shimmer = true;
  await claim.updateComplete;
  const driven = getComputedStyle(content(claim));
  assert(played !== null, 'a claimed driver plays the shimmer role');
  assert(content(claim).hasAttribute('data-tp-motion-driven'), 'the driven target is marked');
  assert(
    sweeps(claim).length === 0 &&
      driven.backgroundClip === 'text' &&
      driven.backgroundImage !== 'none',
    'a claimed driver replaces only the sweep; the paint remains',
  );
  claim.removeEventListener('tp-motion-request', driver);
  claim.shimmer = false;
  await claim.updateComplete;
  assert(
    !content(claim).hasAttribute('data-tp-motion-driven'),
    'stopping releases the driven mark',
  );

  // V-13: part state carries shimmer.
  const state = get('a-state');
  state.partContracts = {
    'marker-content': {
      classHook: (partState: Readonly<Record<string, unknown>>) =>
        partState['shimmer'] ? 'is-shimmering' : 'is-plain',
    },
  };
  await state.updateComplete;
  assert(content(state).classList.contains('is-plain'), 'part state reports shimmer off');
  state.shimmer = true;
  await state.updateComplete;
  assert(content(state).classList.contains('is-shimmering'), 'part state reports shimmer on');

  // V-15: reconnect restarts the role.
  requests.length = 0;
  state.remove();
  root.append(state);
  await state.updateComplete;
  await frame();
  assert(
    requests.some((request) => request.owner === state && request.phase === 'start'),
    'a reconnected shimmering Marker requests the sweep again',
  );
  assert(sweeps(state).length === 1, 'the reconnected Marker sweeps');

  // V-15: a delegated Content element takes over the role.
  const previous = content(state);
  requests.length = 0;
  state.partContracts = {
    'marker-content': {
      renderDelegate: ({ bind, content: inner }: { bind: unknown; content: unknown }) =>
        html`<em ${bind}>${inner}</em>`,
    },
  };
  await state.updateComplete;
  await frame();
  const replaced = content(state);
  assert(
    replaced !== previous && replaced.localName === 'em',
    'Content renders through a delegate',
  );
  assert(
    requests.some((request) => request.owner === state && request.target === replaced),
    'the role re-targets the delegated Content',
  );
  assert(sweeps(state).length === 1, 'the delegated Content sweeps');

  document.removeEventListener('tp-diagnostic', collect);
  document.removeEventListener('tp-motion-request', record);
  assert(diagnostics.length === 0, `no diagnostics (${diagnostics.join(', ')})`);
  root.remove();
  return results;
}
