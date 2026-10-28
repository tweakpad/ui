import type { FlowDocument, FlowSchema } from '../../foundation/flow/types.js';
import type { FlowRun } from '../../foundation/flow/run/types.js';
import type { IconDefinition } from '../../icons/types.js';

export const flowIcons: Readonly<Record<string, IconDefinition>>;
export const workflowSchema: FlowSchema;
export const workflowDocument: FlowDocument;
export const sampleRun: FlowRun;
