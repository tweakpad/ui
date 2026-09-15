import { mkdir } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { catalogEntries } from '../dist/index.js';

const baseUrl = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6106';
const browserName = process.env.BROWSER ?? 'chromium';
const browserType = { chromium, firefox, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported browser: ${browserName}`);
const browser = await browserType.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

try {
  await page.goto(
    `${baseUrl}/iframe.html?id=tweakpad-ui-complete-catalog--overview&viewMode=story`,
    { waitUntil: 'networkidle' },
  );
  await page.locator('.catalog').waitFor();

  const tags = catalogEntries.map((entry) => entry.tagName);
  const registration = await page.evaluate(
    (publicTags) =>
      Object.fromEntries(publicTags.map((tag) => [tag, Boolean(customElements.get(tag))])),
    tags,
  );
  const missingRegistrations = Object.entries(registration)
    .filter(([, registered]) => !registered)
    .map(([tag]) => tag);
  if (missingRegistrations.length)
    throw new Error(`Missing registrations: ${missingRegistrations.join(', ')}`);

  for (const entry of catalogEntries) {
    const count = await page.locator(entry.tagName).count();
    if (count < 1) throw new Error(`Storybook does not render ${entry.tagName}`);
  }

  const checkbox = page.locator('tp-checkbox').first();
  await checkbox.locator('label').click();
  if (!(await checkbox.evaluate((element) => element.checked)))
    throw new Error('Checkbox did not commit checked state');

  await checkbox.evaluate((element) => {
    element.required = true;
    element.checked = false;
    element.requestUpdate();
  });
  await checkbox.evaluate((element) => element.updateComplete);
  if (await checkbox.evaluate((element) => element.checkValidity()))
    throw new Error('Required checkbox did not report invalid state');
  await checkbox.locator('label').click();
  if (!(await checkbox.evaluate((element) => element.checkValidity())))
    throw new Error('Checked required checkbox remained invalid');

  const tabs = page.locator('tp-tabs').first();
  await tabs.locator('[slot="tab"]').nth(1).click();
  if (
    await tabs
      .locator('[slot="panel"]')
      .nth(1)
      .evaluate((element) => element.hidden)
  )
    throw new Error('Tabs did not reveal the selected panel');
  await tabs.locator('[slot="tab"]').nth(0).focus();
  await page.keyboard.press('ArrowRight');
  if ((await tabs.evaluate((element) => element.value)) !== 'two')
    throw new Error('Tabs did not activate with arrow-key navigation');

  const radio = page.locator('tp-radio-group').first();
  await radio.locator('[value="one"]').focus();
  await page.keyboard.press('ArrowRight');
  if ((await radio.evaluate((element) => element.value)) !== 'two')
    throw new Error('Radio group did not select with arrow-key navigation');

  const select = page.locator('tp-select').first();
  await select.locator('button.toggle').click();
  await select.locator('[role="option"]').nth(1).click();
  if ((await select.evaluate((element) => element.value)) !== 'large')
    throw new Error('Select did not commit the selected value');

  const dialog = page.locator('tp-dialog').first();
  await dialog.locator('[slot="trigger"]').click();
  if (!(await dialog.evaluate((element) => element.open))) throw new Error('Dialog did not open');
  await page.keyboard.press('Escape');
  if (await dialog.evaluate((element) => element.open))
    throw new Error('Dialog did not dismiss with Escape');

  const popover = page.locator('tp-popover').first();
  await popover.locator('[slot="trigger"]').click();
  const positionedSurface = popover.locator('[data-positioned]');
  await positionedSurface.waitFor();
  const surfaceBox = await positionedSurface.boundingBox();
  if (
    !surfaceBox ||
    surfaceBox.x < 0 ||
    surfaceBox.y < 0 ||
    surfaceBox.x + surfaceBox.width > 1440 ||
    surfaceBox.y + surfaceBox.height > 1000
  ) {
    throw new Error(`Popover positioning escaped the viewport: ${JSON.stringify(surfaceBox)}`);
  }
  await page.keyboard.press('Escape');
  if (await popover.evaluate((element) => element.open))
    throw new Error('Popover did not dismiss with Escape');

  const pagination = page.locator('tp-pagination').first();
  await pagination.locator('button[part~="next"]').click();
  if ((await pagination.evaluate((element) => element.page)) !== 5)
    throw new Error('Pagination did not advance');

  const menu = page.locator('tp-menu').first();
  await menu.locator('[value="edit"]').focus();
  await page.keyboard.press('d');
  if (
    !(await menu
      .locator('[value="duplicate"]')
      .evaluate((element) => element === document.activeElement))
  ) {
    throw new Error('Menu typeahead did not move focus to the matching item');
  }

  const carousel = page.locator('tp-carousel').first();
  if (!(await carousel.getByText('1 of 2').isVisible()))
    throw new Error('Carousel did not reconcile its slide inventory');
  await carousel.locator('button[part~="next"]').click();
  if ((await carousel.evaluate((element) => element.index)) !== 1)
    throw new Error('Carousel did not advance');

  const form = page.locator('tp-form').first();
  await form.locator('tp-input').locator('input').fill('Ada');
  const formValue = await form.evaluate((element) => new FormData(element.form).get('name'));
  if (formValue !== 'Ada') throw new Error(`Form-associated input produced ${String(formValue)}`);

  const accessibility = await new AxeBuilder({ page }).analyze();
  if (accessibility.violations.length) {
    throw new Error(
      `Accessibility violations:\n${accessibility.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => `${node.target.join(' > ')} (${node.failureSummary})`).join('; ')}`).join('\n')}`,
    );
  }

  await mkdir(new URL('../tmp', import.meta.url), { recursive: true });
  await page.screenshot({
    path: new URL('../tmp/catalog-overview.png', import.meta.url).pathname,
    fullPage: false,
  });

  if (errors.length) throw new Error(errors.join('\n'));
  await page.goto(
    `${baseUrl}/iframe.html?id=tweakpad-ui-complete-catalog--states-and-motion&viewMode=story`,
    { waitUntil: 'networkidle' },
  );
  const statesAccessibility = await new AxeBuilder({ page }).analyze();
  if (statesAccessibility.violations.length) {
    throw new Error(
      `State-story accessibility violations:\n${statesAccessibility.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`).join('\n')}`,
    );
  }

  console.log(
    JSON.stringify({
      browser: browserName,
      controls: catalogEntries.length,
      registrations: Object.keys(registration).length,
      interactions: 12,
      accessibilityViolations: 0,
      errors: 0,
    }),
  );
} finally {
  await browser.close();
}
