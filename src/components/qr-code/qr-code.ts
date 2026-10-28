import { css, html, nothing, svg, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import { copyData, type ClipboardRepresentations } from '../../foundation/clipboard.js';
import { downloadBlob } from '../../foundation/download.js';
import { encodeQr } from '../../foundation/qr/encode.js';
import { qrPathData } from '../../foundation/qr/path.js';
import { QrCapacityError, type QrCode, type QrErrorCorrection } from '../../foundation/qr/types.js';
import { downloadIcon } from '../../icons/download.js';
import { qrCodePresentation } from '../../presentation/families/qr-code.js';
import { TpButton } from '../button/button.js';
import { TpButtonGroup } from '../button-group/button-group.js';
import {
  TpCopyButton,
  type CopyDetail,
  type CopyResultDetail,
} from '../copy-button/copy-button.js';
import { TpIcon } from '../icon/icon.js';
import { TpMenu } from '../menu/menu.js';
import { TpMenuItem } from '../menu/menu-item.js';
import {
  EXPORT_EXTENSIONS,
  EXPORT_TYPES,
  FALLBACK_COLORS,
  MAX_EXPORT_SIZE,
  moduleContrast,
  rasterize,
  resolveColor,
  svgDocument,
  type ExportColors,
  type QrExportFormat,
} from './export.js';
import { DEFAULT_QR_CODE_MESSAGES, type QrCodeMessages } from './messages.js';

export type QrCodeSize = 'sm' | 'default' | 'lg';
export type QrCodeStatus = 'empty' | 'encoded' | 'error';

export interface QrExportOptions {
  /** Side in pixels; `exportSize` by default. */
  readonly size?: number;
  /** JPEG quality from 0 to 1; 0.92 by default. */
  readonly quality?: number;
}

export interface QrDownloadOptions extends QrExportOptions {
  /** File name, with or without the format's extension; `filename` by default. */
  readonly filename?: string;
}

export interface QrDownloadDetail {
  readonly format: QrExportFormat;
  readonly size: number;
  readonly filename: string;
  readonly sourceEvent?: Event;
}

export interface QrDownloadErrorDetail extends QrDownloadDetail {
  readonly error: unknown;
}

const LEVELS: readonly QrErrorCorrection[] = ['L', 'M', 'Q', 'H'];
const FORMATS: readonly QrExportFormat[] = ['png', 'svg', 'jpeg'];
const DEFAULT_QUIET_ZONE = 4;
const DEFAULT_EXPORT_SIZE = 1024;

interface Encoding {
  readonly key: string;
  readonly status: QrCodeStatus;
  readonly code: QrCode | null;
  readonly error: QrCapacityError | null;
}

/**
 * A text value as a scannable QR Code symbol on a light tile (`ucl21-qr-code`, behavior
 * Foundation §18.21 QR code), with opt-in copy and download actions and SVG, PNG and JPEG
 * exports. The encoder is built in and published on its own as `@tweakpad/ui/qr`.
 *
 * @csspart tile - The square light surface.
 * @csspart symbol - The SVG image, named by `label`.
 * @csspart background - The light fill of the symbol, quiet zone included.
 * @csspart modules - The dark modules, one path.
 * @csspart actions - The Button group of the actions.
 * @csspart copy - The Copy button.
 * @csspart download - The download Menu.
 * @csspart download-trigger - The Button that opens the download Menu.
 * @csspart download-item - A format item of the download Menu.
 * @cssprop --tp-qr-code-size - Side of the tile; the `size` axis by default.
 * @cssprop --tp-qr-code-foreground - Color of the dark modules.
 * @cssprop --tp-qr-code-background - Color of the light background.
 * @fires tp-copy - Cancelable, before copying; `detail.value`.
 * @fires tp-copied - After a successful copy; `detail.value` and the written `detail.types`.
 * @fires tp-copy-error - After a failed copy; `detail.value`.
 * @fires tp-download - Cancelable, before a download; format, size, filename, source event.
 * @fires tp-download-error - When the export for a download fails; the same detail and `error`.
 * @fires tp-diagnostic - Invalid levels, quiet zones and export sizes, capacity and contrast.
 */
export class TpQrCode extends TpElement {
  static tagName = 'tp-qr-code';
  static override presentation = qrCodePresentation;
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButtonGroup, TpCopyButton, TpMenu, TpMenuItem, TpButton, TpIcon];
  }
  static override properties = {
    ...TpElement.properties,
    value: { type: String },
    errorCorrection: { type: String, attribute: 'error-correction' },
    quietZone: { type: Number, attribute: 'quiet-zone' },
    size: { type: String, reflect: true },
    label: { type: String },
    copyable: { type: Boolean, reflect: true },
    downloadable: { type: Boolean, reflect: true },
    exportSize: { type: Number, attribute: 'export-size' },
    filename: { type: String },
    messages: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        max-inline-size: 100%;
        vertical-align: middle;
      }

      /* Square at the size axis or --tp-qr-code-size, never wider than the available space. */
      .tile {
        box-sizing: border-box;
        inline-size: var(--tp-qr-code-size, var(--_tp-qr-code-size, calc(var(--tp-spacing) * 48)));
        max-inline-size: 100%;
        aspect-ratio: 1;
        overflow: clip;
      }

      /* An image: its modules never mirror and keep their colors in forced-colors mode. */
      .symbol {
        display: block;
        inline-size: 100%;
        block-size: 100%;
        direction: ltr;
        forced-color-adjust: none;
      }

      .actions {
        max-inline-size: 100%;
      }
    `,
  ];

  /** Text to encode. */
  value = '';
  /** Error correction level: L, M (default), Q or H. */
  errorCorrection: QrErrorCorrection = 'M';
  /** Light border around the modules, in modules; 4 as ISO/IEC 18004 requires. */
  quietZone = DEFAULT_QUIET_ZONE;
  size: QrCodeSize = 'default';
  /** Accessible name and export title; the QR code message when empty. */
  label = '';
  /** Shows the Copy button. */
  copyable = false;
  /** Shows the download Menu. */
  downloadable = false;
  /** Default side of exports and of the copied image, in pixels. */
  exportSize = DEFAULT_EXPORT_SIZE;
  /** Download file name without its extension. */
  filename = 'qr-code';
  messages: QrCodeMessages = {};

  #encoding: Encoding | undefined;
  #announcer: LiveAnnouncer | undefined;
  #reportedContrast = '';

  get qrCodeMessages(): Required<QrCodeMessages> {
    return { ...DEFAULT_QR_CODE_MESSAGES, ...this.messages };
  }

  /** `empty` without a value, `encoded`, or `error` when the value does not fit. */
  get status(): QrCodeStatus {
    return this.#encode().status;
  }

  /** Version of the encoded symbol, 1 to 40; null while not encoded. */
  get version(): number | null {
    return this.#encode().code?.version ?? null;
  }

  /** Modules per side of the encoded symbol, without the quiet zone; null while not encoded. */
  get moduleCount(): number | null {
    return this.#encode().code?.size ?? null;
  }

  /**
   * Copies the PNG export (at `exportSize`) and the value in one clipboard item. With the copy
   * action shown, it runs through the Copy button, which confirms and announces; otherwise it
   * dispatches the same events. Resolves whether anything was written.
   */
  async copy(sourceEvent?: Event): Promise<boolean> {
    if (this.status !== 'encoded') return false;
    const button = this.renderRoot?.querySelector<TpCopyButton>('tp-copy-button');
    if (button) return button.copy(sourceEvent);
    const value = this.value ?? '';
    if (!this.emit<CopyDetail>('tp-copy', { value }, { cancelable: true })) return false;
    const result = await copyData(this.ownerDocument, { ...this.#copyData(), 'text/plain': value });
    this.emit<CopyResultDetail>(result.copied ? 'tp-copied' : 'tp-copy-error', {
      value,
      types: result.types,
    });
    return result.copied;
  }

  /**
   * Proposes a download with a cancelable `tp-download`, then hands the export to the browser
   * as `filename` with the format's extension. Resolves whether the file was handed off.
   */
  async download(
    format: QrExportFormat = 'png',
    options: QrDownloadOptions = {},
    sourceEvent?: Event,
  ): Promise<boolean> {
    if (this.status !== 'encoded' || !FORMATS.includes(format)) return false;
    const size = this.#exportSide(options.size);
    const detail: QrDownloadDetail = {
      format,
      size,
      filename: this.#fileName(options.filename ?? this.filename, format),
      ...(sourceEvent ? { sourceEvent } : {}),
    };
    if (!this.emit<QrDownloadDetail>('tp-download', detail, { cancelable: true })) return false;
    try {
      const blob = await this.toBlob(format, {
        size,
        ...(options.quality === undefined ? {} : { quality: options.quality }),
      });
      if (!blob) throw new Error('The QR code has no symbol to export.');
      downloadBlob(this.ownerDocument, blob, detail.filename);
      return true;
    } catch (error) {
      this.emit<QrDownloadErrorDetail>('tp-download-error', { ...detail, error });
      this.#announcer ??= new LiveAnnouncer({ document: () => this.ownerDocument });
      this.#announcer.announce(this.qrCodeMessages.downloadFailed);
      return false;
    }
  }

  /**
   * The symbol as an image file: SVG, PNG or JPEG of `size` pixels per side (`exportSize` by
   * default) in the colors the symbol presents; null while not encoded. Painting happens
   * synchronously, so a call inside a click can hand the promise to the clipboard.
   */
  toBlob(format: QrExportFormat = 'png', options: QrExportOptions = {}): Promise<Blob | null> {
    const code = this.#encode().code;
    if (!code || !FORMATS.includes(format)) return Promise.resolve(null);
    const size = this.#exportSide(options.size);
    const colors = this.#colors();
    if (format === 'svg') {
      const text = svgDocument(code, this.#quietZone(), size, colors, this.#label());
      return Promise.resolve(new Blob([text], { type: EXPORT_TYPES.svg }));
    }
    return rasterize(
      this.ownerDocument,
      code,
      this.#quietZone(),
      size,
      colors,
      format,
      options.quality,
    );
  }

  /** The symbol as a standalone SVG document of `size` pixels; null while not encoded. */
  toSVG(options: Pick<QrExportOptions, 'size'> = {}): string | null {
    const code = this.#encode().code;
    if (!code) return null;
    return svgDocument(
      code,
      this.#quietZone(),
      this.#exportSide(options.size),
      this.#colors(),
      this.#label(),
    );
  }

  override disconnectedCallback(): void {
    this.#announcer?.dispose();
    this.#announcer = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('errorCorrection') && !LEVELS.includes(this.errorCorrection)) {
      this.diagnose(
        'qr-code-error-correction',
        `Unknown error correction level "${String(this.errorCorrection)}"; using M.`,
        { once: true },
      );
    }
    if (changed.has('quietZone') && this.#quietZone() !== this.quietZone) {
      this.diagnose(
        'qr-code-quiet-zone',
        `The quiet zone must be a non-negative integer; using ${DEFAULT_QUIET_ZONE}.`,
        { once: true },
      );
    }
    if (changed.has('value') || changed.has('errorCorrection')) {
      const { status, error } = this.#encode();
      if (status === 'error' && error) {
        this.diagnose('qr-code-capacity', error.message, { once: true });
      }
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const status = this.status;
    if (this.getAttribute('data-status') !== status) this.setAttribute('data-status', status);
    if (status === 'encoded') this.#checkContrast(this.#colors());
  }

  /** Encodes on demand and caches by value and level, so exports never wait for a render. */
  #encode(): Encoding {
    const value = this.value ?? '';
    const level = this.#level();
    const key = `${level}\n${value}`;
    if (this.#encoding?.key === key) return this.#encoding;
    let encoding: Encoding = { key, status: 'empty', code: null, error: null };
    if (value) {
      try {
        encoding = {
          key,
          status: 'encoded',
          code: encodeQr(value, { errorCorrection: level }),
          error: null,
        };
      } catch (error) {
        if (!(error instanceof QrCapacityError)) throw error;
        encoding = { key, status: 'error', code: null, error };
      }
    }
    this.#encoding = encoding;
    return encoding;
  }

  #level(): QrErrorCorrection {
    return LEVELS.includes(this.errorCorrection) ? this.errorCorrection : 'M';
  }

  #quietZone(): number {
    const zone = this.quietZone;
    return Number.isInteger(zone) && zone >= 0 ? zone : DEFAULT_QUIET_ZONE;
  }

  #label(): string {
    return this.label || this.qrCodeMessages.qrCode;
  }

  /** An export side in pixels, clamped to whole modules and the canvas limit. */
  #exportSide(requested?: number): number {
    const code = this.#encode().code;
    const minimum = (code?.size ?? 21) + this.#quietZone() * 2;
    const fallback =
      Number.isFinite(this.exportSize) && this.exportSize > 0
        ? this.exportSize
        : DEFAULT_EXPORT_SIZE;
    const wanted = Math.round(requested ?? fallback);
    if (!Number.isFinite(wanted)) return Math.max(minimum, DEFAULT_EXPORT_SIZE);
    const side = Math.min(MAX_EXPORT_SIZE, Math.max(minimum, wanted));
    if (side !== wanted) {
      this.diagnose(
        'qr-code-export-size',
        `An export of ${wanted} px was clamped to ${side} px (${minimum} to ${MAX_EXPORT_SIZE}).`,
        { once: true },
      );
    }
    return side;
  }

  #fileName(name: string, format: QrExportFormat): string {
    const base = name.trim() || 'qr-code';
    const extension = EXPORT_EXTENSIONS[format];
    const known = format === 'jpeg' ? /\.jpe?g$/iu : new RegExp(`\\${extension}$`, 'iu');
    return known.test(base) ? base : `${base}${extension}`;
  }

  /** The presented colors, read from the rendered symbol so every customization reaches exports. */
  #colors(): ExportColors {
    const root = this.renderRoot as ShadowRoot | undefined;
    const view = this.ownerDocument.defaultView;
    const symbol = root?.querySelector<SVGElement>('.symbol');
    if (!symbol || !view || !this.isConnected) return FALLBACK_COLORS;
    const modules = root?.querySelector<SVGElement>('.modules');
    const background = root?.querySelector<SVGElement>('.background');
    const foreground = modules
      ? view.getComputedStyle(modules).fill
      : view.getComputedStyle(symbol).color;
    return {
      foreground: resolveColor(this.ownerDocument, foreground) ?? FALLBACK_COLORS.foreground,
      background:
        (background && resolveColor(this.ownerDocument, view.getComputedStyle(background).fill)) ??
        FALLBACK_COLORS.background,
    };
  }

  #checkContrast(colors: ExportColors): void {
    const key = JSON.stringify(colors);
    if (key === this.#reportedContrast) return;
    const contrast = moduleContrast(colors);
    if (contrast >= 3) return;
    this.#reportedContrast = key;
    this.diagnose(
      'qr-code-contrast',
      contrast < 0
        ? 'The QR code modules are lighter than its background; many scanners cannot read an inverted symbol.'
        : `The QR code colors have a contrast of ${contrast.toFixed(2)}:1; use at least 3:1 so scanners can read it.`,
    );
  }

  /** The image representation for a copy, painted synchronously during the activation. */
  #copyData = (): ClipboardRepresentations => ({
    'image/png': this.toBlob('png').then(
      (blob) => blob ?? Promise.reject(new Error('The QR code has no symbol to copy.')),
    ),
  });

  /** Download items run the export; the internal Menu action does not leave the component. */
  #menuAction = (event: CustomEvent<{ value: unknown; sourceEvent?: Event }>): void => {
    event.stopPropagation();
    const format = String(event.detail.value) as QrExportFormat;
    void this.download(format, {}, event.detail.sourceEvent ?? event);
  };

  protected override render() {
    const messages = this.qrCodeMessages;
    const { code } = this.#encode();
    const zone = this.#quietZone();
    const extent = (code?.size ?? 21) + zone * 2;
    return html`<div part="tile" class="tile">
        <svg
          part="symbol"
          class="symbol"
          viewBox="0 0 ${extent} ${extent}"
          shape-rendering="crispEdges"
          focusable="false"
          role=${code ? 'img' : nothing}
          aria-label=${code ? this.#label() : nothing}
          aria-hidden=${code ? nothing : 'true'}
        >
          <rect part="background" class="background" width=${extent} height=${extent}></rect>
          ${code ? svg`<path part="modules" class="modules" d=${qrPathData(code, zone)}></path>` : nothing}
        </svg>
      </div>
      ${this.copyable || this.downloadable ? this.#renderActions(messages, !code) : nothing}`;
  }

  #renderActions(messages: Required<QrCodeMessages>, disabled: boolean) {
    return html`<tp-button-group
      part="actions"
      class="actions"
      label=${messages.actions}
      .joined=${false}
      >${
        this.copyable
          ? html`<tp-copy-button
              part="copy"
              variant="outline"
              size="sm"
              show-label
              .value=${this.value ?? ''}
              .data=${this.#copyData}
              label=${messages.copy}
              copied-label=${messages.copied}
              failed-label=${messages.copyFailed}
              ?disabled=${disabled}
            ></tp-copy-button>`
          : nothing
      }${
        this.downloadable
          ? html`<tp-menu
              part="download"
              label=${messages.download}
              .portal=${false}
              @tp-action=${this.#menuAction}
              ><tp-button
                slot="trigger"
                part="download-trigger"
                variant="outline"
                size="sm"
                ?disabled=${disabled}
                ><tp-icon slot="icon-start" .icon=${downloadIcon}></tp-icon
                >${messages.download}</tp-button
              ><tp-menu-item part="download-item" value="png">${messages.downloadPng}</tp-menu-item
              ><tp-menu-item part="download-item" value="svg">${messages.downloadSvg}</tp-menu-item
              ><tp-menu-item part="download-item" value="jpeg"
                >${messages.downloadJpeg}</tp-menu-item
              ></tp-menu
            >`
          : nothing
      }</tp-button-group
    >`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-qr-code': TpQrCode;
  }
}
