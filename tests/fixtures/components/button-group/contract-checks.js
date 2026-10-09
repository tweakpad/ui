// Button Group browser contract, executed through Chrome DevTools MCP `evaluate_script`.
const nonZero = (value) => parseFloat(value) > 0;
const control = (button) => button.shadowRoot.querySelector('.control');
const member = (text, options = {}) => {
  const button = document.createElement('tp-button');
  button.variant = 'outline';
  button.textContent = text;
  Object.assign(button, options);
  return button;
};

/** Joined corners and seams, native members, focus raise, paired sizes, vertical and unjoined. */
export async function run() {
  const host = document.querySelector('#host');
  const group = document.createElement('tp-button-group');
  group.label = 'Document actions';
  const archive = member('Archive');
  const report = member('Report', { disabled: true });
  const more = member('More', { href: '#group-link' });
  group.append(archive, report, more);
  host.append(group);
  await Promise.all([group, archive, report, more].map((element) => element.updateComplete));

  const root = group.shadowRoot.querySelector('[part~="button-group"]');
  const controls = [archive, report, more].map(control);
  const horizontalStyles = controls.map((element) => getComputedStyle(element));
  const horizontalBoxes = controls.map((element) => element.getBoundingClientRect());
  const horizontalCorners =
    nonZero(horizontalStyles[0].borderTopLeftRadius) &&
    !nonZero(horizontalStyles[0].borderTopRightRadius) &&
    !nonZero(horizontalStyles[1].borderTopLeftRadius) &&
    !nonZero(horizontalStyles[1].borderTopRightRadius) &&
    !nonZero(horizontalStyles[2].borderTopLeftRadius) &&
    nonZero(horizontalStyles[2].borderTopRightRadius);
  const horizontalSeams =
    horizontalStyles[1].borderLeftWidth === '0px' &&
    horizontalStyles[2].borderLeftWidth === '0px' &&
    Math.abs(horizontalBoxes[0].right - horizontalBoxes[1].left) < 0.1 &&
    Math.abs(horizontalBoxes[1].right - horizontalBoxes[2].left) < 0.1;

  let archiveClicks = 0;
  archive.addEventListener('click', () => {
    archiveClicks += 1;
  });
  archive.click();
  report.click();
  const membersStayButtons =
    archiveClicks === 1 &&
    controls[0].localName === 'button' &&
    controls[1].localName === 'button' &&
    controls[1].disabled &&
    controls[2].localName === 'a' &&
    controls[2].getAttribute('href') === '#group-link';
  const defaultControlStyle = getComputedStyle(controls[0]);
  const typographyResolvesOnce =
    Math.abs(parseFloat(getComputedStyle(document.documentElement).fontSize) - 16) < 0.1 &&
    Math.abs(parseFloat(defaultControlStyle.fontSize) - 15) < 0.1 &&
    defaultControlStyle.transform === 'none';
  report.focusableWhenDisabled = true;
  await report.updateComplete;
  report.focus();
  const focusRaised = getComputedStyle(report).zIndex === '1';

  const pairedSizeGeometry = [];
  for (const [textSize, iconSize] of [
    ['sm', 'icon-sm'],
    ['default', 'icon'],
    ['lg', 'icon-lg'],
  ]) {
    const sizeGroup = document.createElement('tp-button-group');
    const textButton = member(textSize, { size: textSize });
    const iconButton = member('', { size: iconSize, ariaLabel: `${textSize} icon` });
    sizeGroup.append(textButton, iconButton);
    host.append(sizeGroup);
    await Promise.all([sizeGroup, textButton, iconButton].map((element) => element.updateComplete));
    const textHost = textButton.getBoundingClientRect();
    const iconHost = iconButton.getBoundingClientRect();
    const textControl = control(textButton).getBoundingClientRect();
    const iconControl = control(iconButton).getBoundingClientRect();
    pairedSizeGeometry.push({
      textSize,
      iconSize,
      textHostHeight: textHost.height,
      iconHostHeight: iconHost.height,
      textControlHeight: textControl.height,
      iconControlWidth: iconControl.width,
      iconControlHeight: iconControl.height,
    });
    sizeGroup.remove();
  }
  const pairedSizesShareGeometry = pairedSizeGeometry.every(
    ({ textHostHeight, iconHostHeight, textControlHeight, iconControlWidth, iconControlHeight }) =>
      Math.abs(textControlHeight - iconControlHeight) < 0.1 &&
      Math.abs(textHostHeight - textControlHeight) < 0.1 &&
      Math.abs(iconHostHeight - iconControlHeight) < 0.1 &&
      Math.abs(iconControlWidth - iconControlHeight) < 0.1,
  );
  if (!pairedSizesShareGeometry)
    throw new Error(`Button size geometry diverged: ${JSON.stringify(pairedSizeGeometry)}`);

  group.orientation = 'vertical';
  await group.updateComplete;
  const verticalStyles = controls.map((element) => getComputedStyle(element));
  const verticalBoxes = controls.map((element) => element.getBoundingClientRect());
  const verticalCorners =
    nonZero(verticalStyles[0].borderTopLeftRadius) &&
    nonZero(verticalStyles[0].borderTopRightRadius) &&
    !nonZero(verticalStyles[1].borderTopLeftRadius) &&
    !nonZero(verticalStyles[1].borderBottomLeftRadius) &&
    nonZero(verticalStyles[2].borderBottomLeftRadius) &&
    nonZero(verticalStyles[2].borderBottomRightRadius);
  const verticalSeams =
    verticalStyles[1].borderTopWidth === '0px' &&
    verticalStyles[2].borderTopWidth === '0px' &&
    Math.abs(verticalBoxes[0].bottom - verticalBoxes[1].top) < 0.1 &&
    Math.abs(verticalBoxes[1].bottom - verticalBoxes[2].top) < 0.1 &&
    verticalBoxes.every((box) => Math.abs(box.width - verticalBoxes[0].width) < 0.1);
  const orderUnchanged =
    group.children[0] === archive && group.children[1] === report && group.children[2] === more;

  group.orientation = 'horizontal';
  group.joined = false;
  await group.updateComplete;
  const unjoinedStyles = controls.map((element) => getComputedStyle(element));
  const unjoined =
    parseFloat(getComputedStyle(root).gap) > 0 &&
    unjoinedStyles.every(
      (style) =>
        nonZero(style.borderTopLeftRadius) &&
        nonZero(style.borderTopRightRadius) &&
        style.borderLeftWidth !== '0px',
    );
  const semantics =
    root.getAttribute('role') === 'group' && root.getAttribute('aria-label') === 'Document actions';
  group.remove();

  const results = {
    horizontalCorners,
    horizontalSeams,
    membersStayButtons,
    typographyResolvesOnce,
    focusRaised,
    pairedSizesShareGeometry,
    verticalCorners,
    verticalSeams,
    orderUnchanged,
    unjoined,
    semantics,
  };
  const failed = Object.entries(results).filter(([, value]) => value !== true);
  if (failed.length)
    throw new Error(`Button group contract failed: ${failed.map(([key]) => key).join(', ')}`);
  return results;
}
