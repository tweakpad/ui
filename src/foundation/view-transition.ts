/** The same-document view transition in progress, where the browser reports one. */
export function activeViewTransition(document: Document | null | undefined): ViewTransition | null {
  return document?.activeViewTransition ?? null;
}

/** Transitions whose `finished` has settled, in case a browser still reports one as active. */
const settled = new WeakSet<ViewTransition>();

/**
 * Holds a reveal while a same-document view transition is active. During the transition the
 * browser shows the page through its snapshots and switches to the live page when it finishes, so
 * a reveal that started inside it would appear to play twice. `holds` reports whether the reveal
 * must wait, and calls `resume` once when the transition finishes, is skipped or fails.
 */
export class ViewTransitionHold {
  #waiting: ViewTransition | null = null;

  holds(document: Document | null | undefined, resume: () => void): boolean {
    const transition = activeViewTransition(document);
    if (!transition || settled.has(transition)) return false;
    if (this.#waiting !== transition) {
      this.#waiting = transition;
      const release = () => {
        settled.add(transition);
        if (this.#waiting !== transition) return;
        this.#waiting = null;
        resume();
      };
      transition.finished.then(release, release);
    }
    return true;
  }
}
