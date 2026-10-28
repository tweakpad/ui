/**
 * Built-in tools of the images feature (Widgets `uwg-te-tab-tools-inserts`,
 * `uwg-te-req-surfaces-4`): the image tool, whose pending image the widget's upload card fills in.
 */
import { imageIcon } from '../../../icons/image.js';
import type { TextEditorBlockAttributes } from '../model.js';
import { insertBlock, type TextEditorImageToolValue, type TextEditorTool } from '../tools.js';
import type { BuiltinToolIdOf } from './ids.js';
import { builtin, text } from './shared.js';

/** The attributes of a pending image: an empty source that an upload fills in. */
const PENDING_IMAGE: TextEditorBlockAttributes = Object.freeze({ src: '', alt: '' });

/** The built-in tools of the images feature by identifier. */
export const textEditorImageTools = Object.freeze({
  image: builtin({
    id: 'image',
    kind: 'image',
    label: text('image'),
    description: text('imageDescription'),
    icon: imageIcon,
    group: 'insert',
    surfaces: ['toolbar', 'slash'],
    requires: ['block.image'],
    // Without a value, the tool inserts a pending image (an empty source) that the widget's
    // upload card fills in (`uwg-te-req-surfaces-4`); that needs the upload hook. A run with a
    // value inserts the image it names and needs no hook.
    isEnabled: (context) => context.imageUpload || context.value !== undefined,
    action: (context) => {
      const value = context.value as TextEditorImageToolValue | undefined;
      return [
        insertBlock(
          context,
          'image',
          value === undefined ? PENDING_IMAGE : { src: value.src, alt: value.alt },
        ),
      ];
    },
  }),
} satisfies Readonly<Record<BuiltinToolIdOf<'images'>, TextEditorTool>>);
