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
const longName = 'render-pass-shadow-cascade-final-approved-v3.exr';
const longPhrase = 'Overnight ferry from the northern harbor to the island lighthouse';

render(
  html`
    <h1>Text transform verification</h1>

    <section id="presets">
      <h2>Presets</h2>
      <p>
        <tp-text-transform id="capitalize" preset="capitalize"
          >northern lights tour</tp-text-transform
        >
        ·
        <tp-text-transform id="sentence" preset="sentence">quiet harbor at dawn</tp-text-transform>
        · <tp-text-transform id="upper" preset="uppercase">dock four</tp-text-transform> ·
        <tp-text-transform id="humanize" preset="humanize">shadowCascadeCount</tp-text-transform> ·
        <tp-text-transform id="kebab" preset="kebab">ShadowCascadeCount</tp-text-transform>
      </p>
      <p>
        <tp-text-transform
          id="currency"
          preset="currency"
          currency="EUR"
          value="1234.5"
        ></tp-text-transform>
        ·
        <tp-text-transform
          id="percent"
          preset="percent"
          decimals="1"
          value="0.256"
        ></tp-text-transform>
        · <tp-text-transform id="compact" preset="compact" value="15300"></tp-text-transform> ·
        <tp-text-transform
          id="unit"
          preset="unit"
          unit="kilometer-per-hour"
          value="42"
        ></tp-text-transform>
        · <tp-text-transform id="bytes" preset="bytes" value="2516582"></tp-text-transform> ·
        <tp-text-transform id="duration" preset="duration" value="3725"></tp-text-transform> ·
        <tp-text-transform id="invalid" preset="number">twelve</tp-text-transform>
      </p>
      <p lang="de-DE" id="german">
        <tp-text-transform
          id="currency-de"
          preset="currency"
          currency="EUR"
          value="1234.5"
        ></tp-text-transform>
      </p>
    </section>

    <section id="truncation">
      <h2>Truncation</h2>
      <div id="end-box" style="${box};inline-size:220px">
        <tp-text-transform id="end" truncate="end">${longPhrase}</tp-text-transform>
      </div>
      <div id="start-box" style="${box};inline-size:220px">
        <tp-text-transform id="start" truncate="start">${longName}</tp-text-transform>
      </div>
      <div id="middle-box" style="${box};inline-size:220px">
        <tp-text-transform id="middle" truncate="middle">${longName}</tp-text-transform>
      </div>
      <div id="words-box" style="${box};inline-size:220px">
        <tp-text-transform id="words" truncate="end" truncate-by="words"
          >${longPhrase}</tp-text-transform
        >
      </div>
      <div id="fits-box" style="${box};inline-size:220px">
        <tp-text-transform id="fits" truncate="middle">harbor.png</tp-text-transform>
      </div>
      <p id="count">
        <tp-text-transform id="count-words" max-length="4" truncate-by="words"
          >${longPhrase}</tp-text-transform
        >
      </p>
      <div id="flex-box" style="${box};display:flex;gap:8px;inline-size:260px">
        <strong>File</strong>
        <tp-text-transform id="flex" truncate="middle">${longName}</tp-text-transform>
      </div>
      <div
        id="grid-box"
        style="${box};display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;inline-size:260px"
      >
        <strong>File</strong>
        <tp-text-transform id="grid" truncate="start">${longName}</tp-text-transform>
      </div>
      <div id="rtl-box" dir="rtl" lang="ar" style="${box};inline-size:220px">
        <tp-text-transform id="rtl" truncate="end"
          >رحلة العبارة الليلية من الميناء الشمالي إلى منارة الجزيرة</tp-text-transform
        >
      </div>
      <p id="after">Content after the truncation section.</p>
    </section>
  `,
  document.querySelector('#fixture')!,
);
