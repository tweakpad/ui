const params = new URLSearchParams(location.search);
const built = params.has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';

const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
for (const element of [
  api.TpMoTextSplit,
  api.TpMoTextMirror,
  api.TpMoTextStroke,
  api.TpScrollTrigger,
])
  api.defineElement(element.tagName, element);

const trigger = document.querySelector<HTMLElement & { progress: number }>('#trigger')!;
const members = [
  ...trigger.querySelectorAll<HTMLElement>(
    'tp-mo-text-split, tp-mo-text-mirror, tp-mo-text-stroke',
  ),
];

/** The presented state of one piece: what its effect animates, rounded. */
function pieceState(element: HTMLElement): string {
  const round = (value: string) =>
    value.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 100) / 100));
  if (element.localName === 'tp-mo-text-mirror') {
    const slide = element.querySelector<HTMLElement>('[data-tp-mirror-slide]');
    return slide ? round(getComputedStyle(slide).translate) : 'no slide';
  }
  const piece = element.querySelector<HTMLElement>('[data-tp-animate]');
  if (!piece) return 'no piece';
  const style = getComputedStyle(piece);
  if (element.localName === 'tp-mo-text-stroke') {
    const outline =
      piece.querySelector('[data-tp-outline]') ?? element.querySelector('[data-tp-outline]');
    const text = outline?.querySelector('text');
    return round(
      `fill ${style.webkitTextFillColor} outline ${outline ? getComputedStyle(outline).opacity : '-'} dash ${text ? getComputedStyle(text).strokeDashoffset : '-'}`,
    );
  }
  return round(`${style.opacity} ${style.translate} ${style.scale} ${style.filter}`);
}

/** Scrolls the trigger to `progress` of its cover range and reports every member's first piece. */
async function scrubTo(progress: number): Promise<Record<string, string>> {
  const box = trigger.getBoundingClientRect();
  const start = box.top + scrollY - innerHeight;
  scrollTo(0, start + progress * (box.height + innerHeight));
  await new Promise((resolve) => setTimeout(resolve, 250));
  return {
    progress: trigger.progress.toFixed(3),
    ...Object.fromEntries(members.map((member) => [member.id, pieceState(member)])),
  };
}

Object.assign(window, { scrubTo, members, trigger });
