export interface FloatingNode {
  id: string;
  parentId?: string;
  element: HTMLElement;
  dismiss(reason: 'escape' | 'outside-press' | 'ancestor-dismiss'): void;
}

export class FloatingTree {
  readonly #nodes = new Map<string, FloatingNode>();

  register(node: FloatingNode): () => void {
    if (this.#nodes.has(node.id)) throw new Error(`Floating node ${node.id} is already registered`);
    this.#nodes.set(node.id, node);
    return () => this.#nodes.delete(node.id);
  }

  get(id: string): FloatingNode | undefined {
    return this.#nodes.get(id);
  }

  children(parentId: string): FloatingNode[] {
    return [...this.#nodes.values()].filter((node) => node.parentId === parentId);
  }

  ancestors(id: string): FloatingNode[] {
    const result: FloatingNode[] = [];
    const visited = new Set<string>();
    let current = this.#nodes.get(id);
    while (current?.parentId) {
      if (visited.has(current.parentId)) throw new Error('Floating tree contains a cycle');
      visited.add(current.parentId);
      current = this.#nodes.get(current.parentId);
      if (current) result.push(current);
    }
    return result;
  }

  dismissBranch(id: string, reason: 'escape' | 'outside-press' | 'ancestor-dismiss'): void {
    for (const child of this.children(id)) this.dismissBranch(child.id, 'ancestor-dismiss');
    this.#nodes.get(id)?.dismiss(reason);
  }
}

export const globalFloatingTree = new FloatingTree();
