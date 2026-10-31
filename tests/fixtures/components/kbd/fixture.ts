import { html, render } from 'lit';
import { kbdExamples } from '../../../../src/stories/kbd.examples.js';
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
    <h1>Kbd verification</h1>
    <p>Standalone <tp-kbd id="single">Ctrl</tp-kbd></p>
    <p>
      Shortcut
      <tp-kbd-group id="group" platform="mac"
        ><tp-kbd value="mod"></tp-kbd><tp-kbd value="K"></tp-kbd
      ></tp-kbd-group>
    </p>
    <p>
      Icons
      <tp-kbd id="icon-key" label="More"
        ><tp-icon .icon=${navigationIcons.more}></tp-icon
      ></tp-kbd>
      <tp-kbd id="large-icon" label="More"
        ><tp-icon .icon=${navigationIcons.more} size="16px"></tp-icon
      ></tp-kbd>
    </p>
    <tp-button variant="outline"
      >Accept <tp-kbd slot="icon-end" value="enter"></tp-kbd
    ></tp-button>
    <tp-tooltip id="tooltip" open-delay="0"
      ><tp-button slot="trigger" variant="outline">Print</tp-button
      ><span
        >Print document
        <tp-kbd-group separator="none"
          ><tp-kbd value="mod"></tp-kbd
          ><tp-kbd value="P"></tp-kbd></tp-kbd-group></span
    ></tp-tooltip>
    <tp-input-group
      ><tp-input label="Search" placeholder="Search..."></tp-input
      ><tp-icon slot="prefix" .icon=${navigationIcons.search}></tp-icon
      ><tp-kbd-group slot="suffix" separator="none"
        ><tp-kbd value="mod"></tp-kbd><tp-kbd>K</tp-kbd></tp-kbd-group
      ></tp-input-group
    >
    <p dir="rtl">
      RTL
      <tp-kbd-group separator="none"
        ><tp-kbd>⌘</tp-kbd><tp-kbd>⇧</tp-kbd><tp-kbd>⌥</tp-kbd
        ><tp-kbd>⌃</tp-kbd></tp-kbd-group
      >
    </p>
    <tp-menu label="Hint menu"
      ><tp-button slot="trigger" variant="outline">Menu</tp-button
      ><tp-menu-item
        >New document<tp-kbd-group data-menu-shortcut separator="none"
          ><tp-kbd value="mod"></tp-kbd><tp-kbd>N</tp-kbd></tp-kbd-group
        ></tp-menu-item
      ></tp-menu
    >
    <tp-command-palette
      inline
      label="Commands"
      .items=${[{ value: 'open', label: 'Open document', shortcut: 'Ctrl + Shift + O' }]}
    ></tp-command-palette>
    ${kbdExamples.map(
      (example) =>
        html`<section>
          <h2>${example.title}</h2>
          ${example.render()}
        </section>`,
    )}
  `,
  document.getElementById('fixture')!,
);
Object.assign(window, { kbdLibrary: library, kbdBuilt: built });
