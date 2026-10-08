import { foldedPrefixEnd, tokenize } from './normalize.js';
import { SearchableMap } from './radix-tree.js';
import type { SearchHit, SearchMatch, SearchRange } from './types.js';

/** Text of one field of an item: a string, several strings, or nothing. */
export type FieldText = string | readonly string[] | null | undefined;

export interface TextIndexOptions<T> {
  /** Field names to index; default `['text']`. */
  readonly fields?: readonly string[];
  /** Text of `field` for `item`; default `String(item)` for `text`, else `item[field]`. */
  readonly extract?: (item: T, field: string) => FieldText;
  /** Identifier reported in hits; default the item itself. */
  readonly getId?: (item: T) => unknown;
  /** Score factor per field; default 1. */
  readonly boost?: Readonly<Record<string, number>>;
  /** Locale for folding and word segmentation. */
  readonly locale?: string | undefined;
}

export interface TextSearchOptions<T> {
  /** Prefix matching of query terms; default true. */
  readonly prefix?: boolean;
  /** Matching of query terms of at least three characters inside words; default true. */
  readonly infix?: boolean;
  /** Fuzzy matching: a fraction below 1 of the term length, an edit distance, or false; default 0.2. */
  readonly fuzzy?: boolean | number;
  /** Upper bound of a fractional fuzzy distance; default 6. */
  readonly maxFuzzy?: number;
  /** AND requires every query term; OR any; default AND. */
  readonly combineWith?: 'AND' | 'OR';
  /** Fields to search; default all. */
  readonly fields?: readonly string[];
  /** Score factors per field, over the index's own. */
  readonly boost?: Readonly<Record<string, number>>;
  /** Keeps only items it accepts. */
  readonly filter?: (item: T) => boolean;
  /** Maximum hits; default unlimited. */
  readonly limit?: number;
}

interface Document<T> {
  readonly item: T;
  readonly id: unknown;
  readonly order: number;
  readonly texts: readonly string[][];
  readonly lengths: readonly number[];
}

/** term → field index → document number → term frequency */
type Postings = Map<number, Map<number, number>>;

const BM25 = { k: 1.2, b: 0.7, d: 0.5 };
const PREFIX_WEIGHT = 0.375;
const INFIX_WEIGHT = 0.25;
const FUZZY_WEIGHT = 0.45;
const MIN_INFIX = 3;

interface TermMatch {
  readonly weight: number;
  /** Folded offset and length of the matched part of the term; absent for the whole term. */
  readonly offset?: number;
  readonly length?: number;
}

/**
 * An inverted index of items over text fields with ranked prefix and typo-tolerant search: terms
 * live in a radix tree, scores follow BM25+ weighted by field boosts and by how each term matched
 * (exact, prefix or fuzzy), and hits carry the matched ranges for highlighting.
 */
export class TextIndex<T> {
  readonly fields: readonly string[];
  readonly locale: string | undefined;
  readonly #options: TextIndexOptions<T>;
  readonly #terms = new SearchableMap<Postings>();
  /** Every indexed term, for infix matching. */
  readonly #vocabulary = new Set<string>();
  readonly #documents = new Map<number, Document<T>>();
  readonly #byId = new Map<unknown, number>();
  readonly #totalLength: number[];
  #next = 0;

  constructor(options: TextIndexOptions<T> = {}) {
    this.#options = options;
    this.fields = options.fields?.length ? options.fields : ['text'];
    this.locale = options.locale;
    this.#totalLength = this.fields.map(() => 0);
  }

  get size(): number {
    return this.#documents.size;
  }

  get termCount(): number {
    return this.#terms.size;
  }

  has(id: unknown): boolean {
    return this.#byId.has(id);
  }

  add(item: T): void {
    const id = this.#options.getId ? this.#options.getId(item) : item;
    if (this.#byId.has(id)) this.discard(id);
    const number = this.#next++;
    const values = this.fields.map((field) => fieldTexts(this.#extract(item, field)));
    const lengths: number[] = [];
    values.forEach((texts, field) => {
      let length = 0;
      for (const value of texts)
        for (const token of tokenize(value, this.locale)) {
          length++;
          const postings = this.#terms.fetch(token.term, () => {
            this.#vocabulary.add(token.term);
            return new Map();
          });
          let documents = postings.get(field);
          if (!documents) postings.set(field, (documents = new Map()));
          documents.set(number, (documents.get(number) ?? 0) + 1);
        }
      lengths.push(length);
      this.#totalLength[field]! += length;
    });
    this.#documents.set(number, { item, id, order: number, texts: values, lengths });
    this.#byId.set(id, number);
  }

  addAll(items: Iterable<T>): void {
    for (const item of items) this.add(item);
  }

  /** Removes the item with identifier `id`, if indexed. */
  discard(id: unknown): boolean {
    const number = this.#byId.get(id);
    if (number === undefined) return false;
    const document = this.#documents.get(number)!;
    document.texts.forEach((values, field) => {
      for (const value of values)
        for (const token of tokenize(value, this.locale)) {
          const postings = this.#terms.get(token.term);
          const documents = postings?.get(field);
          if (!documents?.delete(number)) continue;
          if (!documents.size) postings!.delete(field);
          if (!postings!.size) {
            this.#terms.delete(token.term);
            this.#vocabulary.delete(token.term);
          }
        }
      this.#totalLength[field]! -= document.lengths[field]!;
    });
    this.#documents.delete(number);
    this.#byId.delete(id);
    return true;
  }

  remove(item: T): boolean {
    return this.discard(this.#options.getId ? this.#options.getId(item) : item);
  }

  /** Replaces the indexed item with the same identifier. */
  replace(item: T): void {
    this.remove(item);
    this.add(item);
  }

  clear(): void {
    this.#terms.clear();
    this.#vocabulary.clear();
    this.#documents.clear();
    this.#byId.clear();
    this.#totalLength.fill(0);
    this.#next = 0;
  }

  /** Every indexed item in insertion order. */
  items(): T[] {
    return [...this.#documents.values()].map((document) => document.item);
  }

  /**
   * Ranked hits for `query`, best first, ties in insertion order. An empty query returns every
   * item in insertion order with score 0.
   */
  search(query: string, options: TextSearchOptions<T> = {}): SearchHit<T>[] {
    const queryTerms = [...new Set(tokenize(query, this.locale).map((token) => token.term))];
    const limit = options.limit ?? -1;
    if (!queryTerms.length) {
      const all = [...this.#documents.values()]
        .filter((document) => !options.filter || options.filter(document.item))
        .map((document): SearchHit<T> => ({ item: document.item, id: document.id, score: 0 }));
      return limit < 0 ? all : all.slice(0, limit);
    }
    const fields = this.fields
      .map((name, index) => ({ name, index }))
      .filter(({ name }) => !options.fields || options.fields.includes(name));
    const boost = (name: string) => options.boost?.[name] ?? this.#options.boost?.[name] ?? 1;
    const average = (field: number) => this.#totalLength[field]! / Math.max(1, this.size);
    const prefix = options.prefix ?? true;
    const infix = options.infix ?? true;
    const fuzzy = options.fuzzy ?? 0.2;
    const maxFuzzy = options.maxFuzzy ?? 6;
    const combineWith = options.combineWith ?? 'AND';

    interface Result {
      score: number;
      matched: number;
      /** field index → matched index term → how it matched */
      terms: Map<number, Map<string, TermMatch>>;
    }
    let combined: Map<number, Result> | undefined;
    for (const queryTerm of queryTerms) {
      const candidates = new Map<string, TermMatch>();
      if (this.#terms.has(queryTerm)) candidates.set(queryTerm, { weight: 1 });
      if (prefix)
        for (const [term] of this.#terms.atPrefix(queryTerm)) {
          if (term === queryTerm) continue;
          const extra = term.length - queryTerm.length;
          candidates.set(term, {
            offset: 0,
            length: queryTerm.length,
            weight: (PREFIX_WEIGHT * queryTerm.length) / (queryTerm.length + 0.3 * extra),
          });
        }
      if (infix && queryTerm.length >= MIN_INFIX)
        for (const term of this.#vocabulary) {
          if (term.length <= queryTerm.length || candidates.has(term)) continue;
          const offset = term.indexOf(queryTerm);
          if (offset <= 0) continue;
          const extra = term.length - queryTerm.length;
          candidates.set(term, {
            offset,
            length: queryTerm.length,
            weight: (INFIX_WEIGHT * queryTerm.length) / (queryTerm.length + 0.3 * extra),
          });
        }
      const distance =
        fuzzy === false
          ? 0
          : fuzzy === true || fuzzy < 1
            ? Math.min(maxFuzzy, Math.round(queryTerm.length * (fuzzy === true ? 0.2 : fuzzy)))
            : fuzzy;
      if (distance > 0)
        for (const [term, [, edits]] of this.#terms.fuzzyGet(queryTerm, distance)) {
          if (edits === 0 || candidates.has(term)) continue;
          candidates.set(term, {
            weight: (FUZZY_WEIGHT * queryTerm.length) / (queryTerm.length + edits),
          });
        }
      const scored = new Map<number, Result>();
      for (const [term, match] of candidates) {
        const postings = this.#terms.get(term)!;
        for (const { name, index } of fields) {
          const documents = postings.get(index);
          if (!documents) continue;
          for (const [number, frequency] of documents) {
            const document = this.#documents.get(number)!;
            const score =
              match.weight *
              boost(name) *
              bm25(frequency, documents.size, this.size, document.lengths[index]!, average(index));
            let result = scored.get(number);
            if (!result) scored.set(number, (result = { score: 0, matched: 1, terms: new Map() }));
            result.score += score;
            let terms = result.terms.get(index);
            if (!terms) result.terms.set(index, (terms = new Map()));
            const previous = terms.get(term);
            if (!previous || previous.weight < match.weight) terms.set(term, match);
          }
        }
      }
      if (!combined) combined = scored;
      else if (combineWith === 'AND') {
        const next = new Map<number, Result>();
        for (const [number, result] of scored) {
          const previous = combined.get(number);
          if (!previous) continue;
          next.set(number, merge(previous, result));
        }
        combined = next;
      } else
        for (const [number, result] of scored) {
          const previous = combined.get(number);
          combined.set(number, previous ? merge(previous, result) : result);
        }
    }
    const hits = [...combined!.entries()]
      .map(([number, result]) => ({ document: this.#documents.get(number)!, result }))
      .filter(({ document }) => !options.filter || options.filter(document.item))
      .sort((a, b) => b.result.score - a.result.score || a.document.order - b.document.order);
    const limited = limit < 0 ? hits : hits.slice(0, limit);
    return limited.map(({ document, result }) => {
      const matchedTerms = new Set<string>();
      for (const byTerm of result.terms.values())
        for (const term of byTerm.keys()) matchedTerms.add(term);
      // Ranges are computed when first read, so long result lists stay cheap.
      let matches: SearchMatch[] | undefined;
      const hit = {
        item: document.item,
        id: document.id,
        score: result.score,
        terms: [...matchedTerms],
      } as SearchHit<T>;
      Object.defineProperty(hit, 'matches', {
        enumerable: true,
        get: () => (matches ??= this.#matches(document, result.terms)),
      });
      return hit;
    });
  }

  #matches(document: Document<T>, terms: Map<number, Map<string, TermMatch>>): SearchMatch[] {
    const matches: SearchMatch[] = [];
    for (const [field, byTerm] of terms) {
      // A multi-valued field reports ranges in its first value only, which is what is displayed.
      const text = document.texts[field]![0];
      if (text === undefined) continue;
      const ranges: SearchRange[] = [];
      for (const token of tokenize(text, this.locale)) {
        const match = byTerm.get(token.term);
        if (!match) continue;
        if (match.length === undefined) ranges.push([token.start, token.end]);
        else
          ranges.push([
            match.offset
              ? foldedPrefixEnd(text, token.start, token.end, match.offset, this.locale)
              : token.start,
            foldedPrefixEnd(
              text,
              token.start,
              token.end,
              (match.offset ?? 0) + match.length,
              this.locale,
            ),
          ]);
      }
      if (ranges.length) matches.push({ field: this.fields[field]!, ranges });
    }
    return matches;
  }

  #extract(item: T, field: string): FieldText {
    if (this.#options.extract) return this.#options.extract(item, field);
    if (field === 'text' && (typeof item !== 'object' || item === null)) return String(item);
    const value = (item as Record<string, unknown> | null)?.[field];
    return typeof value === 'string' || Array.isArray(value) ? (value as FieldText) : undefined;
  }
}

function fieldTexts(value: FieldText): string[] {
  if (value == null) return [];
  return (typeof value === 'string' ? [value] : [...value]).filter(
    (text) => typeof text === 'string' && text,
  );
}

function bm25(
  frequency: number,
  documents: number,
  total: number,
  length: number,
  average: number,
): number {
  const idf = Math.log(1 + (total - documents + 0.5) / (documents + 0.5));
  return (
    idf *
    (BM25.d +
      (frequency * (BM25.k + 1)) /
        (frequency + BM25.k * (1 - BM25.b + (BM25.b * length) / Math.max(1, average))))
  );
}

function merge<
  R extends { score: number; matched: number; terms: Map<number, Map<string, TermMatch>> },
>(previous: R, next: R): R {
  previous.score += next.score;
  previous.matched += next.matched;
  for (const [field, byTerm] of next.terms) {
    let terms = previous.terms.get(field);
    if (!terms) previous.terms.set(field, (terms = new Map()));
    for (const [term, match] of byTerm) {
      const existing = terms.get(term);
      if (!existing || existing.weight < match.weight) terms.set(term, match);
    }
  }
  return previous;
}
