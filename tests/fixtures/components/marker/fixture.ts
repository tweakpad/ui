import { html, render } from 'lit';
import { checkIcon } from '../../../../src/icons/check.js';
import { fileTextIcon } from '../../../../src/icons/file-text.js';

const built = new URL(location.href).searchParams.has('package');
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(sheet);
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
document.body.style.cssText =
  'margin:32px;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans);font-size:var(--tp-text-sm)';

const column = 'display:grid;gap:16px;max-inline-size:420px;margin-block-end:32px';

render(
  html`
    <h1>Marker verification</h1>

    <section id="shimmer" style=${column}>
      <h2>Shimmer</h2>
      <tp-marker id="status" role="status" shimmer
        ><tp-spinner slot="icon" size="sm"></tp-spinner>Drafting a summary of the notes</tp-marker
      >
      <tp-marker id="plain" role="status"
        ><tp-spinner slot="icon" size="sm"></tp-spinner>Drafting a summary of the notes</tp-marker
      >
      <tp-marker id="separator" variant="separator" role="status" shimmer
        >Indexing twelve notes</tp-marker
      >
      <tp-marker id="border" variant="border" shimmer
        ><tp-icon slot="icon" .icon=${fileTextIcon}></tp-icon>Opening the release plan</tp-marker
      >
      <tp-marker id="typing" role="status" shimmer><strong>Mina</strong> is typing…</tp-marker>
      <tp-marker id="link-content" variant="separator" shimmer
        >Comparing drafts — <a href="#shimmer">see the changes</a></tp-marker
      >
      <tp-marker id="label" shimmer label="Checking layer names"></tp-marker>
      <tp-marker id="accent" tone="accent" shimmer>Uploading the asset bundle</tp-marker>
      <tp-marker id="danger" tone="danger" shimmer>Retrying the failed export</tp-marker>
      <tp-marker id="success" tone="success" shimmer
        ><tp-icon slot="icon" .icon=${checkIcon}></tp-icon>Verifying the checksum</tp-marker
      >
      <tp-marker id="wrapping" shimmer style="max-inline-size:180px"
        >Rebuilding the search index for every archived workspace</tp-marker
      >
      <tp-marker id="delegated" shimmer data-body="link"
        ><tp-icon slot="icon" .icon=${fileTextIcon}></tp-icon>Open the running job</tp-marker
      >
    </section>

    <section id="direction" style=${column}>
      <h2>Direction</h2>
      <tp-marker id="ltr" shimmer>Sorting the layers by depth</tp-marker>
      <div dir="rtl" lang="ar">
        <tp-marker id="rtl" shimmer>يقرأ أربعة ملفات</tp-marker>
      </div>
      <tp-marker id="reverse" shimmer style="--tp-shimmer-direction:reverse"
        >Sorting the layers by depth</tp-marker
      >
    </section>

    <section id="hooks" style=${column}>
      <h2>Hooks</h2>
      <tp-marker
        id="tuned"
        shimmer
        style="--tp-shimmer-color:var(--tp-primary);--tp-shimmer-duration:1s;--tp-shimmer-spread:calc(var(--tp-spacing) * 6);--tp-shimmer-angle:45deg"
        >Tuning the highlight</tp-marker
      >
      <div id="hook-container" style="--tp-shimmer-duration:3s">
        <tp-marker id="inherited" shimmer>Inheriting the slower sweep</tp-marker>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <tp-marker id="once" shimmer style="--tp-shimmer-iterations:1;--tp-shimmer-duration:1.1s"
          >Summary ready</tp-marker
        >
        <tp-button id="replay" variant="outline" size="sm">Replay</tp-button>
      </div>
    </section>

    <section id="reduced" style=${column}>
      <h2>Reduced motion</h2>
      <tp-marker id="reduce-self" shimmer motion-policy="reduce"
        >Drafting with reduced motion</tp-marker
      >
      <div id="reduce-region" motion-policy="reduce">
        <tp-marker id="reduce-inherited" shimmer>Reduced through an ancestor</tp-marker>
        <tp-marker id="reduce-normal" shimmer motion-policy="normal"
          >Opted back into motion</tp-marker
        >
      </div>
    </section>
  `,
  document.querySelector('#fixture')!,
);

const delegated = document.querySelector<HTMLElement & { partContracts: unknown }>('#delegated')!;
delegated.partContracts = {
  marker: {
    renderDelegate: ({ bind, content }: { bind: unknown; content: unknown }) =>
      html`<a href="#shimmer" ${bind}>${content}</a>`,
  },
};

const once = document.querySelector<HTMLElement & { shimmer: boolean }>('#once')!;
document.querySelector('#replay')!.addEventListener('click', () => {
  once.shimmer = false;
  once.shimmer = true;
});
