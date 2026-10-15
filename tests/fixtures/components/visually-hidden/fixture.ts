import { html, render } from 'lit';
import { mapPinIcon } from '../../../../src/icons/map.js';
import { sunIcon } from '../../../../src/icons/sun.js';
import { waypointsIcon } from '../../../../src/icons/waypoints.js';
import { navigationIcons } from '../../../../src/icons/navigation.js';

const params = new URL(location.href).searchParams;
const built = params.has('package');
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(sheet);
// Diagnostics of elements that render at load, read by api.ts.
const diagnostics: { code: string; target: EventTarget | null }[] = [];
(window as unknown as { __tpDiagnostics: typeof diagnostics }).__tpDiagnostics = diagnostics;
document.addEventListener('tp-diagnostic', (event) =>
  diagnostics.push({
    code: (event as CustomEvent<{ code: string }>).detail.code,
    target: event.composedPath()[0] ?? null,
  }),
);
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
// ?scheme=dark or ?scheme=light pins one theme for visual review.
if (params.get('scheme')) document.documentElement.style.colorScheme = params.get('scheme')!;
document.body.style.cssText =
  'margin:32px;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans);font-size:var(--tp-text-sm)';

const section = 'display:grid;gap:12px;margin-block:20px;max-inline-size:520px';
const loans = [
  ['Orbital sander', 'Fri 18 Oct'],
  ['Pole saw', 'Mon 21 Oct'],
] as const;

render(
  html`
    <h1>Visually hidden verification</h1>

    <section id="names" style=${section}>
      <h2>Icon-only controls</h2>
      <tp-toggle-group label="Trail map layers" multiple variant="outline">
        <tp-toggle value="campsites" id="toggle-campsites">
          <tp-icon .icon=${mapPinIcon}></tp-icon>
          <tp-visually-hidden>Campsites</tp-visually-hidden>
        </tp-toggle>
        <tp-toggle value="routes">
          <tp-icon .icon=${waypointsIcon}></tp-icon>
          <tp-visually-hidden>Trail routes</tp-visually-hidden>
        </tp-toggle>
        <tp-toggle value="sun">
          <tp-icon .icon=${sunIcon}></tp-icon>
          <tp-visually-hidden>Sun exposure</tp-visually-hidden>
        </tp-toggle>
      </tp-toggle-group>
      <p>
        <tp-button id="button-label" variant="outline" size="icon" .icon=${navigationIcons.trash}
          >Remove plot</tp-button
        >
        <tp-button
          id="button-unnamed"
          variant="outline"
          size="icon"
          .icon=${navigationIcons.trash}
        ></tp-button>
        <tp-button
          id="button-aria"
          variant="outline"
          size="icon"
          .icon=${navigationIcons.trash}
          aria-label="Clear plot"
        ></tp-button>
        <tp-button id="button-text" variant="outline">Water now</tp-button>
        <a id="link-icon" href="#names"
          ><tp-icon .icon=${navigationIcons.map}></tp-icon
          ><tp-visually-hidden>Open the garden map</tp-visually-hidden></a
        >
      </p>
    </section>

    <section id="status" style=${section}>
      <h2>Status region</h2>
      <p>
        <tp-button id="status-trigger" variant="outline" size="sm">Count seedlings</tp-button>
      </p>
      <tp-visually-hidden id="status-region" role="status"></tp-visually-hidden>
      <p id="described" aria-describedby="description">Plot B-14</p>
      <tp-visually-hidden id="description">Partial shade, clay soil</tp-visually-hidden>
    </section>

    <section id="context" style=${section}>
      <h2>Context for repeated actions</h2>
      <tp-table label="Your loans">
        <tp-table-header
          ><tp-table-row>
            <tp-table-head scope="col">Tool</tp-table-head>
            <tp-table-head scope="col">Due</tp-table-head>
            <tp-table-head scope="col"
              ><tp-visually-hidden>Actions</tp-visually-hidden></tp-table-head
            >
          </tp-table-row></tp-table-header
        >
        <tp-table-body>
          ${loans.map(
            ([tool, due]) =>
              html`<tp-table-row>
                <tp-table-head scope="row">${tool}</tp-table-head>
                <tp-table-cell>${due}</tp-table-cell>
                <tp-table-cell
                  ><tp-button size="sm" variant="outline"
                    >Renew<tp-visually-hidden> ${tool}</tp-visually-hidden></tp-button
                  ></tp-table-cell
                >
              </tp-table-row>`,
          )}
        </tp-table-body>
      </tp-table>
      <p id="spacing">
        <a href="#context" id="link-spaced"
          >Read more<tp-visually-hidden> about pruning</tp-visually-hidden></a
        >
        ·
        <a href="#context" id="link-unspaced"
          >Read more<tp-visually-hidden>about pruning</tp-visually-hidden></a
        >
      </p>
    </section>

    <section id="layouts" style=${section}>
      <h2>Layouts</h2>
      <p id="inline-text">
        Ferns
        <tp-visually-hidden
          >grow best in the damp shade beside the pond and need little sun</tp-visually-hidden
        >
        line the north fence.
      </p>
      <p dir="rtl" lang="ar" id="rtl-text">
        السراخس
        <tp-visually-hidden>تنمو في الظل الرطب</tp-visually-hidden>
        على السياج الشمالي.
      </p>
      <div
        id="vertical-text"
        lang="ja"
        style="writing-mode:vertical-rl;block-size:120px;border:1px solid var(--tp-border);padding:8px"
      >
        シダ<tp-visually-hidden>は池のそばの湿った日陰でよく育ちます</tp-visually-hidden>は北の柵沿い。
      </div>
      <div
        id="scroll-box"
        style="overflow:auto;block-size:60px;inline-size:200px;border:1px solid var(--tp-border);position:relative"
      >
        <p style="margin:0">Compost turns every two weeks.</p>
        <tp-visually-hidden
          >The bins by the shed hold green waste, the far bins hold finished compost ready for the
          beds.</tp-visually-hidden
        >
      </div>
    </section>

    <section id="consumers" style=${section}>
      <h2>Shared hiding declarations</h2>
      <tp-spinner label="Loading plots"></tp-spinner>
      <tp-checkbox>Water daily</tp-checkbox>
      <div style="inline-size:200px">
        <tp-overflow-list limit="1"
          ><span>Basil</span><span>Thyme</span><span>Sage</span></tp-overflow-list
        >
      </div>
      <tp-code-block label="Bed plan" removed-lines="1" added-lines="2"
        >${'tomatoes\npeppers'}</tp-code-block
      >
      <tp-timeline value="sown" aria-label="Bed status">
        <tp-timeline-item value="dug">Dug</tp-timeline-item>
        <tp-timeline-item value="sown">Sown</tp-timeline-item>
        <tp-timeline-item value="harvested">Harvested</tp-timeline-item>
      </tp-timeline>
      <tp-text-motion split="words">Seeds sprout in spring</tp-text-motion>
      <tp-field label="Plot name" description="Shown to neighbors"><tp-input></tp-input></tp-field>
      <tp-command-palette label="Garden commands"
        ><tp-button slot="trigger" variant="outline">Commands</tp-button></tp-command-palette
      >
    </section>
  `,
  document.getElementById('fixture')!,
);

let seedlings = 0;
document.getElementById('status-trigger')!.addEventListener('click', () => {
  seedlings += 12;
  document.getElementById('status-region')!.textContent = `${seedlings} seedlings counted.`;
});
(window as unknown as { fixtureReady: boolean }).fixtureReady = true;
