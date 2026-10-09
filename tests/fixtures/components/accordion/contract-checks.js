// Accordion contract checks, executed through Chrome DevTools MCP `evaluate_script`.
// Ported from the former Playwright Storybook-entries and repair smoke scripts.
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const settle = async (...elements) => {
  for (let i = 0; i < 3; i++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await frame();
  }
};
const accordion = (id) => document.querySelector(`#${id}`);
const items = (id) => [...accordion(id).querySelectorAll('tp-accordion-item')];
const item = (id, value) => accordion(id).querySelector(`tp-accordion-item[value="${value}"]`);
const fail = (name, result) => {
  const failed = Object.entries(result).filter(([, value]) => value !== true);
  if (failed.length)
    throw new Error(
      `${name} failed: ${failed.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ')}`,
    );
  return result;
};
/** Resolves once every animation inside the accordion has finished. */
export async function settled(id) {
  const root = accordion(id);
  for (let i = 0; i < 200; i++) {
    const running = root
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState !== 'finished' && animation.playState !== 'idle');
    if (!running.length) return true;
    await frame();
  }
  throw new Error(`${id} animations did not settle`);
}
/** Open values of an accordion, for tool-driven click steps. */
export const value = (id) => [...accordion(id).value];

/** Container and item chrome per variant, with the expectations of the former stories. */
export async function variantAppearance() {
  const expectations = {
    plain: { hasRootBorder: false, hasRootGap: false, hasItemBorder: false, hasItemRadius: false },
    line: {
      hasRootBorder: false,
      hasRootGap: false,
      hasItemBorder: false,
      hasItemRadius: false,
      hasSecondItemStartBorder: true,
    },
    outline: {
      hasRootBorder: true,
      hasRootGap: false,
      hasItemBorder: false,
      hasItemRadius: false,
      hasSecondItemStartBorder: true,
    },
    separated: {
      hasRootBorder: false,
      hasRootGap: true,
      hasItemBorder: true,
      hasItemRadius: true,
      hasSecondItemStartBorder: true,
    },
  };
  const results = {};
  for (const [variant, expected] of Object.entries(expectations)) {
    const root = accordion(variant);
    await settle(root, ...items(variant));
    const part = root.shadowRoot.querySelector('[part~="accordion"]');
    const [first, second] = items(variant);
    const rootStyle = getComputedStyle(part);
    const itemStyle = getComputedStyle(first);
    const secondItemStyle = getComputedStyle(second);
    const appearance = {
      hasRootBorder: Number.parseFloat(rootStyle.borderTopWidth) > 0,
      hasRootGap: Number.parseFloat(rootStyle.rowGap) > 0,
      hasItemBorder: Number.parseFloat(itemStyle.borderInlineStartWidth) > 0,
      hasItemRadius: Number.parseFloat(itemStyle.borderStartStartRadius) > 0,
      hasSecondItemStartBorder: Number.parseFloat(secondItemStyle.borderBlockStartWidth) > 0,
    };
    const mismatch = Object.entries(expected).filter(
      ([key, expectedValue]) => appearance[key] !== expectedValue,
    );
    if (mismatch.length)
      throw new Error(
        `${variant} produced ${JSON.stringify(appearance)}; expected ${JSON.stringify(expected)}`,
      );
    results[variant] = appearance;
  }
  return results;
}

/** Only the disabled Security item is inert; a programmatic click leaves the value unchanged. */
export async function disabledItem() {
  const root = accordion('disabled-item');
  await settle(root, ...items('disabled-item'));
  const trigger = (name) => item('disabled-item', name).triggerElement;
  const before = value('disabled-item').join(' ');
  trigger('security').click();
  await settle(root);
  return fail('disabledItem', {
    securityDisabled: item('disabled-item', 'security').hasAttribute('disabled'),
    securityInert:
      trigger('security').getAttribute('aria-disabled') === 'true' &&
      trigger('security').getAttribute('tabindex') === '-1',
    othersEnabled:
      trigger('account').getAttribute('aria-disabled') !== 'true' &&
      trigger('billing').getAttribute('aria-disabled') !== 'true',
    valueUnchanged: value('disabled-item').join(' ') === before && before === 'account',
  });
}
/** After the Billing trigger is clicked with the click tool. */
export async function billingOpened() {
  await settled('disabled-item');
  const account = item('disabled-item', 'account');
  const billing = item('disabled-item', 'billing');
  return fail('billingOpened', {
    value: value('disabled-item').join(' ') === 'billing',
    accountHidden: account.panelElement.hidden === true,
    billingVisible: billing.panelElement.hidden === false,
  });
}

/** The external driver claims the per-item content role and staggers paragraphs. */
export async function lineByLine(id = 'line-by-line') {
  const root = accordion(id);
  const list = items(id);
  await settle(root, ...list);
  const account = item(id, 'account');
  const security = item(id, 'security');
  const paragraphs = list.map((entry) => entry.querySelectorAll('p').length);
  const textLengths = list.flatMap((entry) =>
    [...entry.querySelectorAll('p')].map((paragraph) => paragraph.textContent.trim().length),
  );
  const requests = [];
  const record = (event) =>
    requests.push({ role: event.request.role, phase: event.request.phase, claimed: event.claimed });
  root.addEventListener('tp-motion-request', record);
  security.triggerElement.click();
  await frame();
  await frame();
  root.removeEventListener('tp-motion-request', record);
  const animations = [...account.querySelectorAll('p'), ...security.querySelectorAll('p')]
    .flatMap((paragraph) => paragraph.getAnimations())
    .filter((animation) => animation.playState !== 'idle');
  const delays = animations.map((animation) => animation.effect?.getComputedTiming().delay ?? 0);
  const contentRequests = requests.filter((request) => request.role === 'content');
  const result = {
    paragraphs: paragraphs.every((count) => count >= 2),
    varied: Math.max(...textLengths) - Math.min(...textLengths) >= 80,
    requested: contentRequests.length >= 2,
    claimed: contentRequests.every((request) => request.claimed),
    animated: animations.length >= 2,
    staggered: new Set(delays).size > 1,
    driven:
      account.bodyElement.hasAttribute('data-tp-motion-driven') ||
      security.bodyElement.hasAttribute('data-tp-motion-driven'),
  };
  await settled(id);
  return fail('lineByLine', result);
}
/** Under a reduce policy the external driver is skipped and the toggle still settles. */
export async function reducedMotion() {
  const root = accordion('reduced-motion');
  await settle(root, ...items('reduced-motion'));
  const account = item('reduced-motion', 'account');
  account.triggerElement.click();
  await frame();
  await frame();
  const animations = [...account.querySelectorAll('p')]
    .flatMap((paragraph) => paragraph.getAnimations())
    .filter((animation) => animation.playState !== 'idle');
  await settled('reduced-motion');
  return fail('reducedMotion', {
    noParagraphAnimation: animations.length === 0,
    closed: value('reduced-motion').length === 0 && account.panelElement.hidden === true,
  });
}

/** Root `partPresentation` reaches the Item's cross-shadow trigger part. */
export async function partOverride() {
  const root = accordion('plain');
  await settle(root, ...items('plain'));
  const trigger = item('plain', 'account').triggerElement;
  root.partPresentation = {
    'accordion-trigger': { styleHook: { 'padding-inline-start': '37px' } },
  };
  await settle(root, ...items('plain'));
  const overridden = getComputedStyle(trigger).paddingInlineStart === '37px';
  root.partPresentation = {};
  await settle(root, ...items('plain'));
  return fail('partOverride', {
    overridden,
    restored: getComputedStyle(trigger).paddingInlineStart !== '37px',
  });
}
/** Moving the accordion keeps the open item open. */
export async function reconnect() {
  const root = accordion('plain');
  const parent = root.parentNode;
  root.remove();
  parent.append(root);
  await settle(root, ...items('plain'));
  return fail('reconnect', {
    stillOpen: item('plain', 'account').collapsibleElement.open === true,
  });
}

/** Closed content is retained (keep-mounted) or hidden until found. */
export async function retention() {
  const retained = accordion('retained');
  const findInPage = accordion('find-in-page');
  await settle(retained, findInPage, ...items('retained'), ...items('find-in-page'));
  item('retained', 'account').triggerElement.click();
  item('find-in-page', 'account').triggerElement.click();
  await settled('retained');
  await settled('find-in-page');
  const retainedPanel = item('retained', 'account').panelElement;
  const foundPanel = item('find-in-page', 'account').panelElement;
  return fail('retention', {
    retainedClosed: value('retained').length === 0 && retainedPanel.hidden === true,
    retainedContentKept: item('retained', 'account').querySelectorAll('p').length === 2,
    hiddenUntilFound: foundPanel.getAttribute('hidden') === 'until-found',
  });
}

/** Every evaluate-only check in sequence. */
export async function runAll() {
  return {
    variantAppearance: await variantAppearance(),
    disabledItem: await disabledItem(),
    lineByLine: await lineByLine(),
    reducedMotion: await reducedMotion(),
    partOverride: await partOverride(),
    reconnect: await reconnect(),
    retention: await retention(),
  };
}
