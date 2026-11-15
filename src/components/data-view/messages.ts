import type { DataViewMessages } from './types.js';

export const DEFAULT_DATA_VIEW_MESSAGES: DataViewMessages = {
  label: 'Data',
  empty: 'No rows',
  emptyDescription: 'There is nothing to show yet.',
  loading: 'Loading',
  retry: 'Retry',
  errorTitle: 'The rows could not be loaded',
  sorted: (column, direction) =>
    direction ? `Sorted by ${column}, ${direction}` : `Sorting by ${column} removed`,
};

export function resolveDataViewMessages(
  messages: Partial<DataViewMessages> | undefined,
): DataViewMessages {
  return messages ? { ...DEFAULT_DATA_VIEW_MESSAGES, ...messages } : DEFAULT_DATA_VIEW_MESSAGES;
}
