import { markupExample } from './documentation-examples.js';

const photo = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?w=${width}&q=75&auto=format&fit=crop`;
const widths = (id: string) =>
  [480, 800, 1200, 1600].map((width) => `${photo(id, width)} ${width}w`).join(', ');

export const imageSource = {
  office: 'photo-1497366754035-f200968a6e72',
  desks: 'photo-1497215728101-856f4ea42174',
  alley: 'photo-1465869185982-5a1a7522cbcb',
  facade: 'photo-1494337480532-3725c85fd2ab',
  terrace: 'photo-1548516173-3cabfa4607e9',
};

export const imageDefaults = {
  src: photo(imageSource.office, 1200),
  srcset: widths(imageSource.office),
  alt: 'A bright open-plan office',
};

export const imageDefaultSource = `<tp-image
  ratio="1.7777777778"
  src="${imageDefaults.src}"
  srcset="${imageDefaults.srcset}"
  alt="${imageDefaults.alt}"
></tp-image>`;

const gallery = Object.values(imageSource)
  .concat([imageSource.facade])
  .map(
    (id, index) => `  <tp-image
    ratio="1"
    zoom="in"
    reveal="fade up"
    style="border-radius: var(--tp-radius-lg); --tp-image-reveal-delay: ${index * 80}ms"
    src="${photo(id, 800)}"
    srcset="${widths(id)}"
    alt=""
  ></tp-image>`,
  )
  .join('\n');

export const imageExamples = [
  markupExample(
    'Gallery with staggered reveal',
    `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: var(--tp-space-3)">
${gallery}
</div>`,
    'Square crops that fade up into place the first time they scroll into view, each slightly after the previous one, and zoom in on hover. Lazy loading and `sizes="auto"` fetch only the visible tiles at their displayed size.',
  ),
  markupExample(
    'Parallax hero with art direction',
    `<tp-image
  ratio="2.4"
  parallax="up"
  parallax-depth="0.4"
  loading="eager"
  fetchpriority="high"
  style="border-radius: var(--tp-radius-xl)"
  src="${photo(imageSource.alley, 1600)}"
  srcset="${widths(imageSource.alley)}"
  sizes="100vw"
  alt="A bicycle leaning on a wall in a wet alley"
>
  <source media="(max-width: 600px)" srcset="${photo(imageSource.terrace, 600)} 600w, ${photo(imageSource.terrace, 1000)} 1000w" sizes="100vw" />
</tp-image>`,
    'The image drifts upward inside its frame as the page scrolls. Narrow screens get a different crop through a `<source media>` child. The hero loads eagerly with high fetch priority.',
  ),
  markupExample(
    'Parallax in a vertical scroller',
    `<div style="block-size: 24rem; overflow-y: auto; display: grid; gap: var(--tp-space-4); padding: var(--tp-space-4); border: 1px solid var(--tp-border); border-radius: var(--tp-radius-xl)">
${Object.values(imageSource)
  .map(
    (id) => `  <tp-image
    loading="eager"
    ratio="1.7777777778"
    parallax="up"
    parallax-depth="0.4"
    style="border-radius: var(--tp-radius-lg)"
    src="${photo(id, 1200)}"
    srcset="${widths(id)}"
    alt=""
  ></tp-image>`,
  )
  .join('\n')}
</div>`,
    'Five images inside a container that scrolls vertically. Parallax follows the container’s own scroll, not the page, so each image drifts upward as it passes through the box. The images load eagerly so they are ready before they scroll into view.',
  ),
  markupExample(
    'Scroll zoom in a vertical scroller',
    `<div style="block-size: 24rem; overflow-y: auto; display: grid; gap: var(--tp-space-4); padding: var(--tp-space-4); border: 1px solid var(--tp-border); border-radius: var(--tp-radius-xl)">
${Object.values(imageSource)
  .map(
    (id, index) => `  <tp-image
    loading="eager"
    ratio="1.7777777778"
    parallax="${['zoom-in', 'zoom-out', 'up zoom-in', 'down zoom-out', 'zoom-in'][index]}"
    parallax-depth="0.4"
    style="border-radius: var(--tp-radius-lg)"
    src="${photo(id, 1200)}"
    srcset="${widths(id)}"
    alt=""
  ></tp-image>`,
  )
  .join('\n')}
</div>`,
    'Scroll zoom scales the image instead of moving it: `zoom-in` grows it as it passes through the box, and `zoom-out` settles it from enlarged to natural size. Combine zoom with a direction, such as `up zoom-in`, to zoom and drift at once. The images load eagerly so they are ready before they scroll into view.',
  ),
  markupExample(
    'Parallax in a horizontal scroller',
    `<div style="display: flex; gap: var(--tp-space-4); overflow-x: auto; padding: var(--tp-space-4); border: 1px solid var(--tp-border); border-radius: var(--tp-radius-xl)">
${Object.values(imageSource)
  .map(
    (id) => `  <tp-image
    loading="eager"
    ratio="0.75"
    parallax="left"
    parallax-depth="0.4"
    style="flex: 0 0 min(75%, 26rem); border-radius: var(--tp-radius-lg)"
    src="${photo(id, 800)}"
    srcset="${widths(id)}"
    alt=""
  ></tp-image>`,
  )
  .join('\n')}
</div>`,
    'Five portrait images in a strip that scrolls sideways. A container that only scrolls horizontally measures progress along its inline axis, so each image drifts left as the strip scrolls. The images load eagerly so they are ready before they scroll into view.',
  ),
  markupExample(
    'Card that zooms its image on hover',
    `<tp-card style="max-inline-size: 22rem"
  onpointerenter="this.querySelector('tp-image').zoomed = true"
  onpointerleave="this.querySelector('tp-image').zoomed = false">
  <h3 slot="header">Quiet floor</h3>
  <p slot="description">Bookable desks with natural light.</p>
  <tp-image ratio="1.7777777778" zoom="in" style="border-radius: var(--tp-radius-md)" src="${photo(imageSource.desks, 800)}" srcset="${widths(imageSource.desks)}" alt="Standing desks by a window"></tp-image>
</tp-card>`,
    '`zoomed` lets a surrounding surface drive the hover zoom, so the image zooms while the whole card is hovered.',
  ),
  markupExample(
    'Placeholder and fallback',
    `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: var(--tp-space-3)">
  <tp-image ratio="1.5" placeholder="spinner" style="border-radius: var(--tp-radius-lg)" src="${photo(imageSource.facade, 800)}" alt="Angular concrete facade"></tp-image>
  <tp-image ratio="1.5" style="border-radius: var(--tp-radius-lg)" src="${photo(imageSource.terrace, 800)}" alt="Curved rooftop terrace">
    <img slot="placeholder" alt="" src="${photo(imageSource.terrace, 24)}" style="inline-size: 100%; block-size: 100%; object-fit: cover; filter: blur(12px)" />
  </tp-image>
  <tp-image ratio="1.5" style="border-radius: var(--tp-radius-lg)" src="/missing-photo.jpg" alt="Unavailable photo"></tp-image>
</div>`,
    'A spinner while loading, a tiny blurred preview through the `placeholder` slot, and the default fallback for a source that fails to load.',
  ),
];
