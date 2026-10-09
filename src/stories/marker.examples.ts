import { moduleExample } from './documentation-examples.js';
import { setupMarkerExample } from './marker-example.js';
import setupSource from './marker-example.js?raw';

const layout =
  'display:grid;gap:var(--tp-space-8);max-inline-size:calc(var(--tp-spacing) * 140);min-inline-size:0';
function interactive(title: string, id: string, markup: string, exampleLayout = layout) {
  return moduleExample({
    title,
    id,
    markup,
    wrapperStyle: exampleLayout,
    setup: setupMarkerExample,
    source: setupSource,
    call: `setupMarkerExample(document.getElementById('${id}'));`,
  });
}
export const markerExamples = [
  interactive(
    'Content and native hosts',
    'marker-content-example',
    `<tp-marker>A default marker</tp-marker>
<tp-marker><tp-icon slot="icon" data-icon="file"></tp-icon>Marker with icon</tp-marker>
<tp-marker role="status"><tp-spinner slot="icon" size="sm"></tp-spinner>Reading files</tp-marker>
<tp-marker data-body="link"><tp-icon slot="icon" data-icon="branch"></tp-icon>Open activity details</tp-marker>
<tp-marker data-body="button" data-feedback><tp-icon slot="icon" data-icon="clock"></tp-icon>Review activity<tp-icon data-icon="chevron" aria-hidden="true" style="flex:none;inline-size:var(--tp-icon-size-sm);block-size:var(--tp-icon-size-sm)"></tp-icon></tp-marker>
<tp-marker><tp-icon slot="icon" data-icon="account"></tp-icon>Rhea joined the chat</tp-marker>
<tp-marker data-layout="center"><strong>Olivia Rose</strong> left the chat</tp-marker>
<tp-marker data-layout="vertical"><tp-icon slot="icon" data-icon="file"></tp-icon>Icon above the content</tp-marker>
<p id="marker-details" style="margin:0">Activity details</p><tp-toast></tp-toast>`,
  ),
  interactive(
    'Border',
    'marker-border-example',
    `<tp-marker variant="border"><tp-icon slot="icon" data-icon="branch"></tp-icon>Switched to release candidate</tp-marker>
<tp-marker variant="border"><tp-icon slot="icon" data-icon="search"></tp-icon>Reviewed eight related files</tp-marker>
<tp-marker variant="border"><tp-icon slot="icon" data-icon="file"></tp-icon>Opened implementation notes</tp-marker>`,
    layout.replace('var(--tp-space-8)', 'var(--tp-space-3)'),
  ),
  interactive(
    'Separator',
    'marker-separator-example',
    `<tp-marker variant="separator">Worked for 42s</tp-marker>
<tp-marker variant="separator" role="status"><tp-spinner slot="icon" size="sm"></tp-spinner>Compacting conversation</tp-marker>
<tp-marker variant="separator"><tp-icon slot="icon" data-icon="check"></tp-icon>Conversation compacted</tp-marker>
<tp-marker variant="separator">With a <a href="#marker-details">link to learn more</a></tp-marker>
<tp-marker variant="separator"><tp-button variant="outline"><tp-icon slot="icon-start" data-icon="branch"></tp-icon>Review changes</tp-button></tp-marker>`,
  ),
  interactive(
    'Accordion label',
    'marker-accordion-example',
    `<tp-accordion collapsible>
  <tp-accordion-item value="activity"><tp-marker slot="label"><tp-icon slot="icon" data-icon="clock"></tp-icon>Worked for 42s</tp-marker>
    The requested files were reviewed while preparing this response.
  </tp-accordion-item>
</tp-accordion>`,
  ),
  interactive(
    'Drawer action',
    'marker-drawer-example',
    `<tp-marker variant="separator">
  <tp-drawer label="File activity" description="Files read while preparing the response." edge="inline-end" style="text-align:start">
    <tp-button slot="trigger" variant="outline"><tp-icon slot="icon-start" data-icon="search"></tp-icon>Explored three files</tp-button>
    <div role="list" aria-label="Files read" style="display:grid;gap:var(--tp-space-3)">
      <tp-list-item role="listitem" variant="outline" size="sm">app/chat/page.tsx<span slot="trailing" style="color:var(--tp-muted-foreground)">read</span></tp-list-item>
      <tp-list-item role="listitem" variant="outline" size="sm">components/message.tsx<span slot="trailing" style="color:var(--tp-muted-foreground)">read</span></tp-list-item>
      <tp-list-item role="listitem" variant="outline" size="sm">lib/ai.ts<span slot="trailing" style="color:var(--tp-muted-foreground)">read</span></tp-list-item>
    </div>
    <tp-button slot="close" variant="outline">Close</tp-button>
  </tp-drawer>
</tp-marker>`,
  ),
];
