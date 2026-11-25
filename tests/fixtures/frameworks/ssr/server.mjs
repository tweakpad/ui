// Server rendering fixture: renders the React and Vue bindings on the server, through Vite's SSR
// module loader, and serves pages that hydrate that markup in the browser.
//
//   node tests/fixtures/frameworks/ssr/server.mjs   →   http://127.0.0.1:5191/react, /vue
//
// Each page renders its app with the framework's own server renderer at request time, so the
// markup is always the current source's. The client script then hydrates it (see `checks.ts`).
import { createServer as createHttpServer } from 'node:http';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '../../../..');
const port = Number(process.env.PORT ?? 5191);
const base = '/tests/fixtures/frameworks/ssr';
const vite = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
});

async function page(framework, url) {
  const { render } = await vite.ssrLoadModule(`${base}/${framework}-app.ts`);
  const markup = await render();
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${framework === 'react' ? 'React' : 'Vue'} server rendering verification</title>
    <link rel="stylesheet" href="/src/styles.css" />
    <style>
      body { margin: 24px; color: var(--tp-foreground); background: var(--tp-background); font-family: var(--tp-font-sans); }
      .stack { display: grid; gap: 16px; max-inline-size: 360px; }
    </style>
  </head>
  <body>
    <div id="root">${markup}</div>
    <script type="module" src="${base}/${framework}-client.ts"></script>
  </body>
</html>`;
  return vite.transformIndexHtml(url, html);
}

createHttpServer(async (request, response) => {
  const url = request.url ?? '/';
  const match = /^\/(react|vue)\/?(?:\?.*)?$/u.exec(url);
  if (!match) {
    vite.middlewares(request, response, () => {
      response.statusCode = 404;
      response.end();
    });
    return;
  }
  try {
    const html = await page(match[1], url);
    response.setHeader('content-type', 'text/html');
    response.end(html);
  } catch (error) {
    vite.ssrFixStacktrace(error);
    response.statusCode = 500;
    response.end(String(error?.stack ?? error));
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`SSR fixture: http://127.0.0.1:${port}/react and http://127.0.0.1:${port}/vue`),
);
