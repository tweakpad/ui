const built = new URLSearchParams(location.search).has('built');
if (built) document.querySelector('link').href = '/dist/styles.css';
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const template = document.querySelector('#composition');
const menu = document.createElement('tp-navigation-menu');
menu.id = 'navigation';
menu.setAttribute('aria-label', 'Resources');
menu.value = '';
menu.onValueChange = (event) => {
  if (!event.defaultPrevented && !event.detail.cancelled) menu.value = event.detail.value;
};
menu.innerHTML = template.content.querySelector('tp-navigation-menu').innerHTML;
document.querySelector('main').append(menu);
const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const records = [];
function check(name, pass, actual) {
  records.push({ name, pass, actual });
  if (!pass) throw new Error(`${name}: ${JSON.stringify(actual)}`);
}
async function select(value) {
  menu.value = value;
  await menu.updateComplete;
  await wait();
}
async function stable(value, samples = 8) {
  await select(value);
  const widths = [];
  for (let i = 0; i < samples; i++) {
    await wait(150);
    widths.push(menu.viewportState.width);
  }
  check(
    `stable measured ${value}`,
    Math.min(...widths) > 40 && Math.max(...widths) - Math.min(...widths) <= 1,
    widths,
  );
  return widths[0];
}
async function geometry() {
  records.length = 0;
  const initial = await stable('learn');
  const larger = await stable('tools');
  check('distinct content determines size', larger > initial + 100, { initial, larger });
  for (let i = 0; i < 5; i++) {
    await select('learn');
    check(
      `repeated switch ${i}`,
      Math.abs(menu.viewportState.width - initial) <= 1,
      menu.viewportState,
    );
    await select('tools');
    check(
      `repeated larger ${i}`,
      Math.abs(menu.viewportState.width - larger) <= 1,
      menu.viewportState,
    );
  }
  menu.value = 'learn';
  await menu.updateComplete;
  menu.value = 'tools';
  await menu.updateComplete;
  await select('learn');
  check(
    'rapid reversal retains intrinsic dimensions',
    Math.abs(menu.viewportState.width - initial) <= 1,
    menu.viewportState,
  );
  const content = menu
    .querySelector('tp-navigation-menu-item[value="learn"]')
    .contentElement.getRootNode()
    .host.querySelector('.links');
  content.style.inlineSize = '400px';
  await wait(500);
  check(
    'ResizeObserver tracks actual growth',
    menu.viewportState.width > initial + 90,
    menu.viewportState,
  );
  content.style.inlineSize = '300px';
  await wait(500);
  check(
    'ResizeObserver tracks actual shrink without feedback',
    Math.abs(menu.viewportState.width - initial) <= 1,
    menu.viewportState,
  );
  for (const portal of [false, true]) {
    menu.portal = portal;
    for (const dir of ['ltr', 'rtl']) {
      menu.dir = dir;
      for (const orientation of ['horizontal', 'vertical']) {
        menu.orientation = orientation;
        await stable('learn', 3);
        check(
          `portal=${portal} ${dir} ${orientation}`,
          Math.abs(menu.viewportState.width - initial) <= 1,
          menu.viewportState,
        );
      }
    }
  }
  menu.showViewport = false;
  await select('tools');
  check(
    'independent viewport visibility preserves active content',
    menu.open && menu.value === 'tools',
    { open: menu.open, value: menu.value },
  );
  menu.showViewport = true;
  menu.orientation = 'horizontal';
  menu.dir = 'ltr';
  await stable('learn', 3);
  for (let i = 0; i < 5; i++) {
    await select('');
    await select('learn');
    check(
      `close/reopen ${i}`,
      Math.abs(menu.viewportState.width - initial) <= 1,
      menu.viewportState,
    );
  }
  return [...records];
}
async function alignment() {
  records.length = 0;
  for (const portal of [false, true]) {
    menu.portal = portal;
    for (const showViewport of [false, true]) {
      menu.showViewport = showViewport;
      for (const dir of ['ltr', 'rtl']) {
        menu.dir = dir;
        for (const orientation of ['horizontal', 'vertical']) {
          menu.orientation = orientation;
          menu.placement = orientation === 'vertical' ? 'inline-end start' : 'bottom center';
          await select('learn');
          const items = [...menu.querySelectorAll('tp-navigation-menu-item')];
          const top = items.map(
            (item) =>
              item.triggerElement?.shadowRoot.querySelector('button') ||
              item.querySelector('a[href]'),
          );
          const boxes = top.map((element) => element.getBoundingClientRect());
          check(
            'top-level controls share target and cross-axis alignment',
            boxes.every((box) => box.height >= 44 && Math.abs(box.height - boxes[0].height) <= 1) &&
              (orientation === 'horizontal'
                ? boxes.every((box) => Math.abs(box.top - boxes[0].top) <= 1)
                : boxes.every(
                    (box) =>
                      Math.abs(box.left - boxes[0].left) <= 1 &&
                      Math.abs(box.width - boxes[0].width) <= 1,
                  )),
            { portal, showViewport, dir, orientation, boxes: boxes.map((box) => box.toJSON()) },
          );
          const links = [...items[0].contentElement.getRootNode().host.querySelectorAll('a[href]')];
          const rows = links.map((link) => link.getBoundingClientRect());
          check(
            'popup destination rows share height and text inset',
            rows.every(
              (row) =>
                row.height >= 44 &&
                Math.abs(row.height - rows[0].height) <= 1 &&
                Math.abs(row.left - rows[0].left) <= 1 &&
                Math.abs(row.width - rows[0].width) <= 1,
            ),
            rows.map((row) => row.toJSON()),
          );
        }
      }
    }
  }
  menu.portal = true;
  menu.showViewport = true;
  menu.dir = 'ltr';
  menu.orientation = 'horizontal';
  menu.placement = 'bottom center';
  await select('learn');
  const content = menu
    .querySelector('tp-navigation-menu-item[value="learn"]')
    .contentElement.getRootNode()
    .host.querySelector('.links');
  content.style.display = 'grid';
  content.style.gridTemplateColumns = '1fr 1fr';
  await wait();
  const links = [...content.querySelectorAll('a')];
  check(
    'authored grid composition remains a grid',
    links[1].getBoundingClientRect().top === links[0].getBoundingClientRect().top &&
      links[1].getBoundingClientRect().left > links[0].getBoundingClientRect().left,
    links.map((link) => link.getBoundingClientRect().toJSON()),
  );
  content.style.removeProperty('display');
  content.style.removeProperty('grid-template-columns');
  await wait();
  return [...records];
}
async function association() {
  records.length = 0;
  for (const portal of [false, true]) {
    menu.portal = portal;
    for (const showViewport of [false, true]) {
      menu.showViewport = showViewport;
      for (const dir of ['ltr', 'rtl']) {
        menu.dir = dir;
        for (const orientation of ['horizontal', 'vertical']) {
          menu.orientation = orientation;
          menu.placement = orientation === 'vertical' ? 'inline-end start' : 'bottom center';
          for (const value of ['learn', 'tools', 'learn']) {
            await select(value);
            const trigger = menu.triggerElement.getBoundingClientRect();
            const popup = menu.positioner.getBoundingClientRect();
            const delta =
              orientation === 'horizontal'
                ? popup.left + popup.width / 2 - trigger.left - trigger.width / 2
                : popup.top - trigger.top;
            check(
              'accepted sibling selection replaces the tracked anchor',
              Math.abs(delta) <= 1 &&
                Math.abs(menu.positioningResult.anchorWidth - trigger.width) <= 1,
              {
                portal,
                showViewport,
                dir,
                orientation,
                value,
                delta,
                anchorWidth: menu.positioningResult.anchorWidth,
                trigger: trigger.toJSON(),
                popup: popup.toJSON(),
              },
            );
          }
        }
      }
    }
  }
  menu.portal = true;
  menu.showViewport = true;
  menu.dir = 'ltr';
  menu.orientation = 'horizontal';
  menu.placement = 'bottom center';
  await select('');
  return [...records];
}
Object.assign(window, {
  navigationGeometry: { built, menu, records, geometry, alignment, association, stable, select },
});
