import { html, render } from 'lit';
const built = new URL(location.href).searchParams.has('package');
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(sheet);
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
document.body.style.cssText =
  'margin:32px;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans)';
render(
  html`
    <h1>List verification</h1>
    <tp-list id="files" aria-label="Recent files" style="max-inline-size:32rem">
      <tp-list-item variant="outline" description="Edited today">Launch plan</tp-list-item>
      <tp-list-separator></tp-list-separator>
      <tp-list-item variant="outline" description="Edited yesterday">Budget review</tp-list-item>
    </tp-list>
    <tp-list-item id="standalone" description="Not in a list">Standalone row</tp-list-item>
  `,
  document.querySelector('main')!,
);
