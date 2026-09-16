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
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    JSON.stringify({
      indexedStories: entries.length,
      componentStories: catalogEntries.length,
      renderedStories: catalogEntries.length,
      accessibilityViolations: 0,
      errors: 0,
    }),
  );
} finally {
  await browser.close();
}
