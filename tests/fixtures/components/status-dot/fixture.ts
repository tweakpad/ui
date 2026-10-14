import { html, render } from 'lit';

const params = new URL(location.href).searchParams;
const built = params.has('package');
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(sheet);
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
// ?scheme=dark or ?scheme=light pins one theme for visual review.
if (params.get('scheme')) document.documentElement.style.colorScheme = params.get('scheme')!;
document.body.style.cssText =
  'margin:32px;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans);font-size:var(--tp-text-sm)';

const variants = ['default', 'secondary', 'success', 'warning', 'destructive'] as const;
const lines = [
  { name: 'Harbor shuttle', status: 'Running', variant: 'success', motion: 'ping' },
  { name: 'Night line', status: 'Delayed 12 min', variant: 'warning', motion: 'none' },
  { name: 'Ridge cable car', status: 'Closed for wind', variant: 'destructive', motion: 'pulse' },
  { name: 'Lake ferry', status: 'Seasonal break', variant: 'secondary', motion: 'none' },
  { name: 'Airport express', status: 'Boarding', variant: 'default', motion: 'none' },
] as const;
const row = 'display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-block:8px';

render(
  html`
    <h1>Status dot verification</h1>

    <section id="labels">
      <h2>Label shown</h2>
      <ul style="list-style:none;padding:0;display:grid;gap:8px">
        ${lines.map(
          (line) =>
            html`<li style="display:flex;justify-content:space-between;max-inline-size:360px">
              <span>${line.name}</span>
              <tp-status-dot
                show-label
                variant=${line.variant}
                motion=${line.motion}
                label=${line.status}
              ></tp-status-dot>
            </li>`,
        )}
      </ul>
    </section>

    <section id="tooltips">
      <h2>Label in a tooltip</h2>
      <div style=${row}>
        ${variants.map(
          (variant) =>
            html`<tp-status-dot
              id=${`tip-${variant}`}
              variant=${variant}
              label=${`Status ${variant}`}
            ></tp-status-dot>`,
        )}
        <tp-status-dot id="tip-ping" variant="success" motion="ping" label="Live"></tp-status-dot>
        <tp-status-dot
          id="tip-pulse"
          variant="destructive"
          motion="pulse"
          label="Recording"
        ></tp-status-dot>
        <tp-status-dot
          id="no-tooltip"
          variant="warning"
          tooltip="false"
          label="Unstable"
        ></tp-status-dot>
        <tp-status-dot id="empty" variant="success"></tp-status-dot>
      </div>
    </section>

    <section id="inline">
      <h2>Inline in text</h2>
      <p id="sentence">
        The harbor shuttle is
        <tp-status-dot variant="success" label="Running" show-label></tp-status-dot> again, and the
        night line <tp-status-dot variant="warning" label="Delayed"></tp-status-dot> follows.
      </p>
      <p id="after-inline">Line after the paragraph.</p>
    </section>

    <section id="wrapped">
      <h2>Wrapped label</h2>
      <div style="inline-size:180px;border:1px dashed var(--tp-border);padding:4px">
        <tp-status-dot
          id="wrap"
          show-label
          variant="warning"
          label="Reduced service on the coastal road until the bridge inspection ends"
        ></tp-status-dot>
      </div>
    </section>

    <section id="table">
      <h2>Table</h2>
      <tp-table>
        <tp-table-caption>Departures</tp-table-caption>
        <tp-table-header>
          <tp-table-row>
            <tp-table-head scope="col">Line</tp-table-head>
            <tp-table-head scope="col">State</tp-table-head>
            <tp-table-head scope="col">Next</tp-table-head>
          </tp-table-row>
        </tp-table-header>
        <tp-table-body>
          ${lines.map(
            (line, index) =>
              html`<tp-table-row>
                <tp-table-head scope="row">${line.name}</tp-table-head>
                <tp-table-cell
                  ><tp-status-dot
                    variant=${line.variant}
                    motion=${line.motion}
                    label=${line.status}
                  ></tp-status-dot
                ></tp-table-cell>
                <tp-table-cell>${`${8 + index}:${index % 2 ? '15' : '40'}`}</tp-table-cell>
              </tp-table-row>`,
          )}
        </tp-table-body>
      </tp-table>
    </section>

    <section id="hooks">
      <h2>Hooks</h2>
      <div style=${row}>
        <tp-status-dot
          id="hook-color"
          style="--tp-status-dot-color:var(--tp-chart-2)"
          variant="destructive"
          label="Charter"
          show-label
        ></tp-status-dot>
        <span style="--tp-status-dot-color:var(--tp-chart-5)">
          <tp-status-dot id="hook-inherited" label="Private" show-label></tp-status-dot>
        </span>
        <tp-status-dot
          id="hook-size"
          style="--tp-status-dot-size:12px"
          variant="success"
          motion="ping"
          label="Large"
          show-label
        ></tp-status-dot>
      </div>
    </section>

    <section id="rtl" dir="rtl" lang="ar">
      <h2>Right to left</h2>
      <div style=${row}>
        <tp-status-dot variant="success" label="يعمل" show-label motion="ping"></tp-status-dot>
        <tp-status-dot variant="warning" label="متأخر"></tp-status-dot>
      </div>
    </section>

    <section id="reduced" motion-policy="reduce">
      <h2>Reduced motion</h2>
      <div style=${row}>
        <tp-status-dot
          id="reduced-ping"
          variant="success"
          label="Live"
          show-label
          motion="ping"
        ></tp-status-dot>
        <tp-status-dot
          id="reduced-pulse"
          variant="destructive"
          label="Recording"
          show-label
          motion="pulse"
        ></tp-status-dot>
      </div>
    </section>
    <p id="end">End of fixture.</p>
  `,
  document.getElementById('fixture')!,
);
