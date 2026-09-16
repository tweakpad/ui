import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { catalogEntries } from '../dist/index.js';

const baseUrl = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6106';
const indexResponse = await fetch(`${baseUrl}/index.json`);
if (!indexResponse.ok) throw new Error(`Storybook index returned ${indexResponse.status}`);
const index = await indexResponse.json();
const entries = Object.values(index.entries ?? index.stories ?? {});
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

try {
  for (const component of catalogEntries) {
    const story = entries.find(
      (entry) => entry.title === `Components/${component.name}` && entry.name === 'Default',
    );
    if (!story) throw new Error(`Missing indexed story for ${component.name}`);
    await page.goto(`${baseUrl}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: 'networkidle',
    });
    await page.locator('main.story').waitFor();
    if ((await page.locator(component.tagName).count()) < 1) {
      throw new Error(`${story.id} does not render ${component.tagName}`);
    }
    const accessibility = await new AxeBuilder({ page }).analyze();
    if (accessibility.violations.length) {
      throw new Error(
        `${story.id} accessibility violations:\n${accessibility.violations
          .map((violation) => `${violation.id}: ${violation.nodes.length}`)
          .join('\n')}`,
      );
    }
  }
  const customFadeStory = entries.find(
    (entry) => entry.title === 'Components/Accordion' && entry.name === 'Custom Fade Duration',
  );
  if (!customFadeStory) throw new Error('Missing Custom Fade Duration Accordion story');
  await page.goto(`${baseUrl}/iframe.html?id=${customFadeStory.id}&viewMode=story`, {
    waitUntil: 'networkidle',
  });
  const customFade = await page.evaluate(async () => {
    const items = [...document.querySelectorAll('tp-accordion-item')];
    const account = items.find((item) => item.value === 'account');
    const security = items.find((item) => item.value === 'security');
    const body = account?.bodyElement;
    if (!account || !security || !body) return null;
    const paragraphs = items.map((item) => item.querySelectorAll('p').length);
    const textLengths = items.flatMap((item) =>
      [...item.querySelectorAll('p')].map((paragraph) => paragraph.textContent.trim().length),
    );
    const property = getComputedStyle(body).transitionProperty;
    const duration = getComputedStyle(body).transitionDuration;
    security.triggerElement?.click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const activeFade = account.panelElement
      ?.getAnimations({ subtree: true })
      .some((animation) => animation.effect?.getKeyframes().some((frame) => frame.opacity === '0'));
    return { paragraphs, textLengths, property, duration, activeFade };
  });
  if (
    !customFade ||
    customFade.paragraphs.some((count) => count < 2) ||
    Math.max(...customFade.textLengths) - Math.min(...customFade.textLengths) < 80 ||
    customFade.property !== 'opacity' ||
    customFade.duration !== '0.32s' ||
    !customFade.activeFade
  ) {
    throw new Error(`Custom Fade Duration story produced ${JSON.stringify(customFade)}`);
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
  const disabledItemAccessibility = await new AxeBuilder({ page }).analyze();
  if (disabledItemAccessibility.violations.length) {
    throw new Error(
      `Disabled Item story accessibility violations:\n${disabledItemAccessibility.violations
        .map((violation) => `${violation.id}: ${violation.nodes.length}`)
        .join('\n')}`,
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
  for (const property of [
    'selectionMode',
    'value',
    'defaultValue',
    'collapsible',
    'disabled',
    'keepMounted',
    'hiddenUntilFound',
    'onValueChange',
    'indicatorPosition',
    'securityIndicatorPosition',
    'billingIndicatorPosition',
    'itemDisabled',
    'headingLevel',
  ]) {
    if (!(await page.getByRole('cell', { name: property, exact: true }).count())) {
      throw new Error(`Accordion Docs page omits ${property}`);
    }
  }
  const iconDocs = entries.find(
    (entry) => entry.title === 'Components/Icon' && entry.type === 'docs',
  );
  if (!iconDocs) throw new Error('Missing Icon Docs page');
  await page.goto(`${baseUrl}/iframe.html?id=${iconDocs.id}&viewMode=docs`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('heading', { name: 'Selective imports' }).waitFor();
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
      documentationPages: 2,
      accessibilityViolations: 0,
      errors: 0,
    }),
  );
} finally {
  await browser.close();
}
