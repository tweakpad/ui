import { chromium } from 'playwright';
import { createServer } from 'vite';

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
  </body>
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
    Boolean(customElements.get('tp-button') && customElements.get('tp-input')),
  );
  if (!registered) throw new Error('Published register entry point did not define components');
  await page.locator('tp-button').locator('button').click();
  const inputValue = await page.locator('tp-input').evaluate((element) => element.value);
  if (inputValue !== 'Phase 1')
    throw new Error(`Published input did not initialize its value: ${String(inputValue)}`);
  const accent = await page
    .locator('tp-button')
    .evaluate((element) => getComputedStyle(element).getPropertyValue('--tp-color-accent').trim());
  if (!accent) throw new Error('Published stylesheet did not load');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ entryPoints: 3, registrations: 2, stylesheet: true, errors: 0 }));
} finally {
  await browser.close();
  await server.close();
}
