# File upload: spec amendment

Status: applied 2026-10-11 as Spec Blocks commit `e57b4d59` (0.16.14, parent `f3265974`) and released as 0.17.0 (`63326a7e`). Content generated from one source and verified node by node against the stored documents. Follow-up `c1571b84` (0.17.1) inserted row `fupl-props-r29` (Show trigger, true; false, false) and rewrote `fup-validator` so that removing a validating Item excludes its file and the batch aborts only when none of its Items remain. Follow-up `b773d35c` (0.17.2) added opt-in clipboard paste; see the last section.

## UI Foundation Specification (`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`)

### Insert `sec-1411-file-upload` into `sec-14-field-and-quantitative-entry-components`

Review dependencies: `sec-91-formcontrolcontractt`, `sec-92-validation`, `audit-sec-93-validation-run`, `sec-1923-live-announcer`, `sec-53-changeeventt-and-changereason`.

#### File upload

Purpose and limits. File upload collects an ordered list of files from the host file picker, a native drag-and-drop transfer or a Consumer action, validates each file against accepted types, size, count and Consumer rules, publishes the accepted files as one form value, and tracks a status for every file. It does not prescribe transport, storage, chunking or resumption; an optional Consumer upload adapter performs transfers. Native file and operating-system drag is outside [Drag-and-drop](#sec-1919-drag-drop) and is owned here.  <!-- fup-purpose -->

- **REQ** Anatomy. Exactly one Root; exactly one Dropzone; exactly one Input, a native file input that is the control’s focus, naming, description and invalid-state target; zero or one Trigger; zero or one Summary with zero or one ClearTrigger; zero or one ItemGroup; zero or more Items, each owning zero or one ItemPreview, ItemProgress, ItemRetryTrigger and ItemDeleteTrigger. The Input MUST remain in the accessibility tree while it is visually hidden.  <!-- fup-anatomy -->

<!-- fup-parts -->
| Part | Default semantic | Responsibility |
|---|---|---|
| Root | none | Owns the value, Items, limits, validation batches, upload queue and published markers. |
| Dropzone | none | Receives native transfers and pointer activation and presents the title, description and hint. |
| Input | native file input | Opens the host picker; carries the accessible name, description and invalid state. |
| Trigger | presentational | Optional visible picker action that duplicates the Input and is not a separate control. |
| Summary | none | Presents the count of accepted files against the maximum. |
| ClearTrigger | button | Removes every Item. |
| ItemGroup | list | Contains accepted Items in value order followed by rejected Items in arrival order. |
| Item | list item | Presents one file, its status, description and actions. |
| ItemPreview | decorative image | Shows an image file; other files show a type mark. |
| ItemProgress | progress bar | Shows transfer progress while the Item uploads. |
| ItemRetryTrigger | button | Restarts a failed upload. |
| ItemDeleteTrigger | button | Removes one Item. |

<!-- fup-props -->
| Property | Domain | Default |
|---|---|---|
| value / defaultValue | ordered list of files | empty |
| onValueChange | Optional ChangeEvent<list of files> callback | none |
| multiple | Boolean | false |
| accept | host accept text, list of tokens, or record from media type to extensions | empty: every file |
| maxFiles | positive integer | 1 without multiple, otherwise unbounded |
| maxFileSize / minFileSize / maxTotalSize | byte counts | none |
| allowDuplicates | Boolean | false |
| keepRejected | Boolean | true |
| allowDrop | Boolean | true |
| preventDocumentDrop | Boolean | true |
| directory | Boolean | false |
| capture | none, user, environment | none |
| fileValidator | Optional (file, context) => result or promise of result | none |
| uploader | Optional (item, context) => promise | none |
| autoUpload | Boolean | true |
| uploadConcurrency | positive integer | 3 |
| actions | Optional handle exposing open, add, remove, reject, clear, setItemState, upload, cancelUpload and validate | none |

- **REQ** Value. The value MUST be the ordered list of accepted files; new files are appended in arrival order. Two files are duplicates when their names, byte sizes and last-modified times are equal. Rejected files MUST NOT appear in the value, its change events or form serialization. Assigning the value directly replaces the accepted files without validation or a change event; the add action runs the validation pipeline.  <!-- fup-value -->

- **REQ** Single selection. Without multiple selection the maximum count is one, and a newly selected or dropped valid file MUST replace the current file in one change rather than being rejected for count. When several files arrive together, the first valid file MUST be accepted and every further valid file rejected with `too-many-files`.  <!-- fup-single -->

- **REQ** Count limit. With multiple selection, a batch that would exceed the maximum count MUST fill the remaining slots in batch order and reject every further valid file with `too-many-files`. While the value holds the maximum count the Root is full: the picker and transfers MUST be refused, the Input MUST leave the tab order, and the full state MUST be published.  <!-- fup-count -->

- **REQ** Accepted types. The accept list MUST take the host file-input grammar: comma-separated extension tokens beginning with a period, exact media types, and media-type wildcards ending in /*. A list of tokens or a record from media type to extensions MAY be supplied instead; a record accepts the union of its keys and extensions. A file matches when an extension token is a case-insensitive suffix of its name, so .sql.gz matches backup.sql.gz; when its media type equals a media-type token, ignoring case and parameters; or when its top-level type equals a wildcard’s. A file without a media type matches only by extension. An empty list accepts every file. The same normalized list MUST drive matching, the Input accept attribute and the generated hint.  <!-- fup-accept -->

- **REQ** Validation pipeline. Each batch MUST be processed in order: directory entries are rejected with `folder-not-allowed` unless directory selection is on; each file is checked for type (`file-invalid-type`), size (`file-too-large`, `file-too-small`) and duplication against the value and earlier files of the batch (`file-exists`, unless duplicates are allowed), collecting every error that applies; the Consumer file validator runs for each file that passed; count and total-size limits (`too-many-files`, `total-too-large`) are applied to the remaining files in batch order; and one value change is proposed for the accepted files. A step MUST skip files rejected by an earlier step. Batches MUST settle in arrival order, and each file MUST be presented as an Item with validating status from its arrival until its batch settles.  <!-- fup-pipeline -->

- **REQ** Consumer validator. The file validator receives the file and a context with the current value, the files accepted so far in the batch, the file’s batch index and an abort signal. It MAY return nothing, one or more text errors, one or more error records with a code and message, or a record with errors, metadata and a description, synchronously or asynchronously. A text error or an error record without a code MUST use `file-invalid`. Metadata and description MUST be stored on the Item. A thrown error, rejected promise or malformed result MUST reject the file with `validation-failed` and MUST NOT be treated as valid. Removing a validating Item, clearing, reset and disconnection MUST abort the affected batch signal, and late results of an aborted batch MUST NOT change the value or Items.  <!-- fup-validator -->

<!-- fup-errors -->
| Error code | Cause |
|---|---|
| file-invalid-type | The file does not match the accept list. |
| file-too-large | The file exceeds the maximum file size. |
| file-too-small | The file is below the minimum file size. |
| too-many-files | The file would exceed the maximum count. |
| total-too-large | The file would make the accepted total exceed the maximum total size. |
| file-exists | The file duplicates an accepted file or an earlier file of the batch. |
| folder-not-allowed | A directory arrived while directory selection is off. |
| file-invalid | The Consumer validator or a Consumer rejection reported an error without a code. |
| validation-failed | The Consumer validator threw, rejected or returned a malformed result. |

- **REQ** Items. Each Item MUST have a stable identifier, its file, a status, an optional progress, an ordered error list, optional metadata and description, a relative path for directory selections and, while previews are enabled for an image file, a preview address. Status is one of validating, selected (accepted without an upload adapter), queued, uploading, processing, complete, error and rejected. The Consumer MAY set the status, progress, errors, description and metadata of an accepted Item, MAY reject an accepted Item with errors, which removes its file from the value, and MUST NOT set validating or rejected directly.  <!-- fup-items -->

- **REQ** Rejected files. While rejected files are kept they MUST appear as rejected Items with their error messages until removed, cleared or reset. When they are not kept they MUST be reported and announced without an Item. Every batch with rejected files MUST notify the Consumer once with the rejected files and their errors.  <!-- fup-rejected -->

- **REQ** Upload adapter. When the Consumer supplies an upload adapter, each accepted file MUST be queued and, when automatic upload is on, started in value order with at most the configured concurrency in flight; otherwise the upload action starts it. The adapter receives the Item and a context with an abort signal and a progress callback taking transferred and total bytes, or a percentage. Starting MUST set status uploading with indeterminate progress; progress reports MUST set a percentage clamped to 0 through 100; fulfilment MUST set status complete and store the result; rejection MUST set status error with the error text, unless the upload was aborted. Removing an Item, clearing, cancelling, reset and disconnection MUST abort its upload, and a cancelled upload returns to queued. Retrying an Item in error MUST restart its upload. Without an adapter the Root MUST NOT transfer files and status changes come only from the Consumer.  <!-- fup-upload -->

- **REQ** Picker. The Input MUST mirror the normalized accept list, multiple selection, directory selection and capture preference. Activating the Input, the Trigger, the Dropzone surface outside interactive descendants, or the open action MUST open the host picker when the control is enabled, editable and not full. Selected files MUST enter the pipeline with reason input, and the Input’s own selection MUST then be cleared so that selecting the same file again is observed. A dismissed picker MUST notify the Consumer without changing the value.  <!-- fup-picker -->

- **REQ** Trigger. A present Trigger MUST NOT be a separate tab stop or accessible control; it duplicates the Input’s action for pointer users, and its activation opens the picker through the Dropzone.  <!-- fup-trigger -->

- **REQ** Native transfer. While transfers are allowed, the Dropzone MUST track entry and exit with a nesting-safe counter, publish the drop-target state while a transfer carrying files is over it, and set the drop effect to copy, or to none when the control is disabled, read-only or full. When the host exposes item types during the transfer, the Dropzone MUST publish drop-reject when no item matches the accept list or the item count exceeds the remaining slots; this pre-check is advisory and does not replace the pipeline. A drop MUST prevent host navigation and enter the files with reason drag. Directory entries MUST be traversed recursively when directory selection is on, each file keeping its relative path. Transfers without files MUST be ignored.  <!-- fup-transfer -->

- **REQ** Document drop guard. While at least one enabled File upload in a document prevents document drops, dropping files outside every Dropzone MUST NOT navigate the document. The guard MUST be shared per owner document, counted by registration, and removed with its last registration.  <!-- fup-document-guard -->

- **REQ** Previews. A preview address MUST be created only for image files while previews are enabled, and MUST be released when its Item is removed, previews are disabled, the value is reset or replaced, or the control disconnects. Reconnection MUST restore previews for current Items.  <!-- fup-previews -->

- **REQ** Form participation. A named, enabled File upload MUST serialize each accepted file under its name in value order, and nothing when it is empty or disabled. Required and empty MUST report value missing. While a rejected Item is kept, the control MUST report a custom validity error carrying the first rejection message, so that submission is blocked until the Item is removed; Items in upload error do not change validity. Form reset MUST restore the default value with reason form-reset, release previews and abort validation and uploads. Host file values cannot be restored, so state restoration MUST leave the value empty.  <!-- fup-form -->

- **REQ** Disabled and read-only. A disabled control MUST refuse the picker, transfers, removal, retry and clearing, leave the tab order and not serialize. A read-only control MUST remain focusable, serialize its value, and refuse the picker, transfers, removal, retry and clearing.  <!-- fup-states -->

- **REQ** Validate action. The validate action MUST re-run type, size, count and Consumer validation over the current value, move failing files to rejected Items with reason imperative-action, and return a [ValidationRun](#audit-sec-93-validation-run) that settles with the control’s validity.  <!-- fup-validate -->

- **REQ** Change reasons. The value lane MUST use input for picker selection, drag for a native drop, chip-remove-press for an ItemDeleteTrigger, clear for the ClearTrigger, imperative-action for the open, add, remove, reject, clear and validate actions, and form-reset for reset. The proposal is cancelable; cancellation MUST leave the value unchanged, discard the batch’s accepted files and keep previews of current Items. Change metadata MUST list the added, removed and rejected files and the transfer source.  <!-- fup-reasons -->

- **REQ** Accessibility. The Input MUST take its accessible name from the enclosing Field label, an authored name or the Dropzone title, and its description MUST include the generated hint. The control MUST announce added and rejected files once per batch through the [Live announcer](#sec-1923-live-announcer) at polite priority, MUST expose busy state while a batch validates or an upload is in flight, and MUST name each Item action with its file name. Item status MUST be available as text; progress values MUST NOT be announced individually.  <!-- fup-a11y -->

- **REQ** Lifecycle. Disconnection MUST abort pending validation and uploads and release previews and the document guard registration; reconnection MUST restore the guard and previews. Changing limits or accepted types MUST NOT revalidate the current value; the Consumer revalidates through the validate action.  <!-- fup-lifecycle -->

## UI Component Library Specification (`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`)

### Insert `ucl17-file-upload` into `sec-cl-17-field-entry`

Review dependencies: `sec-1411-file-upload`, `ucl22-attachment`, `ucl22-empty-state`, `ucl22-badge`, `ucl16-button`, `ucl21-progress`, `ucl21-image`, `ucl17-field`.

#### File upload

A file upload collects files through a dashed drop surface, the host file picker or code, validates them against type, size, count and Consumer rules, and lists them with previews, status, progress and actions as rows, chips or image tiles.  <!-- fupl-purpose -->

Behavioral contract: [File upload](#sec-1411-file-upload) and [FormControlContract](#sec-91-formcontrolcontractt). Each Item composes [Attachment](#ucl22-attachment); accepted-type marks compose [Badge](#ucl22-badge); actions compose [Button](#ucl16-button); upload progress composes [Progress](#ucl21-progress); image previews compose [Image](#ucl21-image); the Dropzone shares the [Empty state](#ucl22-empty-state) presentation; naming, descriptions and errors come from an enclosing [Field](#ucl17-field).  <!-- fupl-basis -->

<!-- fupl-anatomy -->
| Element | Responsibility |
|---|---|
| Root | Owns the value, Items, limits, validation and upload queue. |
| Dropzone | Dashed surface that receives drops and pointer activation; in grid layout the final Add tile. |
| Media | Upload mark, or an add mark in grid layout. |
| Title | Names the action. |
| Description | Generated hint naming accepted types and the size limit. |
| Hint | Optional Badge row of accepted types with the size limit. |
| Trigger | Optional presentational Button that opens the picker. |
| Input | Visually hidden native file input; the focusable, named control. |
| Summary | Count of accepted files against the maximum, with the optional Clear action. |
| Clear | Button that removes every Item. |
| Items | List of Items. |
| Item | Attachment presenting one file, its status and description. |
| Item preview | Image preview of an image file. |
| Item progress | Progress shown while the Item uploads. |
| Item retry | Button that restarts a failed upload. |
| Item delete | Button that removes the Item. |

<!-- fupl-props -->
| Property | Values | Default | Meaning |
|---|---|---|---|
| Value; default value | ordered files | empty | Accepted files. Rejected files are never part of the value. |
| Multiple | true; false | false | Allows several files; without it a new file replaces the current one. |
| Accept | host accept text, token list, or media-type record | empty | Accepted extensions and media types; drives matching, the picker filter and the hint. |
| Maximum files | positive integer | 1 without Multiple, otherwise unbounded | Count limit; overflow fills remaining slots and rejects the rest. |
| Maximum file size; minimum file size; maximum total size | bytes | none | Size limits. |
| Allow duplicates | true; false | false | Accepts a file equal to an accepted one. |
| Keep rejected | true; false | true | Keeps rejected files as error Items until removed. |
| Allow drop | true; false | true | Accepts native drag-and-drop transfers. |
| Prevent document drop | true; false | true | Stops a missed drop from navigating the document. |
| Directory | true; false | false | Selects and traverses folders. |
| Capture | none; user; environment | none | Camera preference forwarded to the picker. |
| Layout | stack; grid | stack | Stack places the Dropzone above the Items; grid shows Items as tiles with the Dropzone as the final Add tile, hidden while full. |
| Size | sm; default | default | Dropzone density. |
| Item size | xs; sm; default | default | Attachment density of Items; xs presents chips. |
| Hint treatment | text; badges; none | text | Presents the hint as a sentence, a Badge row or not at all. |
| Show items | true; false | true | Renders the Items; false leaves the list to the Consumer. |
| Show previews | true; false | true | Image Items show a preview instead of a type mark. |
| Removable | true; false | true | Each Item has a delete action. |
| Retryable | true; false | true | Items in upload error have a retry action. |
| Clearable | true; false | false | The Summary has a Clear action. |
| File validator | (file, context) => result | none | Consumer validation and metadata extraction. |
| Item description | (item) => text | none | Replaces the generated Item description. |
| Upload adapter | (item, context) => promise | none | Transfers accepted files and drives their status. |
| Automatic upload | true; false | true | Starts queued uploads without the upload action. |
| Upload concurrency | positive integer | 3 | Uploads in flight at once. |
| Messages | partial text dictionary | English | Every visible and announced text. |
| Locale | locale identifier | owner locale | Byte and count formatting. |
| Disabled; read-only; required | true; false | false | Form-control states. |

- **REQ** Each Item MUST render an Attachment whose status is set explicitly from the Item status: validating and processing as processing, selected and complete as complete, queued as idle, uploading as uploading, and error and rejected as error. Attachment MUST NOT infer upload state.  <!-- fupl-q1 -->

- **REQ** The Dropzone MUST present a dashed line at rest, the drop-target fill while a transfer is over it, and the destructive line for drop-reject and invalid state. Focus indication MUST appear on the Dropzone while the Input has visible focus. Its media, title and description MUST use the Empty state presentation.  <!-- fupl-q2 -->

- **REQ** File upload MUST NOT add a Boolean loading property. Busy presentation comes from Item status, Item progress and the indeterminate Item progress mark.  <!-- fupl-q3 -->

- **REQ** The generated description MUST name the accepted types and the maximum file size from the normalized accept list and limits, for example PNG, JPG or PDF up to 10 MB; the badges treatment MUST present one Badge per accepted type followed by the size limit. Byte sizes MUST use binary units formatted for the resolved locale.  <!-- fupl-q4 -->

- **REQ** The messages dictionary MUST cover every visible and announced text, including each error code, with name, count, maximum, types, size, maximum-size and minimum-size placeholders, and MUST default to English. Developer diagnostics MUST NOT be localized.  <!-- fupl-q5 -->

- **REQ** The binding MUST expose read-only Items, rejections and full state; the open, add, remove, reject, clear, set-item-state, upload, cancel-upload and validate actions; a cancelable value change; and file-reject, file-retry, upload-start, upload-complete, upload-error and picker-cancel notifications.  <!-- fupl-api -->

<!-- fupl-public-definition -->
| Public part | Foundation part | Part slot | Exposure |
|---|---|---|---|
| Root | FileUpload.Root | file-upload | exposed |
| Dropzone | FileUpload.Dropzone | file-upload-dropzone | exposed |
| Media | none (synthesized) | file-upload-media | synthesized |
| Title | none (synthesized) | file-upload-title | synthesized |
| Description | none (synthesized) | file-upload-description | synthesized |
| Hint | none (synthesized) | file-upload-hint | synthesized |
| Trigger | FileUpload.Trigger | file-upload-trigger | exposed |
| Input | FileUpload.Input | file-upload-input | exposed |
| Summary | FileUpload.Summary | file-upload-summary | exposed |
| Clear | FileUpload.ClearTrigger | file-upload-clear | renamed |
| Items | FileUpload.ItemGroup | file-upload-items | renamed |
| Item | FileUpload.Item | file-upload-item | exposed |
| Item preview | FileUpload.ItemPreview | file-upload-item-preview | renamed |
| Item progress | FileUpload.ItemProgress | file-upload-item-progress | renamed |
| Item retry | FileUpload.ItemRetryTrigger | file-upload-item-retry | renamed |
| Item delete | FileUpload.ItemDeleteTrigger | file-upload-item-delete | renamed |

<!-- fupl-definition-summary -->
| Public control | Kind | Variant axes and defaults | Fixed or re-defaulted foundation properties | Surfaced hidden-part properties |
|---|---|---|---|---|
| File upload | compound-reexport | Size: sm, default; default=default | none | none |

<!-- fupl-presentation-keys -->
| Public part | Cardinality and containment | Presentation key inventory |
|---|---|---|
| Root | exactly one public owner host per control instance | file-upload, file-upload-size-sm, file-upload-size-default |
| Dropzone | exactly one descendant of Root | file-upload-dropzone, file-upload-dropzone-size-sm, file-upload-dropzone-size-default |
| Media | zero or one descendant of Dropzone; present unless media content is empty | file-upload-media, file-upload-media-size-sm, file-upload-media-size-default |
| Title | exactly one descendant of Dropzone | file-upload-title, file-upload-title-size-sm, file-upload-title-size-default |
| Description | zero or one descendant of Dropzone; present with the text hint treatment or authored content | file-upload-description, file-upload-description-size-sm, file-upload-description-size-default |
| Hint | zero or one descendant of Dropzone; present with the badges hint treatment or authored content | file-upload-hint, file-upload-hint-size-sm, file-upload-hint-size-default |
| Trigger | zero or one descendant of Dropzone | file-upload-trigger, file-upload-trigger-size-sm, file-upload-trigger-size-default |
| Input | exactly one descendant of Root | file-upload-input, file-upload-input-size-sm, file-upload-input-size-default |
| Summary | zero or one descendant of Root; present with a count limit, Clear or authored content | file-upload-summary, file-upload-summary-size-sm, file-upload-summary-size-default |
| Clear | zero or one descendant of Summary; present while Clearable and not empty | file-upload-clear, file-upload-clear-size-sm, file-upload-clear-size-default |
| Items | zero or one descendant of Root; present while Show items and Items exist, or in grid layout | file-upload-items, file-upload-items-size-sm, file-upload-items-size-default |
| Item | zero or more descendants of Items | file-upload-item, file-upload-item-size-sm, file-upload-item-size-default |
| Item preview | zero or one descendant of each Item; image files with Show previews | file-upload-item-preview, file-upload-item-preview-size-sm, file-upload-item-preview-size-default |
| Item progress | zero or one descendant of each Item; present while uploading | file-upload-item-progress, file-upload-item-progress-size-sm, file-upload-item-progress-size-default |
| Item retry | zero or one descendant of each Item; present for upload errors while Retryable | file-upload-item-retry, file-upload-item-retry-size-sm, file-upload-item-retry-size-default |
| Item delete | zero or one descendant of each Item; present while Removable | file-upload-item-delete, file-upload-item-delete-size-sm, file-upload-item-delete-size-default |

Recorded design decisions: the native input stays the single focusable and named control, so Field association, label activation and native picker keys need no synthesized semantics, and the visible Trigger is presentational. Rejected files stay visible as error Items by default because a silent drop loses the reason; they never enter the value. Without an upload adapter the control never transfers files, which keeps Attachment’s rule that status is application supplied; the adapter is an optional owner of the queue. Item reordering, clipboard paste, image transformation and resumable transport are left to composition.  <!-- fupl-decisions -->

## Table rows and baseline

- `foundation` `node-016395` append `fup-b83-row`: File upload value | input, drag, chip-remove-press, clear, imperative-action, form-reset
- `foundation` `audit-foundation-catalog-coverage-map` append `fup-coverage-row`: File upload | File upload | catalog control | direct public control
- `cl` `audit-complete-coverage-map` append `fupl-coverage-row`: File upload | [File upload](#ucl17-file-upload) | compound-reexport | [File upload behavior](#sec-1411-file-upload) | included public control
- `cl` `ucl111-table` append `fupl-state-row`: drop-reject; full | [File upload](#sec-1411-file-upload); drop-target, filled and pending reuse the shared markers.
- `foundation` `sec-a1-pinned-upstream-baseline` append `fup-evidence-baseline`: File upload evidence: the HTML file input (accept, multiple, capture and directory selection), the HTML drag-and-drop data store with the File and Directory Entries interfaces, and the File API object-address lifecycle. No behavioral component evidence snapshot provides a file upload; accept matching, rejection codes and transfer pre-checks follow common dropzone conventions. These sources are implementation evidence, not runtime dependencies.

## Follow-up 0.17.2: clipboard paste (`b773d35c`)

Foundation (`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`):

- Insert row `fup-props-r18` into `fup-props` before `actions`: paste | none, control, document | none.
- Insert requirement `fup-paste` after `fup-document-guard`: Paste. The paste scope is none, control or document. With control, a paste whose clipboard data carries files MUST be handled when its composed path includes the Root or the pointer is over the Root. With document, such a paste MUST also be handled when no other File upload takes it. A paste whose composed path contains an editable element outside the Root, or whose default action was already prevented, MUST NOT be handled, and a paste without files MUST be left to the host. Exactly one File upload MUST handle a paste, chosen in this order: the one whose Root is in the composed path, the one under the pointer, then the document-scoped one activated most recently by focus or pointer press, or connected most recently when none was activated. A disabled control MUST NOT take part. The handling control MUST prevent the host default action and enter the files with reason input-paste and transfer source paste; a read-only or full control MUST refuse them. Paste listeners MUST be shared per owner document and removed with their last registration.
- `fup-purpose`: sources now include "an opt-in clipboard paste".
- `fup-reasons`: adds "input-paste for a clipboard paste".
- `fup-states`: disabled and read-only controls refuse pastes.
- `fup-lifecycle`: disconnection releases and reconnection restores the paste registration.
- B.8.3 row `fup-b83-row`: input, drag, input-paste, chip-remove-press, clear, imperative-action, form-reset.

Component Library (`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`):

- Insert row `fupl-props-r30` after Prevent document drop: Paste | none; control; document | none | Accepts files pasted from the clipboard. Control takes pastes while focus is in the control or the pointer is over it; document also takes pastes elsewhere on the page outside editable fields.
- `fupl-decisions-p`: clipboard paste leaves the composition list; "Clipboard paste is opt-in because a page-wide paste listener changes what paste does outside the control; editable fields keep their own pastes."

Reviews approved: `ucl17-file-upload-dep-0`, `rel-changeevent-to-b8`, `rel-complete-audit-to-b`.
