import { markupExample, moduleExample } from './documentation-examples.js';
import { setupTimelineExample } from './timeline-example.js';
import setupSource from './timeline-example.js?raw';

function interactive(title: string, id: string, markup: string, description: string) {
  return moduleExample({
    title,
    id,
    markup,
    description,
    setup: setupTimelineExample,
    source: setupSource,
    call: `setupTimelineExample(document.getElementById('${id}'));`,
  });
}

const date = (value: string) =>
  `<tp-time datetime="${value}" mode="absolute" pattern="MMM d"></tp-time>`;
const muted = 'color: var(--tp-muted-foreground)';

export const timelineDefaultSource = `<tp-timeline value="shipped" aria-label="Order status" style="max-inline-size: 24rem">
  <tp-timeline-item value="placed">
    <strong>Placed</strong>
    <div style="${muted}">${date('2026-03-18')}</div>
  </tp-timeline-item>
  <tp-timeline-item value="confirmed">
    <strong>Confirmed</strong>
    <div style="${muted}">${date('2026-03-18')}</div>
  </tp-timeline-item>
  <tp-timeline-item value="shipped">
    <strong>Shipped</strong>
    <div style="${muted}">${date('2026-03-19')}</div>
  </tp-timeline-item>
  <tp-timeline-item value="transit">
    <strong>In transit</strong>
    <div style="${muted}">${date('2026-03-20')}</div>
  </tp-timeline-item>
  <tp-timeline-item value="delivered">
    <strong>Delivered</strong>
    <div style="${muted}">${date('2026-03-21')}</div>
  </tp-timeline-item>
</tp-timeline>`;

const stage = (title: string, meta: string, value = title.toLowerCase()) =>
  `    <tp-timeline-item value="${value}"><strong>${title}</strong><div style="${muted}">${meta}</div></tp-timeline-item>`;

const step = (n: number, title: string, text: string, when: string, done: boolean) =>
  `    <tp-timeline-item value="${title.toLowerCase()}">
      ${done ? '<tp-icon slot="marker" data-icon="check"></tp-icon>' : `<span slot="marker" aria-hidden="true">${n}</span>`}
      <strong>${title}</strong>
      <p style="margin: var(--tp-space-1) 0; ${muted}">${text}</p>
      ${date(when)}
    </tp-timeline-item>`;

const milestone = (when: string, title: string, text: string) =>
  `      <tp-timeline-item>
        <div style="${muted}">${when}</div>
        <strong>${title}</strong>
        <p style="margin: var(--tp-space-1) 0 0; ${muted}">${text}</p>
      </tp-timeline-item>`;

const phase = (value: string, title: string, when: string, body: string, extra = '') =>
  `  <tp-timeline-item value="${value}">
    ${value === 'design' || value === 'permits' ? '<tp-icon slot="marker" data-icon="check"></tp-icon>' : ''}
    <tp-collapsible indicator-position="trailing" content-alignment="label"${extra}>
      <span slot="label"><strong>${title}</strong> <span style="${muted}">${when}</span></span>
      ${body}
    </tp-collapsible>
  </tp-timeline-item>`;

const message = (
  side: 'start' | 'end',
  initials: string,
  name: string,
  time: string,
  text: string,
) =>
  `  <tp-timeline-item align="${side}">
    <tp-avatar slot="marker" size="sm" fallback="${initials}" alt="${name}"></tp-avatar>
    <tp-bubble align="${side}"${side === 'end' ? ' variant="outline"' : ''}>${text}</tp-bubble>
    <div style="margin-block-start: var(--tp-space-1); font-size: var(--tp-text-xs); ${muted}; text-align: ${side}">${name} · <tp-time datetime="2026-10-09T${time}" mode="absolute" pattern="h:mm a"></tp-time></div>
  </tp-timeline-item>`;

const release = (version: string, title: string, when: string, entries: [string, string][]) =>
  `  <tp-timeline-item>
    <code slot="opposite">${version}</code>
    <strong>${title}</strong>
    <div style="${muted}"><tp-time datetime="${when}" mode="absolute" pattern="MMM d, y"></tp-time></div>
    <ul style="display: grid; gap: var(--tp-space-2); margin: var(--tp-space-3) 0 0; padding: 0; list-style: none">
${entries.map(([kind, text]) => `      <li><tp-badge variant="${kind === 'Fixed' ? 'outline' : kind === 'Removed' ? 'destructive' : 'secondary'}">${kind}</tp-badge> ${text}</li>`).join('\n')}
    </ul>
  </tp-timeline-item>`;

export const timelineExamples = [
  markupExample(
    'Order status',
    `<tp-card style="max-inline-size: 44rem">
  <h3 slot="header">Order status</h3>
  <p slot="description">#WB-4821</p>
  <tp-timeline orientation="horizontal" value="transit" aria-label="Order status">
${[
  ['Placed', '2026-03-18'],
  ['Confirmed', '2026-03-18'],
  ['Shipped', '2026-03-19'],
  ['In transit', '2026-03-20', 'transit'],
  ['Delivered', '2026-03-21'],
]
  .map(([title, when, value]) => stage(title!, date(when!), value))
  .join('\n')}
  </tp-timeline>
</tp-card>`,
    'A horizontal step tracker inside a Card. Setting `value` to the current step makes earlier steps complete and later ones upcoming; the connectors fill up to the current step.',
  ),
  interactive(
    'Deployment pipeline',
    'timeline-pipeline-example',
    `<tp-card style="max-inline-size: 52rem">
  <h3 slot="header">Deployment pipeline</h3>
  <p slot="description">3 of 6 completed</p>
  <tp-timeline orientation="horizontal" value="testing" aria-label="Deployment pipeline" style="--tp-timeline-item-min-size: 7rem">
${step(1, 'Discovery', 'Requirements and stakeholder interviews.', '2025-01-15', true)}
${step(2, 'Design', 'Wireframes and prototype validation.', '2025-03-15', true)}
${step(3, 'Development', 'Sprints with weekly demos.', '2025-06-15', true)}
${step(4, 'Testing', 'QA automation and security testing.', '2025-09-15', false)}
${step(5, 'Staging', 'Load testing and final sign-off.', '2025-11-15', false)}
${step(6, 'Launch', 'Phased rollout and monitoring.', '2026-01-15', false)}
  </tp-timeline>
  <tp-progress slot="footer" value="50" label="Pipeline progress" style="inline-size: 100%"></tp-progress>
</tp-card>`,
    'The marker slot replaces the default dot: completed steps show a check Icon and the others their number. Each item still announces its status, so the number can stay hidden from assistive technology. A Progress in the Card footer summarizes the pipeline.',
  ),
  markupExample(
    'Roadmap',
    `<tp-card style="max-inline-size: 48rem">
  <h3 slot="header">Product roadmap</h3>
  <p slot="description">6 milestones</p>
  <tp-scroll-area orientation="horizontal" label="Product roadmap">
    <tp-timeline orientation="horizontal" align="alternate" style="padding-block-end: var(--tp-space-4); --tp-timeline-item-min-size: 12rem">
${milestone('Jan 2025', 'Project kickoff', 'Initial planning, team assembly and architecture design.')}
${milestone('Mar 2025', 'Alpha release', 'Core features shipped to internal testers.')}
${milestone('Jun 2025', 'Beta launch', 'Public beta with 500 early adopters.')}
${milestone('Sep 2025', 'General availability', 'Production release with full documentation.')}
${milestone('Dec 2025', 'Enterprise tier', 'SSO, audit logs and team management.')}
${milestone('Mar 2026', 'Platform v2', 'Assisted workflows and real-time collaboration.')}
    </tp-timeline>
  </tp-scroll-area>
  <p slot="footer" style="margin: 0; ${muted}">Scroll horizontally to explore</p>
</tp-card>`,
    'Alternating items above and below a horizontal axis. Every marker stays on the same axis however tall the content is. A minimum item size makes the timeline overflow, and a horizontal Scroll area scrolls it.',
  ),
  interactive(
    'Expandable phases',
    'timeline-phases-example',
    `<tp-card style="max-inline-size: 40rem">
  <h3 slot="header">Construction phases</h3>
  <p slot="description">3 of 6 phases completed</p>
  <tp-timeline value="foundation" aria-label="Construction phases" style="--tp-timeline-gap: 0; --tp-timeline-marker-offset: var(--tp-space-2-5)">
${phase('design', 'Architectural design', 'Sep — Nov 2025', '<p style="margin: 0">Plans approved by the city.</p>')}
${phase('permits', 'Permits and approvals', 'Dec 2025 — Jan 2026', '<p style="margin: 0">All permits issued.</p>')}
${phase(
  'foundation',
  'Foundation and concrete',
  'Mar — Apr 2026',
  `<p style="margin: 0 0 var(--tp-space-2)">Footings poured and cured. Foundation walls 80% complete. Waterproofing membrane applied to completed sections.</p>
      <tp-badge variant="secondary">In progress</tp-badge>`,
  ' default-open',
)}
${phase('framing', 'Structural framing', 'May — Jul 2026', '<p style="margin: 0">Scheduled after the foundation inspection.</p>')}
${phase('systems', 'Mechanical, electrical, plumbing', 'Jul — Sep 2026', '<p style="margin: 0">Contractors confirmed.</p>')}
  </tp-timeline>
</tp-card>`,
    "Each item's content is a Collapsible, so expanding a phase is the Collapsible's own disclosure behavior; the connectors stretch while it opens. The Collapsible pads its trigger by `--tp-space-2-5`, so `--tp-timeline-marker-offset` adds the same inset to keep each marker on the trigger's first line.",
  ),
  markupExample(
    'Conversation',
    `<tp-timeline align="alternate" aria-label="Conversation" style="max-inline-size: 44rem; --tp-timeline-gap: var(--tp-space-4)">
${message('end', 'YU', 'You', '10:02', 'Are we still on track for the API migration this sprint?')}
${message('start', 'SC', 'Sarah Chen', '10:04', 'The Stripe webhook PR is ready to merge. The auth middleware one still needs a review.')}
${message('end', 'YU', 'You', '10:05', 'I can review the auth middleware today.')}
${message('start', 'SC', 'Sarah Chen', '10:08', 'The token format changed to opaque tokens. Run the migration script against staging first.')}
</tp-timeline>`,
    "Per-item `align` places each message on its author's side instead of alternating by position. Avatars are the markers, and Bubbles carry the messages. Below 40rem of inline size the alternating timeline puts every item on the end side.",
  ),
  markupExample(
    'Changelog',
    `<tp-timeline aria-label="Changelog" style="max-inline-size: 44rem; --tp-timeline-gap: var(--tp-space-8)">
${release('2.4.0', 'Team workspaces and real-time collaboration', '2026-03-22', [
  ['Added', 'Team workspaces with role-based permissions'],
  ['Improved', 'Dashboard load time reduced by 40%'],
  ['Fixed', 'Session expiry no longer redirects during editing'],
])}
${release('2.3.1', 'Performance improvements and bug fixes', '2026-03-15', [
  ['Fixed', 'WebSocket reconnection dropping pending messages'],
  ['Improved', 'Search indexing runs in background workers'],
])}
${release('2.3.0', 'Advanced analytics and custom dashboards', '2026-03-08', [
  ['Added', 'Custom dashboard builder'],
  ['Removed', 'Legacy analytics v1 endpoints'],
])}
</tp-timeline>`,
    'A log without a `value`: items have no status, and the dots and connectors stay neutral. The opposite slot holds each version, and Badges label the change types.',
  ),
];
