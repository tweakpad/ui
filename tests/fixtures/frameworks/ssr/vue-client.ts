// Hydrates the server-rendered Vue app and checks the result (`window.ssrFixture`).
import { createSSRApp } from 'vue';
import { App } from './vue-app.js';
import { collectWarnings, report } from './checks.js';

const messages = collectWarnings();
const container = document.getElementById('root')!;
const serverMarkup = container.innerHTML;
const app = createSSRApp(App);
app.config.warnHandler = (message) => messages.push(['vue', message]);
app.mount(container);
await report('vue', serverMarkup, messages);
