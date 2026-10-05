import { html, render } from 'lit';
import { keyHintExamples } from '../../../../src/stories/key-hint.examples.js';
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = new URL(location.href).searchParams.has('package')
  ? '/dist/styles.css'
  : '/src/styles.css';
document.head.append(sheet);
import { navigationIcons } from '../../../../src/icons/navigation.js';
const built = new URL(location.href).searchParams.has('package');
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
const library = await (built
  ? import('../../../../dist/index.js')
  : import('../../../../src/index.js'));
document.body.style.cssText =
  'margin:32px;background:var(--tp-background);color:var(--tp-foreground)';
render(
  html`
    <h1>Key Hint verification</h1>
    <p>Standalone <tp-key-hint id="single">Ctrl</tp-key-hint></p>
    <p>
      Shortcut
      <tp-key-hint-group id="group" platform="mac"
        ><tp-key-hint key="mod"></tp-key-hint><tp-key-hint key="K"></tp-key-hint
      ></tp-key-hint-group>
    </p>
    <p>
      Icons
      <tp-key-hint id="icon-key" label="More"
        ><tp-icon .icon=${navigationIcons.more}></tp-icon
      ></tp-key-hint>
      <tp-key-hint id="large-icon" label="More"
        ><tp-icon .icon=${navigationIcons.more} size="16px"></tp-icon
      ></tp-key-hint>
    </p>
    <tp-button variant="outline"
      >Accept <tp-key-hint slot="icon-end" key="enter"></tp-key-hint
    ></tp-button>
    <tp-tooltip id="tooltip" open-delay="0"
      ><tp-button slot="trigger" variant="outline">Print</tp-button
      ><span
        >Print document
        <tp-key-hint-group separator="none"
          ><tp-key-hint key="mod"></tp-key-hint
          ><tp-key-hint key="P"></tp-key-hint></tp-key-hint-group></span
    ></tp-tooltip>
    <tp-input-group
      ><tp-input label="Search" placeholder="Search..."></tp-input
      ><tp-icon slot="prefix" .icon=${navigationIcons.search}></tp-icon
      ><tp-key-hint-group slot="suffix" separator="none"
        ><tp-key-hint key="mod"></tp-key-hint><tp-key-hint>K</tp-key-hint></tp-key-hint-group
      ></tp-input-group
    >
    <p dir="rtl">
      RTL
      <tp-key-hint-group separator="none"
        ><tp-key-hint>⌘</tp-key-hint><tp-key-hint>⇧</tp-key-hint><tp-key-hint>⌥</tp-key-hint
        ><tp-key-hint>⌃</tp-key-hint></tp-key-hint-group
      >
    </p>
    <tp-menu label="Hint menu"
      ><tp-button slot="trigger" variant="outline">Menu</tp-button
      ><tp-menu-item
        >New document<tp-key-hint-group data-menu-shortcut separator="none"
          ><tp-key-hint key="mod"></tp-key-hint><tp-key-hint>N</tp-key-hint></tp-key-hint-group
        ></tp-menu-item
      ></tp-menu
    >
    <tp-command-palette
      inline
      label="Commands"
      .items=${[{ value: 'open', label: 'Open document', shortcut: 'Ctrl + Shift + O' }]}
    ></tp-command-palette>
    ${keyHintExamples.map(
      (example) =>
        html`<section>
          <h2>${example.title}</h2>
          ${example.render()}
        </section>`,
    )}
  `,
  document.getElementById('fixture')!,
);
Object.assign(window, { keyHintLibrary: library, keyHintBuilt: built });
