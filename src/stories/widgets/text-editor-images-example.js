import { textEditorImages } from '../../widgets/text-editor/features/index.js';
import { createEngine } from './text-editor-engine.js';

/**
 * Sends the file to your storage and resolves the stored image's URL. This one stands in for it:
 * it reports progress in eight steps, stops when the upload is aborted and keeps the file in the page.
 */
function upload(file, { signal, onProgress }) {
  return new Promise((resolve, reject) => {
    const total = Math.max(file.size, 1);
    let sent = 0;
    const timer = setInterval(() => {
      sent = Math.min(total, sent + Math.ceil(total / 8));
      onProgress(sent, total);
      if (sent < total) return;
      clearInterval(timer);
      resolve(URL.createObjectURL(file));
    }, 200);
    signal.addEventListener('abort', () => {
      clearInterval(timer);
      reject(signal.reason);
    });
  });
}

/** The image tool, and pasted or dropped images: PNG, JPEG or WebP files up to 5 MB. */
export function setupImageUploads(editor) {
  editor.features = [
    textEditorImages({ upload, accept: 'image/png,image/jpeg,image/webp', maxFileSize: '5MB' }),
  ];
  editor.engine = createEngine();
}
