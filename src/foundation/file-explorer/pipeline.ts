import type {
  FileErrorCode,
  FileLayer,
  FileLayerContext,
  FileListRequest,
  FileListResult,
  FileOperation,
  FileOperationRequest,
  FileOperationResult,
  FileSource,
} from './types.js';

/** A failed file operation, with a code the explorer turns into a message. */
export class FileOperationError extends Error {
  readonly code: FileErrorCode;
  constructor(code: FileErrorCode, message: string) {
    super(message);
    this.name = 'FileOperationError';
    this.code = code;
  }
}

/** Runs operations through the layers, outermost first, then the source. */
export interface FilePipeline {
  run<K extends FileOperation>(
    operation: K,
    request: FileOperationRequest<K>,
  ): Promise<FileOperationResult<K>>;
  /** Whether a layer or the source implements the operation. */
  supports(operation: FileOperation): boolean;
}

type Step = (
  request: unknown,
  next: (request?: unknown) => Promise<unknown>,
  context: FileLayerContext,
) => unknown;

/** The pipeline of `layers` in front of `source`. */
export function createFilePipeline(
  source: FileSource,
  layers: readonly FileLayer[] = [],
): FilePipeline {
  const sourceStep = (operation: FileOperation): Step | undefined => {
    const method = source[operation] as ((request: unknown) => unknown) | undefined;
    return method ? (request) => method.call(source, request) : undefined;
  };
  const layerStep = (layer: FileLayer, operation: FileOperation): Step | undefined => {
    const hook = layer[operation] as Step | undefined;
    return hook ? (request, next, context) => hook.call(layer, request, next, context) : undefined;
  };
  /** The steps implementing an operation, outermost first. */
  const stepsOf = (operation: FileOperation): Step[] => {
    const steps = layers.flatMap((layer) => {
      const step = layerStep(layer, operation);
      return step ? [step] : [];
    });
    const last = sourceStep(operation);
    return last ? [...steps, last] : steps;
  };
  const cache = new Map<FileOperation, Step[]>();
  const steps = (operation: FileOperation): Step[] => {
    let found = cache.get(operation);
    if (!found) cache.set(operation, (found = stepsOf(operation)));
    return found;
  };

  const run = <K extends FileOperation>(
    operation: K,
    request: FileOperationRequest<K>,
  ): Promise<FileOperationResult<K>> => {
    const chain = steps(operation);
    const call = async (index: number, current: unknown): Promise<unknown> => {
      const step = chain[index];
      if (!step)
        throw new FileOperationError(
          'unsupported',
          `No layer or source implements "${operation}".`,
        );
      const context: FileLayerContext = {
        list: (listRequest: FileListRequest) => run('list', listRequest) as Promise<FileListResult>,
        run,
        hasNext: index + 1 < chain.length,
      };
      return step(current, (next) => call(index + 1, next ?? current), context);
    };
    return call(0, request) as Promise<FileOperationResult<K>>;
  };

  return {
    run,
    supports: (operation) => steps(operation).length > 0,
  };
}

/** Rejects when the signal is aborted, so long walks stop between steps. */
export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
}
