import { html, render } from 'lit';
import { siteMark } from '../../../../src/stories/citation.examples.js';
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = new URL(location.href).searchParams.has('package')
  ? '/dist/styles.css'
  : '/src/styles.css';
document.head.append(sheet);
const built = new URL(location.href).searchParams.has('package');
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
document.body.style.cssText =
  'margin:32px;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans)';
render(
  html`
    <h1>Citation verification</h1>
    <p id="inline" style="max-inline-size:36rem">
      Tidal output is predictable
      <tp-citation
        id="preview"
        href="https://tides.example/turbines"
        src=${siteMark('#2563eb', 'T')}
        source-title="Blade wear in fast tidal streams"
        description="Ten-year inspection results from three test sites."
        >tides.example</tp-citation
      >
      and field crews confirm it
      <tp-citation id="inert" description="Kept offline.">Field interview</tp-citation>.
    </p>
    <p id="numbered" style="max-inline-size:36rem">
      Storage needs stay small<tp-citation
        id="footnote"
        source="entry-1"
        href="#entry-1"
        superscript
      ></tp-citation>
      and coastal surveys agree<tp-citation
        source="entry-2"
        href="#entry-2"
        superscript
      ></tp-citation
      >.
    </p>
    <tp-citation-list id="list" label="Sources">
      <tp-citation id="entry-1" href="https://grid.example/storage" description="Battery sizing."
        >Grid storage notes</tp-citation
      >
      <tp-citation id="entry-2" href="https://coast.example/survey"
        >Coastal survey 2025</tp-citation
      >
    </tp-citation-list>
  `,
  document.querySelector('main')!,
);
