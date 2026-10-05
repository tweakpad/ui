import { html, render } from 'lit';
import { badgeExamples } from '../../../../src/stories/badge.examples.ts';

const built = new URLSearchParams(location.search).has('built');
await import(built ? '/dist/register.js' : '/src/register.ts');
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(style);
window.badgeLibrary = await import(built ? '/dist/index.js' : '/src/index.ts');
render(
  html`
    ${badgeExamples.map(
    (example) =>
      html`<section>
        <h2>${example.title}</h2>
        ${example.render()}
      </section>`,
  )}
    <section id="extra">
      <h2>Constrained content and inheritance</h2>
      <div style="max-width:160px">
        <tp-badge id="long" variant="outline"
          >A long classification label with several words</tp-badge
        >
      </div>
      <tp-navigation-panel
        ><tp-navigation-panel-content
          ><tp-navigation-panel-menu
            ><tp-navigation-panel-item
              ><tp-navigation-panel-link href="#extra">Inbox</tp-navigation-panel-link
              ><tp-navigation-panel-badge>12</tp-navigation-panel-badge></tp-navigation-panel-item
            ></tp-navigation-panel-menu
          ></tp-navigation-panel-content
        ></tp-navigation-panel
      >
    </section>
  `,
  document.getElementById('examples'),
);
window.badgeReady = true;
