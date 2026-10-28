/**
 * The images feature (`uwg-te-req-surfaces-4`, `uwg-te-tab-props` r13 to r15): the upload card
 * that fills a pending image in, the pasted and dropped image files and the alternative text
 * field of a selected image. `textEditorImages()` creates it with the application's upload hook.
 */
import { TpButton } from '../../../components/button/button.js';
import { TpFileUpload } from '../../../components/file-upload/file-upload.js';
import type { FileAcceptInput } from '../../../components/file-upload/types.js';
import { TpInputGroup } from '../../../components/input-group/input-group.js';
import { TpInput } from '../../../components/input/input.js';
import { parseByteSize } from '../../../foundation/format-bytes.js';
import { textEditorImageTools } from '../../../foundation/text-editor/builtin-tools/images.js';
import type {
  TextEditorFeature,
  TextEditorFeatureHost,
  TextEditorFeatureInstance,
} from '../feature.js';
import type { TextEditorImageUpload } from '../types.js';
import { imageAltStyles, TextEditorImageAltField } from '../views/image-alt.js';
import { TextEditorImageUploads, type TextEditorImageLimits } from '../views/image-upload.js';

export interface TextEditorImagesOptions {
  /** Uploads an image file and resolves to its source; without it the image tool inserts no pending image. */
  readonly upload?: TextEditorImageUpload | null | undefined;
  /** The accepted image types, in File upload's `accept` forms; `image/*` by default. */
  readonly accept?: FileAcceptInput | undefined;
  /** The largest accepted image file: bytes, or text with a unit (`10MB`); none by default. */
  readonly maxFileSize?: number | string | null | undefined;
}

/** The byte count of a size option: a number as is, text parsed with its unit, unreadable as no limit. */
export function imageMaxFileSize(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value === 'string') return parseByteSize(value);
  return null;
}

/** The image upload card, the pasted and dropped image files and the alternative text field. */
export function textEditorImages(options: TextEditorImagesOptions = {}): TextEditorFeature {
  const upload = options.upload ?? null;
  const limits: TextEditorImageLimits = Object.freeze({
    accept: options.accept ?? 'image/*',
    maxFileSize: imageMaxFileSize(options.maxFileSize),
  });
  return Object.freeze({
    name: 'images' as const,
    tools: textEditorImageTools,
    elements: Object.freeze([TpFileUpload, TpInput, TpInputGroup, TpButton]),
    styles: Object.freeze([imageAltStyles]),
    attach: (host: TextEditorFeatureHost): TextEditorFeatureInstance => {
      const image = new TextEditorImageUploads({
        strings: () => host.strings(),
        imageUpload: () => upload,
        limits: () => limits,
        access: () => host.access(),
        instance: () => host.instance(),
        selection: () => host.selection(),
        request: (proposal) => host.request(proposal),
        diagnose: (message) => host.diagnose('text-editor-upload-rejected', message),
        announce: (message) => host.announce(message),
        focusEditing: () => host.focusEditing(),
      });
      const views = Object.freeze({
        pendingImage: (element: HTMLElement, id: string) => image.mount(element, id),
      });
      const shadow = () => host.renderRoot() as ShadowRoot;
      const alt = new TextEditorImageAltField({
        element: host.element,
        get renderRoot() {
          return shadow();
        },
        requestUpdate: () => host.requestUpdate(),
        strings: () => host.strings(),
        instance: () => host.instance(),
        state: () => host.state(),
        access: () => host.access(),
        direction: () => host.direction(),
        toolbar: () => host.toolbar(),
        dragging: () => host.dragging(),
        surfaceOpen: () => host.surfaceOpen() || host.menuOpen(),
        request: (proposal) => host.request(proposal),
        focusEditing: () => host.focusEditing(),
        registerContextual: (surface) => host.registerContextual(surface),
      });
      return {
        name: 'images',
        views,
        stateChanged: () => image.sync(),
        updated: () => alt.updated(),
        valueChanged: (change) => {
          // The pending image that the image tool inserts takes focus once its card renders, as
          // the popover it replaces did when it opened; a paste or a drop keeps focus in the root.
          if (
            change.origin === 'request' &&
            change.tool === 'image' &&
            change.reason !== 'input-paste' &&
            change.reason !== 'drag'
          )
            image.toolInserted();
        },
        disconnected: () => image.release(),
        dispose: () => {
          image.release();
          alt.dispose();
        },
        // The alternative text field sits in the context bar under the toolbar, outside the
        // viewport; the upload views live in engine hosts, which a render of the widget refreshes.
        renderSurfaces: () => {
          image.refresh();
          return alt.render();
        },
        uploadImages: (files, at, reason, event) => image.uploadImages(files, at, reason, event),
        uploads: () => upload !== null,
        focusExcluded: (active) => image.contains(active),
        // The selection toolbar keeps clear of the alternative text field in the context bar.
        keepClear: () => alt.band(),
      };
    },
  });
}
