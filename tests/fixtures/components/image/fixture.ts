import type { TpImage } from '../../../../src/index.js';

const params = new URLSearchParams(location.search);
// `?script-parallax` exercises the scroll-observation fallback in a browser that has view
// timelines: the support query alone reports false. Scrolling, layout and observers stay real.
if (params.has('script-parallax')) {
  const supports = CSS.supports.bind(CSS);
  CSS.supports = ((...args: [string] | [string, string]) =>
    args.join(':').includes('animation-timeline')
      ? false
      : supports(...(args as [string]))) as typeof CSS.supports;
}
const built = params.has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
// Only Image: it must define the controls it composes itself.
api.defineElement(api.TpImage.tagName, api.TpImage);
api.defineElement(api.TpImageGroup.tagName, api.TpImageGroup);

const photo = (id: string, width: number, format = '') =>
  `https://images.unsplash.com/${id}?w=${width}&q=70&auto=format&fit=crop${format ? `&fm=${format}` : ''}`;
const office = 'photo-1497366754035-f200968a6e72';
const desks = 'photo-1497215728101-856f4ea42174';
const alley = 'photo-1465869185982-5a1a7522cbcb';
const facade = 'photo-1494337480532-3725c85fd2ab';
const terrace = 'photo-1548516173-3cabfa4607e9';
const photos = [office, desks, alley, facade, terrace];
const widthSet = (id: string) =>
  [320, 640, 960, 1280].map((w) => `${photo(id, w)} ${w}w`).join(', ');

const make = (attributes: Record<string, string>, caption?: string, children = '') => {
  const image = document.createElement('tp-image') as TpImage;
  for (const [name, value] of Object.entries(attributes)) image.setAttribute(name, value);
  image.innerHTML = children;
  if (!caption) return image;
  const figure = document.createElement('figure');
  figure.append(image, caption);
  return figure;
};

// Events are logged for MCP inspection.
const log: { id: string; status: string }[] = [];
document.addEventListener('tp-loading-status-change', (event) => {
  const target = event.composedPath()[0] as HTMLElement;
  log.push({ id: target.id, status: (event as CustomEvent<{ status: string }>).detail.status });
});
Object.assign(window, { imageLog: log });

const base = document.querySelector<TpImage>('#base')!;
base.src = photo(office, 1280);

const placeholders = document.querySelector('#placeholders')!;
for (const mode of ['skeleton', 'spinner', 'none'])
  placeholders.append(
    make({ id: `placeholder-${mode}`, ratio: '1.5', placeholder: mode, alt: '' }, mode),
  );
placeholders.append(
  make(
    { id: 'placeholder-slotted', ratio: '1.5', alt: '' },
    'slotted placeholder',
    `<img slot="placeholder" alt="" src="${photo(alley, 24)}" style="inline-size:100%;block-size:100%;object-fit:cover;filter:blur(8px)">`,
  ),
);
placeholders.querySelectorAll<TpImage>('tp-image').forEach((image, index) => {
  image.src = photo(photos[index % photos.length]!, 640);
});

const fits = document.querySelector('#fits')!;
for (const fit of ['cover', 'contain', 'fill', 'none', 'scale-down'])
  fits.append(make({ id: `fit-${fit}`, ratio: '1', fit, src: photo(facade, 480), alt: '' }, fit));
fits.append(
  make(
    {
      id: 'fit-position',
      ratio: '1',
      src: photo(facade, 480),
      alt: '',
      style: '--tp-image-position: 0% 50%',
    },
    'cover, position 0% 50%',
  ),
);

document.querySelector<TpImage>('#intrinsic')!.src = photo(desks, 900);

const srcsetAuto = document.querySelector<TpImage>('#srcset-auto')!;
srcsetAuto.srcSet = widthSet(alley);
srcsetAuto.src = photo(alley, 640);
const srcsetSizes = document.querySelector<TpImage>('#srcset-sizes')!;
srcsetSizes.srcSet = widthSet(facade);
srcsetSizes.src = photo(facade, 640);
const srcsetEager = document.querySelector<TpImage>('#srcset-eager')!;
srcsetEager.srcSet = widthSet(terrace);
srcsetEager.src = photo(terrace, 640);
const srcsetX = document.querySelector<TpImage>('#srcset-x')!;
srcsetX.srcSet = `${photo(desks, 300)} 1x, ${photo(desks, 600)} 2x, ${photo(desks, 900)} 3x`;
srcsetX.src = photo(desks, 300);
const art = document.querySelector<TpImage>('#art')!;
art.innerHTML = [
  `<source media="(max-width: 600px)" type="image/avif" srcset="${photo(alley, 400, 'avif')} 400w, ${photo(alley, 800, 'avif')} 800w">`,
  `<source media="(max-width: 600px)" srcset="${photo(alley, 400, 'jpg')} 400w, ${photo(alley, 800, 'jpg')} 800w">`,
  `<source type="image/avif" srcset="${photo(office, 400, 'avif')} 400w, ${photo(office, 800, 'avif')} 800w">`,
].join('');
art.src = photo(office, 640, 'jpg');

const zooms = document.querySelector('#zooms')!;
zooms.append(
  make(
    { id: 'zoom-in', ratio: '1.5', zoom: 'in', src: photo(terrace, 640), alt: 'Zoom in' },
    'zoom in (hover)',
  ),
  make(
    { id: 'zoom-out', ratio: '1.5', zoom: 'out', src: photo(terrace, 640), alt: 'Zoom out' },
    'zoom out (hover)',
  ),
  make(
    { id: 'zoom-forced', ratio: '1.5', zoom: 'in', zoomed: '', src: photo(terrace, 640), alt: '' },
    'zoomed',
  ),
  make(
    {
      id: 'zoom-parallax',
      ratio: '1.5',
      zoom: 'in',
      parallax: 'up',
      src: photo(terrace, 640),
      alt: '',
    },
    'zoom in + parallax up',
  ),
);

const parallax = document.querySelector('#parallax')!;
for (const direction of ['up', 'down', 'left', 'right'])
  parallax.append(
    make(
      {
        id: `parallax-${direction}`,
        ratio: '1',
        parallax: direction,
        src: photo(alley, 640),
        alt: '',
      },
      direction,
    ),
  );
for (const effects of ['zoom-in', 'zoom-out', 'up zoom-in'])
  parallax.append(
    make(
      {
        id: `parallax-${effects.replace(' ', '-')}`,
        ratio: '1',
        parallax: effects,
        src: photo(alley, 640),
        alt: '',
      },
      effects,
    ),
  );
parallax.append(
  make(
    {
      id: 'parallax-deep',
      ratio: '1',
      parallax: 'up',
      'parallax-depth': '2',
      src: photo(alley, 640),
      alt: '',
    },
    'up, depth 2 (clamped to 1)',
  ),
);

document.querySelector<TpImage>('#clipped')!.src = photo(alley, 1280);

for (const strip of ['#strip', '#strip-rtl'])
  for (const [index, id] of photos.entries())
    document.querySelector(strip)!.append(
      make({
        id: `${strip.slice(1)}-${index}`,
        ratio: '0.75',
        parallax: 'left',
        src: photo(id, 480),
        alt: '',
      }),
    );

const scroller = document.querySelector('#scroller')!;
scroller.append(Object.assign(document.createElement('div'), { className: 'pad' }));
for (const [index, direction] of ['up', 'down'].entries())
  scroller.append(
    make({
      id: `nested-${direction}`,
      ratio: '2',
      parallax: direction,
      reveal: 'fade zoom-in',
      src: photo(photos[index]!, 640),
      alt: '',
    }),
  );
scroller.append(Object.assign(document.createElement('div'), { className: 'pad' }));

const reveals = document.querySelector('#reveals')!;
for (const [index, reveal] of [
  'fade',
  'up',
  'down',
  'left',
  'right',
  'zoom-in',
  'zoom-out',
  'fade up zoom-in',
].entries())
  reveals.append(
    make(
      {
        id: `reveal-${reveal.replaceAll(' ', '-')}`,
        ratio: '1.5',
        reveal,
        style: `--tp-image-reveal-delay: ${index * 60}ms`,
        src: photo(photos[index % photos.length]!, 480),
        alt: '',
      },
      reveal,
    ),
  );

const smoothing = document.querySelector('#smoothing')!;
for (const value of ['0', '0.85'])
  smoothing.append(
    make(
      {
        id: `smoothing-${value}`,
        ratio: '1',
        parallax: 'up zoom-in',
        'parallax-smoothing': value,
        src: photo(alley, 640),
        alt: '',
      },
      `smoothing ${value}`,
    ),
  );

const repeats = document.querySelector('#repeats')!;
repeats.append(
  make(
    {
      id: 'repeat-on',
      ratio: '1.5',
      reveal: 'fade up',
      'reveal-repeat': '',
      src: photo(desks, 480),
      alt: '',
    },
    'reveal-repeat',
  ),
  make(
    { id: 'repeat-off', ratio: '1.5', reveal: 'fade up', src: photo(office, 480), alt: '' },
    'once (default)',
  ),
);

// Groups: unique widths keep each member a separate request.
const groupImage = (id: string, index: number, extra: Record<string, string> = {}) =>
  make({
    id,
    ratio: '1.5',
    src: photo(photos[index % photos.length]!, 500 + index),
    alt: '',
    ...extra,
  });
const stagger = document.querySelector('#group-stagger')!;
for (let index = 0; index < 5; index++) stagger.append(groupImage(`group-stagger-${index}`, index));
stagger.append(groupImage('group-stagger-failing', 5, { src: '/missing-member.jpg' }));
const held = document.querySelector('#group-held')!;
for (let index = 0; index < 4; index++) held.append(groupImage(`group-held-${index}`, index + 10));
const repeat = document.querySelector('#group-repeat')!;
for (let index = 0; index < 4; index++)
  repeat.append(groupImage(`group-repeat-${index}`, index + 20));
const outer = document.querySelector('#group-outer')!;
outer.prepend(groupImage('group-outer-0', 30));
const inner = document.querySelector('#group-inner')!;
for (let index = 0; index < 3; index++)
  inner.append(groupImage(`group-inner-${index}`, index + 40));

if (params.has('stress')) {
  const section = document.querySelector<HTMLElement>('#case-stress')!;
  section.hidden = false;
  const stress = document.querySelector('#stress')!;
  const effects = ['fade up', 'fade zoom-in', 'fade', 'fade left'];
  for (let index = 0; index < 500; index++)
    stress.append(
      make({
        id: `stress-${index}`,
        ratio: '1',
        zoom: 'in',
        reveal: effects[index % effects.length]!,
        parallax: index % 7 === 0 ? 'up' : 'none',
        // Unique widths keep every image a distinct request.
        src: photo(photos[index % photos.length]!, 200 + index),
        alt: '',
      }),
    );
}
