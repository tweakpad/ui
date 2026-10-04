import { html } from 'lit';

/** Base registry aspect-ratio-example.tsx: preserve all four reference use cases. */
const ratios = [
  { title: '16:9', ratio: 16 / 9 },
  { title: '21:9', ratio: 21 / 9 },
  { title: '1:1', ratio: 1 },
  { title: '9:16', ratio: 9 / 16 },
] as const;
const surface = 'inline-size:100%;block-size:100%;background:var(--tp-muted)';
export const aspectRatioExamples = [
  ...ratios.map(({ title, ratio }) => ({
    title,
    description: `A ${title} box that follows its available width.`,
    code: `<tp-aspect-ratio ratio="${ratio}" style="inline-size:100%;max-inline-size:calc(var(--tp-spacing) * 100);border-radius:var(--tp-radius-lg)">
  <div style="${surface}"></div>
</tp-aspect-ratio>`,
    render: () =>
      html`<tp-aspect-ratio
        .ratio=${ratio}
        style="inline-size:100%;max-inline-size:calc(var(--tp-spacing) * 100);border-radius:var(--tp-radius-lg)"
        ><div style=${surface}></div
      ></tp-aspect-ratio>`,
  })),
  {
    title: 'Different container sizes',
    description:
      'The same 16:9 ratio at three widths. Each box shrinks with its container; dimensions and spacing follow the theme.',
    code: `<div style="display:flex;align-items:start;flex-wrap:wrap;gap:var(--tp-space-4)">
  <tp-aspect-ratio ratio="1.7777777777777777" style="inline-size:calc(var(--tp-spacing) * 40);max-inline-size:100%;border-radius:var(--tp-radius-lg)"><div style="${surface}"></div></tp-aspect-ratio>
  <tp-aspect-ratio ratio="1.7777777777777777" style="inline-size:calc(var(--tp-spacing) * 60);max-inline-size:100%;border-radius:var(--tp-radius-lg)"><div style="${surface}"></div></tp-aspect-ratio>
  <tp-aspect-ratio ratio="1.7777777777777777" style="inline-size:calc(var(--tp-spacing) * 80);max-inline-size:100%;border-radius:var(--tp-radius-lg)"><div style="${surface}"></div></tp-aspect-ratio>
</div>`,
    render: () =>
      html`<div style="display:flex;align-items:start;flex-wrap:wrap;gap:var(--tp-space-4)">
        ${[40, 60, 80].map((width) => html`<tp-aspect-ratio .ratio=${16 / 9} style=${`inline-size:calc(var(--tp-spacing) * ${width});max-inline-size:100%;border-radius:var(--tp-radius-lg)`}><div style=${surface}></div></tp-aspect-ratio>`)}
      </div>`,
  },
];
