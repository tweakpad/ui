import type { MediaTarget } from './target.js';

/**
 * Custom media registrations of one provider (`mp-f-discovery`). The most recently registered
 * media wins. Each release removes only the registration that created it, so a stale release
 * (for example, from an element that re-registered) cannot evict a newer registration. When the
 * winner is released, the previous live registration wins again.
 */
export class MediaRegistrations {
  readonly #entries: Array<{ readonly media: MediaTarget }> = [];
  readonly #onChange: (media: MediaTarget | null) => void;

  constructor(onChange: (media: MediaTarget | null) => void = () => undefined) {
    this.#onChange = onChange;
  }

  /** The winning registered media, or `null`. */
  get current(): MediaTarget | null {
    return this.#entries.at(-1)?.media ?? null;
  }

  register(media: MediaTarget): () => void {
    const entry = { media };
    const previous = this.current;
    this.#entries.push(entry);
    if (previous !== media) this.#onChange(media);
    return () => {
      const index = this.#entries.indexOf(entry);
      if (index < 0) return;
      const before = this.current;
      this.#entries.splice(index, 1);
      const after = this.current;
      if (before !== after) this.#onChange(after);
    };
  }

  clear(): void {
    const had = this.current !== null;
    this.#entries.length = 0;
    if (had) this.#onChange(null);
  }
}

/**
 * Media discovery order (`mp-f-discovery`): the winning registered media, else the first slotted
 * `<video>`/`<audio>` among `candidates`, else none.
 */
export function discoverMedia(
  registrations: MediaRegistrations,
  candidates: Iterable<Element>,
): MediaTarget | null {
  const registered = registrations.current;
  if (registered) return registered;
  for (const element of candidates) {
    const name = element.localName;
    if (name === 'video' || name === 'audio') return element as unknown as MediaTarget;
  }
  return null;
}
