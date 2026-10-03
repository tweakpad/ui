/** Public scalar controls shared by the authored anchored-family examples. */
export const surfaceArgs = {
  open: false,
  disabled: false,
  label: '',
  placement: 'bottom center',
  sideOffset: undefined as number | undefined,
  alignOffset: 0,
  keepMounted: false,
  showArrow: false,
  arrowPadding: undefined as number | undefined,
  arrowWidth: undefined as number | undefined,
  arrowHeight: undefined as number | undefined,
  portal: true,
  preserveTabOrder: true,
  showBackdrop: false,
  backdropForceRender: false,
  showViewport: false,
  dismissible: true,
  sticky: false,
  disableAnchorTracking: false,
  positionMethod: 'absolute',
};
export const surfaceArgTypes = {
  open: { control: 'boolean' },
  disabled: { control: 'boolean' },
  label: { control: 'text' },
  placement: {
    control: 'select',
    options: [
      'bottom start',
      'bottom center',
      'bottom end',
      'top start',
      'top center',
      'top end',
      'right start',
      'right center',
      'right end',
      'left start',
      'left center',
      'left end',
      'inline-start start',
      'inline-start center',
      'inline-start end',
      'inline-end start',
      'inline-end center',
      'inline-end end',
      'block-start start',
      'block-start center',
      'block-start end',
      'block-end start',
      'block-end center',
      'block-end end',
    ],
  },
  sideOffset: { control: 'number' },
  alignOffset: { control: 'number' },
  keepMounted: { control: 'boolean' },
  showArrow: { control: 'boolean' },
  arrowPadding: { control: 'number' },
  arrowWidth: { control: 'number' },
  arrowHeight: { control: 'number' },
  portal: { control: 'boolean' },
  preserveTabOrder: { control: 'boolean' },
  showBackdrop: { control: 'boolean' },
  backdropForceRender: { control: 'boolean' },
  showViewport: { control: 'boolean' },
  dismissible: { control: 'boolean' },
  sticky: { control: 'boolean' },
  disableAnchorTracking: { control: 'boolean' },
  positionMethod: { control: 'select', options: ['absolute', 'fixed'] },
} as const;
export type SurfaceArgs = typeof surfaceArgs;
export const sourceImports = `<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>`;

/** Standalone HTML follows current Controls and supplies the actual controlled owner. */
export function configuredSource(source: string, args: object, lane: 'open' | 'value'): string {
  const body = source.slice(source.indexOf('</script>') + '</script>'.length).trim();
  const properties = Object.entries(args)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => `.${key}=\${${JSON.stringify(value).replaceAll('<', '\\u003c')}}`)
    .join('\n      ');
  const callback = lane === 'open' ? 'onOpenChange' : 'onValueChange';
  const configured = body.replace(
    /^(<[a-z-]+)([^>]*)(>)/u,
    `$1$2\n      ${properties}\n      .${callback}=\${function (event) {\n        if (!event.defaultPrevented && !event.detail.cancelled) this.${lane} = event.detail.value;\n      }}$3`,
  );
  return `<div id="example"></div>\n<script type="module">\n  import { html, render } from 'lit';\n  import '@tweakpad/ui/register';\n  import '@tweakpad/ui/styles.css';\n  render(html\`${configured}\`, document.getElementById('example'));\n</script>`;
}
