import type {
  TextEditorBlockDefinition,
  TextEditorEngine,
  TextEditorInlineDefinition,
  TextEditorSuggestionRequest,
} from '../../foundation/text-editor/index.js';
import type { TextEditorFeature } from '../../widgets/text-editor/feature.js';

/** Survey notes in HTML: a heading, two paragraphs and a list with bold lead words. */
export const fieldNotes: string;
/** A new engine for one editor, with tables. */
export function tiptapEngine(): TextEditorEngine;
/** A new engine for one editor, with tables. */
export function lexicalEngine(): TextEditorEngine;
/** The upload hook of the examples: reports progress and resolves an object URL of the file. */
export function uploadImage(
  file: File,
  options: { readonly signal: AbortSignal; onProgress(loaded: number, total?: number): void },
): Promise<string>;
/** Every feature of the editor, with the sample upload hook. */
export function allTextEditorFeatures(): TextEditorFeature[];
/** The classic toolbar editor: links, tables and images, no block editing. */
export function classicTextEditorFeatures(): TextEditorFeature[];
/** The block editor: every feature, with the fixed toolbar turned off through `layout`. */
export function blockTextEditorSetup(): { features: TextEditorFeature[]; layout: { toolbar: [] } };
/** Wires the editors, sample notes, features and form readout inside `root`; returns cleanup. */
export function setupTextEditorExample(
  root: HTMLElement,
  createEngine: () => TextEditorEngine,
): () => void;
/** A callout textblock with a tone; its Markdown is an alert. */
export const calloutBlock: TextEditorBlockDefinition;
/** An embed atom: an https page in a sandboxed frame with a required title. */
export const embedBlock: TextEditorBlockDefinition;
/** The https or same-origin URL an embed may load, or null. */
export function embedSource(src: unknown, base?: string): string | null;
/** A crew member the mention list offers. */
export interface CrewMember {
  readonly id: string;
  readonly name: string;
  readonly role: string;
}
/** Searches the crew after a short delay; the signal aborts the call. */
export function searchCrew(request: TextEditorSuggestionRequest): Promise<CrewMember[]>;
/** A mention inline atom with an `@` suggestion over the crew. */
export const mentionInline: TextEditorInlineDefinition;
/** Notes in HTML with a callout, a mention and an embed. */
export const customBlockNotes: string;
