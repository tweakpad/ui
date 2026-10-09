interface EyeDropperResult {
  readonly sRGBHex: string;
}
interface EyeDropperInstance {
  open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>;
}
type EyeDropperWindow = Window & { EyeDropper?: new () => EyeDropperInstance };

/** True when the owner window offers the EyeDropper API. */
export function supportsEyeDropper(owner: Window | null | undefined): boolean {
  return !!owner && typeof (owner as EyeDropperWindow).EyeDropper === 'function';
}

/** Opens the platform eyedropper; resolves the picked `#rrggbb` or null when aborted. */
export async function pickScreenColor(owner: Window, signal?: AbortSignal): Promise<string | null> {
  const Constructor = (owner as EyeDropperWindow).EyeDropper;
  if (!Constructor) return null;
  try {
    const result = await new Constructor().open(signal ? { signal } : undefined);
    return result.sRGBHex.toLowerCase();
  } catch {
    return null;
  }
}
