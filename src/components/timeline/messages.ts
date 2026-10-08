export interface TimelineMessages {
  complete?: string;
  current?: string;
  upcoming?: string;
}

export const DEFAULT_TIMELINE_MESSAGES: Required<TimelineMessages> = {
  complete: 'Completed',
  current: 'Current',
  upcoming: 'Not started',
};
