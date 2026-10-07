/** Heading identifier text (Foundation §18.16): lowercase, letters/numbers/spaces/-/_ kept. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N} _-]/gu, '')
    .replace(/ /g, '-');
}

/** Hands out unique identifiers in document order: `a`, `a-1`, `a-2`. */
export class Slugger {
  readonly #seen = new Map<string, number>();

  constructor(private readonly prefix = '') {}

  slug(text: string): string {
    const base = this.prefix + slugify(text);
    let id = base;
    let count = this.#seen.get(base) ?? 0;
    while (this.#seen.has(id)) id = `${base}-${++count}`;
    this.#seen.set(base, count);
    this.#seen.set(id, 0);
    return id;
  }
}
