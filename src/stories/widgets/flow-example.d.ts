import type { FlowDocument, FlowEdgeKind, FlowSchema } from '../../foundation/flow/types.js';
import type { FlowRun, FlowTrace } from '../../foundation/flow/run/types.js';
import type { IconDefinition } from '../../icons/types.js';

export const flowIcons: Readonly<Record<string, IconDefinition>>;
export const workflowSchema: FlowSchema;
export const workflowDocument: FlowDocument;
export const sampleRun: FlowRun;
export const sampleTrace: FlowTrace;
export const materialSchema: FlowSchema;
export const materialDocument: FlowDocument;
export const pipelineSchema: FlowSchema;
export const pipelineDocument: FlowDocument;
export function generateDocument(
  count: number,
  columns?: number,
  kind?: FlowEdgeKind,
): FlowDocument;
export function setupFlowExample(root: HTMLElement): () => void;
