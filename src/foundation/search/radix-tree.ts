interface Edge<V> {
  label: string;
  node: RadixNode<V>;
}

class RadixNode<V> {
  /** Outgoing edges keyed by the first character of their label. */
  readonly edges = new Map<string, Edge<V>>();
  value: V | undefined = undefined;
  has = false;
}

/**
 * A map of string keys stored as a radix tree (a prefix tree with compressed edges), with prefix
 * enumeration and edit-distance-bounded fuzzy lookup.
 */
export class SearchableMap<V> {
  #root = new RadixNode<V>();
  #size = 0;

  get size(): number {
    return this.#size;
  }

  clear(): void {
    this.#root = new RadixNode<V>();
    this.#size = 0;
  }

  get(key: string): V | undefined {
    const node = this.#find(key);
    return node?.has ? node.value : undefined;
  }

  has(key: string): boolean {
    return !!this.#find(key)?.has;
  }

  set(key: string, value: V): this {
    let node = this.#root;
    let index = 0;
    while (index < key.length) {
      const edge = node.edges.get(key[index]!);
      if (!edge) {
        const leaf = new RadixNode<V>();
        node.edges.set(key[index]!, { label: key.slice(index), node: leaf });
        node = leaf;
        break;
      }
      const shared = commonPrefixLength(edge.label, key, index);
      if (shared < edge.label.length) {
        // Split the edge where the key diverges from it.
        const middle = new RadixNode<V>();
        middle.edges.set(edge.label[shared]!, { label: edge.label.slice(shared), node: edge.node });
        edge.label = edge.label.slice(0, shared);
        edge.node = middle;
      }
      node = edge.node;
      index += shared;
    }
    if (!node.has) this.#size++;
    node.value = value;
    node.has = true;
    return this;
  }

  /** Returns the value for `key`, setting it from `create` first when absent. */
  fetch(key: string, create: () => V): V {
    const node = this.#find(key);
    if (node?.has) return node.value as V;
    const value = create();
    this.set(key, value);
    return value;
  }

  delete(key: string): boolean {
    const path: Array<{ parent: RadixNode<V>; first: string }> = [];
    let node = this.#root;
    let index = 0;
    while (index < key.length) {
      const first = key[index]!;
      const edge = node.edges.get(first);
      if (!edge || !key.startsWith(edge.label, index)) return false;
      path.push({ parent: node, first });
      node = edge.node;
      index += edge.label.length;
    }
    if (!node.has) return false;
    node.has = false;
    node.value = undefined;
    this.#size--;
    // Prune empty leaves and merge pass-through nodes back into their parent edge.
    for (let step = path.length - 1; step >= 0; step--) {
      const { parent, first } = path[step]!;
      const edge = parent.edges.get(first)!;
      const child = edge.node;
      if (!child.has && child.edges.size === 0) parent.edges.delete(first);
      else if (!child.has && child.edges.size === 1) {
        const only = child.edges.values().next().value as Edge<V>;
        edge.label += only.label;
        edge.node = only.node;
      } else break;
    }
    return true;
  }

  /** Every entry whose key starts with `prefix`, in no particular order. */
  *atPrefix(prefix: string): Generator<[string, V]> {
    let node = this.#root;
    let index = 0;
    let base = '';
    while (index < prefix.length) {
      const edge = node.edges.get(prefix[index]!);
      if (!edge) return;
      const rest = prefix.length - index;
      if (edge.label.length >= rest) {
        if (!edge.label.startsWith(prefix.slice(index))) return;
        base += edge.label;
        node = edge.node;
        break;
      }
      if (!prefix.startsWith(edge.label, index)) return;
      base += edge.label;
      node = edge.node;
      index += edge.label.length;
    }
    yield* entries(node, base);
  }

  *entries(): Generator<[string, V]> {
    yield* entries(this.#root, '');
  }

  /**
   * Every key within `maxDistance` edits of `query`, with its value and distance. Edits are
   * insertions, deletions, substitutions and swaps of adjacent characters (optimal string
   * alignment), so the commonest typo, two letters typed in the wrong order, costs one edit.
   * One distance matrix is shared across the walk: each edge character fills one row, only the
   * diagonal band that can stay within the bound is computed, and a subtree is skipped as soon as
   * its row minimum exceeds the bound.
   */
  fuzzyGet(query: string, maxDistance: number): Map<string, [V, number]> {
    maxDistance = Math.max(0, Math.min(250, Math.floor(maxDistance)));
    const results = new Map<string, [V, number]>();
    const width = query.length + 1;
    const maxDepth = query.length + maxDistance;
    const matrix = new Uint8Array((maxDepth + 1) * width).fill(Math.min(255, maxDistance + 1));
    for (let column = 0; column < width; column++) matrix[column] = column;
    for (let row = 1; row <= maxDepth; row++) matrix[row * width] = Math.min(255, row);
    // The key character of each matrix row along the current path, for adjacent swaps.
    const characters: string[] = [];
    const walk = (node: RadixNode<V>, depth: number, key: string): void => {
      if (node.has) {
        const distance = matrix[depth * width + query.length]!;
        if (distance <= maxDistance) results.set(key, [node.value as V, distance]);
      }
      edges: for (const edge of node.edges.values()) {
        let row = depth;
        for (let offset = 0; offset < edge.label.length; offset++) {
          row++;
          if (row > maxDepth) continue edges;
          const character = edge.label[offset]!;
          characters[row] = character;
          const current = row * width,
            previous = current - width;
          const from = Math.max(1, row - maxDistance),
            to = Math.min(query.length, row + maxDistance);
          let minimum = matrix[current]!;
          for (let column = from; column <= to; column++) {
            const substitution =
              matrix[previous + column - 1]! + (query[column - 1] === character ? 0 : 1);
            let value = Math.min(
              substitution,
              matrix[previous + column]! + 1,
              matrix[current + column - 1]! + 1,
            );
            if (
              row > 1 &&
              column > 1 &&
              character === query[column - 2] &&
              characters[row - 1] === query[column - 1]
            )
              value = Math.min(value, matrix[previous - width + column - 2]! + 1);
            matrix[current + column] = value;
            if (value < minimum) minimum = value;
          }
          if (minimum > maxDistance) continue edges;
        }
        walk(edge.node, row, key + edge.label);
      }
    };
    walk(this.#root, 0, '');
    return results;
  }

  #find(key: string): RadixNode<V> | undefined {
    let node = this.#root;
    let index = 0;
    while (index < key.length) {
      const edge = node.edges.get(key[index]!);
      if (!edge || !key.startsWith(edge.label, index)) return undefined;
      node = edge.node;
      index += edge.label.length;
    }
    return node;
  }
}

function commonPrefixLength(label: string, key: string, offset: number): number {
  const limit = Math.min(label.length, key.length - offset);
  let length = 0;
  while (length < limit && label[length] === key[offset + length]) length++;
  return length;
}

function* entries<V>(node: RadixNode<V>, key: string): Generator<[string, V]> {
  if (node.has) yield [key, node.value as V];
  for (const edge of node.edges.values()) yield* entries(edge.node, key + edge.label);
}
