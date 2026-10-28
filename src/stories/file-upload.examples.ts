import { moduleExample } from './documentation-examples.js';
import { setupFileUploadExample } from './file-upload-example.js';
import setupSource from './file-upload-example.js?raw';

const stack = 'display:grid;gap:var(--tp-space-4);min-inline-size:0';

function example(title: string, id: string, markup: string, description?: string) {
  return moduleExample({
    title,
    id,
    markup,
    description,
    wrapperStyle: stack,
    setup: setupFileUploadExample,
    source: setupSource,
    call: `const cleanup = setupFileUploadExample(document.getElementById('${id}'));\n// Call cleanup() when removing this composition.`,
  });
}

export const fileUploadExamples = [
  example(
    'Single file',
    'file-upload-single',
    `<tp-file-upload name="backup" accept=".sql,.sql.gz,.dump,.bak" max-file-size="10GB">
  <span slot="title">Upload backup file</span>
</tp-file-upload>`,
    'One file with an accept list and a size limit. A new pick replaces the file; other types and larger files appear as error items.',
  ),
  example(
    'Attachments as chips',
    'file-upload-chips',
    `<tp-file-upload
  name="attachments"
  multiple
  size="sm"
  item-size="xs"
  clearable
  show-trigger
  data-sample="attachments"
></tp-file-upload>`,
    'Extra-small items wrap as chips. The Clear action removes every file after one value change.',
  ),
  example(
    'Documents with metadata',
    'file-upload-documents',
    `<tp-file-upload
  name="documents"
  multiple
  accept=".pdf,.doc,.docx,.xls,.xlsx"
  max-file-size="25MB"
  hint-treatment="badges"
  data-validator="documents"
></tp-file-upload>`,
    'A file validator checks the PDF signature and counts pages; the count becomes item metadata and description.',
  ),
  example(
    'Image gallery with slots',
    'file-upload-gallery',
    `<tp-card>
  <h3 slot="header">Images</h3>
  <p slot="description">JPG, PNG or WebP, up to 8 images</p>
  <tp-file-upload
    name="images"
    multiple
    layout="grid"
    max-files="8"
    accept="image/jpeg,image/png,image/webp"
    paste="control"
    data-sample="gallery"
  ></tp-file-upload>
</tp-card>`,
    'The grid layout shows image previews as tiles and the drop surface as the final Add tile, hidden while the eight slots are full. With `paste="control"`, an image pasted while the grid has focus or the pointer is over it is added like a drop.',
  ),
  example(
    'Uploads with progress',
    'file-upload-uploads',
    `<tp-file-upload name="uploads" multiple upload-concurrency="2" data-uploader>
  <span slot="description">Files upload as soon as they are added. Names containing “fail” fail once.</span>
</tp-file-upload>`,
    'An upload adapter drives each file through queued, uploading and complete or error. Removing a file cancels its upload; Retry restarts a failed one.',
  ),
  example(
    'Structure validation',
    'file-upload-imports',
    `<tp-file-upload name="contacts" multiple accept=".csv,.json" data-validator="imports">
  <span slot="title">Import contacts</span>
  <span slot="description">CSV with name, email and phone columns, or a JSON array of records</span>
</tp-file-upload>`,
    'The validator reads the file and rejects missing columns or malformed JSON with its own error code.',
  ),
  example(
    'Forms and server errors',
    'file-upload-form',
    `<tp-form>
  <tp-field label="Signed contract" description="PDF up to 5 MB">
    <tp-file-upload
      name="contract"
      required
      accept="application/pdf"
      max-file-size="5MB"
      hint-treatment="none"
      show-trigger
      data-server
    ></tp-file-upload>
  </tp-field>
  <div slot="actions">
    <tp-button type="submit">Submit</tp-button>
    <tp-button type="reset" variant="outline">Reset</tp-button>
  </div>
  <p data-submitted></p>
</tp-form>`,
    'Field names the control and shows its errors. Files named “copy” are rejected by a simulated server after upload; rejected files block submission until removed.',
  ),
];
