import { setupCursorExample } from './cursor-example.js';
import setupSource from './cursor-example.js?raw';
import { markupExample, moduleExample } from './documentation-examples.js';

const interior =
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80';
const desk =
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80';
const workspace =
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&auto=format&fit=crop&q=80';

/** Every example keeps its cursor to its own region, so the page keeps the native pointer. */
const region = (inner: string) =>
  `<div style="display:grid;gap:var(--tp-space-4);justify-items:start;padding:var(--tp-space-4)">
${inner}
</div>`;

export const cursorDefaultSource = `import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';

const cursor = document.createElement('tp-cursor');
document.body.append(cursor);
cursor.addEventListener('tp-cursor-state-change', (event) => console.log(event.detail.value));`;

export const cursorExamples = [
  markupExample(
    'A label over the hero',
    region(`  <tp-cursor id="hero-cursor" scope="region"></tp-cursor>
  <tp-cursor-zone for="hero-cursor" state="view" style="--tp-cursor-size: 4.5rem; --tp-cursor-color: var(--tp-primary)">
    <template><tp-badge>View</tp-badge></template>
    <tp-card style="max-inline-size: 32rem">
      <h3 slot="header">Studio north</h3>
      <p slot="description">Move the pointer over the photo: the ring grows and reads View.</p>
      <tp-image src="${interior}" alt="A bright studio interior" ratio="16/9" style="border-radius: var(--tp-radius-lg)"></tp-image>
    </tp-card>
  </tp-cursor-zone>`),
    'The zone names a state, sets the size and color the cursor adopts, and carries a template with the content the cursor shows while the pointer is inside. `scope="region"` keeps this cursor to its wrapper.',
  ),
  markupExample(
    'A gallery with a drag look',
    region(`  <tp-cursor id="gallery-cursor" scope="region"></tp-cursor>
  <tp-cursor-zone for="gallery-cursor" state="drag" style="--tp-cursor-size: 3.5rem; --tp-cursor-color: white; --tp-cursor-blend: difference">
    <template><tp-badge variant="secondary">Drag</tp-badge></template>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--tp-space-3);max-inline-size:40rem">
      <tp-image src="${interior}" alt="" ratio="1" style="border-radius: var(--tp-radius-md)"></tp-image>
      <tp-image src="${desk}" alt="" ratio="1" style="border-radius: var(--tp-radius-md)"></tp-image>
      <tp-image src="${workspace}" alt="" ratio="1" style="border-radius: var(--tp-radius-md)"></tp-image>
    </div>
  </tp-cursor-zone>`),
    '`--tp-cursor-blend: difference` inverts the cursor over the images so it stays visible on light and dark areas.',
  ),
  markupExample(
    'Buttons that attract the cursor',
    region(`  <tp-cursor id="stick-cursor" scope="region"></tp-cursor>
  <div style="display:flex;gap:var(--tp-space-4);flex-wrap:wrap">
    <tp-cursor-zone for="stick-cursor" stick="bounds"><tp-button variant="outline">Morph to my bounds</tp-button></tp-cursor-zone>
    <tp-cursor-zone for="stick-cursor" stick="center" damping="40"><tp-button variant="outline">Pull to my center</tp-button></tp-cursor-zone>
    <tp-cursor-zone for="stick-cursor" state="go" style="--tp-cursor-size: var(--tp-space-12)"><tp-button>Just grow</tp-button></tp-cursor-zone>
  </div>`),
    '`stick="bounds"` morphs the ring into the button’s rectangle, `stick="center"` pulls it to the middle with a heavier damping of its own, and a plain zone only changes the size.',
  ),
  markupExample(
    'A dot and a lagging ring',
    region(`  <tp-cursor id="dot" scope="region" stiffness="900" damping="50">
    <span style="display:block;inline-size:var(--tp-space-2);block-size:var(--tp-space-2);border-radius:var(--tp-radius-full);background:currentcolor"></span>
  </tp-cursor>
  <tp-cursor id="ring" scope="region" stiffness="120" damping="16" style="--tp-cursor-size: var(--tp-space-10)"></tp-cursor>
  <tp-cursor-zone for="ring" state="press" style="--tp-cursor-size: var(--tp-space-16); --tp-cursor-opacity: 0.6">
    <tp-button>Only the ring reacts</tp-button>
  </tp-cursor-zone>
  <p style="margin:0;color:var(--tp-muted-foreground)">Two cursors with their own physics; the zone addresses the ring with <code>for</code>.</p>`),
    'Several cursors can coexist. The dot is stiff and slots its own look; the ring lags behind, and the zone targets it alone.',
  ),
  markupExample(
    'Native passthrough',
    region(`  <tp-cursor id="native-cursor" scope="region"></tp-cursor>
  <tp-cursor-zone for="native-cursor" native>
    <tp-field label="Notes" description="The native pointer returns over text entry.">
      <tp-text-area rows="3"></tp-text-area>
    </tp-field>
  </tp-cursor-zone>
  <tp-cursor-zone for="native-cursor" state="go"><tp-button variant="outline">Back to the custom cursor</tp-button></tp-cursor-zone>`),
    'A `native` zone hands the pointer back where the real one is needed: text entry, embedded documents, players.',
  ),
  markupExample(
    'Reduced motion',
    region(`  <tp-cursor id="reduced-cursor" scope="region" motion-policy="reduce"></tp-cursor>
  <tp-cursor-zone for="reduced-cursor" state="view" style="--tp-cursor-size: var(--tp-space-12)">
    <tp-button variant="outline">No lag, no transitions</tp-button>
  </tp-cursor-zone>`),
    'Under reduced motion, from the system preference or `motion-policy="reduce"`, the cursor stays but follows instantly and zone transitions are immediate.',
  ),
  moduleExample({
    title: 'Programmatic state',
    id: 'cursor-state-example',
    markup: region(`  <style>
    tp-cursor[data-cursor-state="view"] { --tp-cursor-color: var(--tp-primary); --tp-cursor-size: var(--tp-space-12); }
    tp-cursor[data-cursor-state="drag"] { --tp-cursor-color: var(--tp-destructive); --tp-cursor-radius: var(--tp-radius-md); }
    tp-cursor[data-cursor-state="go"] { --tp-cursor-size: var(--tp-space-3); }
  </style>
  <tp-cursor id="state-cursor" scope="region"></tp-cursor>
  <tp-toggle-group aria-label="Cursor state">
    <tp-toggle value="view">View</tp-toggle>
    <tp-toggle value="drag">Drag</tp-toggle>
    <tp-toggle value="go">Go</tp-toggle>
  </tp-toggle-group>
  <tp-badge variant="secondary" data-readout>none → none</tp-badge>`),
    setup: setupCursorExample,
    source: setupSource,
    call: `setupCursorExample(document.getElementById('cursor-state-example'));`,
    description:
      '`setState()` sets a state that persists until cleared or a zone takes over; the host marker `data-cursor-state` lets CSS style each state, and every change reports its reason.',
  }),
];
