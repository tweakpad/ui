import { markupExample } from './documentation-examples.js';

const lines = [
  ['Harbor shuttle', 'success', 'Running', ' motion="ping"'],
  ['Night line', 'warning', 'Delayed 12 min', ''],
  ['Ridge cable car', 'destructive', 'Closed for wind', ''],
  ['Lake ferry', 'secondary', 'Seasonal break', ''],
] as const;

export const statusDotExamples = [
  markupExample(
    'Service status',
    `<tp-list aria-label="Lines">
${lines
  .map(
    ([name, variant, label, motion]) => `  <tp-list-item>
    ${name}
    <tp-status-dot slot="description" variant="${variant}" label="${label}" show-label${motion}></tp-status-dot>
  </tp-list-item>`,
  )
  .join('\n')}
</tp-list>`,
    '`show-label` puts the status beside the dot, here as the supporting text of each row. The ping on the running line marks it as live; the other lines stay still so the motion keeps its meaning.',
  ),
  markupExample(
    'Compact column',
    `<div style="max-inline-size:28rem"><tp-table label="Departures">
  <tp-table-header
    ><tp-table-row>
      <tp-table-head scope="col">Line</tp-table-head>
      <tp-table-head scope="col">State</tp-table-head>
      <tp-table-head scope="col">Next</tp-table-head>
    </tp-table-row></tp-table-header
  >
  <tp-table-body
    >${lines
      .map(
        ([name, variant, label, motion], index) => `<tp-table-row>
      <tp-table-head scope="row">${name}</tp-table-head>
      <tp-table-cell><tp-status-dot variant="${variant}" label="${label}"${motion}></tp-status-dot></tp-table-cell>
      <tp-table-cell>${8 + index}:${index % 2 ? '15' : '40'}</tp-table-cell>
    </tp-table-row
    >`,
      )
      .join('')}</tp-table-body
  >
</tp-table></div>`,
    'Without `show-label` the dot stands alone and the label becomes its accessible name and tooltip. Hover a dot, or press Tab to reach it with the keyboard.',
  ),
  markupExample(
    'Pulse and ping',
    `<tp-status-dot variant="destructive" label="Recording" show-label motion="pulse"></tp-status-dot>
<tp-status-dot variant="success" label="Live" show-label motion="ping"></tp-status-dot>
<tp-status-dot variant="secondary" label="Idle" show-label></tp-status-dot>`,
    '`pulse` fades the dot, `ping` sends a ring out of it. Neither moves the label or the content around it, and both rest under reduced motion.',
  ),
];
