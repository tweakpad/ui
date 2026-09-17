import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const publishedModules = new Map();
async function collectPublishedModules(url) {
  if (publishedModules.has(url.href)) return;
  const source = await readFile(url, 'utf8');
  publishedModules.set(url.href, source);
  for (const [, specifier] of source.matchAll(
    /\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?["']([^"']+)["']/gu,
  )) {
    if (specifier.startsWith('.')) await collectPublishedModules(new URL(specifier, url));
  }
}

await collectPublishedModules(new URL('../dist/register/icon.js', import.meta.url));
await collectPublishedModules(new URL('../dist/icons/plus.js', import.meta.url));
const selectiveGraph = [...publishedModules.values()].join('\n');
if (selectiveGraph.includes('m9 18 6-6-6-6') || selectiveGraph.includes('chevron-right.js')) {
  throw new Error('Selective Icon imports include the unrelated Accordion chevron');
}
if (!selectiveGraph.includes('M12 5v14M5 12h14')) {
  throw new Error('Selective Icon imports omitted the requested plus definition');
}

const pageHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/dist/styles.css">
    <script type="module" src="/dist/register.js"></script>
  </head>
  <body>
    <tp-button>Publish</tp-button>
    <tp-input name="title" value="Phase 1" label="Title"></tp-input>
    <tp-accordion value="account">
      <tp-accordion-item value="account" indicator-position="leading">
        <span slot="label">Account</span>
        <p>Profile</p>
      </tp-accordion-item>
    </tp-accordion>
  </body>
</html>`;

const iconPageHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script type="module">
      import '/dist/register/icon.js';
      import { plusIcon } from '/dist/icons/plus.js';
      document.querySelector('tp-icon').icon = plusIcon;
    </script>
  </head>
  <body><tp-icon label="Add"></tp-icon></body>
</html>`;

const server = await createServer({
  root: new URL('..', import.meta.url).pathname,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 },
  plugins: [
    {
      name: 'package-smoke-page',
      configureServer(viteServer) {
        viteServer.middlewares.use('/__package-smoke', (_request, response) => {
          response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          response.end(pageHtml);
        });
        viteServer.middlewares.use('/__icon-package-smoke', (_request, response) => {
          response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          response.end(iconPageHtml);
        });
      },
    },
  ],
});
await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === 'string') throw new Error('Package smoke server did not start');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

try {
  await page.goto(`http://127.0.0.1:${address.port}/__package-smoke`, { waitUntil: 'networkidle' });
  const registered = await page.evaluate(() =>
    Boolean(
      customElements.get('tp-button') &&
      customElements.get('tp-input') &&
      customElements.get('tp-accordion') &&
      customElements.get('tp-accordion-item') &&
      customElements.get('tp-icon'),
    ),
  );
  if (!registered) throw new Error('Published register entry point did not define components');
  await page.locator('tp-button').locator('button').click();
  const inputValue = await page.locator('tp-input').evaluate((element) => element.value);
  if (inputValue !== 'Phase 1')
    throw new Error(`Published input did not initialize its value: ${String(inputValue)}`);
  const accordionItem = page.locator('tp-accordion-item');
  await page.waitForFunction(
    () =>
      document.querySelector('tp-accordion-item')?.triggerElement?.getAttribute('aria-expanded') ===
      'true',
  );
  if (
    !(await accordionItem.evaluate(
      (element) =>
        element.dataset.iconEdge === 'leading' &&
        element.triggerElement?.getAttribute('aria-controls') === element.panelElement?.id,
    ))
  )
    throw new Error('Published Accordion Item did not initialize its position or relationships');
  const accent = await page
    .locator('tp-button')
    .evaluate((element) => getComputedStyle(element).getPropertyValue('--tp-accent').trim());
  if (!accent) throw new Error('Published stylesheet did not load');
  await page.goto(`http://127.0.0.1:${address.port}/__icon-package-smoke`, {
    waitUntil: 'networkidle',
  });
  const selectiveIcon = await page.locator('tp-icon').evaluate((element) => ({
    iconRegistered: Boolean(customElements.get('tp-icon')),
    accordionNotRegistered: !customElements.get('tp-accordion'),
    path: element.shadowRoot?.querySelector('path')?.getAttribute('d'),
    named: element.getAttribute('role') === 'img' && element.getAttribute('aria-label') === 'Add',
  }));
  if (
    !selectiveIcon.iconRegistered ||
    !selectiveIcon.accordionNotRegistered ||
    selectiveIcon.path !== 'M12 5v14M5 12h14' ||
    !selectiveIcon.named
  ) {
    throw new Error(`Selective published Icon entry failed: ${JSON.stringify(selectiveIcon)}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ entryPoints: 5, registrations: 5, stylesheet: true, errors: 0 }));
} finally {
  await browser.close();
  await server.close();
}
