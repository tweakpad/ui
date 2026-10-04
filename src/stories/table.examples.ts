import { html, nothing } from 'lit';
import { navigationIcons } from '../icons/navigation.js';
export interface TableArgs {
  label: string;
  layout: 'automatic' | 'fixed';
  selectionPresentation: 'none' | 'row';
  stickyHeader: boolean;
  stickyFooter: boolean;
  stickyStartColumns: number;
  stickyEndColumns: number;
}
export const tableDefaults: TableArgs = {
  label: 'Recent invoices',
  layout: 'automatic',
  selectionPresentation: 'none',
  stickyHeader: false,
  stickyFooter: false,
  stickyStartColumns: 0,
  stickyEndColumns: 0,
};
const invoices = [
  ['INV001', 'Paid', 'Credit card', 250],
  ['INV002', 'Pending', 'PayPal', 150],
  ['INV003', 'Unpaid', 'Bank transfer', 350],
] as const;
export type TableExample =
  'basic' | 'footer' | 'simple' | 'badges' | 'actions' | 'select' | 'input' | 'sticky';
const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
export function tableContent(kind: TableExample) {
  if (kind === 'badges')
    return html`
      <tp-table-caption> Project tasks </tp-table-caption>
      <tp-table-header>
        <tp-table-row>
          <tp-table-head scope="col">Task</tp-table-head>
          <tp-table-head scope="col">Status</tp-table-head>
          <tp-table-head scope="col">Priority</tp-table-head>
        </tp-table-row>
      </tp-table-header>
      <tp-table-body>
        ${[
          ['Design homepage', 'Completed', 'High'],
          ['Implement API', 'In progress', 'Medium'],
          ['Write tests', 'Pending', 'Low'],
        ].map(
          ([task, status, priority]) =>
            html`<tp-table-row>
              <tp-table-head scope="row">${task}</tp-table-head>
              <tp-table-cell><tp-badge variant="secondary">${status}</tp-badge></tp-table-cell>
              <tp-table-cell><tp-badge variant="outline">${priority}</tp-badge></tp-table-cell>
            </tp-table-row>`,
        )}
      </tp-table-body>
    `;
  if (kind === 'select')
    return html`
      <tp-table-caption> Task assignments </tp-table-caption>
      <tp-table-header>
        <tp-table-row>
          <tp-table-head scope="col">Task</tp-table-head>
          <tp-table-head scope="col">Assignee</tp-table-head>
          <tp-table-head scope="col">Status</tp-table-head>
        </tp-table-row>
      </tp-table-header>
      <tp-table-body>
        ${['Design homepage', 'Implement API', 'Write tests'].map(
          (task, i) =>
            html`<tp-table-row>
              <tp-table-head scope="row">${task}</tp-table-head>
              <tp-table-cell>
                <tp-select
                  .label=${`Assignee for ${task}`}
                  .items=${['Alex', 'Morgan', 'Sam']}
                  .defaultValue=${['Alex', 'Morgan', 'Sam'][i]}
                ></tp-select>
              </tp-table-cell>
              <tp-table-cell>In progress</tp-table-cell>
            </tp-table-row>`,
        )}
      </tp-table-body>
    `;
  if (kind === 'input')
    return html`
      <tp-table-caption> Order quantities </tp-table-caption>
      <tp-table-header>
        <tp-table-row>
          <tp-table-head scope="col">Product</tp-table-head>
          <tp-table-head scope="col">Quantity</tp-table-head>
          <tp-table-head scope="col">Unit price</tp-table-head>
        </tp-table-row>
      </tp-table-header>
      <tp-table-body>
        ${[
          ['Wireless mouse', 29.99],
          ['Mechanical keyboard', 129.99],
          ['USB-C hub', 49.99],
        ].map(
          ([product, price]) =>
            html`<tp-table-row>
              <tp-table-head scope="row">${product}</tp-table-head>
              <tp-table-cell>
                <tp-input
                  type="number"
                  min="0"
                  .defaultValue=${'1'}
                  .ariaLabel=${`Quantity for ${product}`}
                ></tp-input>
              </tp-table-cell>
              <tp-table-cell>${money(Number(price))}</tp-table-cell>
            </tp-table-row>`,
        )}
      </tp-table-body>
    `;
  if (kind === 'sticky')
    return html`
      <tp-table-caption> Quarterly account totals </tp-table-caption>
      <tp-table-header>
        <tp-table-row>
          <tp-table-head scope="col">Account</tp-table-head>
          <tp-table-head scope="col">January</tp-table-head>
          <tp-table-head scope="col">February</tp-table-head>
          <tp-table-head scope="col">March</tp-table-head>
          <tp-table-head scope="col">Total</tp-table-head>
        </tp-table-row>
      </tp-table-header>
      <tp-table-body>
        ${Array.from(
          { length: 36 },
          (_, i) =>
            html`<tp-table-row>
              <tp-table-head scope="row">Account ${i + 1}</tp-table-head>
              <tp-table-cell>${money(125)}</tp-table-cell>
              <tp-table-cell>${money(225)}</tp-table-cell>
              <tp-table-cell>${money(325)}</tp-table-cell>
              <tp-table-cell>${money(675)}</tp-table-cell>
            </tp-table-row>`,
        )}
      </tp-table-body>
      <tp-table-footer>
        <tp-table-row>
          <tp-table-head scope="row">Total</tp-table-head>
          <tp-table-cell>${money(4500)}</tp-table-cell>
          <tp-table-cell>${money(8100)}</tp-table-cell>
          <tp-table-cell>${money(11700)}</tp-table-cell>
          <tp-table-cell>${money(24300)}</tp-table-cell>
        </tp-table-row>
      </tp-table-footer>
    `;
  return html`
    ${
      kind === 'simple'
        ? nothing
        : html`<tp-table-caption> A list of your recent invoices. </tp-table-caption>`
    }
    <tp-table-header>
      <tp-table-row>
        <tp-table-head scope="col">Invoice</tp-table-head>
        <tp-table-head scope="col">Status</tp-table-head>
        <tp-table-head scope="col">Method</tp-table-head>
        <tp-table-head scope="col" style="text-align:end">Amount</tp-table-head>
        ${kind === 'actions' ? html`<tp-table-head scope="col">Actions</tp-table-head>` : nothing}
      </tp-table-row>
    </tp-table-header>
    <tp-table-body>
      ${invoices.map(
        ([invoice, status, method, amount], i) =>
          html`<tp-table-row ?selected=${i === 0}>
            <tp-table-head scope="row">${invoice}</tp-table-head>
            <tp-table-cell>${status}</tp-table-cell>
            <tp-table-cell>${method}</tp-table-cell>
            <tp-table-cell style="text-align:end">${money(amount)}</tp-table-cell>
            ${
              kind === 'actions'
                ? html`<tp-table-cell>
                    <tp-menu .label=${`Actions for ${invoice}`}
                      ><tp-button
                        slot="trigger"
                        variant="ghost"
                        size="icon-sm"
                        .icon=${navigationIcons.more}
                        .ariaLabel=${`Actions for ${invoice}`}
                      ></tp-button
                      ><tp-menu-item>View invoice</tp-menu-item><tp-menu-item>Download</tp-menu-item
                      ><tp-menu-separator></tp-menu-separator
                      ><tp-menu-item variant="destructive">Delete invoice</tp-menu-item></tp-menu
                    >
                  </tp-table-cell>`
                : nothing
            }
          </tp-table-row>`,
      )}
    </tp-table-body>
    ${
      kind === 'footer'
        ? html`<tp-table-footer>
            <tp-table-row>
              <tp-table-head scope="row" colspan="3">Total</tp-table-head>
              <tp-table-cell style="text-align:end">
                ${money(invoices.reduce((sum, row) => sum + row[3], 0))}
              </tp-table-cell>
            </tp-table-row>
          </tp-table-footer>`
        : nothing
    }
  `;
}
export function renderTable(args: TableArgs, kind: TableExample = 'basic') {
  return html`<tp-table
    .partPresentation=${kind === 'sticky' ? { 'table-table': { styleHook: { 'min-inline-size': 'calc(var(--tp-spacing) * 240)' } } } : {}}
    .label=${args.label}
    .layout=${args.layout}
    .selectionPresentation=${args.selectionPresentation}
    .stickyHeader=${args.stickyHeader}
    .stickyFooter=${args.stickyFooter}
    .stickyStartColumns=${args.stickyStartColumns}
    .stickyEndColumns=${args.stickyEndColumns}
    style=${kind === 'sticky' ? 'max-block-size:calc(var(--tp-spacing) * 72);max-inline-size:calc(var(--tp-spacing) * 160)' : ''}
    >${tableContent(kind)}</tp-table
  >`;
}
/** Copyable authored HTML mirrors each live native composition, without fixture imports. */
export function tableSource(kind: TableExample): string {
  const begin =
    kind === 'sticky'
      ? '<style>\n  .quarterly-totals::part(table-table) { min-inline-size: calc(var(--tp-spacing) * 240); }\n</style>\n<tp-table class="quarterly-totals" label="Quarterly totals" sticky-header sticky-footer sticky-start-columns="1" sticky-end-columns="1" style="max-block-size:calc(var(--tp-spacing) * 72);max-inline-size:calc(var(--tp-spacing) * 160)">'
      : '<tp-table label="Records">';
  const headers =
    kind === 'badges'
      ? ['Task', 'Status', 'Priority']
      : kind === 'select'
        ? ['Task', 'Assignee', 'Status']
        : kind === 'input'
          ? ['Product', 'Quantity', 'Unit price']
          : kind === 'sticky'
            ? ['Account', 'January', 'February', 'March', 'Total']
            : ['Invoice', 'Status', 'Method', 'Amount', ...(kind === 'actions' ? ['Actions'] : [])];
  let rows: string[];
  if (kind === 'badges')
    rows = [
      '<tp-table-head scope="row">Design homepage</tp-table-head><tp-table-cell><tp-badge variant="secondary">Completed</tp-badge></tp-table-cell><tp-table-cell><tp-badge variant="outline">High</tp-badge></tp-table-cell>',
    ];
  else if (kind === 'select')
    rows = [
      '<tp-table-head scope="row">Design homepage</tp-table-head><tp-table-cell><tp-select label="Assignee for Design homepage"><option value="Alex">Alex</option><option value="Morgan">Morgan</option><option value="Sam">Sam</option></tp-select></tp-table-cell><tp-table-cell>In progress</tp-table-cell>',
    ];
  else if (kind === 'input')
    rows = [
      '<tp-table-head scope="row">Wireless mouse</tp-table-head><tp-table-cell><tp-input type="number" min="0" aria-label="Quantity for Wireless mouse" default-value="1"></tp-input></tp-table-cell><tp-table-cell>$29.99</tp-table-cell>',
    ];
  else if (kind === 'sticky')
    rows = Array.from(
      { length: 36 },
      (_, i) =>
        `<tp-table-head scope="row">Account ${i + 1}</tp-table-head><tp-table-cell>$125.00</tp-table-cell><tp-table-cell>$225.00</tp-table-cell><tp-table-cell>$325.00</tp-table-cell><tp-table-cell>$675.00</tp-table-cell>`,
    );
  else
    rows = invoices.map(
      ([invoice, status, method, amount]) =>
        `<tp-table-head scope="row">${invoice}</tp-table-head><tp-table-cell>${status}</tp-table-cell><tp-table-cell>${method}</tp-table-cell><tp-table-cell>${money(amount)}</tp-table-cell>${kind === 'actions' ? `<tp-table-cell><tp-menu label="Actions for ${invoice}"><tp-button slot="trigger" variant="ghost">Actions</tp-button><tp-menu-item>View invoice</tp-menu-item><tp-menu-item>Download</tp-menu-item><tp-menu-separator></tp-menu-separator><tp-menu-item variant="destructive">Delete invoice</tp-menu-item></tp-menu></tp-table-cell>` : ''}`,
    );
  const footer =
    kind === 'footer'
      ? '<tp-table-footer><tp-table-row><tp-table-head scope="row" colspan="3">Total</tp-table-head><tp-table-cell>$750.00</tp-table-cell></tp-table-row></tp-table-footer>'
      : kind === 'sticky'
        ? '<tp-table-footer><tp-table-row><tp-table-head scope="row">Total</tp-table-head><tp-table-cell>$4,500.00</tp-table-cell><tp-table-cell>$8,100.00</tp-table-cell><tp-table-cell>$11,700.00</tp-table-cell><tp-table-cell>$24,300.00</tp-table-cell></tp-table-row></tp-table-footer>'
        : '';
  return `${begin}\n  \n    ${kind === 'simple' ? '' : '<tp-table-caption>Records and totals</tp-table-caption>'}\n    <tp-table-header><tp-table-row>${headers.map((h) => `<tp-table-head scope="col">${h}</tp-table-head>`).join('')}</tp-table-row></tp-table-header>\n    <tp-table-body>\n${rows.map((row) => `      <tp-table-row>${row}</tp-table-row>`).join('\n')}\n    </tp-table-body>\n    ${footer}\n  \n</tp-table>`;
}
