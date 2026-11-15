/** Invoke through Chrome DevTools MCP on the static Complete catalog page. */
export async function reviewCatalogDemo() {
  const workspace = document.querySelector('catalog-workspace');
  const results = [];
  for (const section of [
    'overview',
    'work',
    'files',
    'brief',
    'activity',
    'sites',
    'automations',
  ]) {
    workspace.go(section);
    await Promise.race([
      workspace.updateComplete,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
    // Reveal motions (headline splits and mirrors) move text while they play; measure them settled.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const page = workspace.querySelector('.workspace-page');
    // Table, carousel, board, map and editor content may intentionally overflow their own viewport.
    const bounds = workspace.getBoundingClientRect();
    const failures = [];
    if (workspace.scrollWidth > bounds.width + 2) failures.push('Workspace overflows');
    // A motion border's glow paints past its card on purpose; measure the content without it.
    const glow = document.createElement('style');
    glow.textContent = ['glow-border', 'segment-border']
      .map(
        (name) =>
          `tp-mo-${name}::part(mo-${name}-glow), tp-mo-${name}::part(mo-${name}-bloom) { display: none; }`,
      )
      .join('\n');
    document.head.append(glow);
    if (page.scrollWidth > page.clientWidth + 2) failures.push('Page overflows');
    glow.remove();
    const unknown = [...workspace.querySelectorAll('*')].filter(
      (element) => element.localName.startsWith('tp-') && !customElements.get(element.localName),
    );
    if (unknown.length) failures.push('Unregistered controls');
    let columns;
    if (section === 'overview') {
      columns = getComputedStyle(
        workspace.querySelector('.overview-sprint-row'),
      ).gridTemplateColumns;
      const values = [...workspace.querySelectorAll('.overview-metric-value')];
      if (values.length !== 4) failures.push('Missing metrics');
      if (values.some((element) => getComputedStyle(element).whiteSpace !== 'nowrap'))
        failures.push('Metric value wraps');
    }
    const accessibility = window.axe
      ? await window.axe.run(workspace, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
      : null;
    results.push({
      section,
      width: Math.round(bounds.width),
      mobile: workspace.mobile,
      columns,
      failures,
      violations: accessibility?.violations.map((violation) => ({
        id: violation.id,
        count: violation.nodes.length,
      })),
    });
  }
  workspace.go('overview');
  return { viewport: innerWidth, results };
}
