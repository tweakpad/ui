/** Artwork passed to tp-icon. Definitions are plain data, not registered names. */
export interface IconDefinition {
  readonly viewBox: string;
  readonly paths: readonly IconPath[];
}

export interface IconPath {
  readonly d: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly fillRule?: 'nonzero' | 'evenodd';
  readonly clipRule?: 'nonzero' | 'evenodd';
}
