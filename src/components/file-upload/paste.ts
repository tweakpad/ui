import { isEditableTarget } from '../../foundation/interactive-target.js';
import type { FileUploadPaste } from './types.js';

/**
 * Clipboard paste routing for File upload (Foundation `fup-paste`). One listener set per owner
 * document chooses exactly one registered control for each paste that carries files.
 */

/** A File upload as the paste router sees it. */
export interface PasteOwner {
  /** The Root host; composed-path and hover tests use it. */
  readonly host: Element;
  /** Current scope; `none` takes no pastes. */
  scope(): FileUploadPaste;
  /** False while disabled; a disabled control takes no part in routing. */
  enabled(): boolean;
  /** Called for the chosen owner only, before any default action is prevented. */
  receive(event: ClipboardEvent, files: File[]): void;
}

/** Routing input for one owner, separated from the DOM so the order is testable. */
export interface PasteCandidate<T> {
  readonly owner: T;
  readonly host: unknown;
  readonly scope: FileUploadPaste;
  readonly enabled: boolean;
  readonly hovered: boolean;
  /** Higher is more recent: last focus or pointer press, else connection. */
  readonly activity: number;
}

/** Files carried by clipboard data: the file list, or file items when the list is empty. */
export function clipboardFiles(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const files = Array.from(data.files ?? []);
  if (files.length) return files;
  const fromItems: File[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file) fromItems.push(file);
  }
  return fromItems;
}

const latest = <T>(candidates: readonly PasteCandidate<T>[]) =>
  candidates.reduce<PasteCandidate<T> | undefined>(
    (best, candidate) => (!best || candidate.activity > best.activity ? candidate : best),
    undefined,
  );

/**
 * Chooses the owner of a paste: the control whose Root is in the composed path, then the one
 * under the pointer, then the most recently active document-scoped one. Editable targets
 * outside every chosen Root keep their paste.
 */
export function choosePasteOwner<T>(
  path: readonly unknown[],
  candidates: readonly PasteCandidate<T>[],
): T | undefined {
  const eligible = candidates.filter(
    (candidate) => candidate.enabled && candidate.scope !== 'none',
  );
  if (!eligible.length) return undefined;
  for (const node of path) {
    const owner = eligible.find((candidate) => candidate.host === node);
    if (owner) return owner.owner;
  }
  // No eligible Root contains the target, so an editable element in the path keeps its paste.
  if (path.some((node) => isEditableTarget(node as EventTarget))) return undefined;
  return (
    latest(eligible.filter((candidate) => candidate.hovered))?.owner ??
    latest(eligible.filter((candidate) => candidate.scope === 'document'))?.owner
  );
}

interface Router {
  readonly owners: Map<PasteOwner, number>;
  readonly release: () => void;
}
const routers = new WeakMap<Document, Router>();
let clock = 0;

const hovered = (host: Element): boolean => {
  try {
    return host.matches(':hover');
  } catch {
    return false;
  }
};

function createRouter(document: Document): Router {
  const owners = new Map<PasteOwner, number>();
  const touch = (event: Event) => {
    const path = event.composedPath();
    for (const owner of owners.keys()) if (path.includes(owner.host)) owners.set(owner, ++clock);
  };
  const paste = (event: Event) => {
    const clipboard = event as ClipboardEvent;
    if (clipboard.defaultPrevented) return;
    const files = clipboardFiles(clipboard.clipboardData);
    if (!files.length) return;
    const owner = choosePasteOwner(
      event.composedPath(),
      [...owners].map(([candidate, activity]) => {
        const scope = candidate.scope();
        return {
          owner: candidate,
          host: candidate.host,
          scope,
          enabled: candidate.enabled(),
          hovered: scope !== 'none' && hovered(candidate.host),
          activity,
        };
      }),
    );
    owner?.receive(clipboard, files);
  };
  document.addEventListener('paste', paste);
  document.addEventListener('pointerdown', touch, true);
  document.addEventListener('focusin', touch, true);
  return {
    owners,
    release: () => {
      document.removeEventListener('paste', paste);
      document.removeEventListener('pointerdown', touch, true);
      document.removeEventListener('focusin', touch, true);
    },
  };
}

/**
 * Registers a paste owner with its document's shared router; the returned function releases
 * it, and the last release removes the listeners.
 */
export function registerPasteOwner(document: Document, owner: PasteOwner): () => void {
  let router = routers.get(document);
  if (!router) {
    router = createRouter(document);
    routers.set(document, router);
  }
  router.owners.set(owner, ++clock);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = routers.get(document);
    if (!current) return;
    current.owners.delete(owner);
    if (!current.owners.size) {
      current.release();
      routers.delete(document);
    }
  };
}

/** Registered paste owners of a document, for diagnostics and tests. */
export function pasteOwnerCount(document: Document): number {
  return routers.get(document)?.owners.size ?? 0;
}
