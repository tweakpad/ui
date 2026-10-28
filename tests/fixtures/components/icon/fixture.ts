import { html, render } from 'lit';
import type { TpIcon } from '../../../../src/components/icon/icon.js';
import type { IconDefinition } from '../../../../src/icons/types.js';

const params = new URL(location.href).searchParams;
const built = params.has('package');
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(sheet);
await (built
  ? import('../../../../dist/register/icon.js')
  : import('../../../../src/register/icon.js'));
// ?scheme=dark or ?scheme=light pins one theme for visual review.
if (params.get('scheme')) document.documentElement.style.colorScheme = params.get('scheme')!;
document.body.style.cssText =
  'margin:32px;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans);font-size:var(--tp-text-sm)';

/** The text-editing icon modules, each published as `@tweakpad/ui/icons/<module>`. */
const MODULES = [
  'text-formatting',
  'text-blocks',
  'text-align',
  'link',
  'table-editing',
  'arrows',
  'ellipsis',
  'image-plus',
  'at-sign',
  'ban',
] as const;
/** The extents each definition renders at. */
const SIZES = ['16px', '24px', '48px'] as const;
/** The definitions that show a physical side, which a right-to-left editor swaps. */
const SIDED = [
  ['textAlignLeftIcon', 'textAlignRightIcon'],
  ['insertColumnLeftIcon', 'insertColumnRightIcon'],
  ['arrowLeftIcon', 'arrowRightIcon'],
] as const;

const load = async (module: string) =>
  (await import(
    /* @vite-ignore */ built ? `/dist/icons/${module}.js` : `/src/icons/${module}.ts`
  )) as Record<string, IconDefinition>;
const modules = await Promise.all(
  MODULES.map(async (module) => [module, await load(module)] as const),
);
const definitions = new Map(modules.flatMap(([, exports]) => Object.entries(exports)));
const definition = (name: string) => {
  const icon = definitions.get(name);
  if (!icon) throw new Error(`no definition ${name}`);
  return icon;
};

const cell = 'display:flex;align-items:center;gap:16px;min-block-size:56px';
const row = (name: string) =>
  html`<li data-icon=${name} style=${cell}>
    <code style="min-inline-size:200px">${name}</code>
    ${SIZES.map(
      (size) => html`<tp-icon .icon=${definition(name)} size=${size} data-size=${size}></tp-icon>`,
    )}
  </li>`;
const list = 'list-style:none;margin:0;padding:0;display:grid;gap:4px';

render(
  html`
    <h1>Icon verification</h1>
    <p>
      Every text-editing definition at 16, 24 and 48 pixels, loaded from
      ${built ? 'the built package' : 'the source modules'}.
    </p>

    <section id="gallery">
      ${modules.map(
        ([module, exports]) =>
          html`<section data-module=${module}>
            <h2><code>@tweakpad/ui/icons/${module}</code></h2>
            <ul style=${list}>
              ${Object.keys(exports).map(row)}
            </ul>
          </section>`,
      )}
    </section>

    <section id="sided">
      <h2>Sided pairs</h2>
      <ul style=${list}>
        ${SIDED.map(
          (pair) =>
            html`<li data-pair=${pair.join(' ')} style=${cell}>
              ${pair.map(
                (name) =>
                  html`<code style="min-inline-size:200px">${name}</code>
                    <tp-icon .icon=${definition(name)} size="48px" data-size="48px"></tp-icon>`,
              )}
            </li>`,
        )}
      </ul>
    </section>

    <section id="labelled">
      <h2>Labelled</h2>
      <p style=${cell}>
        <tp-icon
          id="labelled-link"
          .icon=${definition('linkIcon')}
          label="Attach a web address"
        ></tp-icon>
        <tp-icon
          id="labelled-table"
          .icon=${definition('tableIcon')}
          label="Seating chart"
        ></tp-icon>
        <tp-icon
          id="labelled-quote"
          .icon=${definition('quoteIcon')}
          label="Pull quote from the harbor log"
        ></tp-icon>
        <span>Decorative beside its text:</span>
        <tp-icon id="decorative-mention" .icon=${definition('atSignIcon')}></tp-icon>
        <span>Mention a crew member</span>
      </p>
    </section>
  `,
  document.querySelector('#fixture')!,
);

const icons = () => [...document.querySelectorAll<TpIcon>('#fixture tp-icon')];
const settle = () => Promise.all(icons().map((icon) => icon.updateComplete));

/**
 * Checks every rendered definition: the 24×24 view box, each path drawn with a length and inside
 * the view box (one unit of slack for round caps outside the geometry), and the host at its size.
 */
async function assertGeometry() {
  await settle();
  const problems: string[] = [];
  let paths = 0;
  for (const host of icons()) {
    const name = host.closest('[data-icon]')?.getAttribute('data-icon') ?? host.id;
    const svg = host.shadowRoot?.querySelector('svg');
    if (!svg) {
      problems.push(`${name}: no artwork`);
      continue;
    }
    if (svg.getAttribute('viewBox') !== '0 0 24 24') problems.push(`${name}: view box`);
    for (const path of svg.querySelectorAll('path')) {
      paths += 1;
      const d = path.getAttribute('d');
      const box = path.getBBox();
      if (!(path.getTotalLength() > 0)) problems.push(`${name}: ${d} has no length`);
      if (box.x < -1 || box.y < -1 || box.x + box.width > 25 || box.y + box.height > 25)
        problems.push(`${name}: ${d} leaves the view box`);
    }
    const size = host.dataset.size;
    const { width, height } = host.getBoundingClientRect();
    if (
      size &&
      (Math.abs(width - parseFloat(size)) > 0.5 || Math.abs(height - parseFloat(size)) > 0.5)
    )
      problems.push(`${name}: ${width}×${height} at ${size}`);
  }
  if (problems.length) throw new Error(problems.join('\n'));
  return { definitions: definitions.size, icons: icons().length, paths };
}

/** Checks that an icon without a label is hidden and a labelled one is an image with its name. */
async function assertSemantics() {
  await settle();
  const problems: string[] = [];
  for (const host of icons()) {
    const label = host.getAttribute('label');
    const id = host.id || host.closest('[data-icon]')?.getAttribute('data-icon');
    if (label) {
      if (host.getAttribute('role') !== 'img' || host.getAttribute('aria-label') !== label)
        problems.push(`${id}: labelled icon is not an image named ${label}`);
    } else if (host.getAttribute('aria-hidden') !== 'true' || host.hasAttribute('role'))
      problems.push(`${id}: decorative icon is exposed`);
  }
  if (problems.length) throw new Error(problems.join('\n'));
  return { labelled: icons().filter((host) => host.getAttribute('label')).length };
}

(window as unknown as { iconFixture: unknown }).iconFixture = {
  definitions,
  assertGeometry,
  assertSemantics,
};
await settle();
document.documentElement.dataset.fixtureReady = 'true';
