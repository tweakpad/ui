# File upload

`tp-file-upload` collects files through a dashed drop surface, the host file picker, an opt-in
clipboard paste or code. It validates each file against accepted types, size, count and your own
rules, lists the files as [Attachment](attachment.md) rows, chips or image tiles, and submits them
with its form. It never transfers files unless you give it an upload adapter.

```html
<tp-field label="Contract" description="Signed PDF">
  <tp-file-upload
    name="contract"
    accept="application/pdf"
    max-file-size="5MB"
    required
  ></tp-file-upload>
</tp-field>
```

The visually hidden native file input is the control: it takes focus, opens the picker with Enter
or Space, carries the Field label, description and errors, and reports the selection as its value
text. Clicking anywhere on the drop surface also opens the picker. The optional Trigger Button is a
visual duplicate of that action and is not a separate tab stop.

## Properties

| Property / attribute                                       | Type                                                          | Default         | Meaning                                                                                                                                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`                                                    | `readonly File[]`, property only                              | `[]`            | Accepted files in order. Assigning it replaces the files without validation or an event; use `addFiles()` to validate.                                                                           |
| `defaultValue`                                             | `readonly File[]`, property only                              | `[]`            | Initial files and the value restored by form reset.                                                                                                                                              |
| `name`, `form`                                             | text                                                          | empty           | Form name and owner. Each accepted file is appended under the name.                                                                                                                              |
| `multiple`                                                 | Boolean                                                       | `false`         | Allows several files. Without it a new file replaces the current one.                                                                                                                            |
| `accept`                                                   | accept text, token list or record of media type to extensions | `''` (any file) | Extensions (`.sql.gz` matches as a suffix), media types and wildcards such as `image/*`. Drives matching, the picker filter and the hint.                                                        |
| `maxFiles` / `max-files`                                   | number or `null`                                              | `null`          | Count limit with `multiple`. A batch fills the remaining slots and rejects the rest.                                                                                                             |
| `maxFileSize` / `max-file-size`                            | bytes or size text (`10MB`, `2.5 GiB`)                        | `null`          | Larger files are rejected with `file-too-large`.                                                                                                                                                 |
| `minFileSize` / `min-file-size`                            | bytes or size text                                            | `null`          | Smaller files are rejected with `file-too-small`.                                                                                                                                                |
| `maxTotalSize` / `max-total-size`                          | bytes or size text                                            | `null`          | Files that would make the total exceed it are rejected with `total-too-large`.                                                                                                                   |
| `allowDuplicates` / `allow-duplicates`                     | Boolean                                                       | `false`         | Accepts a file with the same name, size and modification time as an accepted one.                                                                                                                |
| `keepRejected` / `keep-rejected`                           | Boolean (`keep-rejected="false"` turns it off)                | `true`          | Keeps rejected files as error items until removed. Off, rejections are announced and reported only.                                                                                              |
| `allowDrop` / `allow-drop`                                 | Boolean (`"false"` turns it off)                              | `true`          | Accepts native drag and drop.                                                                                                                                                                    |
| `preventDocumentDrop` / `prevent-document-drop`            | Boolean (`"false"` turns it off)                              | `true`          | Stops a file dropped beside the drop surface from opening in the tab.                                                                                                                            |
| `paste`                                                    | `none`, `control`, `document`                                 | `none`          | Accepts files pasted from the clipboard. `control` takes pastes while focus is in the control or the pointer is over it; `document` also takes pastes elsewhere on the page outside text fields. |
| `directory`                                                | Boolean                                                       | `false`         | Picks and traverses folders; items keep their relative path. Otherwise dropped folders are rejected with `folder-not-allowed`.                                                                   |
| `capture`                                                  | `''`, `user`, `environment`                                   | `''`            | Camera preference forwarded to the picker on mobile devices.                                                                                                                                     |
| `layout`                                                   | `stack`, `grid`                                               | `stack`         | Grid shows image tiles with the drop surface as a final Add tile, hidden while full.                                                                                                             |
| `size`                                                     | `sm`, `default` (reflected)                                   | `default`       | Drop surface density.                                                                                                                                                                            |
| `itemSize` / `item-size`                                   | `xs`, `sm`, `default`                                         | `default`       | Attachment density in the stack layout; `xs` wraps items as chips.                                                                                                                               |
| `hintTreatment` / `hint-treatment`                         | `text`, `badges`, `none`                                      | `text`          | Generated hint as a sentence ("PNG, JPG or PDF up to 10 MB"), a Badge row, or nothing.                                                                                                           |
| `showItems` / `show-items`                                 | Boolean (`"false"` turns it off)                              | `true`          | Renders the item list; turn it off to render your own from `items`.                                                                                                                              |
| `showPreviews` / `show-previews`                           | Boolean (`"false"` turns it off)                              | `true`          | Image files show an Image preview instead of a type mark.                                                                                                                                        |
| `showTrigger` / `show-trigger`                             | Boolean                                                       | `false`         | Shows the presentational Browse Button in the drop surface.                                                                                                                                      |
| `removable`                                                | Boolean (`"false"` turns it off)                              | `true`          | Each item has a Remove Button.                                                                                                                                                                   |
| `retryable`                                                | Boolean (`"false"` turns it off)                              | `true`          | Items in upload error have a Retry Button (with an upload adapter).                                                                                                                              |
| `clearable`                                                | Boolean                                                       | `false`         | The summary has a Clear all Button.                                                                                                                                                              |
| `fileValidator`                                            | `(file, context) => result`, property only                    | none            | Your validation and metadata extraction; see Custom validation.                                                                                                                                  |
| `getItemDescription`                                       | `(item) => string`, property only                             | none            | Replaces the generated item description.                                                                                                                                                         |
| `uploader`                                                 | `(item, context) => Promise`, property only                   | none            | Upload adapter; see Uploads.                                                                                                                                                                     |
| `autoUpload` / `auto-upload`                               | Boolean (`"false"` turns it off)                              | `true`          | Starts uploads as soon as files are accepted; off, call `upload()`.                                                                                                                              |
| `uploadConcurrency` / `upload-concurrency`                 | number                                                        | `3`             | Uploads in flight at once.                                                                                                                                                                       |
| `messages`                                                 | partial `FileUploadMessages`, property only                   | `{}`            | Text overrides; see Messages.                                                                                                                                                                    |
| `locale`                                                   | locale identifier                                             | nearest `lang`  | Byte and list formatting.                                                                                                                                                                        |
| `disabled`, `readOnly` / `readonly`, `required`, `invalid` | Boolean                                                       | `false`         | Form-control states. Disabled refuses every change, leaves the tab order and does not submit. Read-only stays focusable and submits but refuses changes and hides the Remove and Retry Buttons.  |
| `partContracts`, `partPresentation`, `motionPolicy`        | records, `inherit`/`normal`/`reduce`                          | `{}`, `inherit` | Shared part and presentation hooks.                                                                                                                                                              |

## Read-only state

| Property     | Meaning                                                                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`      | Every item: accepted files in value order, then files being validated, then rejected files. Each item has `id`, `file`, `status`, `progress` (0–100 or `null`), `errors`, `meta`, `description`, `previewUrl`, `relativePath`, `rejected` and `response`. |
| `rejections` | Kept rejected files with their errors.                                                                                                                                                                                                                    |
| `full`       | True while the count limit is reached.                                                                                                                                                                                                                    |
| `dropTarget` | True while a transfer carrying files is over the drop surface.                                                                                                                                                                                            |

Item status is `validating`, `selected` (accepted, no adapter), `queued`, `uploading`, `processing`, `complete`, `error` or `rejected`. Each item renders an Attachment with an explicit status: validating and processing as processing, selected and complete as complete, queued as idle, uploading as uploading, error and rejected as error.

## Methods

| Method                                           | Result                                                                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openFilePicker()`                               | Opens the picker; returns `false` while disabled, read-only or full. Call it from a user gesture.                                                                           |
| `addFiles(files)`                                | Runs files through validation with reason `imperative-action`. Resolves `{ accepted, rejected, cancelled }`.                                                                |
| `removeFile(target)`                             | Removes one item by id, `File` or item. Accepted files propose a value change first.                                                                                        |
| `clearFiles()`                                   | Removes every item after one value-change proposal.                                                                                                                         |
| `rejectFile(target, errors)`                     | Moves an accepted file to the rejected items, for example after your server refuses it. Errors are text or `{ code, message }` records.                                     |
| `setItemState(target, patch)`                    | Updates an accepted item: `status` (`selected`, `queued`, `uploading`, `processing`, `complete`, `error`), `progress`, `error` or `errors`, `description`, `meta` (merged). |
| `upload(target?)`                                | Starts queued or failed uploads through the adapter.                                                                                                                        |
| `cancelUpload(target?)`                          | Aborts uploads; cancelled items return to queued.                                                                                                                           |
| `validate()`                                     | Re-runs type, size, count and custom validation over the value, moves failing files to rejected items, and returns a `ValidationRun`.                                       |
| `checkValidity()`, `reportValidity()`, `focus()` | Native form-control behavior on the input.                                                                                                                                  |

## Events

All events bubble and are composed.

| Event                | Detail                                                    | When                                                                                                                                                       |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-value-change`    | `{ value, previousValue, reason, sourceEvent, metadata }` | Before the accepted files change. Cancel it to keep the value; a cancelled batch is discarded. `metadata` has `added`, `removed`, `rejected` and `source`. |
| `tp-file-reject`     | `{ rejections, source }`                                  | Once per batch with rejected files, and after `rejectFile()`.                                                                                              |
| `tp-upload-start`    | `{ item }`                                                | An upload began.                                                                                                                                           |
| `tp-upload-complete` | `{ item, response }`                                      | The adapter fulfilled.                                                                                                                                     |
| `tp-upload-error`    | `{ item, error }`                                         | The adapter rejected (not for cancellations).                                                                                                              |
| `tp-file-retry`      | `{ item, sourceEvent }` (cancelable)                      | The Retry Button was pressed; the default restarts the upload.                                                                                             |
| `tp-picker-cancel`   | `{ sourceEvent }`                                         | The picker closed without a selection.                                                                                                                     |
| `tp-diagnostic`      | `{ code, message, severity }`                             | A refused action, an unreadable size or a missing adapter.                                                                                                 |

Reasons are `input` (picker), `drag` (drop), `input-paste` (clipboard paste), `chip-remove-press` (Remove Button), `clear` (Clear all), `imperative-action` (methods) and `form-reset`. `metadata.source` is `picker`, `drop`, `paste`, `action`, `remove`, `clear` or `reset`.

## Validation and errors

Each batch is checked in order. Folders are rejected unless `directory` is set. Each file is then checked for type, size and duplicates, collecting every error that applies. Your `fileValidator` runs next, one file at a time. Count and total-size limits come last. Built-in error codes are `file-invalid-type`, `file-too-large`, `file-too-small`, `too-many-files`, `total-too-large`, `file-exists`, `folder-not-allowed`, `file-invalid` and `validation-failed`. Upload failures use `upload-failed`.

Rejected files never enter the value or the form data. While a rejected item is kept, the control reports a custom validity error ("report.exe: This file type is not accepted.") so submission is blocked until the item is removed. An enclosing Field shows that message, `required` reports a missing file, and server errors keyed by name come from the Field `errors` property.

## Custom validation

```js
upload.fileValidator = async (file, { value, accepted, index, signal, relativePath }) => {
  const text = await file.text();
  if (signal.aborted) return null;
  if (!text.startsWith('name,email')) return { code: 'csv-columns', message: 'Missing header.' };
  return { meta: { rows: text.split('\n').length - 1 }, description: 'Contacts' };
};
```

Return nothing to accept the file; text or `{ code, message }` records (one or a list) to reject it; or `{ errors, meta, description }` to attach metadata such as a page count. Text errors use `file-invalid`. A thrown error, rejected promise or unreadable result rejects the file with `validation-failed`, never accepts it. Removing a file while it is checked excludes it; clearing, reset and disconnection abort the signal and ignore late results.

## Uploads

```js
upload.uploader = async (item, { signal, onProgress }) => {
  const body = new FormData();
  body.append('file', item.file);
  const response = await fetch('/upload', { method: 'POST', body, signal });
  if (!response.ok) throw new Error(`Upload failed (${response.status})`);
  return response.json();
};
```

`onProgress(loaded, total)` takes bytes, or a percentage without `total`; `fetch` has no upload progress, so use `XMLHttpRequest` when you need it. Accepted files queue and start in order with `uploadConcurrency` in flight. The fulfilled value is stored as `item.response`. Removing a file, clearing, reset and disconnection abort its upload. Without an adapter files stay `selected` and you drive status yourself with `setItemState()`.

## Paste

```html
<!-- Screenshots pasted while the grid is focused or under the pointer -->
<tp-file-upload multiple layout="grid" accept="image/*" paste="control"></tp-file-upload>
<!-- Files pasted anywhere on the page, except into text fields -->
<tp-file-upload multiple paste="document"></tp-file-upload>
```

Paste is off by default. A paste that carries files goes through the same checks as a drop and is reported with reason `input-paste` and source `paste`; a paste without files, a paste into a text field or editable content outside the control, and a paste another handler already cancelled are left alone. Exactly one control takes each paste: the one that has focus, then the one under the pointer, then the `document` control that was focused, pressed or connected most recently. A disabled control takes no pastes; a read-only or full control takes the paste and refuses its files. Pasted screenshots usually arrive named `image.png`.

## Slots and parts

| Slot          | Content                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `media`       | Drop surface mark; replaces the upload icon.                              |
| `title`       | Drop surface title; also the input's name when no Field label is present. |
| `description` | Replaces the generated hint sentence.                                     |
| `hint`        | Replaces the generated Badge row.                                         |
| `summary`     | Extra summary content beside the count.                                   |
| default       | Extra drop surface content.                                               |

Parts: `file-upload` (root), `file-upload-dropzone`, `file-upload-media`, `file-upload-title`, `file-upload-description`, `file-upload-hint`, `file-upload-trigger`, `file-upload-input`, `file-upload-summary`, `file-upload-clear`, `file-upload-items`, `file-upload-item`, `file-upload-item-preview`, `file-upload-item-progress`, `file-upload-item-retry` and `file-upload-item-delete`. Each part has `-size-sm` and `-size-default` presentation keys.

Host markers: `data-drop-target`, `data-drop-reject` (the dragged files will not be accepted), `data-full`, `data-filled`, `data-pending` (validation or uploads in flight), `data-focus-visible`, `data-disabled`, `data-readonly` and `data-invalid`. The drop surface carries the same markers. Items carry `data-status` and `data-rejected`. The drop surface mark is `--tp-file-upload-icon-size` (default twice the large icon size, the large size at `size="sm"` and in grid tiles); the mark renders in the muted foreground at 75% opacity. Grid tiles follow `--tp-file-upload-tile-size`; the upload bar sits in the row padding at `--tp-file-upload-progress-inset`.

## Messages

`messages` replaces any text: titles (`title`, `titleMultiple`, `add`, `dropActive`, `dropReject`, `full`), hints (`hintTypesAndSize`, `hintTypes`, `hintSize`, `wildcardType`, `acceptedTypes`, `maxSize`), actions (`browse`, `clear`, `remove`, `retry`), counts (`count`, `countLimited`), item status (`validating`, `queued`, `uploading`, `processing`, `complete`, `uploadFailed`, `progress`), announcements (`added`, `rejected`, `removed`, `cleared`), validity (`valueMissing`, `invalidItem`) and one entry per error code. Entries are text with `{name}`, `{count}`, `{max}`, `{types}`, `{type}`, `{maxSize}`, `{minSize}`, `{maxTotalSize}` and `{error}` placeholders, or functions of those values (for plurals). `DEFAULT_FILE_UPLOAD_MESSAGES` holds the English defaults.

## Accessibility

The native input is the single named control. Its name comes from the Field label, an `aria-label` on the host, or the title; its description includes the hint. Added and rejected files are announced once per batch through a polite live region; item status text sits in each Attachment's status region, and progress values are not announced. Remove and Retry Buttons are named with the file name. The item list uses list semantics and is marked busy while files are checked or uploaded.
