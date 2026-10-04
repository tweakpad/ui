const built = new URL(location.href).searchParams.has('package');
await import(built ? '/dist/register.js' : '/src/register.ts');
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(stylesheet);
await new Promise((resolve) => stylesheet.addEventListener('load', resolve, { once: true }));
await customElements.whenDefined('tp-popover');
const subject = document.getElementById('subject');
const stage = document.getElementById('stage');
const frames = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const settle = async (element = subject) => {
  await element.updateComplete;
  await frames();
  await element.updatePosition?.();
};
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const positioner = (element) => {
  if (element.popupElement?.hasAttribute('data-positioned')) return element.popupElement;
  const root = element.portalElement?.shadowRoot ?? element.shadowRoot;
  return root.querySelector('[data-positioned]');
};
const close = async (element = subject) => {
  element.setOpen(false);
  await settle(element);
};
const attached = (element, side = 'bottom', align = 'start') => {
  const a = (element.anchor ?? element.triggerElement).getBoundingClientRect();
  const s = positioner(element).getBoundingClientRect();
  const error =
    side === 'bottom'
      ? s.top - a.bottom
      : side === 'top'
        ? s.bottom - a.top
        : side === 'left'
          ? s.right - a.left
          : s.left - a.right;
  check(Math.abs(error) <= 1, `${element.localName} ${side}: attachment error ${error}`);
  if (align === 'center') {
    const difference =
      side === 'top' || side === 'bottom'
        ? (s.left + s.right - a.left - a.right) / 2
        : (s.top + s.bottom - a.top - a.bottom) / 2;
    check(Math.abs(difference) <= 1, `Center error ${difference}`);
  }
  return {
    tag: element.localName,
    side,
    error,
    anchor: { x: a.x, y: a.y },
    surface: { x: s.x, y: s.y },
  };
};
const anchor = document.createElement('div');
anchor.id = 'anchor';
anchor.slot = 'anchor';
subject.append(anchor);
window.placementChecks = {
  built,
  async syntax() {
    const results = [];
    subject.anchor = anchor;
    subject.collisionAvoidance = { side: 'none', align: 'none' };
    subject.setOpen(true);
    const sides = [
      'top',
      'right',
      'bottom',
      'left',
      'inline-start',
      'inline-end',
      'block-start',
      'block-end',
    ];
    for (const dir of ['ltr', 'rtl']) {
      anchor.dir = dir;
      for (const side of sides)
        for (const align of ['start', 'center', 'end']) {
          const physical =
            side === 'inline-start'
              ? dir === 'rtl'
                ? 'right'
                : 'left'
              : side === 'inline-end'
                ? dir === 'rtl'
                  ? 'left'
                  : 'right'
                : side === 'block-start'
                  ? 'top'
                  : side === 'block-end'
                    ? 'bottom'
                    : side;
          for (const separator of [' ', '-'])
            for (const attribute of [false, true]) {
              const value = `${side}${separator}${align}`;
              if (attribute) subject.setAttribute('placement', value);
              else subject.placement = value;
              await settle();
              check(subject.side === side && subject.align === align, `Rejected ${value}`);
              check(
                subject.resolvedSide === physical && subject.resolvedAlign === align,
                `Wrong resolution ${value}`,
              );
              const geometry = attached(subject, physical, align);
              const a = anchor.getBoundingClientRect(),
                s = positioner(subject).getBoundingClientRect();
              if (align !== 'center') {
                const vertical = physical === 'top' || physical === 'bottom';
                const start = align === 'start';
                const logicalStart = vertical && dir === 'rtl' ? !start : start;
                const delta = vertical
                  ? logicalStart
                    ? s.left - a.left
                    : s.right - a.right
                  : start
                    ? s.top - a.top
                    : s.bottom - a.bottom;
                check(Math.abs(delta) <= 1, `Alignment ${value} ${dir}: ${delta}`);
              }
              results.push({ value, dir, attribute, ...geometry });
            }
        }
    }
    subject.placement = ' top   start ';
    await settle();
    check(subject.placement === 'top-start', 'Whitespace normalization');
    subject.placement = 'invalid';
    check(subject.placement === 'top-start', 'Invalid changed state');
    await close();
    return {
      cases: results.length,
      maximumError: Math.max(...results.map((r) => Math.abs(r.error))),
    };
  },
  async scrolling() {
    const results = [];
    stage.append(anchor);
    subject.anchor = undefined;
    subject.placement = 'bottom start';
    subject.collisionAvoidance = { side: 'none', align: 'none' };
    document.body.style.minWidth = '2400px';
    document.body.style.minHeight = '2400px';
    stage.style.left = '1100px';
    stage.style.top = '1250px';
    subject.setOpen(true);
    for (const portal of [true, false])
      for (const method of ['absolute', 'fixed', 'absolute']) {
        subject.portal = portal;
        subject.positionMethod = method;
        scrollTo(400, 1000);
        await settle();
        results.push({ portal, method, scrollX, scrollY, ...attached(subject) });
        scrollTo(450, 1050);
        await frames();
        await frames();
        results.push({ portal, method, automatic: true, scrollX, scrollY, ...attached(subject) });
      }
    // Top-layer coordinates must remain independent of transformed ancestors.
    stage.style.transform = 'translate(25px, 10px)';
    await settle();
    results.push({ transformed: true, ...attached(subject) });
    const scroller = document.createElement('div');
    scroller.style.cssText =
      'position:fixed;left:550px;top:300px;width:400px;height:160px;overflow:auto;transform:translateZ(0)';
    const space = document.createElement('div');
    space.style.cssText = 'height:600px;padding:100px 20px 0';
    stage.append(scroller);
    scroller.append(space);
    space.append(subject);
    subject.portal = true;
    subject.positionMethod = 'absolute';
    await settle();
    subject.setOpen(true);
    await settle();
    scroller.scrollTop = 40;
    await frames();
    await frames();
    results.push({ nestedScroller: true, ...attached(subject) });
    stage.prepend(subject);
    scroller.remove();
    stage.style.removeProperty('transform');
    await close();
    scrollTo(0, 0);
    document.body.style.cssText = '';
    stage.style.cssText = '';
    subject.portal = true;
    subject.append(anchor);
    return results;
  },
  async defaults() {
    const results = [];
    for (const mode of ['horizontal-tb', 'vertical-rl', 'vertical-lr'])
      for (const dir of ['ltr', 'rtl']) {
        const p = document.createElement('tp-popover');
        p.label = 'Default placement';
        p.innerHTML =
          '<tp-button slot="trigger">Default</tp-button><tp-button slot="close">Done</tp-button>';
        stage.append(p);
        anchor.style.writingMode = mode;
        anchor.dir = dir;
        p.anchor = anchor;
        p.open = true;
        p.collisionAvoidance = { side: 'none', align: 'none' };
        await settle(p);
        const expected =
          mode === 'vertical-rl' ? 'left' : mode === 'vertical-lr' ? 'right' : 'bottom';
        check(p.side === 'block-end' && p.align === 'center', 'Wrong Popover default');
        check(p.resolvedSide === expected, `Default ${mode}: ${p.resolvedSide}`);
        results.push({ mode, dir, ...attached(p, expected, 'center') });
        p.placement = 'bottom center';
        await settle(p);
        attached(p, 'bottom', 'center');
        p.remove();
      }
    anchor.style.writingMode = 'horizontal-tb';
    anchor.dir = 'ltr';
    return results;
  },
  async otherConsumers() {
    const results = [];
    document.body.style.minHeight = '2400px';
    scrollTo(0, 1000);
    for (const searchable of [false, true]) {
      const tag = 'tp-select';
      const p = document.createElement(tag);
      p.searchable = searchable;
      p.label = `${tag} placement`;
      p.items = ['One'];
      p.anchor = anchor;
      p.alignItemWithTrigger = false;
      p.placement = 'bottom start';
      p.sideOffset = 0;
      p.motionPolicy = 'reduce';
      stage.append(p);
      await settle(p);
      for (const method of ['absolute', 'fixed']) {
        p.positionMethod = method;
        p.setOpen(true);
        await settle(p);
        results.push({ method, scrollY, ...attached(p) });
      }
      p.setOpen(false);
      await settle(p);
      p.remove();
    }
    const toast = document.createElement('tp-toast');
    toast.motionPolicy = 'reduce';
    stage.append(toast);
    await toast.updateComplete;
    for (const method of ['absolute', 'fixed']) {
      toast.add({
        title: 'Anchored placement',
        timeout: 0,
        positionerProperties: {
          anchor,
          side: 'bottom',
          align: 'start',
          sideOffset: 0,
          positionMethod: method,
        },
      });
      await toast.updateComplete;
      await frames();
      await frames();
      const wrappers = [...toast.shadowRoot.querySelectorAll('[data-toast-positioner]')];
      const s = wrappers.at(-1).getBoundingClientRect(),
        a = anchor.getBoundingClientRect();
      check(Math.abs(s.top - a.bottom) <= 1, `Toast ${method}: ${s.top - a.bottom}`);
      results.push({ tag: 'tp-toast', method, scrollY, error: s.top - a.bottom });
      toast.close();
      await toast.updateComplete;
      await frames();
    }
    toast.remove();
    scrollTo(0, 0);
    document.body.style.minHeight = '';
    return results;
  },
  async family() {
    const results = [];
    for (const tag of [
      'tp-menu',
      'menu-context',
      'tp-navigation-menu',
      'tp-tooltip',
      'tp-preview-card',
    ]) {
      const p = document.createElement(tag === 'menu-context' ? 'tp-menu' : tag);
      if (tag === 'menu-context') p.invocation = 'context';
      p.label = `${tag} placement`;
      p.innerHTML = `<tp-button slot="trigger">${tag}</tp-button>${tag.includes('menu') ? '<tp-menu-item>Action</tp-menu-item>' : tag === 'tp-tooltip' ? 'Description' : '<tp-button>Action</tp-button>'}`;
      if (tag === 'tp-navigation-menu')
        p.innerHTML =
          '<tp-navigation-menu-item value="sample"><tp-button slot="trigger">Navigation</tp-button><div slot="content"><a href="#sample">Sample</a></div></tp-navigation-menu-item>';
      if (tag === 'tp-navigation-menu') p.value = '';
      stage.append(p);
      if (tag === 'menu-context') p.for = anchor.id;
      p.anchor = anchor;
      p.sideOffset = 0;
      p.showArrow = false;
      p.placement = 'bottom start';
      p.positionMethod = 'absolute';
      await settle(p);
      if (tag === 'tp-navigation-menu') p.value = 'sample';
      else p.setOpen(true);
      await settle(p);
      results.push(attached(p));
      p.placement = 'top-end';
      await settle(p);
      results.push(attached(p, 'top', 'end'));
      p.remove();
    }
    return results;
  },
};
await subject.updateComplete;
window.placementReady = true;
