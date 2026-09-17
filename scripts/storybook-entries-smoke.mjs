import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { catalogEntries } from '../dist/index.js';

const baseUrl = process.env.STORYBOOK_URL ?? 'http://localhost:6106';
const indexResponse = await fetch(`${baseUrl}/index.json`);
if (!indexResponse.ok) throw new Error(`Storybook index returned ${indexResponse.status}`);
const index = await indexResponse.json();
const entries = Object.values(index.entries ?? index.stories ?? {});
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
const isolatedCanvasRules = ['landmark-one-main', 'page-has-heading-one', 'region'];

for (const component of catalogEntries) {
  const docs = entries.find(
    (entry) => entry.title === `Components/${component.name}` && entry.type === 'docs',
  );
  if (!docs) throw new Error(`Missing Docs page for ${component.name}`);
}

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

try {
  const buttonDocs = entries.find(
    (entry) => entry.title === 'Components/Button' && entry.type === 'docs',
  );
  if (!buttonDocs) throw new Error('Missing Button Docs page');
  await page.goto(`${baseUrl}/iframe.html?id=${buttonDocs.id}&viewMode=docs`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() =>
    [...document.querySelectorAll('h1, h2, h3')].some(
      (heading) => heading.textContent?.trim() === 'Default',
    ),
  );
  await assertDocsOrder(page, 'Button', { configurationsRequired: false });
  await page.locator('tp-button').first().waitFor();

  for (const component of catalogEntries) {
    const story = entries.find(
      (entry) => entry.title === `Components/${component.name}` && entry.name === 'Default',
    );
    if (!story) throw new Error(`Missing indexed story for ${component.name}`);
    await page.goto(`${baseUrl}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: 'networkidle',
    });
    await page.locator(component.tagName).first().waitFor({ state: 'attached' });
    const accessibility = await new AxeBuilder({ page })
      .disableRules(isolatedCanvasRules)
      .analyze();
    if (accessibility.violations.length) {
      throw new Error(
        `${story.id} accessibility violations:\n${accessibility.violations
          .map((violation) => `${violation.id}: ${violation.nodes.length}`)
          .join('\n')}`,
      );
    }
  }
  const lineByLineStory = entries.find(
    (entry) =>
      entry.title === 'Components/Accordion' && entry.name === 'External Line By Line Motion',
  );
  if (!lineByLineStory) throw new Error('Missing External Line By Line Motion Accordion story');
  await page.goto(`${baseUrl}/iframe.html?id=${lineByLineStory.id}&viewMode=story`, {
    waitUntil: 'networkidle',
  });
  const lineByLine = await page.evaluate(async () => {
    const items = [...document.querySelectorAll('tp-accordion-item')];
    const account = items.find((item) => item.value === 'account');
    const security = items.find((item) => item.value === 'security');
    const accordion = document.querySelector('tp-accordion');
    if (!accordion || !account || !security) return null;
    const paragraphs = items.map((item) => item.querySelectorAll('p').length);
    const textLengths = items.flatMap((item) =>
      [...item.querySelectorAll('p')].map((paragraph) => paragraph.textContent.trim().length),
    );
    const requests = [];
    accordion.addEventListener('tp-motion-request', (event) => {
      requests.push({
        role: event.request.role,
        phase: event.request.phase,
        claimed: event.claimed,
      });
    });
    security.triggerElement?.click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const animations = [...account.querySelectorAll('p'), ...security.querySelectorAll('p')]
      .flatMap((paragraph) => paragraph.getAnimations())
      .filter((animation) => animation.playState !== 'idle');
    const delays = animations.map((animation) => animation.effect?.getComputedTiming().delay ?? 0);
    return {
      paragraphs,
      textLengths,
      contentRequests: requests.filter((request) => request.role === 'content'),
      animations: animations.length,
      staggered: new Set(delays).size > 1,
      driven:
        account.bodyElement.hasAttribute('data-tp-motion-driven') ||
        security.bodyElement.hasAttribute('data-tp-motion-driven'),
    };
  });
  if (
    !lineByLine ||
    lineByLine.paragraphs.some((count) => count < 2) ||
    Math.max(...lineByLine.textLengths) - Math.min(...lineByLine.textLengths) < 80 ||
    lineByLine.contentRequests.length < 2 ||
    lineByLine.contentRequests.some((request) => !request.claimed) ||
    lineByLine.animations < 2 ||
    !lineByLine.staggered ||
    !lineByLine.driven
  ) {
    throw new Error(`External line-by-line story produced ${JSON.stringify(lineByLine)}`);
  }
  const disabledItemStory = entries.find(
    (entry) => entry.title === 'Components/Accordion' && entry.name === 'Disabled Item',
  );
  if (!disabledItemStory) throw new Error('Missing Disabled Item Accordion story');
  await page.goto(`${baseUrl}/iframe.html?id=${disabledItemStory.id}&viewMode=story`, {
    waitUntil: 'networkidle',
  });
  const accordion = page.locator('tp-accordion');
  const security = accordion.locator('tp-accordion-item[value="security"]');
  const account = accordion.locator('tp-accordion-item[value="account"]');
  const billing = accordion.locator('tp-accordion-item[value="billing"]');
  if ((await security.getAttribute('disabled')) === null) {
    throw new Error('Disabled Item story does not disable Security');
  }
  if (
    (await security.locator('button').getAttribute('aria-disabled')) !== 'true' ||
    (await security.locator('button').getAttribute('tabindex')) !== '-1' ||
    (await account.locator('button').getAttribute('aria-disabled')) !== 'false' ||
    (await billing.locator('button').getAttribute('aria-disabled')) !== 'false'
  ) {
    throw new Error('Disabled Item story did not isolate the disabled state');
  }
  await security.locator('button').dispatchEvent('click');
  if ((await accordion.evaluate((element) => element.value.join(' '))) !== 'account') {
    throw new Error('Disabled Security item changed the Accordion value');
  }
  await billing.locator('button').click();
  if ((await accordion.evaluate((element) => element.value.join(' '))) !== 'billing') {
    throw new Error('Enabled Billing item did not remain interactive');
  }
  await page.waitForFunction(() => {
    const accountItem = document.querySelector('tp-accordion-item[value="account"]');
    const billingItem = document.querySelector('tp-accordion-item[value="billing"]');
    return (
      accountItem?.panelElement?.dataset.state === 'absent' &&
      billingItem?.panelElement?.dataset.state === 'open' &&
      billingItem.panelElement
        .getAnimations({ subtree: true })
        .every((animation) => animation.playState === 'finished' || animation.playState === 'idle')
    );
  });
  const disabledItemAccessibility = await new AxeBuilder({ page })
    .disableRules(isolatedCanvasRules)
    .analyze();
  if (disabledItemAccessibility.violations.length) {
    throw new Error(
      `Disabled Item story accessibility violations:\n${disabledItemAccessibility.violations
        .map((violation) => `${violation.id}: ${violation.nodes.length}`)
        .join('\n')}`,
    );
  }
  const variantExpectations = {
    Default: {
      hasRootBorder: false,
      hasRootGap: false,
      hasItemBorder: false,
      hasItemRadius: false,
    },
    Line: {
      hasRootBorder: false,
      hasRootGap: false,
      hasItemBorder: false,
      hasItemRadius: false,
      hasSecondItemStartBorder: true,
    },
    Outline: {
      hasRootBorder: true,
      hasRootGap: false,
      hasItemBorder: false,
      hasItemRadius: false,
      hasSecondItemStartBorder: true,
    },
    Separated: {
      hasRootBorder: false,
      hasRootGap: true,
      hasItemBorder: true,
      hasItemRadius: true,
      hasSecondItemStartBorder: true,
    },
  };
  for (const [storyName, expected] of Object.entries(variantExpectations)) {
    const story = entries.find(
      (entry) => entry.title === 'Components/Accordion' && entry.name === storyName,
    );
    if (!story) throw new Error(`Missing ${storyName} Accordion story`);
    await page.goto(`${baseUrl}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: 'networkidle',
    });
    const appearance = await page.evaluate(() => {
      const accordion = document.querySelector('tp-accordion');
      const root = accordion?.shadowRoot?.querySelector('[part~="accordion"]');
      const items = accordion ? [...accordion.querySelectorAll('tp-accordion-item')] : [];
      if (!(root instanceof HTMLElement) || items.length < 2) return null;
      const rootStyle = getComputedStyle(root);
      const itemStyle = getComputedStyle(items[0]);
      const secondItemStyle = getComputedStyle(items[1]);
      return {
        hasRootBorder: Number.parseFloat(rootStyle.borderTopWidth) > 0,
        hasRootGap: Number.parseFloat(rootStyle.rowGap) > 0,
        hasItemBorder: Number.parseFloat(itemStyle.borderInlineStartWidth) > 0,
        hasItemRadius: Number.parseFloat(itemStyle.borderStartStartRadius) > 0,
        hasSecondItemStartBorder: Number.parseFloat(secondItemStyle.borderBlockStartWidth) > 0,
      };
    });
    if (
      !appearance ||
      Object.entries(expected).some(([property, value]) => appearance[property] !== value)
    ) {
      throw new Error(
        `${storyName} Accordion variant produced ${JSON.stringify(appearance)}; expected ${JSON.stringify(expected)}`,
      );
    }
  }
  const collapsibleStory = entries.find(
    (entry) => entry.title === 'Components/Collapsible' && entry.name === 'Default',
  );
  if (!collapsibleStory) throw new Error('Missing Default Collapsible story');
  await page.goto(`${baseUrl}/iframe.html?id=${collapsibleStory.id}&viewMode=story`, {
    waitUntil: 'networkidle',
  });
  const collapsible = page.locator('tp-collapsible');
  const collapsibleTrigger = collapsible.locator('button');
  const initialCollapsible = await collapsible.evaluate((element) => {
    const trigger = element.shadowRoot?.querySelector('[part~="collapsible-trigger"]');
    const content = element.shadowRoot?.querySelector('[part~="collapsible-content"]');
    return {
      open: element.open,
      expanded: trigger?.getAttribute('aria-expanded'),
      associated:
        Boolean(trigger?.id) &&
        trigger?.getAttribute('aria-controls') === content?.id &&
        content?.getAttribute('aria-labelledby') === trigger?.id,
      state: content?.getAttribute('data-state'),
    };
  });
  if (
    initialCollapsible.open ||
    initialCollapsible.expanded !== 'false' ||
    !initialCollapsible.associated ||
    initialCollapsible.state !== 'absent'
  ) {
    throw new Error(`Initial Collapsible contract produced ${JSON.stringify(initialCollapsible)}`);
  }
  await collapsibleTrigger.click();
  await page.waitForFunction(() => {
    const element = document.querySelector('tp-collapsible');
    const content = element?.shadowRoot?.querySelector('[part~="collapsible-content"]');
    return element?.open && content?.getAttribute('data-state') === 'open';
  });
  const openedCollapsible = await collapsible.evaluate((element) => {
    const trigger = element.shadowRoot?.querySelector('[part~="collapsible-trigger"]');
    const content = element.shadowRoot?.querySelector('[part~="collapsible-content"]');
    const body = element.bodyElement;
    const label = element.querySelector('[slot="label"]');
    const paragraph = element.querySelector('p');
    return {
      expanded: trigger?.getAttribute('aria-expanded'),
      opened: element.hasAttribute('data-open') && trigger?.hasAttribute('data-open'),
      hidden: content?.hasAttribute('hidden'),
      baselineInset:
        body instanceof HTMLElement &&
        Number.parseFloat(getComputedStyle(body).paddingInlineStart) > 0 &&
        Number.parseFloat(getComputedStyle(body).paddingBlockEnd) > 0,
      contentAligned:
        label instanceof HTMLElement &&
        paragraph instanceof HTMLElement &&
        Math.abs(label.getBoundingClientRect().left - paragraph.getBoundingClientRect().left) < 0.5,
    };
  });
  if (
    openedCollapsible.expanded !== 'true' ||
    !openedCollapsible.opened ||
    openedCollapsible.hidden ||
    !openedCollapsible.baselineInset ||
    !openedCollapsible.contentAligned
  ) {
    throw new Error(`Opened Collapsible contract produced ${JSON.stringify(openedCollapsible)}`);
  }
  const labelAlignedStory = entries.find(
    (entry) => entry.title === 'Components/Collapsible' && entry.name === 'Label Aligned Content',
  );
  if (!labelAlignedStory) throw new Error('Missing Label Aligned Content Collapsible story');
  await page.goto(`${baseUrl}/iframe.html?id=${labelAlignedStory.id}&viewMode=story`, {
    waitUntil: 'networkidle',
  });
  const labelAlignment = await page.locator('tp-collapsible').evaluate(async (element) => {
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const label = element.shadowRoot?.querySelector('[part~="collapsible-label"]');
    const content = element.bodyElement;
    if (!(label instanceof HTMLElement) || !(content instanceof HTMLElement)) return null;
    await nextFrame();
    const ltr = Math.abs(label.getBoundingClientRect().left - content.getBoundingClientRect().left);
    element.dir = 'rtl';
    await nextFrame();
    const rtl = Math.abs(
      label.getBoundingClientRect().right - content.getBoundingClientRect().right,
    );
    return {
      marker: element.dataset.contentAlignment,
      ltr,
      rtl,
    };
  });
  if (
    !labelAlignment ||
    labelAlignment.marker !== 'label' ||
    labelAlignment.ltr >= 0.5 ||
    labelAlignment.rtl >= 0.5
  ) {
    throw new Error(`Label-aligned Collapsible produced ${JSON.stringify(labelAlignment)}`);
  }
  const retainedStory = entries.find(
    (entry) => entry.title === 'Components/Collapsible' && entry.name === 'Retained',
  );
  if (!retainedStory) throw new Error('Missing Retained Collapsible story');
  await page.goto(`${baseUrl}/iframe.html?id=${retainedStory.id}&viewMode=story`, {
    waitUntil: 'networkidle',
  });
  const retainedState = await page.locator('tp-collapsible').evaluate((element) => {
    const content = element.shadowRoot?.querySelector('[part~="collapsible-content"]');
    return { state: content?.getAttribute('data-state'), hidden: content?.hasAttribute('hidden') };
  });
  if (retainedState.state !== 'retained' || !retainedState.hidden) {
    throw new Error(`Retained Collapsible contract produced ${JSON.stringify(retainedState)}`);
  }
  const findInPageStory = entries.find(
    (entry) => entry.title === 'Components/Collapsible' && entry.name === 'Find In Page',
  );
  if (!findInPageStory) throw new Error('Missing Find In Page Collapsible story');
  await page.goto(`${baseUrl}/iframe.html?id=${findInPageStory.id}&viewMode=story`, {
    waitUntil: 'networkidle',
  });
  const revealableState = await page.locator('tp-collapsible').evaluate((element) => {
    const content = element.shadowRoot?.querySelector('[part~="collapsible-content"]');
    return {
      state: content?.getAttribute('data-state'),
      hidden: content?.getAttribute('hidden'),
    };
  });
  if (revealableState.state !== 'retained' || revealableState.hidden !== 'until-found') {
    throw new Error(
      `Find-in-page Collapsible contract produced ${JSON.stringify(revealableState)}`,
    );
  }
  const accordionDocs = entries.find(
    (entry) => entry.title === 'Components/Accordion' && entry.type === 'docs',
  );
  if (!accordionDocs) throw new Error('Missing Accordion Docs page');
  await page.goto(`${baseUrl}/iframe.html?id=${accordionDocs.id}&viewMode=docs`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('heading', { name: 'Root properties' }).waitFor();
  await assertDocsOrder(page, 'Accordion');
  for (const property of [
    'variant',
    'selectionMode',
    'value',
    'defaultValue',
    'collapsible',
    'disabled',
    'keepMounted',
    'hiddenUntilFound',
    'contentAlignment',
    'accountContentAlignment',
    'onValueChange',
    'indicatorPosition',
    'securityIndicatorPosition',
    'billingIndicatorPosition',
    'itemDisabled',
    'headingLevel',
    'showLeadingContent',
  ]) {
    if (!(await page.getByRole('cell', { name: property, exact: true }).count())) {
      throw new Error(`Accordion Docs page omits ${property}`);
    }
  }
  await assertDocsSourceExpands(page, 'Accordion', '<tp-accordion');
  const collapsibleDocs = entries.find(
    (entry) => entry.title === 'Components/Collapsible' && entry.type === 'docs',
  );
  if (!collapsibleDocs) throw new Error('Missing Collapsible Docs page');
  await page.goto(`${baseUrl}/iframe.html?id=${collapsibleDocs.id}&viewMode=docs`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('heading', { name: 'Properties' }).waitFor();
  await assertDocsOrder(page, 'Collapsible');
  for (const property of [
    'open',
    'defaultOpen',
    'disabled',
    'keepMounted',
    'hiddenUntilFound',
    'motionPolicy',
    'contentAlignment',
    'indicatorPosition',
    'headingLevel',
    'showLeadingContent',
    'showTrailingContent',
    'contentMotion',
    'onOpenChange',
  ]) {
    if (!(await page.getByRole('cell', { name: property, exact: true }).count())) {
      throw new Error(`Collapsible Docs page omits ${property}`);
    }
  }
  await assertDocsSourceExpands(page, 'Collapsible', '<tp-collapsible');
  const iconDocs = entries.find(
    (entry) => entry.title === 'Components/Icon' && entry.type === 'docs',
  );
  if (!iconDocs) throw new Error('Missing Icon Docs page');
  await page.goto(`${baseUrl}/iframe.html?id=${iconDocs.id}&viewMode=docs`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('heading', { name: 'Selective imports' }).waitFor();
  await assertDocsOrder(page, 'Icon');
  for (const property of ['icon', 'label', 'size']) {
    if (!(await page.getByRole('cell', { name: property, exact: true }).count())) {
      throw new Error(`Icon Docs page omits ${property}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    JSON.stringify({
      indexedStories: entries.length,
      componentStories: catalogEntries.length,
      renderedStories: catalogEntries.length,
      documentationPages: catalogEntries.length,
      accessibilityViolations: 0,
      errors: 0,
    }),
  );
} finally {
  await browser.close();
}

async function assertDocsSourceExpands(page, componentName, expectedSource) {
  const toggle = page.getByRole('switch', { name: 'Show code' }).first();
  const sourceId = await toggle.getAttribute('aria-controls');
  if (!sourceId) throw new Error(`${componentName} Docs source toggle has no controlled region`);
  await toggle.click();
  await page.waitForFunction(
    ({ controlledId, expected }) => {
      const sourceToggle = document.querySelector(`[aria-controls="${controlledId}"]`);
      const source = document.getElementById(controlledId)?.innerText ?? '';
      return sourceToggle?.getAttribute('aria-checked') === 'true' && source.includes(expected);
    },
    { controlledId: sourceId, expected: expectedSource },
  );
  const source = await page.evaluate(
    (controlledId) => document.getElementById(controlledId)?.innerText ?? '',
    sourceId,
  );
  if (!source.includes(expectedSource)) {
    throw new Error(`${componentName} Docs source did not render ${expectedSource}`);
  }
}

async function assertDocsOrder(page, componentName, options = {}) {
  const headings = await page
    .locator('h1, h2, h3')
    .evaluateAll((elements) => elements.map((element) => element.textContent?.trim() ?? ''));
  const defaultIndex = headings.indexOf('Default');
  const configurationsIndex = headings.indexOf('Configurations');
  if (
    defaultIndex < 0 ||
    (options.configurationsRequired !== false && configurationsIndex < 0) ||
    (configurationsIndex >= 0 && defaultIndex >= configurationsIndex)
  ) {
    throw new Error(`${componentName} Docs headings are out of order: ${headings.join(' | ')}`);
  }
}
