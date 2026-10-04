const violations: unknown[] = [];
document.addEventListener('securitypolicyviolation', (event) =>
  violations.push({
    directive: event.violatedDirective,
    blocked: event.blockedURI,
    source: event.sourceFile,
    line: event.lineNumber,
  }),
);
const built = new URL(location.href).searchParams.has('package');
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.prepend(stylesheet);
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
const initialPolicy = {
  nonce: 'tweakpad-csp-test',
  disableStyleElements: new URL(location.href).searchParams.has('suppressed'),
};
const policy = new api.ContentSecurityService(document, initialPolicy);
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const input = document.getElementById('input')!;
const select = document.getElementById('select')!;
const portal = document.getElementById('portal')!;
Object.assign(select, { items: ['Apple', 'Banana', 'Cherry'] });
Object.assign(portal, {
  items: ['Apple', 'Banana', 'Cherry'],
  container: document.getElementById('portal-target'),
});
const scope = document.getElementById('scope')!;
const scopedPolicy = new api.ContentSecurityService(scope, initialPolicy);
const toast = document.getElementById('toast')!;
Object.assign(toast, { container: document.getElementById('toast-target') });
document.getElementById('notify')!.addEventListener('click', () => {
  (toast as HTMLElement & { add: (options: unknown) => void }).add({
    title: 'Saved',
    description: 'Nonce-protected notification',
  });
});
let actions = 0;
document.getElementById('action')!.addEventListener('click', () => {
  document.getElementById('result')!.textContent = `${++actions} actions`;
});
Object.assign(window, {
  cspFixture: { api, policy, scopedPolicy, scope, input, select, portal, violations, built },
});
export {};
