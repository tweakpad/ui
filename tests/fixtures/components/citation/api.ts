import type { TpCitation, TpCitationList } from '../../../../src/components/citation/index.js';

/** Contract checks for CL Citation q1–q8; run through Chrome DevTools MCP evaluation. */
export async function verifyCitations() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  const settle = async () => {
    for (let n = 0; n < 6; n++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      for (const el of document.querySelectorAll<TpCitation>('tp-citation, tp-citation-list'))
        await el.updateComplete;
    }
  };
  const control = (c: Element) =>
    c
      .shadowRoot!.querySelector('tp-badge')!
      .shadowRoot!.querySelector<HTMLElement>('[part~="badge"]')!;
  const root = document.createElement('section');
  document.querySelector('main')!.append(root);
  root.innerHTML = `
    <tp-citation id="t-link" href="https://a.example/x" target="_blank" rel="noopener">a.example</tp-citation>
    <tp-citation id="t-unsafe" href="javascript:void 0">Unsafe</tp-citation>
    <tp-citation id="t-number" index="3"></tp-citation>
    <tp-citation id="t-host" index="4" href="https://www.b.example/y"></tp-citation>
    <tp-citation id="t-fragment" index="5" href="#x"></tp-citation>
    <tp-citation id="t-locale" index="1234" lang="ar-EG"></tp-citation>
    <tp-citation id="t-image" href="https://c.example" src="https://invalid.invalid/x.ico">c.example</tp-citation>
    <tp-citation id="t-site" href="https://f.example/z">f.example</tp-citation>
    <tp-citation id="t-self" href="https://g.example/z" target="_self">g.example</tp-citation>
    <p><tp-citation id="t-ref" source="t-entry-2" superscript></tp-citation></p>
    <p><tp-citation id="t-jump" source="t-entry-1" href="#t-entry-1" superscript></tp-citation></p>
    <tp-citation-list id="t-list" start="5"><tp-citation id="t-entry-1" href="https://d.example">One</tp-citation><tp-citation id="t-entry-2" href="https://e.example">Two</tp-citation></tp-citation-list>`;
  await settle();
  const byId = (id: string) => root.querySelector<TpCitation>('#' + id)!;

  const link = control(byId('t-link'));
  assert(
    link.tagName === 'A' && link.getAttribute('href') === 'https://a.example/x',
    'q1 accepted href renders a link',
  );
  assert(
    link.getAttribute('target') === '_blank' && link.getAttribute('rel') === 'noopener',
    'q1 link carries target and rel',
  );
  const unsafe = control(byId('t-unsafe'));
  assert(
    unsafe.tagName === 'SPAN' && !unsafe.hasAttribute('tabindex'),
    'q1 rejected href is inert and not focusable',
  );
  assert(
    byId('t-link').shadowRoot!.querySelector('tp-badge')!.hasAttribute('interactive'),
    'q3 linked badge is interactive',
  );
  assert(
    !byId('t-unsafe').shadowRoot!.querySelector('tp-badge')!.hasAttribute('interactive'),
    'q3 inert badge is not interactive',
  );
  assert(
    link.getAttribute('aria-label') === 'Citation: a.example (opens in a new tab)',
    'q2 name uses the label and ends with the new-tab text',
  );
  assert(
    control(byId('t-number')).getAttribute('aria-label') === 'Citation 3',
    'q2 number-only name',
  );
  assert(
    control(byId('t-host')).getAttribute('aria-label') ===
      'Citation 4: b.example (opens in a new tab)',
    'q2 host fallback without www',
  );
  assert(
    control(byId('t-fragment')).getAttribute('aria-label') === 'Citation 5',
    'q2 fragment address names no host',
  );
  assert(
    control(byId('t-locale')).getAttribute('aria-label') === 'Citation ١٬٢٣٤',
    'q2 number follows lang',
  );
  assert(byId('t-number').hasAttribute('data-number-only'), 'q6 number-only marker');
  assert(
    parseFloat(getComputedStyle(byId('t-number')).marginInlineStart) > 0 &&
      parseFloat(getComputedStyle(byId('t-link')).marginInlineStart) === 0,
    'q6 a numbered marker keeps space from the word it follows; a labelled one does not',
  );
  const chip = control(byId('t-number')).getBoundingClientRect();
  assert(chip.width >= chip.height - 0.5, 'q6 number chip is at least as wide as tall');

  const site = byId('t-site');
  const siteLink = control(site);
  assert(site.variant === 'outline', 'q3 outline is the default variant');
  assert(
    getComputedStyle(siteLink, '::before').content === 'none',
    'q3 the outline chip has no hover fill layer',
  );
  const muted = document.createElement('span');
  muted.style.color = 'var(--tp-muted-foreground)';
  root.append(muted);
  assert(
    getComputedStyle(siteLink).color === getComputedStyle(muted).color,
    'q3 an outline citation reads in the muted foreground',
  );
  muted.remove();
  assert(siteLink.getAttribute('target') === '_blank', 'q9 a site address opens in a new tab');
  assert(!siteLink.hasAttribute('rel'), 'q9 no relation is added');
  const self = control(byId('t-self'));
  assert(
    self.getAttribute('target') === '_self' &&
      self.getAttribute('aria-label') === 'Citation: g.example',
    'q9 an explicit target keeps the tab and drops the new-tab text',
  );
  assert(!control(byId('t-fragment')).hasAttribute('target'), 'q9 a fragment opens in place');
  const external = site.shadowRoot!.querySelector<HTMLElement>('[part~="citation-external"]');
  assert(site.hasAttribute('data-external') && external, 'q9 a labelled site link has the mark');
  assert(
    getComputedStyle(external!).position === 'absolute',
    'q9 the mark overlays the label instead of taking space',
  );
  assert(
    !byId('t-host').hasAttribute('data-external') &&
      !byId('t-host').shadowRoot!.querySelector('[part~="citation-external"]'),
    'q9 a number-only citation shows no mark',
  );
  assert(!byId('t-fragment').hasAttribute('data-external'), 'q9 a fragment link shows no mark');

  const image = byId('t-image');
  const loading = image.getBoundingClientRect().width;
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await settle();
  assert(
    Math.abs(image.getBoundingClientRect().width - loading) < 0.5,
    'q4 failed image keeps the citation width',
  );
  assert(
    image.shadowRoot!.querySelector('[part~="citation-icon"] tp-icon'),
    'q4 failed image shows the default mark',
  );

  const ref = byId('t-ref');
  const list = root.querySelector<TpCitationList>('#t-list')!;
  assert(
    control(ref).getAttribute('aria-label') === 'Citation 6: Two (opens in a new tab)',
    'q8 source supplies number and title',
  );
  assert(ref.hasAttribute('data-number-only'), 'q8 visible content stays the citation’s own');
  assert(
    list.shadowRoot!.querySelector('[part~="citation-list"]')!.getAttribute('role') === 'list',
    'q7 list role',
  );
  assert(byId('t-entry-1').getAttribute('role') === 'listitem', 'q7 entries are list items');
  const jump = control(byId('t-jump'));
  assert(
    jump.getAttribute('aria-label') === 'Citation 5: One' && !jump.hasAttribute('target'),
    'q10 a fragment marker takes its entry’s number and title and opens in place',
  );
  jump.click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  assert(active === control(byId('t-entry-1')), 'q10 activating it moves focus to the list entry');
  history.replaceState(null, '', location.pathname + location.search);
  list.prepend(byId('t-entry-2'));
  await settle();
  assert(
    control(ref).getAttribute('aria-label') === 'Citation 5: Two (opens in a new tab)',
    'q7 moving an entry renumbers and q8 follows',
  );
  byId('t-entry-2').textContent = 'Two renamed';
  await settle();
  assert(
    control(ref).getAttribute('aria-label') === 'Citation 5: Two renamed (opens in a new tab)',
    'q8 follows edits',
  );
  byId('t-entry-2').remove();
  await settle();
  assert(control(ref).getAttribute('aria-label') === 'Citation', 'q8 follows removal');
  const removed = byId('t-entry-1');
  root.append(removed);
  await settle();
  assert(
    !removed.hasAttribute('role'),
    'q7 an entry moved out of the list is no longer a list item',
  );
  root.remove();
  return results;
}
