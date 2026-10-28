import { describe, expect, it, vi } from 'vitest';
import { ENGINE_CHANGES, engineChange, InputCauseTracker } from './cause.js';
import type { TextEditorContentChange } from './engine.js';

// Node has no InputEvent, ClipboardEvent or CompositionEvent: the tracker reads only the event
// type and the `inputType` and `isComposing` members, so plain events carry them here.

const EVENT_INIT: EventInit = { bubbles: true, cancelable: true, composed: true };

/** A `beforeinput` as a browser dispatches it, outside a composition unless said otherwise. */
function beforeInput(inputType: string, isComposing = false): Event {
  return Object.assign(new Event('beforeinput', EVENT_INIT), { inputType, isComposing });
}

const ENGINE: TextEditorContentChange = {
  cause: 'engine',
  reason: 'engine',
  sourceEvent: undefined,
};

function setup() {
  const root = new EventTarget();
  const tracker = new InputCauseTracker();
  const detach = tracker.attach(root);
  /** Dispatches `event` at the editing root and returns it. */
  const dispatch = (event: Event | string): Event => {
    const dispatched = typeof event === 'string' ? new Event(event, EVENT_INIT) : event;
    root.dispatchEvent(dispatched);
    return dispatched;
  };
  return { root, tracker, detach, dispatch };
}

/** An event target that records the listeners added to it and removed from it. */
class RecordingTarget extends EventTarget {
  readonly added: (readonly [string, unknown])[] = [];
  readonly removed: (readonly [string, unknown])[] = [];
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.added.push([type, options]);
    super.addEventListener(type, listener, options);
  }
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void {
    this.removed.push([type, options]);
    super.removeEventListener(type, listener, options);
  }
}

describe('InputCauseTracker (uwg-te-req-engine-6, uwg-te-tab-reasons r1 r2)', () => {
  it('V-034: typing, Enter and deletion give cause input and reason input', () => {
    const { tracker, dispatch } = setup();
    for (const inputType of [
      'insertText',
      'insertReplacementText',
      'insertParagraph',
      'insertLineBreak',
      'deleteContentBackward',
      'deleteContentForward',
      'deleteWordBackward',
      'deleteSoftLineForward',
    ]) {
      const event = dispatch(beforeInput(inputType));
      const change = tracker.consume();
      expect(change, inputType).toEqual({ cause: 'input', reason: 'input', sourceEvent: event });
      expect(change.sourceEvent, inputType).toBe(event);
      expect(Object.isFrozen(change), inputType).toBe(true);
    }
  });

  it('V-034: composition gives cause composition and reason input once, at its end', () => {
    const { tracker, dispatch } = setup();
    const start = dispatch('compositionstart');
    expect(tracker.composing).toBe(true);
    dispatch(beforeInput('insertCompositionText', true));
    // The updates inside the composition carry it without consuming it: its change is held.
    const held = { cause: 'composition', reason: 'input', sourceEvent: start };
    expect(tracker.consume()).toEqual(held);
    dispatch(beforeInput('insertCompositionText', true));
    dispatch(beforeInput('insertText', true));
    expect(tracker.consume()).toEqual(held);
    expect(tracker.composing).toBe(true);

    const end = dispatch('compositionend');
    expect(tracker.composing).toBe(false);
    const change = tracker.consume();
    expect(change).toEqual({ cause: 'composition', reason: 'input', sourceEvent: end });
    expect(change.sourceEvent).toBe(end);
    expect(tracker.consume()).toEqual(ENGINE);
  });

  it('V-034: cut gives cause cut and reason input', () => {
    const { tracker, dispatch } = setup();
    const cut = dispatch('cut');
    expect(tracker.consume()).toEqual({ cause: 'cut', reason: 'input', sourceEvent: cut });
    // The deletion of a cut that the browser performs itself.
    const deletion = dispatch(beforeInput('deleteByCut'));
    expect(tracker.consume()).toEqual({ cause: 'cut', reason: 'input', sourceEvent: deletion });
    expect(tracker.consume()).toEqual(ENGINE);
  });

  it('V-034: history inputs give cause history and reason engine', () => {
    const { tracker, dispatch } = setup();
    for (const inputType of ['historyUndo', 'historyRedo']) {
      const event = dispatch(beforeInput(inputType));
      const change = tracker.consume();
      expect(change, inputType).toEqual({ cause: 'history', reason: 'engine', sourceEvent: event });
      expect(change.sourceEvent, inputType).toBe(event);
    }
  });

  it('V-034: no intent gives cause engine and reason engine', () => {
    const { tracker } = setup();
    const change = tracker.consume();
    expect(change).toEqual(ENGINE);
    expect(Object.isFrozen(change)).toBe(true);
    expect(new InputCauseTracker().consume()).toEqual(ENGINE);
  });

  it("V-034: an action gives the request's reason", () => {
    const { tracker, dispatch } = setup();
    const press = new Event('click');
    const done = tracker.expectAction('trigger-press', press, 'mark.toggle');
    const change = tracker.consume();
    expect(change).toEqual({
      cause: 'action',
      reason: 'trigger-press',
      sourceEvent: press,
      action: 'mark.toggle',
    });
    expect(change.sourceEvent).toBe(press);
    expect(Object.isFrozen(change)).toBe(true);
    done();
    expect(tracker.consume()).toEqual(ENGINE);

    // `content.set` reports cause content; a request without an action type reports none.
    tracker.expectAction('imperative-action', undefined, 'content.set');
    expect(tracker.consume()).toEqual({
      cause: 'content',
      reason: 'imperative-action',
      sourceEvent: undefined,
      action: 'content.set',
    });
    const key = new Event('keydown');
    tracker.expectAction('hotkey', key);
    const untyped = tracker.consume();
    expect(untyped).toEqual({ cause: 'action', reason: 'hotkey', sourceEvent: key });
    expect('action' in untyped).toBe(false);

    // The expectation comes first, inside a composition too, and leaves the intent in place.
    const typed = dispatch(beforeInput('insertText'));
    const withdrawUndo = tracker.expectAction('hotkey', key, 'history.undo');
    expect(tracker.consume()).toMatchObject({ cause: 'action', reason: 'hotkey' });
    withdrawUndo();
    expect(tracker.consume()).toEqual({ cause: 'input', reason: 'input', sourceEvent: typed });
    const start = dispatch('compositionstart');
    tracker.expectAction('item-press', press, 'blocks.insert');
    expect(tracker.consume()).toMatchObject({ cause: 'action', reason: 'item-press' });
    expect(tracker.consume()).toEqual({
      cause: 'composition',
      reason: 'input',
      sourceEvent: start,
    });
  });

  it('V-034: an expectation that no update consumed is withdrawn, the intent left in place', () => {
    const { tracker, dispatch } = setup();
    const typed = dispatch(beforeInput('insertText'));
    const withdraw = tracker.expectAction('trigger-press', new Event('click'), 'blocks.delete');
    withdraw();
    expect(tracker.consume()).toEqual({ cause: 'input', reason: 'input', sourceEvent: typed });

    // A newer expectation replaces an older one, whose withdrawal then changes nothing.
    const older = tracker.expectAction('item-press', undefined, 'mark.clear');
    tracker.expectAction('keyboard', undefined, 'blocks.delete');
    older();
    expect(tracker.consume()).toMatchObject({ cause: 'action', reason: 'keyboard' });
    expect(tracker.consume()).toEqual(ENGINE);
  });

  it('V-034: each intent is consumed by the next update, and a newer input replaces it', () => {
    const { tracker, dispatch } = setup();
    dispatch(beforeInput('insertText'));
    const undo = dispatch(beforeInput('historyUndo'));
    expect(tracker.consume()).toEqual({ cause: 'history', reason: 'engine', sourceEvent: undo });
    expect(tracker.consume()).toEqual(ENGINE);

    // The composition replaces the cut before it, which no update consumed.
    dispatch('cut');
    dispatch('compositionstart');
    const end = dispatch('compositionend');
    expect(tracker.consume()).toEqual({ cause: 'composition', reason: 'input', sourceEvent: end });
    expect(tracker.consume()).toEqual(ENGINE);
  });

  it('records neither paste nor drops, which the widget turns into requests', () => {
    const { tracker, dispatch } = setup();
    const typed = dispatch(beforeInput('insertText'));
    for (const inputType of [
      'insertFromPaste',
      'insertFromPasteAsQuotation',
      'insertFromDrop',
      'deleteByDrag',
    ])
      dispatch(beforeInput(inputType));
    dispatch('paste');
    dispatch('drop');
    expect(tracker.consume()).toEqual({ cause: 'input', reason: 'input', sourceEvent: typed });
    dispatch(beforeInput('insertFromPaste'));
    expect(tracker.consume()).toEqual(ENGINE);
  });

  it('observes the editing root in the capture phase and never cancels or stops an event', () => {
    const root = new RecordingTarget();
    const tracker = new InputCauseTracker();
    const detach = tracker.attach(root);
    const observed = ['beforeinput', 'compositionend', 'compositionstart', 'cut'];
    expect(root.added.map(([type]) => type).sort()).toEqual(observed);
    for (const [, options] of root.added) expect(options).toEqual({ capture: true, passive: true });

    const later = vi.fn();
    for (const type of observed) root.addEventListener(type, later);
    for (const event of [
      beforeInput('insertText'),
      beforeInput('historyUndo'),
      new Event('cut', EVENT_INIT),
      new Event('compositionstart', EVENT_INIT),
      new Event('compositionend', EVENT_INIT),
    ]) {
      expect(root.dispatchEvent(event), event.type).toBe(true);
      expect(event.defaultPrevented, event.type).toBe(false);
    }
    expect(later).toHaveBeenCalledTimes(5);

    detach();
    expect(root.removed.map(([type]) => type).sort()).toEqual(observed);
    for (const [, options] of root.removed)
      expect(options).toEqual({ capture: true, passive: true });
  });

  it('forgets the intent and composition of a root it stops observing; a new root replaces the first', () => {
    const tracker = new InputCauseTracker();
    const first = new EventTarget();
    const second = new EventTarget();
    const detachFirst = tracker.attach(first);
    first.dispatchEvent(beforeInput('insertText'));
    first.dispatchEvent(new Event('compositionstart', EVENT_INIT));
    expect(tracker.composing).toBe(true);

    const detachSecond = tracker.attach(second);
    expect(tracker.composing).toBe(false);
    expect(tracker.consume()).toEqual(ENGINE);
    first.dispatchEvent(beforeInput('insertText'));
    expect(tracker.consume()).toEqual(ENGINE);

    const typed = beforeInput('insertText');
    second.dispatchEvent(typed);
    detachFirst();
    expect(tracker.consume()).toEqual({ cause: 'input', reason: 'input', sourceEvent: typed });

    second.dispatchEvent(beforeInput('deleteContentBackward'));
    detachSecond();
    expect(tracker.consume()).toEqual(ENGINE);
    second.dispatchEvent(beforeInput('insertText'));
    expect(tracker.consume()).toEqual(ENGINE);
  });

  it('ends a composition that an input or a cut reports over, and attributes late composition inputs to it', () => {
    const { tracker, dispatch } = setup();
    dispatch('compositionstart');
    dispatch(beforeInput('insertFromComposition'));
    expect(tracker.composing).toBe(true);
    const typed = dispatch(beforeInput('insertText'));
    expect(tracker.composing).toBe(false);
    expect(tracker.consume()).toEqual({ cause: 'input', reason: 'input', sourceEvent: typed });

    dispatch('compositionstart');
    const cut = dispatch('cut');
    expect(tracker.composing).toBe(false);
    expect(tracker.consume()).toEqual({ cause: 'cut', reason: 'input', sourceEvent: cut });

    // A composition input after the composition ended still belongs to a composition.
    const committed = dispatch(beforeInput('insertFromComposition'));
    expect(tracker.consume()).toEqual({
      cause: 'composition',
      reason: 'input',
      sourceEvent: committed,
    });
  });
});

describe('uwg-te-req-engine-6, uwg-te-tab-reasons r1: the cause of a change that no adapter call made', () => {
  it('is history with reason engine, or a cut, a composition or typing with reason input', () => {
    expect(ENGINE_CHANGES).toEqual({
      input: { cause: 'input', reason: 'input' },
      history: { cause: 'history', reason: 'engine' },
      cut: { cause: 'cut', reason: 'input' },
      composition: { cause: 'composition', reason: 'input' },
    });
    expect(Object.isFrozen(ENGINE_CHANGES) && Object.isFrozen(ENGINE_CHANGES.cut)).toBe(true);
  });

  it('takes history first, then a cut, then a composition, else typing', () => {
    const none = { history: false, cut: false, composition: false };
    expect(engineChange(none)).toBe(ENGINE_CHANGES.input);
    expect(engineChange({ ...none, composition: true })).toBe(ENGINE_CHANGES.composition);
    expect(engineChange({ ...none, cut: true, composition: true })).toBe(ENGINE_CHANGES.cut);
    expect(engineChange({ history: true, cut: true, composition: true })).toBe(
      ENGINE_CHANGES.history,
    );
  });
});
