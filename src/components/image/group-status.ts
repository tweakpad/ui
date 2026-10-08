import type { ImageLoadStatus } from '../../foundation/image-load.js';

export type ImageGroupLoadingStatus = 'idle' | 'loading' | 'loaded';

/** Aggregate loading status of image statuses, counting failures as settled. */
export function groupLoadingStatus(statuses: readonly ImageLoadStatus[]): {
  status: ImageGroupLoadingStatus;
  loaded: number;
  failed: number;
  total: number;
} {
  const total = statuses.length;
  const loaded = statuses.filter((status) => status === 'loaded').length;
  const failed = statuses.filter((status) => status === 'error').length;
  const pending = statuses.some((status) => status === 'loading');
  return { status: total === 0 ? 'idle' : pending ? 'loading' : 'loaded', loaded, failed, total };
}
