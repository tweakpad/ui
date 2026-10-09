// Collapsible contract checks, executed through Chrome DevTools MCP `evaluate_script`.
// Ported from the former Playwright Storybook-entries smoke script.
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const settle = async (element) => {
  for (let i = 0; i < 3; i++) {
    await element.updateComplete;
    await frame();
  }
};
const host = (id) => document.querySelector(`#${id}`);
const part = (element, name) => element.shadowRoot.querySelector(`[part~="collapsible-${name}"]`);
const fail = (name, result) => {
  const failed = Object.entries(result).filter(([, value]) => value !== true);
  if (failed.length)
    throw new Error(
      `${name} failed: ${failed.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ')}`,
    );
  return result;
};
/** Resolves once every animation inside the collapsible has finished. */
export async function settled(id) {
  const element = host(id);
  for (let i = 0; i < 200; i++) {
    const running = element
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState !== 'finished' && animation.playState !== 'idle');
    if (!running.length) return true;
    await frame();
  }
  throw new Error(`${id} animations did not settle`);
}

/** Closed by default: trigger/content association and hidden content. */
export async function initialContract(id = 'default') {
  const element = host(id);
  await settle(element);
  const trigger = part(element, 'trigger');
  const content = part(element, 'content');
  return fail('initialContract', {
    closed: element.open === false,
    collapsed: trigger.getAttribute('aria-expanded') === 'false',
    associated:
      Boolean(trigger.id) &&
      trigger.getAttribute('aria-controls') === content.id &&
      content.getAttribute('aria-labelledby') === trigger.id,
    hidden: content.hidden === true,
  });
}

/** After the trigger is clicked with the click tool: expanded, visible, inset and aligned. */
export async function openedContract(id = 'default') {
  const element = host(id);
  await settled(id);
  const trigger = part(element, 'trigger');
  const content = part(element, 'content');
  const body = element.bodyElement;
  const label = element.querySelector('[slot="label"]');
  const paragraph = element.querySelector('p');
  return fail('openedContract', {
    open: element.open === true,
    expanded: trigger.getAttribute('aria-expanded') === 'true',
    markers: element.hasAttribute('data-open') && trigger.hasAttribute('data-open'),
    visible: !content.hasAttribute('hidden'),
    baselineInset:
      Number.parseFloat(getComputedStyle(body).paddingInlineStart) > 0 &&
      Number.parseFloat(getComputedStyle(body).paddingBlockEnd) > 0,
    contentAligned:
      Math.abs(label.getBoundingClientRect().left - paragraph.getBoundingClientRect().left) < 0.5,
  });
}

/** Label alignment holds in both directions when Leading content is present. */
export async function labelAlignment(id = 'label-aligned') {
  const element = host(id);
  await settle(element);
  const label = part(element, 'label');
  const content = element.bodyElement;
  const ltr = Math.abs(label.getBoundingClientRect().left - content.getBoundingClientRect().left);
  element.dir = 'rtl';
  await settle(element);
  const rtl = Math.abs(label.getBoundingClientRect().right - content.getBoundingClientRect().right);
  element.removeAttribute('dir');
  await settle(element);
  return fail('labelAlignment', {
    marker: element.dataset.contentAlignment === 'label',
    ltrAligned: ltr < 0.5,
    rtlAligned: rtl < 0.5,
  });
}

/** Closed content stays mounted (keep-mounted) or is hidden until found. */
export async function retention() {
  const retained = host('retained');
  const findInPage = host('find-in-page');
  await settle(retained);
  await settle(findInPage);
  return fail('retention', {
    retainedHidden: part(retained, 'content').hidden === true,
    retainedContentKept: retained.querySelectorAll('p').length === 2,
    hiddenUntilFound: part(findInPage, 'content').getAttribute('hidden') === 'until-found',
  });
}

/** The disabled trigger is inert and a programmatic click leaves the state closed. */
export async function disabled() {
  const element = host('disabled');
  await settle(element);
  const trigger = part(element, 'trigger');
  trigger.click();
  await settle(element);
  return fail('disabled', {
    inert: trigger.disabled === true || trigger.getAttribute('aria-disabled') === 'true',
    closed: element.open === false,
    marker: element.hasAttribute('data-disabled') || trigger.hasAttribute('data-disabled'),
  });
}

/** The external driver claims the content role and staggers paragraphs on exit and enter. */
export async function lineByLine() {
  const element = host('line-by-line');
  await settle(element);
  const requests = [];
  const record = (event) =>
    requests.push({ role: event.request.role, phase: event.request.phase, claimed: event.claimed });
  element.addEventListener('tp-motion-request', record);
  part(element, 'trigger').click();
  await frame();
  await frame();
  const animations = [...element.querySelectorAll('p')]
    .flatMap((paragraph) => paragraph.getAnimations())
    .filter((animation) => animation.playState !== 'idle');
  const delays = animations.map((animation) => animation.effect?.getComputedTiming().delay ?? 0);
  await settled('line-by-line');
  part(element, 'trigger').click();
  await settled('line-by-line');
  element.removeEventListener('tp-motion-request', record);
  const content = requests.filter((request) => request.role === 'content');
  return fail('lineByLine', {
    exitRequested: content.some((request) => request.phase === 'exit'),
    enterRequested: content.some((request) => request.phase === 'enter'),
    claimed: content.every((request) => request.claimed),
    animated: animations.length >= 2,
    staggered: new Set(delays).size > 1,
    reopened: element.open === true,
  });
}

/** Every evaluate-only check in sequence. */
export async function runAll() {
  return {
    initialContract: await initialContract(),
    labelAlignment: await labelAlignment(),
    retention: await retention(),
    disabled: await disabled(),
    lineByLine: await lineByLine(),
  };
}
