// Browser fixture for tp-image-editor, driven only through Chrome DevTools MCP (see README.md).
// The owner supplies its value before the element upgrades, so the editor starts controlled.
(document.getElementById('controlled') as unknown as { value: unknown }).value = {
  x: 0,
  y: 0,
  width: 1600,
  height: 2000,
  rotation: 0,
};
const built = new URLSearchParams(location.search).has('built');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
await import(/* @vite-ignore */ built ? '/dist/register/widgets.js' : '/src/register/widgets.ts');

interface Value {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
type Editor = HTMLElement & {
  value: Value | undefined;
  zoom: number;
  zoomRange: { min: number; max: number; fit: number };
  updateComplete: Promise<boolean>;
  toBlob(options?: { maxSize?: number; type?: string }): Promise<Blob>;
};

const editor = (id: string) => document.getElementById(id) as Editor;
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const events: { id: string; type: string; reason: string; value: unknown }[] = [];
for (const type of ['tp-value-change', 'tp-value-commit', 'tp-load', 'tp-error'])
  document.addEventListener(type, (event) => {
    const detail = ((event as CustomEvent).detail ?? {}) as Record<string, unknown>;
    events.push({
      id: (event.target as HTMLElement).id,
      type,
      reason: String(detail.reason ?? ''),
      value: detail.value ?? detail,
    });
  });

// A controlled owner that writes every proposal back, rounding to whole pixels.
const controlled = editor('controlled');
controlled.addEventListener('tp-value-change', (event) => {
  const value = (event as CustomEvent<{ value: Value }>).detail.value;
  controlled.value = {
    ...value,
    x: Math.round(value.x),
    y: Math.round(value.y),
    width: Math.round(value.width),
    height: Math.round(value.height),
  };
});

/**
 * Synthetic touch pointers on the deepest element under the viewport centre (pointer ids 1 and 2).
 * These prove the gesture logic only; real multi-touch needs a device.
 */
async function pinch(id: string, scale: number, twist = 0, steps = 8): Promise<Value | undefined> {
  const target = editor(id);
  const viewport = target.shadowRoot!.querySelector('.viewport') as HTMLElement;
  const rect = viewport.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const element = (target.shadowRoot!.elementFromPoint(cx, cy) as HTMLElement) ?? viewport;
  const send = (type: string, pointerId: number, x: number, y: number) =>
    element.dispatchEvent(
      new PointerEvent(type, {
        pointerId,
        pointerType: 'touch',
        isPrimary: pointerId === 1,
        button: type === 'pointermove' ? -1 : 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  const at = (t: number) => {
    const radius = 40 * (1 + (scale - 1) * t);
    const angle = (twist * t * Math.PI) / 180;
    return [
      [cx - radius * Math.cos(angle), cy - radius * Math.sin(angle)],
      [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)],
    ] as const;
  };
  let [a, b] = at(0);
  send('pointerdown', 1, a[0], a[1]);
  send('pointerdown', 2, b[0], b[1]);
  await frame();
  for (let step = 1; step <= steps; step += 1) {
    [a, b] = at(step / steps);
    send('pointermove', 1, a[0], a[1]);
    send('pointermove', 2, b[0], b[1]);
    await frame();
  }
  send('pointerup', 2, b[0], b[1]);
  send('pointerup', 1, a[0], a[1]);
  await frame();
  return target.value;
}

Object.assign(window, {
  imageEditorAPI: {
    events,
    clear: () => events.splice(0),
    get: editor,
    pinch,
    /** The region's on-screen rectangle. */
    region: (id: string) => {
      const region = editor(id).shadowRoot!.querySelector('.region');
      return region ? region.getBoundingClientRect().toJSON() : null;
    },
    /** The exported region's size and its centre pixel. */
    exported: async (id: string, maxSize?: number) => {
      const blob = await editor(id).toBlob(maxSize ? { maxSize } : {});
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(bitmap, 0, 0);
      const centre = [...context.getImageData(bitmap.width >> 1, bitmap.height >> 1, 1, 1).data];
      return { width: bitmap.width, height: bitmap.height, centre, type: blob.type };
    },
    formData: () =>
      Object.fromEntries(new FormData(document.getElementById('form') as HTMLFormElement)),
  },
});
document.documentElement.dataset.fixtureReady = '';
