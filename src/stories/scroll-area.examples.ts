import { markupExample } from './documentation-examples.js';

const scrollAreaFrame =
  'border:var(--tp-border-width) var(--tp-border-style) var(--tp-border);border-radius:var(--tp-radius-md)';

const artworks = [
  ['Ornella Binni', 'photo-1465869185982-5a1a7522cbcb'],
  ['Tom Byrom', 'photo-1548516173-3cabfa4607e9'],
  ['Vladimir Malyavko', 'photo-1494337480532-3725c85fd2ab'],
] as const;

export const scrollAreaExamples = [
  markupExample(
    'Horizontal scrolling',
    `<tp-scroll-area orientation="horizontal" label="Artwork gallery" style="${scrollAreaFrame};inline-size:calc(var(--tp-spacing) * 120);max-inline-size:100%">
  <div style="display:flex;inline-size:max-content;gap:var(--tp-space-4);padding:var(--tp-space-4)">
    ${artworks
      .map(
        ([
          artist,
          photo,
        ]) => `<figure style="margin:0;inline-size:calc(var(--tp-spacing) * 75);flex:none">
      <tp-aspect-ratio ratio="0.75" fit="cover" style="border-radius:var(--tp-radius-md)"><img src="https://images.unsplash.com/${photo}?auto=format&fit=crop&w=300&q=80" alt="Photo by ${artist}" width="300" height="400" /></tp-aspect-ratio>
      <figcaption style="padding-block-start:var(--tp-space-2);font-size:var(--tp-text-xs);color:var(--tp-muted-foreground)">Photo by <span style="font-weight:var(--tp-font-semibold);color:var(--tp-foreground)">${artist}</span></figcaption>
    </figure>`,
      )
      .join('\n    ')}
  </div>
</tp-scroll-area>`,
    'A native horizontal viewport with portrait artwork and captions. Photographs match the reference gallery.',
  ),
  markupExample(
    'Both axes',
    `<tp-scroll-area axis="both" label="Release notes" style="${scrollAreaFrame};inline-size:calc(var(--tp-spacing) * 100);block-size:calc(var(--tp-spacing) * 72);max-inline-size:100%">
  <div style="min-inline-size:calc(var(--tp-spacing) * 160);padding:var(--tp-space-4)">
    ${Array.from({ length: 30 }, (_, i) => `<p>Release 1.${i}.0 — Updated components, documentation and examples.</p>`).join('\n    ')}
  </div>
</tp-scroll-area>`,
  ),
];
