/* global URLSearchParams, location, document, window, requestAnimationFrame, setTimeout, getComputedStyle, library, performance */
const built = new URLSearchParams(location.search).has('built');
await import(built ? '/dist/register.js' : '/src/register.ts');
const css = document.createElement('link');
css.rel = 'stylesheet';
css.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(css);
window.library = await import(built ? '/dist/index.js' : '/src/index.ts');
export const frames = async (n = 5) => {
  for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame);
};
export function row(id, height = 80, anchor = false) {
  const item = document.createElement('tp-message-scroller-item');
  item.messageId = id;
  item.scrollAnchor = anchor;
  item.style.height = `${height}px`;
  item.textContent = `Message ${id || '(anonymous)'} — stable transcript row.`;
  return item;
}
export async function make(options = {}, count = 12, explicit = true, attach = true) {
  const root = document.createElement('tp-message-scroller');
  Object.assign(root, options);
  root.style.setProperty('--tp-message-scroller-height', '260px');
  root.style.maxWidth = '600px';
  let content = root;
  if (explicit) {
    const viewport = document.createElement('tp-message-scroller-viewport');
    content = document.createElement('tp-message-scroller-content');
    viewport.append(content);
    root.append(viewport, document.createElement('tp-message-scroller-return-control'));
  }
  for (let i = 0; i < count; i++) content.append(row(`m${i}`, 80, i % 3 === 0));
  if (attach) {
    document.querySelector('#stage').append(root);
    await frames();
  }
  return {
    root,
    content,
    get viewport() {
      return root.provider.viewport;
    },
  };
}
const near = (a, b, label, tolerance = 2) => {
  if (Math.abs(a - b) > tolerance) throw Error(`${label}: ${a} vs ${b}`);
};
const assert = (value, label) => {
  if (!value) throw Error(label);
};
const offset = (fixture, id) =>
  fixture.root.querySelector(`[message-id="${id}"]`).getBoundingClientRect().top -
  fixture.viewport.getBoundingClientRect().top;
async function command(receipt) {
  const result = await Promise.race([
    receipt.finished,
    new Promise((resolve) => setTimeout(() => resolve('timeout'), 1500)),
  ]);
  assert(result === 'completed', `command ${receipt.status}/${result}`);
  await frames();
}
export async function runChecks() {
  const results = [];
  async function test(name, fn) {
    document.querySelector('#stage').replaceChildren();
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: String(error) });
    }
  }
  await test('explicit and shorthand anatomy', async () => {
    for (const explicit of [true, false]) {
      const f = await make({}, 6, explicit);
      assert(f.viewport.clientHeight === 260, 'one finite native viewport');
      assert(f.root.provider.mode === 'following-bottom', 'opening end');
      near(f.viewport.scrollTop, f.viewport.scrollHeight - f.viewport.clientHeight, 'end');
      f.root.remove();
    }
  });
  await test('opening start and last-anchor fallback', async () => {
    const f = await make({ initialPosition: 'start' });
    near(f.viewport.scrollTop, 0, 'start');
    f.root.remove();
    const g = await make({ initialPosition: 'last-anchor' }, 4);
    near(
      g.viewport.scrollTop,
      g.viewport.scrollHeight - g.viewport.clientHeight,
      'short last turn opens end',
    );
  });
  await test('last-anchor long turn, previous peek and collapse', async () => {
    const f = await make({ initialPosition: 'last-anchor', previousItemPeek: 32 }, 0, true, false);
    f.content.append(row('old', 320), row('anchor', 50, true), row('reply', 400));
    document.querySelector('#stage').append(f.root);
    await frames();
    near(offset(f, 'anchor'), 41.6, 'anchor plus content padding');
    f.content.lastElementChild.style.height = '100px';
    await frames();
    near(offset(f, 'anchor'), 41.6, 'collapse held');
  });
  await test('empty, hidden, and delayed first content', async () => {
    const f = await make({}, 0);
    assert(!f.root.hasAttribute('data-pending-scroll'), 'empty resolved');
    f.root.hidden = true;
    f.content.append(...Array.from({ length: 8 }, (_, i) => row(`late${i}`)));
    await frames();
    f.root.hidden = false;
    await frames();
    near(f.viewport.scrollTop, f.viewport.scrollHeight - f.viewport.clientHeight, 'delayed end');
  });
  await test('following append/growth without end flicker', async () => {
    const f = await make();
    const flags = [];
    const off = f.root.provider.scrollable.subscribe((e) => flags.push(e.value.end));
    f.content.append(row('tail', 80));
    await frames();
    f.content.lastElementChild.style.height = '220px';
    await frames();
    near(f.viewport.scrollTop, f.viewport.scrollHeight - f.viewport.clientHeight, 'growth end');
    assert(!flags.includes(true), 'no end flag while following');
    off();
  });
  await test('follow disabled still opens end but preserves later growth', async () => {
    const f = await make({ follow: false });
    const top = f.viewport.scrollTop;
    f.content.append(row('tail', 160));
    await frames();
    near(f.viewport.scrollTop, top, 'follow false');
  });
  await test('enabling follow at the live edge rearms without moving a reader above it', async () => {
    const f = await make({ follow: false });
    f.root.follow = true;
    await frames();
    assert(f.root.provider.mode === 'following-bottom', 'enabled at end');
    f.root.follow = false;
    await command(f.root.scrollToStart());
    f.root.follow = true;
    await frames();
    near(f.viewport.scrollTop, 0, 'enabling above end preserves reader');
    assert(f.root.provider.mode === 'free-scrolling', 'stays free above end');
  });
  await test('single new anchor, streaming handoff, then follow', async () => {
    const f = await make({ previousItemPeek: 32 });
    f.content.append(row('turn', 24, true));
    await frames();
    near(offset(f, 'turn'), 41.6, 'new turn');
    assert(f.root.provider.mode === 'anchored-to-message', 'anchored');
    f.content.append(row('reply', 50));
    await frames();
    near(offset(f, 'turn'), 41.6, 'short stream held');
    f.content.lastElementChild.style.height = '420px';
    await frames();
    assert(f.root.provider.mode === 'following-bottom', 'handoff');
    near(f.viewport.scrollTop, f.viewport.scrollHeight - f.viewport.clientHeight, 'handoff end');
  });
  await test('long new anchor stays at reading line', async () => {
    const f = await make();
    f.content.append(row('long', 450, true));
    await frames();
    near(offset(f, 'long'), 9.6, 'long anchor');
    f.content.lastElementChild.style.height = '650px';
    await frames();
    near(offset(f, 'long'), 9.6, 'long growth anchored');
  });
  await test('batch anchors retain end while following', async () => {
    const f = await make();
    f.content.append(row('a', 80, true), row('b', 80, true));
    await frames();
    near(f.viewport.scrollTop, f.viewport.scrollHeight - f.viewport.clientHeight, 'batch end');
  });
  await test('bare native scroll-away releases follow', async () => {
    const f = await make();
    f.viewport.scrollTop -= 150;
    await frames();
    const top = f.viewport.scrollTop;
    assert(f.root.provider.mode === 'free-scrolling', 'free mode');
    f.content.append(row('tail', 120));
    await frames();
    near(f.viewport.scrollTop, top, 'not yanked');
    f.viewport.scrollTop = f.viewport.scrollHeight;
    await frames();
    assert(f.root.provider.mode === 'following-bottom', 'rearmed');
  });
  await test('prepend and above-row resize preserve coordinate', async () => {
    const f = await make();
    await command(f.root.scrollToMessage('m5'));
    const before = offset(f, 'm5');
    f.content.prepend(row('older', 170));
    await frames();
    near(offset(f, 'm5'), before, 'prepend');
    f.content.firstElementChild.style.height = '240px';
    await frames();
    near(offset(f, 'm5'), before, 'resize above');
  });
  await test('four command alignments with padding and margin', async () => {
    const f = await make();
    for (const [align, expected] of [
      ['start', 29.6],
      ['center', 110],
      ['end', 150.4],
    ]) {
      await command(f.root.scrollToMessage('m5', { align, scrollMargin: 20 }));
      near(offset(f, 'm5'), expected, align);
    }
    const top = f.viewport.scrollTop;
    await command(f.root.scrollToMessage('m5', { align: 'nearest' }));
    near(f.viewport.scrollTop, top, 'nearest no-op');
  });
  await test('pending known command before mount and unknown rejection', async () => {
    const f = await make({ knownMessageIds: ['later'] }, 0, true, false);
    const receipt = f.root.scrollToMessage('later');
    assert(receipt.status === 'pending', 'premount pending');
    document.querySelector('#stage').append(f.root);
    await frames();
    f.content.append(row('old', 300), row('later', 80));
    await command(receipt);
    near(offset(f, 'later'), 9.6, 'queued placement');
    assert(f.root.scrollToMessage('missing').status === 'rejected', 'unknown rejected');
  });
  await test('supersession, disconnect and reconnection', async () => {
    const f = await make({ knownMessageIds: ['later'] });
    const old = f.root.scrollToMessage('later');
    await command(f.root.scrollToStart());
    assert((await old.finished) === 'superseded', 'superseded');
    const pending = f.root.scrollToMessage('later');
    f.root.remove();
    assert((await pending.finished) === 'superseded', 'disconnect supersedes');
    document.querySelector('#stage').append(f.root);
    await frames();
    await command(f.root.scrollToEnd());
  });
  await test('anonymous, duplicate and replacement rows', async () => {
    const f = await make({}, 2);
    f.content.append(row('', 100));
    await frames();
    assert(f.viewport.scrollHeight > 260, 'anonymous measured');
    const duplicate = row('m0', 80);
    f.content.append(duplicate);
    await frames();
    await command(f.root.scrollToMessage('m0'));
    near(offset(f, 'm0'), 9.6, 'first duplicate wins');
    duplicate.remove();
    f.content.lastElementChild.replaceWith(row('replacement', 100, true));
    await frames();
    near(offset(f, 'replacement'), 9.6, 'same-count new anchor');
  });
  await test('visibility lazy stable snapshot and current anchor', async () => {
    const f = await make({ initialPosition: 'start' });
    const empty = f.root.provider.visibility;
    assert(empty.visibleMessageIds.length === 0, 'inactive empty');
    const off = f.root.provider.subscribeVisibility(() => {});
    await frames();
    assert(f.root.provider.visibility.visibleMessageIds.includes('m0'), 'visible');
    await command(f.root.scrollToMessage('m5'));
    assert(f.root.provider.visibility.currentAnchorId === 'm3', 'previous current anchor persists');
    off();
    assert(f.root.provider.visibility === empty, 'stable empty');
  });
  await test('controlled pin rejection leaves position and mode', async () => {
    const f = await make({ pinned: true });
    const top = f.viewport.scrollTop;
    const receipt = f.root.scrollToStart();
    assert(receipt.status === 'rejected', 'rejected');
    near(f.viewport.scrollTop, top, 'rejected position');
    assert(f.root.provider.mode === 'following-bottom', 'accepted mode retained');
  });
  await test('controlled pin acceptance completes without recursive command', async () => {
    const f = await make({ pinned: true });
    f.root.addEventListener('tp-value-change', (e) => {
      f.root.pinned = e.detail.value;
    });
    await command(f.root.scrollToStart());
    assert(!f.root.pinned, 'false accepted');
    await command(f.root.scrollToEnd());
    assert(f.root.pinned, 'true accepted');
  });
  await test('semantic overrides, projected hooks and state-aware viewport', async () => {
    const f = await make({ initialPosition: 'start' });
    f.root.partContracts = {
      'message-scroller-viewport': { classHook: (s) => (s.end ? 'has-newer' : 'at-end') },
      'message-scroller-content': {
        hostProperties: { role: 'list', 'aria-live': 'off', 'aria-busy': 'true' },
      },
    };
    f.root.partPresentation = {
      'message-scroller-content': { styleHook: { padding: '20px', gap: '12px' } },
    };
    await frames();
    assert(f.viewport.classList.contains('has-newer'), 'state hook initial');
    assert(f.content.contentElement.getAttribute('role') === 'list', 'role override');
    assert(f.content.contentElement.getAttribute('aria-live') === 'off', 'live override');
    assert(f.content.contentElement.getAttribute('aria-busy') === 'true', 'busy override');
    near(
      parseFloat(getComputedStyle(f.content.contentElement).paddingTop),
      20,
      'projected padding',
    );
    await command(f.root.scrollToEnd());
    assert(f.viewport.classList.contains('at-end'), 'state hook updated');
    f.content.partContracts = { 'message-scroller-content': { hostProperties: { role: 'feed' } } };
    await frames();
    assert(f.content.contentElement.getAttribute('role') === 'feed', 'local replaces inherited');
    assert(
      f.content.contentElement.getAttribute('aria-live') === 'polite',
      'complete local contract',
    );
  });
  await test('plain explicit content, nested providers and replacement viewport', async () => {
    const f = await make({}, 0);
    const prose = document.createElement('p');
    prose.textContent = 'Native transcript prose';
    prose.style.height = '500px';
    f.content.append(prose);
    await frames();
    near(
      f.viewport.scrollTop,
      f.viewport.scrollHeight - f.viewport.clientHeight,
      'plain content follows',
    );
    const inner = await make({ initialPosition: 'start' }, 5);
    f.content.append(inner.root);
    await frames();
    assert(
      f.root.provider.options
        .rows()
        .every((r) => r.element === inner.root || !inner.root.contains(r.element)),
      'nested rows isolated',
    );
    const old = f.viewport;
    const replacement = document.createElement('tp-message-scroller-viewport');
    replacement.append(f.content);
    f.root.querySelector('tp-message-scroller-viewport').replaceWith(replacement);
    await frames();
    assert(f.viewport !== old && f.viewport === replacement.viewportElement, 'replacement rebound');
    near(inner.viewport.scrollTop, 0, 'inner unaffected');
  });
  await test('optional control, direction, inherited Button and disability', async () => {
    const f = await make();
    const control = f.root.querySelector('tp-message-scroller-return-control');
    assert(control instanceof library.TpButton, 'actual Button');
    assert(control.inert && !control.active, 'inactive at end');
    control.returnDirection = 'start';
    control.size = 'sm';
    control.textContent = 'First message';
    await frames();
    assert(
      control.active && !control.inert && control.ariaLabel === 'Scroll to start',
      'start active',
    );
    const button = control.shadowRoot.querySelector('button');
    assert(button.part.contains('message-scroller-return-control'), 'canonical native part');
    control.disabled = true;
    await frames();
    assert(
      button.disabled && getComputedStyle(button).opacity !== '0',
      'active disabled remains visible',
    );
    control.remove();
    assert(
      f.root.querySelectorAll('tp-message-scroller-return-control').length === 0,
      'optional removal',
    );
    await command(f.root.scrollToStart());
  });
  await test('reduced motion, rapid smooth replacement and end marker cleanup', async () => {
    const f = await make({ initialPosition: 'start', motionPolicy: 'reduce' });
    const reduced = f.root.scrollToEnd({ behavior: 'smooth' });
    near(
      f.viewport.scrollTop,
      f.viewport.scrollHeight - f.viewport.clientHeight,
      'reduced immediate',
    );
    assert(!f.root.provider.autoscrolling, 'no decorative indicator in reduced policy');
    await command(reduced);
    f.root.motionPolicy = 'normal';
    await frames();
    await command(f.root.scrollToStart());
    const smooth = f.root.scrollToEnd({ behavior: 'smooth' });
    assert(f.root.provider.autoscrolling, 'end marker');
    await frames(2);
    await command(f.root.scrollToMessage('m3', { behavior: 'instant' }));
    assert((await smooth.finished) === 'superseded', 'smooth superseded');
    await frames(15);
    assert(!f.root.provider.autoscrolling, 'marker cleared');
  });
  await test('viewport prepend opt-out and transformed geometry', async () => {
    const f = await make();
    const viewport = f.root.querySelector('tp-message-scroller-viewport');
    viewport.preserveOnPrepend = false;
    f.viewport.style.overflowAnchor = 'none';
    await command(f.root.scrollToMessage('m5'));
    const top = f.viewport.scrollTop;
    f.content.prepend(row('old', 100));
    await frames();
    near(f.viewport.scrollTop, top, 'provider preservation disabled');
    f.root.style.transform = 'scale(0.8)';
    f.root.style.transformOrigin = 'top left';
    await command(f.root.scrollToMessage('m7', { scrollMargin: 20 }));
    near(offset(f, 'm7') / 0.8, 29.6, 'scaled CSS pixel placement');
  });
  await test('immediate append and command uses current row geometry', async () => {
    const f = await make();
    f.content.append(row('immediate', 80));
    await command(f.root.scrollToMessage('immediate'));
    near(offset(f, 'immediate'), 9.6, 'immediate target');
  });
  await test('non-addressable tail and virtualizer spacers contribute to edges', async () => {
    const f = await make({ initialPosition: 'start' }, 2);
    const tail = document.createElement('div');
    tail.style.height = '800px';
    f.content.append(tail);
    await frames();
    assert(f.root.provider.scrollable.value.end, 'native virtualizer tail counts');
    await command(f.root.scrollToMessage('m1'));
    assert(f.root.provider.scrollable.value.end, 'tail remains below addressable row');
    tail.remove();
    f.content.append(row('m0', 800));
    await frames();
    assert(f.root.provider.scrollable.value.end, 'duplicate content still counts');
  });
  await test('dictionary replacement and scoped tokens preserve focus and state', async () => {
    const f = await make({ initialPosition: 'start' });
    f.viewport.focus();
    const viewport = f.viewport;
    const dictionary = {
      ...library.defaultPresentationDictionary,
      'message-scroller-content': [
        { declarations: { padding: '24px', gap: '16px', background: 'rgb(240, 246, 252)' } },
      ],
      'message-scroller-return-control': [
        { declarations: { border: '2px solid rgb(40, 80, 120)', 'border-radius': '6px' } },
      ],
    };
    library.setPresentationDictionary(dictionary);
    await frames();
    near(
      parseFloat(getComputedStyle(f.content.contentElement).paddingTop),
      24,
      'dictionary padding',
    );
    assert(
      viewport === f.viewport && viewport.getRootNode().activeElement === viewport,
      'identity and focus retained',
    );
    delete dictionary['message-scroller-content'];
    library.setPresentationDictionary(dictionary);
    await frames();
    near(
      parseFloat(getComputedStyle(f.content.contentElement).paddingTop),
      0,
      'missing key removes previous recipe',
    );
    library.setPresentationDictionary(library.defaultPresentationDictionary);
    f.root.style.setProperty('--tp-space-3', '17px');
    await frames();
    near(
      parseFloat(getComputedStyle(f.content.contentElement).paddingTop),
      17,
      'scoped token inherited',
    );
    f.root.style.removeProperty('--tp-space-3');
    await frames();
    near(parseFloat(getComputedStyle(f.content.contentElement).paddingTop), 9.6, 'token reset');
  });
  await test('headless provider without a custom element wrapper', async () => {
    const viewport = document.createElement('div');
    viewport.style.cssText = 'height:200px;overflow:auto';
    const content = document.createElement('div');
    content.style.display = 'flow-root';
    const spacer = document.createElement('div');
    const rows = Array.from({ length: 8 }, (_, i) => {
      const element = document.createElement('p');
      element.textContent = `Headless transcript ${i}`;
      element.style.cssText = 'height:80px;margin:0';
      content.append(element);
      return { id: `h${i}`, element, anchor: i === 0 };
    });
    content.append(spacer);
    viewport.append(content);
    document.querySelector('#stage').append(viewport);
    let pinned = true;
    const provider = new library.MessageScrollerProvider({
      rows: () => rows,
      knownIds: () => [],
      pinned: () => pinned,
      pin: (value) => {
        pinned = value;
        return true;
      },
      follow: () => true,
      initialPosition: () => 'end',
      threshold: () => 8,
      readingLine: () => 0,
      previousItemPeek: () => 0,
      returnControlPeek: () => 0,
      preserveOnPrepend: () => true,
      reducedMotion: () => false,
      changed: () => {},
    });
    provider.connect(viewport, content, spacer, content);
    await frames();
    near(viewport.scrollTop, 440, 'headless end');
    await command(provider.scrollToMessage('h3'));
    near(viewport.scrollTop, 240, 'headless message');
    provider.disconnect();
    assert(!provider.viewport, 'headless cleanup');
  });
  await test('1000 rows, schedule coalescing and no row rerenders', async () => {
    const f = await make({ initialPosition: 'start' }, 1000);
    await frames(10);
    let renders = 0,
      reads = 0;
    for (const item of f.content.children) {
      const update = item.requestUpdate;
      item.requestUpdate = function (...args) {
        renders++;
        return update.apply(this, args);
      };
    }
    const rows = f.root.provider.options.rows;
    f.root.provider.options.rows = () => {
      reads++;
      return rows();
    };
    const before = performance.now();
    for (let i = 0; i < 100; i++) f.root.provider.schedule();
    await frames(2);
    assert(reads === 1, `100 schedules coalesced to ${reads} reads`);
    f.viewport.scrollTop = 1000;
    await frames(5);
    assert(renders === 0, `row renders ${renders}`);
    window.performanceResult = {
      rows: 1000,
      rowUpdates: renders,
      reconciliations: reads,
      elapsedIncludingFrames: performance.now() - before,
    };
    f.root.provider.options.rows = rows;
  });
  window.results = results;
  document.querySelector('#results').textContent = JSON.stringify(results, null, 2);
  return results;
}
window.fixture = { make, row, frames, runChecks };
window.ready = true;
