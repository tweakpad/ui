import { html, render } from 'lit';
const built = new URL(location.href).searchParams.has('package');
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(sheet);
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
document.body.style.cssText =
  'margin:32px;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans)';
render(
  html`
    <h1>Description list verification</h1>
    <section style="display:grid;gap:var(--tp-space-8);max-inline-size:32rem">
      <tp-description-list id="plot" limit="3">
        <tp-description-list-item label="Plot">B-14, east terrace</tp-description-list-item>
        <tp-description-list-item label="Gardener">Mara Lindqvist</tp-description-list-item>
        <tp-description-list-item label="Status"
          ><tp-badge variant="success">Active</tp-badge></tp-description-list-item
        >
        <tp-description-list-item label="Size">3 × 4 m</tp-description-list-item>
        <tp-description-list-item label="Water access"
          ><a href="#taps">Shared tap, row C</a></tp-description-list-item
        >
        <tp-description-list-item label="Soil test"
          >pH 6.8, tested in March</tp-description-list-item
        >
      </tp-description-list>
      <tp-description-list id="stacked" layout="stacked" limit="2">
        <tp-description-list-item label="Seed order"
          >Runner beans, chard, calendula</tp-description-list-item
        >
        <tp-description-list-item label="Compost"
          >Two bags, collected on Saturdays</tp-description-list-item
        >
        <tp-description-list-item label="Tool shed"
          >Code 4471, returned keys by 6 pm</tp-description-list-item
        >
      </tp-description-list>
      <tp-description-list id="summary" orientation="horizontal" layout="stacked">
        <tp-description-list-item label="Status">Active</tp-description-list-item>
        <tp-description-list-item label="Type">Premium</tp-description-list-item>
        <tp-description-list-item label="Owner">Mara</tp-description-list-item>
        <tp-description-list-item label="Created">Jan 15, 2026</tp-description-list-item>
      </tp-description-list>
      <tp-description-list id="row" orientation="horizontal" limit="3">
        <tp-description-list-item label="Beds">12</tp-description-list-item>
        <tp-description-list-item label="Paths">4</tp-description-list-item>
        <tp-description-list-item label="Taps">2</tp-description-list-item>
        <tp-description-list-item label="Benches">3</tp-description-list-item>
        <tp-description-list-item label="Sheds">1</tp-description-list-item>
      </tp-description-list>
      <tp-description-list id="centered" align="center" limit="3">
        <tp-description-list-item label="Status">Active</tp-description-list-item>
        <tp-description-list-item label="Type">Premium</tp-description-list-item>
        <tp-description-list-item label="Owner">Mara Lindqvist</tp-description-list-item>
        <tp-description-list-item label="Created">Jan 15, 2026</tp-description-list-item>
        <tp-description-list-item label="Renewal">Apr 1, 2027</tp-description-list-item>
      </tp-description-list>
      <tp-description-list id="mixed">
        <tp-description-list-item label="Plot">B-14</tp-description-list-item>
        <tp-description-list-item label="Gardener">Mara Lindqvist</tp-description-list-item>
        <tp-description-list-item label="Notes" layout="stacked"
          >Shares the east terrace hose with B-15; prefers morning watering and keeps the compost
          lid closed.</tp-description-list-item
        >
      </tp-description-list>
      <tp-description-list id="found" limit="1" hidden-until-found>
        <tp-description-list-item label="Gate code">Ask the plot steward</tp-description-list-item>
        <tp-description-list-item label="Beehive"
          >Lantern hive by the south fence</tp-description-list-item
        >
      </tp-description-list>
      <tp-description-list id="all">
        <tp-description-list-item label="Opens">Dawn</tp-description-list-item>
        <tp-description-list-item label="Closes">Dusk</tp-description-list-item>
      </tp-description-list>
    </section>
  `,
  document.querySelector('main')!,
);
