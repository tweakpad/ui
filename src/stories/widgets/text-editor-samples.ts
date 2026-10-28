/** Sample documents the text editor stories and examples open with; never part of copied code. */

/** Survey notes: a heading, two paragraphs and a list with bold lead words. */
export const fieldNotes = [
  '<h1>Tide pool survey, north cove</h1>',
  '<p>Low tide reached 0.3 m at 07:40 and left the upper pools exposed for almost two hours. ',
  'The water stayed clear, with a light swell from the west.</p>',
  '<p>To log on the next visit:</p>',
  '<ul>',
  '<li><p><strong>Count the anemones</strong> in pools 4 to 7 before the sun reaches them.</p></li>',
  '<li><p><strong>Photograph the hermit crabs</strong> and note which shells they moved into.</p></li>',
  '<li><p><strong>Check the temperature logger</strong> under the ledge and swap its battery.</p></li>',
  '</ul>',
].join('');

/** The page the embed example shows: a sample tide table served beside the examples. */
const tideTablePage = '/pages/tide-table.html';

/** Notes with a callout and an embed. */
export const customBlockNotes = [
  '<h2>Mooring check</h2>',
  '<aside data-type="callout" data-tone="warning">Wait for slack water before you board the dinghy.</aside>',
  '<p>The tide table below is the harbour office page for this week.</p>',
  `<figure data-type="embed" data-src="${tideTablePage}" data-title="Harbour tide table"></figure>`,
].join('');

/** Notes with a mention. */
export const mentionNotes = [
  '<h2>Handover</h2>',
  '<p><span data-type="mention" data-person="selma-raud" data-label="Selma Raud">@Selma Raud</span> ',
  'updates the tide table on Mondays. Type @ to mention someone else.</p>',
].join('');
