export interface DialogTriggerOptions {
  identifier?: string;
  payload?: unknown;
  nativeAction?: boolean;
}

export interface DialogHandleRoot {
  readonly open: boolean;
  openFromHandle(identifier?: string, payload?: unknown): void;
  close(): void;
  registerTrigger(element: HTMLElement, options?: DialogTriggerOptions): () => void;
}

/** Detached trigger registrations follow the most recently attached live Root. */
export class DialogHandle {
  #roots: DialogHandleRoot[] = [];
  #triggers = new Map<
    HTMLElement,
    {
      options: DialogTriggerOptions;
      cleanup?: (() => void) | undefined;
      wasInert: boolean;
      inertOwned: boolean;
    }
  >();
  get isOpen(): boolean {
    return this.#roots.at(-1)?.open ?? false;
  }
  open(identifier?: string, payload?: unknown): void {
    const root = this.#roots.at(-1);
    if (root) root.openFromHandle(identifier, payload);
    else console.warn('DialogHandle.open(): attach a live tp-dialog first.');
  }
  close(): void {
    const root = this.#roots.at(-1);
    if (root) root.close();
    else console.warn('DialogHandle.close(): attach a live tp-dialog first.');
  }
  registerTrigger(element: HTMLElement, options: DialogTriggerOptions = {}): () => void {
    if (this.#triggers.has(element)) return () => {};
    this.#triggers.set(element, { options, wasInert: element.inert, inertOwned: false });
    this.#bind();
    return () => {
      const record = this.#triggers.get(element);
      record?.cleanup?.();
      if (record?.inertOwned && element.inert) element.inert = record.wasInert;
      this.#triggers.delete(element);
    };
  }
  attach(root: DialogHandleRoot): () => void {
    this.#roots.push(root);
    this.#bind();
    return () => {
      this.#roots = this.#roots.filter((item) => item !== root);
      this.#bind();
    };
  }
  #bind(): void {
    const root = this.#roots.at(-1);
    for (const [element, record] of this.#triggers) {
      record.cleanup?.();
      if (record.inertOwned && element.inert) element.inert = record.wasInert;
      record.inertOwned = !root;
      if (!root) element.inert = true;
      record.cleanup = root?.registerTrigger(element, record.options);
    }
  }
}
export function createDialogHandle(): DialogHandle {
  return new DialogHandle();
}
