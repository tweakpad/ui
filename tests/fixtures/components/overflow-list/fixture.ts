import { html, render } from 'lit';

const built = new URL(location.href).searchParams.has('package');
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(sheet);
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
document.body.style.cssText =
  'margin:32px;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans);font-size:var(--tp-text-sm)';

const box = 'border:1px dashed var(--tp-border);padding:4px;margin-block:4px';
const skills = [
  'First aid',
  'Forklift',
  'Spanish',
  'Sound desk',
  'Rigging',
  'Catering',
  'Photography',
  'Signage',
  'Night shifts',
  'Radio',
  'Ticketing',
  'Lighting',
];
const badges = (count = skills.length) =>
  skills.slice(0, count).map((label) => html`<tp-badge variant="outline">${label}</tp-badge>`);

render(
  html`
    <h1>Overflow list verification</h1>

    <section id="limits">
      <h2>Item limit</h2>
      <div style=${box}>
        <tp-overflow-list id="limit-end" limit="3">${badges(8)}</tp-overflow-list>
      </div>
      <div style=${box}>
        <tp-overflow-list id="limit-start" limit="3" collapse-from="start"
          >${badges(8)}</tp-overflow-list
        >
      </div>
    </section>

    <section id="rows">
      <h2>Row limit (resize the boxes)</h2>
      <div
        id="rows-box"
        style="${box};inline-size:360px;resize:horizontal;overflow:hidden;min-inline-size:24px"
      >
        <tp-overflow-list id="rows-end" max-rows="2">${badges()}</tp-overflow-list>
      </div>
      <p id="rows-after">Content after the two-row list.</p>
      <div
        id="rows-start-box"
        style="${box};inline-size:360px;resize:horizontal;overflow:hidden;min-inline-size:24px"
      >
        <tp-overflow-list id="rows-start" max-rows="1" collapse-from="start"
          >${badges()}</tp-overflow-list
        >
      </div>
      <div style="${box};inline-size:360px" dir="rtl">
        <tp-overflow-list id="rows-rtl" max-rows="1">${badges()}</tp-overflow-list>
      </div>
      <div style="${box};writing-mode:vertical-rl;inline-size:300px;block-size:160px">
        <tp-overflow-list id="rows-vertical" max-rows="2">${badges()}</tp-overflow-list>
      </div>
    </section>

    <section id="tracks">
      <h2>Tracks</h2>
      <div id="flex-row" style="${box};display:flex;gap:8px;align-items:center;inline-size:420px">
        <strong>Skills</strong>
        <tp-overflow-list id="track-flex" max-rows="1" style="flex:1">${badges()}</tp-overflow-list>
      </div>
      <div
        id="grid-row"
        style="${box};display:grid;grid-template-columns:auto auto;gap:8px;inline-size:420px"
      >
        <strong>Skills</strong>
        <tp-overflow-list id="track-grid" max-rows="1">${badges()}</tp-overflow-list>
      </div>
      <table id="table-row" style="${box};inline-size:420px;border-collapse:collapse">
        <tbody>
          <tr>
            <th scope="row" style="text-align:start">Noor Haddad</th>
            <td><tp-overflow-list id="track-table" max-rows="1">${badges()}</tp-overflow-list></td>
          </tr>
        </tbody>
      </table>
      <div style="${box};inline-size:420px">
        <span>Inline:</span>
        <tp-overflow-list id="track-inline" max-rows="1" style="display:inline-block"
          >${badges(3)}</tp-overflow-list
        >
      </div>
    </section>

    <section id="custom">
      <h2>Custom count</h2>
      <div style="${box};inline-size:360px">
        <tp-overflow-list id="custom-list" max-rows="1">
          ${badges()}
          <span slot="count"
            ><tp-button id="custom-button" variant="outline" size="xs">+0</tp-button></span
          >
        </tp-overflow-list>
      </div>
    </section>

    <section id="unrendered">
      <h2>Inside a closed disclosure</h2>
      <details id="closed">
        <summary>Show crew</summary>
        <div style="inline-size:240px">
          <tp-overflow-list id="closed-list" max-rows="1">${badges()}</tp-overflow-list>
        </div>
      </details>
    </section>
  `,
  document.getElementById('fixture')!,
);

const custom = document.getElementById('custom-list') as HTMLElement & { hiddenCount: number };
const button = document.getElementById('custom-button')!;
custom.addEventListener('tp-overflow-change', () => {
  button.textContent = `+${custom.hiddenCount}`;
  button.setAttribute('aria-label', `${custom.hiddenCount} more skills`);
});
