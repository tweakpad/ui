/** Text, or a function of the omitted and the total Item counts. */
export type OverflowListMessage = string | ((hidden: number, total: number) => string);

/** Replaceable texts of the default Count; each defaults to English. */
export interface OverflowListMessages {
  /** Visible Count text. */
  count?: OverflowListMessage;
  /** Accessible Count text, announced in place of the visible text. */
  countLabel?: OverflowListMessage;
}

export const DEFAULT_OVERFLOW_LIST_MESSAGES: Required<OverflowListMessages> = {
  count: (hidden) => `+${hidden}`,
  countLabel: (hidden) => `${hidden} more`,
};

/** Resolves one message for `hidden` omitted Items out of `total`. */
export function overflowListMessage(
  message: OverflowListMessage,
  hidden: number,
  total: number,
): string {
  return typeof message === 'function' ? message(hidden, total) : message;
}
