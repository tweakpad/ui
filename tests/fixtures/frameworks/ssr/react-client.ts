// Hydrates the server-rendered React app and checks the result (`window.ssrFixture`).
import { createElement as h } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './react-app.js';
import { collectWarnings, report } from './checks.js';

const messages = collectWarnings();
const container = document.getElementById('root')!;
const serverMarkup = container.innerHTML;
hydrateRoot(container, h(App), {
  onRecoverableError: (error) => messages.push(['recoverable', String(error)]),
});
await report('react', serverMarkup, messages);
