import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { stateMarkers } from '../../foundation/state-markers.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import { ValidationRun } from '../../foundation/validation.js';
import { defaultTrue, numberOrNull } from '../../foundation/converters.js';
import { composedContains, deepActiveElement, focusAfterRemoval } from '../../foundation/focus.js';
import { formatBytes, parseByteSize } from '../../foundation/format-bytes.js';
import { listFormatter } from '../../foundation/date-locale.js';
import { resolveLocale } from '../../foundation/services.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { fileTextIcon } from '../../icons/file-text.js';
import { imageIcon } from '../../icons/image.js';
import { plusIcon } from '../../icons/plus.js';
import { refreshIcon } from '../../icons/refresh.js';
import { uploadCloudIcon } from '../../icons/upload-cloud.js';
import { xIcon } from '../../icons/x.js';
import { fileUploadPresentation } from '../../presentation/families/file-upload.js';
import { TpAttachment, type AttachmentStatus } from '../attachment/attachment.js';
import { TpBadge } from '../badge/badge.js';
import { TpButton } from '../button/button.js';
import { TpIcon } from '../icon/icon.js';
import { TpImage } from '../image/image.js';
import { TpProgress } from '../progress/progress.js';
import { observeSlots, slotOccupied } from '../shared/slots.js';
import { acceptLabels, nativeAccept, normalizeAccept, type NormalizedAccept } from './accept.js';
import { FileItemStore, isAcceptedStatus, previewable } from './items.js';
import {
  formatFileUploadMessage,
  type FileUploadMessageParams,
  type FileUploadMessages,
} from './messages.js';
import { fileKey, selectFiles, type FileCandidate, type SelectionResult } from './selection.js';
import { fileUploadStyles } from './styles.js';
import {
  collectTransfer,
  pickerCandidates,
  registerDocumentDropGuard,
  snapshotTransfer,
  transferHasFiles,
  transferRejected,
} from './transfer.js';
import { registerPasteOwner, type PasteOwner } from './paste.js';
import { progressPercentage, UploadQueue, type UploadOutcome } from './uploads.js';
import type {
  FileAcceptInput,
  FileAddResult,
  FileError,
  FileErrorCode,
  FileRejection,
  FileUploadCapture,
  FileUploadChangeMetadata,
  FileUploadHintTreatment,
  FileUploadItem,
  FileUploadItemPatch,
  FileUploadItemSize,
  FileUploadItemStatus,
  FileUploadLayout,
  FileUploadPaste,
  FileUploadSize,
  FileUploadSource,
  FileUploadTarget,
  FileUploader,
  FileValidationError,
  FileValidator,
} from './types.js';

/** A byte-count attribute: a number or text with a binary unit (`10MB`); unreadable is no limit. */
const byteSize = {
  fromAttribute: (value: string | null): number | null =>
    value === null ? null : parseByteSize(value),
  toAttribute: (value: number | null): string | null => (value === null ? null : String(value)),
};

const ATTACHMENT_STATUS: Record<FileUploadItemStatus, AttachmentStatus> = {
  validating: 'processing',
  processing: 'processing',
  selected: 'complete',
  complete: 'complete',
  queued: 'idle',
  uploading: 'uploading',
  error: 'error',
  rejected: 'error',
};

interface Batch {
  readonly controller: AbortController;
  readonly ids: string[];
  readonly removed: Set<number>;
}

const EMPTY_RESULT: FileAddResult = Object.freeze({ accepted: [], rejected: [], cancelled: true });

function errorsOf(
  input: FileValidationError | readonly FileValidationError[] | undefined,
): FileError[] {
  if (input == null) return [];
  const list = (Array.isArray(input) ? input : [input]) as FileValidationError[];
  return list
    .map((entry) =>
      typeof entry === 'string'
        ? { code: 'file-invalid', message: entry }
        : { code: entry.code || 'file-invalid', message: entry.message },
    )
    .filter((entry) => entry.message);
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

/**
 * File upload (CL `ucl17-file-upload`, Foundation `sec-1411-file-upload`): a dashed drop surface
 * over a native file input that validates files, lists them as Attachments and optionally uploads
 * them through an application adapter.
 */
export class TpFileUpload extends TpFormElement<readonly File[]> {
  static tagName = 'tp-file-upload';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpAttachment, TpBadge, TpButton, TpIcon, TpImage, TpProgress];
  }
  static override presentation = fileUploadPresentation;
  static override properties: PropertyDeclarations = {
    ...TpFormElement.properties,
    value: { attribute: false, noAccessor: true },
    defaultValue: { attribute: false },
    multiple: { type: Boolean },
    accept: { attribute: 'accept' },
    maxFiles: { attribute: 'max-files', converter: numberOrNull },
    maxFileSize: { attribute: 'max-file-size', converter: byteSize },
    minFileSize: { attribute: 'min-file-size', converter: byteSize },
    maxTotalSize: { attribute: 'max-total-size', converter: byteSize },
    allowDuplicates: { type: Boolean, attribute: 'allow-duplicates' },
    keepRejected: { attribute: 'keep-rejected', converter: defaultTrue },
    allowDrop: { attribute: 'allow-drop', converter: defaultTrue },
    preventDocumentDrop: { attribute: 'prevent-document-drop', converter: defaultTrue },
    paste: { type: String },
    directory: { type: Boolean },
    capture: { type: String },
    layout: { type: String },
    size: { type: String, reflect: true },
    itemSize: { type: String, attribute: 'item-size' },
    hintTreatment: { type: String, attribute: 'hint-treatment' },
    showItems: { attribute: 'show-items', converter: defaultTrue },
    showPreviews: { attribute: 'show-previews', converter: defaultTrue },
    showTrigger: { type: Boolean, attribute: 'show-trigger' },
    removable: { converter: defaultTrue },
    retryable: { converter: defaultTrue },
    clearable: { type: Boolean },
    fileValidator: { attribute: false },
    getItemDescription: { attribute: false },
    uploader: { attribute: false },
    autoUpload: { attribute: 'auto-upload', converter: defaultTrue },
    uploadConcurrency: { type: Number, attribute: 'upload-concurrency' },
    messages: { attribute: false },
    locale: { type: String },
    _dropTarget: { state: true },
    _dropReject: { state: true },
    _focusVisible: { state: true },
  };
  static override styles = [TpElement.styles, fileUploadStyles];

  /** Files restored on form reset; also the initial value until files are assigned. */
  defaultValue: readonly File[] = [];
  /** Allows several files; without it a new file replaces the current one. */
  multiple = false;
  /** Host accept text, a token list, or a record from media type to extensions. */
  accept: FileAcceptInput = '';
  /** Count limit with `multiple`; `null` is unbounded. */
  maxFiles: number | null = null;
  maxFileSize: number | null = null;
  minFileSize: number | null = null;
  maxTotalSize: number | null = null;
  allowDuplicates = false;
  keepRejected = true;
  allowDrop = true;
  preventDocumentDrop = true;
  /**
   * Clipboard paste scope: `none`, `control` (while focus is in the control or the pointer is
   * over it) or `document` (also pastes elsewhere on the page outside editable fields).
   */
  paste: FileUploadPaste = 'none';
  directory = false;
  capture: FileUploadCapture = '';
  layout: FileUploadLayout = 'stack';
  size: FileUploadSize = 'default';
  itemSize: FileUploadItemSize = 'default';
  hintTreatment: FileUploadHintTreatment = 'text';
  showItems = true;
  showPreviews = true;
  showTrigger = false;
  removable = true;
  retryable = true;
  clearable = false;
  /** Application validation and metadata extraction, run after the built-in checks. */
  fileValidator: FileValidator | undefined;
  /** Replaces the generated item description. */
  getItemDescription: ((item: FileUploadItem) => string) | undefined;
  /** Optional transfer adapter; without it the control never uploads. */
  uploader: FileUploader | undefined;
  autoUpload = true;
  uploadConcurrency = 3;
  /** Partial text overrides; missing entries use `DEFAULT_FILE_UPLOAD_MESSAGES`. */
  messages: Partial<FileUploadMessages> = {};
  /** Formatting locale; defaults to the nearest `lang`. */
  locale: string | undefined;

  protected _dropTarget = false;
  protected _dropReject = false;
  protected _focusVisible = false;

  readonly #store = new FileItemStore({
    create: (file) => (this.ownerDocument.defaultView?.URL ?? URL).createObjectURL(file),
    revoke: (url) => (this.ownerDocument.defaultView?.URL ?? URL).revokeObjectURL(url),
  });
  readonly #queue = new UploadQueue({
    concurrency: () => this.uploadConcurrency,
    run: (id, signal, progress) => this.#runUpload(id, signal, progress),
    started: (id) => this.#uploadStarted(id),
    progressed: (id, percentage) => {
      this.#store.update(id, { progress: percentage });
      this.requestUpdate();
    },
    settled: (id, outcome) => this.#uploadSettled(id, outcome),
  });
  readonly #batches = new Set<Batch>();
  readonly #validations = new Set<AbortController>();
  #chain: Promise<unknown> = Promise.resolve();
  #files: readonly File[] = Object.freeze([]);
  #rejectedKey = '';
  #assigned = false;
  #dragDepth = 0;
  #generation = 0;
  #announcer: LiveAnnouncer | undefined;
  #releaseGuard: (() => void) | undefined;
  #releasePaste: (() => void) | undefined;
  readonly #pasteOwner: PasteOwner = {
    host: this,
    scope: () => this.#pasteScope,
    enabled: () => !this.effectiveDisabled,
    receive: (event, files) => this.#receivePaste(event, files),
  };
  #releaseSlots: (() => void) | undefined;
  #accept: NormalizedAccept = normalizeAccept('');
  #acceptSource: FileAcceptInput = '';

  // ---- Value -------------------------------------------------------------------------------

  /** Accepted files in value order. Assignment replaces them without validation or an event. */
  override get value(): readonly File[] {
    return this.#files;
  }
  override set value(next: readonly File[]) {
    this.#assigned = true;
    this.#replace(Array.from(next ?? []));
    this.#notifyField('programmatic');
  }

  /** The Field value channel. */
  get fieldValue(): readonly File[] {
    return this.#files;
  }

  /** Every item: accepted in value order, then validating, then rejected. */
  get items(): readonly FileUploadItem[] {
    return this.#store.items;
  }

  /** Rejected files currently kept as items. */
  get rejections(): readonly FileRejection[] {
    return this.#store.rejected.map((item) => ({
      file: item.file,
      errors: item.errors,
      relativePath: item.relativePath,
    }));
  }

  /** True while the count limit is reached (multiple selection only). */
  get full(): boolean {
    const max = this.#maxCount;
    return this.multiple && Number.isFinite(max) && this.#files.length >= max;
  }

  /** True while a native transfer carrying files is over the Dropzone. */
  get dropTarget(): boolean {
    return this._dropTarget;
  }

  get #maxCount(): number {
    if (!this.multiple) return 1;
    const max = this.maxFiles;
    return max != null && max > 0 ? Math.floor(max) : Number.POSITIVE_INFINITY;
  }

  get #pending(): boolean {
    return this.#batches.size > 0 || this.#validations.size > 0 || this.#queue.busy;
  }

  get #canPick(): boolean {
    return !this.effectiveDisabled && !this.readOnly && !this.full;
  }

  get #locale(): string | undefined {
    return this.locale || resolveLocale(this) || undefined;
  }

  #normalized(): NormalizedAccept {
    if (this.accept !== this.#acceptSource) {
      this.#acceptSource = this.accept;
      this.#accept = normalizeAccept(this.accept);
    }
    return this.#accept;
  }

  #t(key: keyof FileUploadMessages, params: FileUploadMessageParams = {}): string {
    return formatFileUploadMessage(this.messages, key, params);
  }

  #bytes(value: number | null): string {
    return value == null ? '' : formatBytes(value, this.#locale);
  }

  #typesText(): string {
    const labels = acceptLabels(this.#normalized(), (type) => this.#t('wildcardType', { type }));
    if (!labels.length) return '';
    try {
      return listFormatter(this.#locale, { type: 'disjunction' }).format(labels);
    } catch {
      return labels.join(', ');
    }
  }

  #limitParams(name = ''): FileUploadMessageParams {
    const max = this.#maxCount;
    return {
      name,
      ...(Number.isFinite(max) ? { max } : {}),
      types: this.#typesText(),
      maxSize: this.#bytes(this.maxFileSize),
      minSize: this.#bytes(this.minFileSize),
      maxTotalSize: this.#bytes(this.maxTotalSize),
    };
  }

  #errorText(code: FileErrorCode, file: File): string {
    return this.#t(code, this.#limitParams(file.name));
  }

  // ---- Public actions ----------------------------------------------------------------------

  /** Opens the host picker. Returns false when the control is disabled, read-only or full. */
  openFilePicker(): boolean {
    const input = this.#input;
    if (!input || !this.#canPick) {
      this.diagnose(
        'file-upload-picker-refused',
        'The file picker cannot open while the control is disabled, read-only, full or not rendered.',
        { severity: 'info' },
      );
      return false;
    }
    try {
      input.showPicker();
    } catch {
      input.click();
    }
    return true;
  }

  /** Adds files through the validation pipeline with reason `imperative-action`. */
  addFiles(files: Iterable<File> | ArrayLike<File>): Promise<FileAddResult> {
    return this.#ingest(
      pickerCandidates(Array.from(files)),
      'imperative-action',
      undefined,
      'action',
    );
  }

  /** Removes one item. Accepted files propose a value change; returns whether it was removed. */
  removeFile(target: FileUploadTarget): boolean {
    return this.#remove(target, 'imperative-action', undefined);
  }

  /** Removes every item after one value-change proposal. */
  clearFiles(): boolean {
    return this.#clear('imperative-action', undefined);
  }

  /** Moves an accepted file to the rejected items, as for a server-side rejection. */
  rejectFile(
    target: FileUploadTarget,
    errors: FileValidationError | readonly FileValidationError[],
  ): boolean {
    const item = this.#store.find(target);
    if (!item || !isAcceptedStatus(item.status)) {
      this.diagnose('file-upload-item-not-accepted', 'Only an accepted file can be rejected.');
      return false;
    }
    const list = errorsOf(errors);
    const reasons = list.length
      ? list
      : [{ code: 'file-invalid', message: this.#t('file-invalid') }];
    const rejection: FileRejection = {
      file: item.file,
      errors: reasons,
      relativePath: item.relativePath,
    };
    const previous = this.#files;
    const next = previous.filter((file) => file !== item.file);
    if (
      !this.#propose(next, previous, 'imperative-action', undefined, {
        added: [],
        removed: [item.file],
        rejected: [rejection],
        source: 'action',
      })
    )
      return false;
    this.#queue.cancel(item.id);
    if (this.keepRejected) {
      this.#store.update(item.id, { status: 'rejected', errors: reasons, progress: null });
      this.#store.touch(item.id);
    } else this.#store.remove(item.id);
    this.#changed();
    this.emit('tp-file-reject', { rejections: [rejection], source: 'action' as FileUploadSource });
    this.#announce(
      this.#t('rejected', { count: 1, name: item.file.name, error: reasons[0]!.message }),
    );
    return true;
  }

  /** Updates an accepted item's status, progress, errors, description or metadata. */
  setItemState(target: FileUploadTarget, patch: FileUploadItemPatch): boolean {
    const item = this.#store.find(target);
    if (!item || !isAcceptedStatus(item.status)) {
      this.diagnose('file-upload-item-not-accepted', 'Item state applies to accepted files only.');
      return false;
    }
    const change: Parameters<FileItemStore['update']>[1] = {};
    if (patch.status) {
      if (!isAcceptedStatus(patch.status)) {
        this.diagnose(
          'file-upload-invalid-status',
          `Status "${String(patch.status)}" cannot be set.`,
        );
        return false;
      }
      change.status = patch.status;
      if (patch.status !== 'uploading') change.progress = null;
    }
    if (patch.progress !== undefined)
      change.progress = patch.progress === null ? null : progressPercentage(patch.progress);
    if (patch.errors !== undefined || patch.error !== undefined)
      change.errors = [...errorsOf(patch.errors), ...errorsOf(patch.error)];
    if (patch.description !== undefined) change.description = patch.description;
    if (patch.meta !== undefined) change.meta = { ...item.meta, ...patch.meta };
    this.#store.update(item.id, change);
    this.#changed();
    return true;
  }

  /** Starts queued or failed uploads (one item or all) through the upload adapter. */
  upload(target?: FileUploadTarget): boolean {
    if (!this.uploader) {
      this.diagnose('file-upload-no-uploader', 'upload() needs an uploader adapter.');
      return false;
    }
    const items = target
      ? [this.#store.find(target)].filter((item): item is FileUploadItem => !!item)
      : this.#store.items.filter((item) => item.status === 'queued' || item.status === 'error');
    let started = false;
    for (const item of items) {
      if (!isAcceptedStatus(item.status) || item.status === 'uploading') continue;
      this.#store.update(item.id, { status: 'queued', errors: [], progress: null });
      this.#queue.enqueue(item.id);
      started = true;
    }
    this.#changed();
    return started;
  }

  /** Aborts an upload (one item or all); cancelled items return to queued. */
  cancelUpload(target?: FileUploadTarget): void {
    const ids = target
      ? [this.#store.find(target)?.id].filter((id): id is string => !!id)
      : this.#store.items.map((item) => item.id);
    for (const id of ids) this.#queue.cancel(id);
    this.#changed();
  }

  /** Re-runs type, size, count and custom validation over the value (Foundation `fup-validate`). */
  validate(): ValidationRun {
    const run = new ValidationRun(++this.#generation);
    const controller = new AbortController();
    this.#validations.add(controller);
    this.requestUpdate();
    const items = this.#store.items.filter((item) => isAcceptedStatus(item.status));
    const candidates = items.map((item) => ({
      file: item.file,
      relativePath: item.relativePath,
      directory: false,
    }));
    void selectFiles(candidates, [], this.#limits(), {
      validator: this.fileValidator,
      signal: controller.signal,
      errorText: (code, candidate) => this.#errorText(code, candidate.file),
    })
      .then((result) => {
        if (controller.signal.aborted) return run.cancel();
        const failing = result.decisions
          .map((decision, index) => ({ decision, item: items[index]! }))
          .filter(({ decision, item }) => !decision.accepted && this.#store.get(item.id));
        if (failing.length) {
          const rejections = failing.map(({ decision, item }) => ({
            file: item.file,
            errors: decision.errors,
            relativePath: item.relativePath,
          }));
          const previous = this.#files;
          const removed = new Set(failing.map(({ item }) => item.file));
          const next = previous.filter((file) => !removed.has(file));
          if (
            this.#propose(next, previous, 'imperative-action', undefined, {
              added: [],
              removed: [...removed],
              rejected: rejections,
              source: 'action',
            })
          ) {
            for (const { decision, item } of failing) {
              this.#queue.cancel(item.id);
              if (this.keepRejected) {
                this.#store.update(item.id, {
                  status: 'rejected',
                  errors: decision.errors,
                  progress: null,
                });
                this.#store.touch(item.id);
              } else this.#store.remove(item.id);
            }
            this.emit('tp-file-reject', { rejections, source: 'action' as FileUploadSource });
          }
        }
        for (const [index, decision] of result.decisions.entries())
          if (decision.accepted && this.#store.get(items[index]!.id))
            this.#store.update(items[index]!.id, {
              meta: { ...items[index]!.meta, ...decision.meta },
              ...(decision.description ? { description: decision.description } : {}),
            });
        this.#changed();
        const valid = this.checkValidity();
        run.settle(valid ? 'valid' : 'invalid', [
          {
            identity: this.effectiveName || this.id || 'file-upload',
            status: valid ? 'valid' : 'invalid',
            valid,
            errors: valid ? [] : [this.validationMessage],
          },
        ]);
      })
      .catch(() => run.cancel())
      .finally(() => {
        this.#validations.delete(controller);
        this.requestUpdate();
      });
    return run;
  }

  override activateFromLabel(): void {
    if (this.effectiveDisabled) return;
    this.focus();
    if (this.#canPick) this.openFilePicker();
  }

  protected override focusTarget(): HTMLElement | null {
    return this.#input;
  }

  get #input(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input[type="file"]') ?? null;
  }

  // ---- Pipeline ----------------------------------------------------------------------------

  #limits() {
    return {
      accept: this.#normalized(),
      multiple: this.multiple,
      maxFiles: this.#maxCount,
      maxFileSize: this.maxFileSize,
      minFileSize: this.minFileSize,
      maxTotalSize: this.maxTotalSize,
      allowDuplicates: this.allowDuplicates,
      directory: this.directory,
    };
  }

  #ingest(
    candidates: FileCandidate[],
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    source: FileUploadSource,
  ): Promise<FileAddResult> {
    if (!candidates.length)
      return Promise.resolve({ accepted: [], rejected: [], cancelled: false });
    if (this.effectiveDisabled || this.readOnly || this.full) {
      this.diagnose(
        'file-upload-refused',
        'Files cannot be added while the control is disabled, read-only or full.',
        { severity: 'info' },
      );
      return Promise.resolve(EMPTY_RESULT);
    }
    const batch: Batch = { controller: new AbortController(), ids: [], removed: new Set() };
    for (const candidate of candidates)
      batch.ids.push(
        this.#store.add({
          file: candidate.file,
          relativePath: candidate.relativePath,
          status: 'validating',
        }).id,
      );
    this.#batches.add(batch);
    this.#changed();
    const run = this.#chain.then(() =>
      this.#settle(batch, candidates, reason, sourceEvent, source),
    );
    this.#chain = run.catch(() => undefined);
    return run;
  }

  async #settle(
    batch: Batch,
    candidates: FileCandidate[],
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    source: FileUploadSource,
  ): Promise<FileAddResult> {
    const { signal } = batch.controller;
    let result: SelectionResult;
    try {
      if (signal.aborted) throw signal.reason;
      result = await selectFiles(candidates, this.#files, this.#limits(), {
        validator: this.fileValidator,
        signal,
        errorText: (code, candidate) => this.#errorText(code, candidate.file),
        excluded: (index) => batch.removed.has(index),
      });
    } catch {
      this.#batches.delete(batch);
      for (const id of batch.ids) this.#store.remove(id);
      this.#changed();
      return EMPTY_RESULT;
    }
    this.#batches.delete(batch);
    const decisions = result.decisions;
    const accepted = decisions
      .filter((decision) => decision.accepted)
      .map((decision) => decision.candidate.file);
    const rejected: FileRejection[] = decisions
      .filter((decision) => !decision.accepted && !decision.excluded)
      .map((decision) => ({
        file: decision.candidate.file,
        errors: decision.errors,
        relativePath: decision.candidate.relativePath,
      }));
    const previous = this.#files;
    const replaced = result.replaces ? previous : [];
    let cancelled = false;
    if (accepted.length) {
      const next = result.replaces ? [accepted[0]!] : [...previous, ...accepted];
      cancelled = !this.#propose(next, previous, reason, sourceEvent, {
        added: accepted,
        removed: replaced,
        rejected,
        source,
      });
    }
    const queued: string[] = [];
    for (const [index, decision] of decisions.entries()) {
      const id = batch.ids[index]!;
      if (decision.excluded || !this.#store.get(id)) continue;
      if (decision.accepted) {
        if (cancelled) this.#store.remove(id);
        else {
          this.#store.update(id, {
            status: this.uploader ? 'queued' : 'selected',
            meta: decision.meta,
            description: decision.description,
          });
          this.#store.touch(id);
          queued.push(id);
        }
      } else if (this.keepRejected) {
        this.#store.update(id, {
          status: 'rejected',
          errors: decision.errors,
          meta: decision.meta,
          description: decision.description,
        });
        this.#store.touch(id);
      } else this.#store.remove(id);
    }
    if (!cancelled && replaced.length)
      for (const item of this.#store.items)
        if (replaced.includes(item.file) && !batch.ids.includes(item.id)) {
          this.#queue.cancel(item.id);
          this.#store.remove(item.id);
        }
    this.#changed();
    if (rejected.length) this.emit('tp-file-reject', { rejections: rejected, source });
    const messages: string[] = [];
    if (accepted.length && !cancelled)
      messages.push(this.#t('added', { count: accepted.length, name: accepted[0]!.name }));
    if (rejected.length)
      messages.push(
        this.#t('rejected', {
          count: rejected.length,
          name: rejected[0]!.file.name,
          error: rejected[0]!.errors[0]?.message ?? '',
        }),
      );
    if (messages.length) this.#announce(messages.join('. '));
    if (!cancelled && this.uploader && this.autoUpload)
      for (const id of queued) this.#queue.enqueue(id);
    return { accepted: cancelled ? [] : accepted, rejected, cancelled };
  }

  #propose(
    next: readonly File[],
    previous: readonly File[],
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    metadata: FileUploadChangeMetadata,
    cancelable = true,
  ): boolean {
    const event = new TpValueChangeEvent<readonly File[]>(
      Object.freeze([...next]),
      previous,
      reason,
      sourceEvent,
      { metadata, cancelable },
    );
    return this.dispatchEvent(event) || !cancelable;
  }

  #remove(target: FileUploadTarget, reason: ChangeReason, sourceEvent: Event | undefined): boolean {
    const item = this.#store.find(target);
    if (!item) {
      this.diagnose('file-upload-item-not-found', 'No item matches the removal target.');
      return false;
    }
    if (this.effectiveDisabled || this.readOnly) return false;
    if (item.status === 'validating') {
      for (const batch of this.#batches) {
        const index = batch.ids.indexOf(item.id);
        if (index < 0) continue;
        batch.removed.add(index);
        if (batch.removed.size === batch.ids.length) batch.controller.abort();
      }
    } else if (isAcceptedStatus(item.status)) {
      const previous = this.#files;
      const next = previous.filter((file) => file !== item.file);
      const source: FileUploadSource = reason === 'chip-remove-press' ? 'remove' : 'action';
      if (
        !this.#propose(next, previous, reason, sourceEvent, {
          added: [],
          removed: [item.file],
          rejected: [],
          source,
        })
      )
        return false;
      this.#queue.cancel(item.id);
    }
    const index = this.#store.items.findIndex((entry) => entry.id === item.id);
    const held = this.#holdsFocus(this.#part('file-upload-item', index));
    this.#store.remove(item.id);
    this.#changed();
    if (held) this.#refocus(index);
    this.#announce(this.#t('removed', { name: item.file.name }));
    return true;
  }

  #clear(reason: ChangeReason, sourceEvent: Event | undefined): boolean {
    if (this.effectiveDisabled || this.readOnly) return false;
    const previous = this.#files;
    if (previous.length) {
      const source: FileUploadSource = reason === 'clear' ? 'clear' : 'action';
      if (
        !this.#propose([], previous, reason, sourceEvent, {
          added: [],
          removed: previous,
          rejected: [],
          source,
        })
      )
        return false;
    }
    if (!previous.length && !this.#store.items.length) return true;
    const held =
      this.#holdsFocus(this.#part('file-upload-clear')) ||
      this.#holdsFocus(this.#part('file-upload-items'));
    this.#abortPending();
    this.#store.clear();
    this.#changed();
    if (held) this.#refocus(0);
    this.#announce(this.#t('cleared'));
    return true;
  }

  #part(name: string, index = 0): HTMLElement | null {
    return this.renderRoot?.querySelectorAll<HTMLElement>(`[part~="${name}"]`)[index] ?? null;
  }

  /** Whether keyboard focus is inside a rendered part that the change is about to remove. */
  #holdsFocus(element: HTMLElement | null): boolean {
    return !!element && composedContains(element, deepActiveElement(this.ownerDocument));
  }

  /** Keeps focus in the control once the Button that held it is gone: the Remove Button of the item now at `index`, else the last one, else the input. */
  #refocus(index: number): void {
    void this.updateComplete.then(() => {
      const buttons = [
        ...this.renderRoot.querySelectorAll<HTMLElement>('[part~="file-upload-item-delete"]'),
      ];
      focusAfterRemoval(buttons, index, this.focusTarget());
    });
  }

  #abortPending(): void {
    for (const batch of this.#batches) batch.controller.abort();
    for (const controller of this.#validations) controller.abort();
    this.#queue.cancelAll();
  }

  /** Replaces accepted files without validation (assignment, default value, reset). */
  #replace(files: File[]): void {
    for (const item of this.#store.items)
      if (isAcceptedStatus(item.status)) {
        this.#queue.cancel(item.id);
        this.#store.remove(item.id);
      }
    for (const file of files)
      this.#store.add({ file, status: this.uploader ? 'queued' : 'selected' });
    this.#changed();
  }

  // ---- Uploads -----------------------------------------------------------------------------

  #runUpload(
    id: string,
    signal: AbortSignal,
    progress: (percentage: number | null) => void,
  ): Promise<unknown> {
    const item = this.#store.get(id);
    if (!item || !this.uploader) return Promise.reject(new Error('No uploader'));
    return this.uploader(item, {
      signal,
      onProgress: (loaded, total) => progress(progressPercentage(loaded, total)),
    });
  }

  #uploadStarted(id: string): void {
    const item = this.#store.update(id, { status: 'uploading', progress: null, errors: [] });
    this.#changed();
    if (item) this.emit('tp-upload-start', { item });
  }

  #uploadSettled(id: string, outcome: UploadOutcome): void {
    if (!this.#store.get(id)) return;
    if (outcome.status === 'complete') {
      const item = this.#store.update(id, {
        status: 'complete',
        progress: null,
        response: outcome.response,
      });
      this.#changed();
      if (item) this.emit('tp-upload-complete', { item, response: outcome.response });
    } else if (outcome.status === 'error') {
      const message = errorText(outcome.error) || this.#t('uploadFailed');
      const item = this.#store.update(id, {
        status: 'error',
        progress: null,
        errors: [{ code: 'upload-failed', message }],
      });
      this.#changed();
      if (item) this.emit('tp-upload-error', { item, error: outcome.error });
    } else {
      this.#store.update(id, { status: 'queued', progress: null });
      this.#changed();
    }
  }

  #retry(item: FileUploadItem, sourceEvent: Event): void {
    if (this.effectiveDisabled || this.readOnly) return;
    const proceed = this.emit('tp-file-retry', { item, sourceEvent }, { cancelable: true });
    if (proceed && this.uploader) this.upload(item);
  }

  // ---- State sync --------------------------------------------------------------------------

  #changed(): void {
    const files = this.#store.files;
    const same =
      files.length === this.#files.length &&
      files.every((file, index) => file === this.#files[index]);
    if (!same) this.#files = Object.freeze(files);
    this.#syncForm();
    const rejected = this.keepRejected ? this.#store.rejected.map((item) => item.id).join(' ') : '';
    if (rejected !== this.#rejectedKey) {
      this.#rejectedKey = rejected;
      if (same) this.emit('tp-field-validity', {});
    }
    this.requestUpdate();
  }

  #syncForm(): void {
    const files = this.#files;
    const name = this.effectiveName;
    if (this.effectiveDisabled || !name || !files.length) this.setFormValue(null);
    else if (!this.multiple) this.setFormValue(files[0]!);
    else {
      const data = new FormData();
      for (const file of files) data.append(name, file);
      this.setFormValue(data);
    }
    const anchor = this.#input ?? undefined;
    const rejected = this.keepRejected ? this.#store.rejected[0] : undefined;
    const missing = this.required && !files.length;
    if (rejected)
      this.setValidity(
        { customError: true, ...(missing ? { valueMissing: true } : {}) },
        this.#t('invalidItem', {
          name: rejected.file.name,
          error: rejected.errors[0]?.message ?? '',
        }),
        anchor,
      );
    else this.setRequiredValidity(missing, this.#t('valueMissing'), anchor);
  }

  #notifyField(reason: ChangeReason): void {
    this.emit('tp-field-value', {
      value: this.#files,
      previousValue: this.#files,
      reason,
      sourceEvent: new Event('tp-programmatic-source'),
      cancelled: false,
      allowPropagation: false,
    });
  }

  #announce(message: string): void {
    if (!message || !this.isConnected) return;
    this.#announcer ??= new LiveAnnouncer({ document: () => this.ownerDocument });
    this.#announcer.announce(message, { politeness: 'polite', key: 'tp-file-upload' });
  }

  protected resetFormValue(): void {
    const previous = this.#files;
    this.#abortPending();
    this.#store.clear();
    for (const file of this.defaultValue)
      this.#store.add({ file, status: this.uploader ? 'queued' : 'selected' });
    this.#changed();
    this.#propose(
      this.#files,
      previous,
      'form-reset',
      undefined,
      { added: [...this.#files], removed: [...previous], rejected: [], source: 'reset' },
      false,
    );
  }

  override formStateRestoreCallback(): void {
    // Host file values cannot be restored (Foundation `fup-form`); the value stays empty.
  }

  // ---- Lifecycle ---------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.#assigned && !this.#store.items.length && this.defaultValue.length) {
      this.#assigned = true;
      this.#replace([...this.defaultValue]);
    }
    this.#store.restore();
    this.#syncGuard();
    this.#syncPaste();
    this.#releaseSlots = observeSlots(this, () => this.requestUpdate(), { characterData: true });
  }

  override disconnectedCallback(): void {
    this.#abortPending();
    this.#store.suspend();
    this.#releaseGuard?.();
    this.#releaseGuard = undefined;
    this.#releasePaste?.();
    this.#releasePaste = undefined;
    this.#releaseSlots?.();
    this.#releaseSlots = undefined;
    this.#announcer?.dispose();
    this.#announcer = undefined;
    this.#dragDepth = 0;
    this._dropTarget = false;
    this._dropReject = false;
    super.disconnectedCallback();
  }

  #syncGuard(): void {
    const wanted = this.isConnected && this.preventDocumentDrop && !this.effectiveDisabled;
    if (wanted && !this.#releaseGuard)
      this.#releaseGuard = registerDocumentDropGuard(this.ownerDocument);
    else if (!wanted && this.#releaseGuard) {
      this.#releaseGuard();
      this.#releaseGuard = undefined;
    }
  }

  get #pasteScope(): FileUploadPaste {
    return this.paste === 'control' || this.paste === 'document' ? this.paste : 'none';
  }

  /** Registers with the document paste router while a paste scope is set (Foundation `fup-paste`). */
  #syncPaste(): void {
    const wanted = this.isConnected && this.#pasteScope !== 'none';
    if (wanted && !this.#releasePaste)
      this.#releasePaste = registerPasteOwner(this.ownerDocument, this.#pasteOwner);
    else if (!wanted && this.#releasePaste) {
      this.#releasePaste();
      this.#releasePaste = undefined;
    }
  }

  #receivePaste(event: ClipboardEvent, files: File[]): void {
    event.preventDefault();
    void this.#ingest(pickerCandidates(files), 'input-paste', event, 'paste');
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('showPreviews')) this.#store.previews = this.showPreviews;
    if (
      changed.has('defaultValue') &&
      !this.#assigned &&
      !this.#store.items.length &&
      this.defaultValue.length
    ) {
      this.#assigned = true;
      this.#replace([...this.defaultValue]);
    }
    if (changed.has('uploadConcurrency')) this.#queue.pump();
    if (
      changed.has('required') ||
      changed.has('disabled') ||
      changed.has('name') ||
      changed.has('multiple') ||
      changed.has('keepRejected') ||
      changed.has('messages')
    )
      this.#syncForm();
    for (const key of ['maxFileSize', 'minFileSize', 'maxTotalSize'] as const) {
      const attribute = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      if (changed.has(key) && this.hasAttribute(attribute) && this[key] === null)
        this.diagnose(
          'file-upload-invalid-size',
          `"${this.getAttribute(attribute)}" is not a byte size; ${attribute} is ignored.`,
          { once: true },
        );
    }
  }

  /**
   * Mirrors the accepted files into the native input so its value text ("2 files") stays true
   * (Foundation `fup-picker`); a later pick of a different selection still fires `change`.
   */
  #syncInputFiles(force = false): void {
    const input = this.#input;
    if (!input) return;
    const current = Array.from(input.files ?? []);
    const files = this.#files;
    if (
      !force &&
      current.length === files.length &&
      current.every((file, index) => fileKey(file) === fileKey(files[index]!))
    )
      return;
    const View = this.ownerDocument.defaultView;
    if (!View?.DataTransfer) {
      input.value = '';
      return;
    }
    const transfer = new View.DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncInputFiles();
    this.#syncGuard();
    if (changed.has('paste')) {
      if (this.paste && this.#pasteScope === 'none' && this.paste !== 'none')
        this.diagnose(
          'file-upload-invalid-paste',
          `"${this.paste}" is not a paste scope; use none, control or document.`,
          { once: true },
        );
      this.#syncPaste();
    }
    this.toggleAttribute('data-drop-target', this._dropTarget);
    this.toggleAttribute('data-drop-reject', this._dropTarget && this._dropReject);
    this.toggleAttribute('data-full', this.full);
    this.toggleAttribute('data-filled', this.#files.length > 0);
    this.toggleAttribute('data-pending', this.#pending);
    this.toggleAttribute('data-focus-visible', this._focusVisible);
  }

  // ---- Native input and transfers ----------------------------------------------------------

  #inputChanged = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    const candidates = pickerCandidates(input.files);
    this.#syncInputFiles(true);
    void this.#ingest(candidates, 'input', event, 'picker');
  };

  #inputClicked = (event: MouseEvent): void => {
    if (!this.#canPick) event.preventDefault();
  };

  #pickerCancelled = (event: Event): void => {
    this.emit('tp-picker-cancel', { sourceEvent: event });
  };

  #inputFocus = (event: FocusEvent): void => {
    this._focusVisible = (event.currentTarget as HTMLElement).matches(':focus-visible');
  };

  #inputBlur = (): void => {
    this._focusVisible = false;
  };

  #dropzoneClicked = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    const path = event.composedPath();
    const zone = event.currentTarget as HTMLElement;
    for (const node of path) {
      if (node === zone) break;
      if (!(node instanceof HTMLElement)) continue;
      if (
        node.matches(
          'input, a[href], button, select, textarea, [tabindex]:not([tabindex="-1"]), tp-button:not([inert])',
        )
      )
        return;
    }
    this.openFilePicker();
  };

  #dragEnter = (event: DragEvent): void => {
    if (!this.allowDrop || !transferHasFiles(event.dataTransfer)) return;
    event.preventDefault();
    this.#dragDepth += 1;
    if (this.#dragDepth === 1) {
      const remaining = this.multiple ? this.#maxCount - this.#files.length : 1;
      this._dropTarget = true;
      this._dropReject =
        !this.#canPick || transferRejected(event.dataTransfer, this.#normalized(), remaining);
    }
  };

  #dragOver = (event: DragEvent): void => {
    if (!this.allowDrop || !transferHasFiles(event.dataTransfer)) return;
    event.preventDefault();
    if (event.dataTransfer)
      event.dataTransfer.dropEffect = this.#canPick && !this._dropReject ? 'copy' : 'none';
  };

  #dragLeave = (event: DragEvent): void => {
    if (!this.allowDrop || !transferHasFiles(event.dataTransfer)) return;
    this.#dragDepth = Math.max(0, this.#dragDepth - 1);
    if (!this.#dragDepth) {
      this._dropTarget = false;
      this._dropReject = false;
    }
  };

  #drop = (event: DragEvent): void => {
    if (!this.allowDrop || !transferHasFiles(event.dataTransfer)) return;
    event.preventDefault();
    this.#dragDepth = 0;
    this._dropTarget = false;
    this._dropReject = false;
    if (!this.#canPick || !event.dataTransfer) return;
    const snapshot = snapshotTransfer(event.dataTransfer);
    void collectTransfer(snapshot, { directory: this.directory }).then((candidates) =>
      this.#ingest(candidates, 'drag', event, 'drop'),
    );
  };

  // ---- Rendering ---------------------------------------------------------------------------

  protected override render() {
    const files = this.#files;
    const items = this.#store.items;
    const grid = this.layout === 'grid';
    const full = this.full;
    const max = this.#maxCount;
    const state = Object.freeze({
      size: this.size,
      layout: this.layout,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      invalid: this.effectiveInvalid,
      full,
      dropTarget: this._dropTarget,
      dropReject: this._dropTarget && this._dropReject,
      focusVisible: this._focusVisible,
      filled: files.length > 0,
      pending: this.#pending,
    });
    const part = (name: string, options: Parameters<TpElement['renderPart']>[2]) =>
      this.renderPart(name, state, options);
    const accept = this.#normalized();
    const hintId = 'file-upload-hint';
    const descriptionText = this.#descriptionText();
    const hasDescription =
      (this.hintTreatment === 'text' && !grid && !!descriptionText) ||
      slotOccupied(this, 'description', { text: true });
    const hasHint =
      (this.hintTreatment === 'badges' &&
        !grid &&
        (accept.tokens.length > 0 || this.maxFileSize != null)) ||
      slotOccupied(this, 'hint', { text: true });
    const title = grid
      ? this.#t('add')
      : this._dropTarget
        ? this.#t(this._dropReject ? 'dropReject' : 'dropActive')
        : full
          ? this.#t('full', { max })
          : this.#t(this.multiple ? 'titleMultiple' : 'title');
    const markers = stateMarkers(
      {
        dropTarget: this._dropTarget,
        dropReject: this._dropTarget && this._dropReject,
        disabled: this.effectiveDisabled,
        readOnly: this.readOnly,
        invalid: this.effectiveInvalid,
        full,
        focusVisible: this._focusVisible,
      },
      ['dropTarget', 'dropReject', 'disabled', 'readOnly', 'invalid', 'full', 'focusVisible'],
    );
    const dropzone = part('file-upload-dropzone', {
      properties: {
        class: 'dropzone',
        ...markers,
        '@click': this.#dropzoneClicked,
        '@dragenter': this.#dragEnter,
        '@dragover': this.#dragOver,
        '@dragleave': this.#dragLeave,
        '@drop': this.#drop,
      },
      content: html`${part('file-upload-media', {
          properties: { class: 'media', 'aria-hidden': 'true' },
          content: html`<slot name="media" @slotchange=${this.#slotChanged}
            ><tp-icon
              .icon=${grid ? plusIcon : uploadCloudIcon}
              size="var(--tp-file-upload-icon-size, var(--_tp-file-upload-icon-size))"
            ></tp-icon
          ></slot>`,
        })}${part('file-upload-title', {
          properties: { class: 'title' },
          content: html`<slot name="title" @slotchange=${this.#slotChanged}>${title}</slot>`,
        })}${part('file-upload-description', {
          properties: { class: 'description', id: hintId, hidden: !hasDescription },
          content: html`<slot name="description" @slotchange=${this.#slotChanged}
            >${descriptionText}</slot
          >`,
        })}${part('file-upload-hint', {
          properties: { class: 'hint', hidden: !hasHint },
          content: html`<slot name="hint" @slotchange=${this.#slotChanged}
            >${this.#badges()}</slot
          >`,
        })}${
          this.showTrigger && !grid
            ? part('file-upload-trigger', {
                tag: 'tp-button',
                properties: {
                  class: 'trigger',
                  inert: true,
                  '.variant': 'outline',
                  '.size': 'sm',
                  '.nativeAction': false,
                  '.disabled': this.effectiveDisabled,
                },
                content: this.#t('browse'),
              })
            : nothing
        }<slot @slotchange=${this.#slotChanged}></slot>`,
    });
    const input = part('file-upload-input', {
      tag: 'input',
      properties: {
        class: 'visually-hidden',
        type: 'file',
        '.accept': nativeAccept(accept),
        '.multiple': this.multiple,
        '.webkitdirectory': this.directory,
        capture: this.capture || null,
        '.disabled': this.effectiveDisabled,
        tabindex: full ? '-1' : null,
        'aria-disabled': full || this.readOnly ? 'true' : null,
        'aria-label': this.#accessibleTitle(),
        'aria-describedby': hasDescription ? hintId : null,
        'aria-required': this.required ? 'true' : null,
        '@change': this.#inputChanged,
        '@click': this.#inputClicked,
        '@cancel': this.#pickerCancelled,
        '@focus': this.#inputFocus,
        '@blur': this.#inputBlur,
      },
    });
    const summaryShown =
      (this.multiple && Number.isFinite(max) && (files.length > 0 || grid)) ||
      (this.clearable && items.length > 0) ||
      slotOccupied(this, 'summary', { text: true });
    const summary = part('file-upload-summary', {
      properties: { class: 'summary', hidden: !summaryShown },
      content: html`<span class="count"
          >${
            Number.isFinite(max) && this.multiple
              ? this.#t('countLimited', { count: files.length, max })
              : this.#t('count', { count: files.length })
          }</span
        ><slot name="summary" @slotchange=${this.#slotChanged}></slot>${
          this.clearable && items.length
            ? part('file-upload-clear', {
                tag: 'tp-button',
                properties: {
                  '.variant': 'ghost',
                  '.size': 'sm',
                  '.disabled': this.effectiveDisabled || this.readOnly,
                  '@click': (event: Event) => this.#clear('clear', event),
                },
                content: this.#t('clear'),
              })
            : nothing
        }`,
    });
    const showList = this.showItems && (items.length > 0 || grid);
    const list = part('file-upload-items', {
      tag: 'ul',
      properties: {
        class: 'items',
        role: 'list',
        hidden: !showList,
        'data-layout': this.layout,
        'data-item-size': grid ? 'default' : this.itemSize,
        'aria-busy': this.#pending ? 'true' : null,
      },
      content: html`${this.showItems ? items.map((item) => this.#renderItem(item, grid)) : nothing}${
        grid ? html`<li class="tile" ?hidden=${full}>${dropzone}</li>` : nothing
      }`,
    });
    return part('file-upload', {
      properties: { class: 'root', 'data-layout': this.layout, ...markers },
      content: html`${input}${grid ? html`${summary}${list}` : html`${dropzone}${summary}${list}`}`,
    });
  }

  #slotChanged = (): void => {
    this.requestUpdate();
  };

  #accessibleTitle(): string {
    const slotted = (this.querySelector(':scope > [slot="title"]')?.textContent ?? '').trim();
    return slotted || this.#t(this.multiple ? 'titleMultiple' : 'title');
  }

  #descriptionText(): string {
    const types = this.#typesText();
    const maxSize = this.#bytes(this.maxFileSize);
    if (types && maxSize) return this.#t('hintTypesAndSize', { types, maxSize });
    if (types) return this.#t('hintTypes', { types });
    if (maxSize) return this.#t('hintSize', { maxSize });
    return '';
  }

  #badges() {
    const labels = acceptLabels(this.#normalized(), (type) => this.#t('wildcardType', { type }));
    const maxSize = this.#bytes(this.maxFileSize);
    return html`${labels.length ? html`<span class="hint-label">${this.#t('acceptedTypes')}</span>` : nothing}${labels.map(
      (label) => html`<tp-badge variant="secondary">${label}</tp-badge>`,
    )}${maxSize ? html`<span class="hint-size">${this.#t('maxSize', { maxSize })}</span>` : nothing}`;
  }

  #itemDescription(item: FileUploadItem): string {
    if (this.getItemDescription) {
      try {
        return this.getItemDescription(item);
      } catch {
        this.diagnose(
          'file-upload-description-failed',
          'getItemDescription threw; the generated description is used.',
          { once: true },
        );
      }
    }
    const status: Partial<Record<FileUploadItemStatus, string>> = {
      validating: this.#t('validating'),
      queued: this.#t('queued'),
      uploading: this.#t('uploading'),
      processing: this.#t('processing'),
      complete: this.#t('complete'),
    };
    const folder = item.relativePath.includes('/')
      ? item.relativePath.slice(0, item.relativePath.lastIndexOf('/'))
      : '';
    return [folder, this.#bytes(item.file.size), item.description, status[item.status] ?? '']
      .filter(Boolean)
      .join(' · ');
  }

  #renderItem(item: FileUploadItem, grid: boolean) {
    const name = item.file.name;
    const busy = this.effectiveDisabled || this.readOnly;
    const preview = !!item.previewUrl && this.showPreviews;
    const attachmentStatus = ATTACHMENT_STATUS[item.status];
    const errors = item.errors.map((error) => error.message).join(' ');
    const itemState = Object.freeze({
      status: item.status,
      rejected: item.rejected,
      size: this.size,
    });
    return this.renderPart('file-upload-item', itemState, {
      tag: 'li',
      properties: {
        class: 'item',
        'data-status': item.status,
        'data-rejected': item.rejected,
        'data-id': item.id,
      },
      content: html`<tp-attachment
        .filename=${name}
        .size=${grid ? 'default' : this.itemSize}
        .orientation=${grid ? 'vertical' : 'horizontal'}
        .status=${attachmentStatus}
        .mediaTreatment=${preview ? 'image' : 'mark'}
        .description=${attachmentStatus === 'error' ? '' : this.#itemDescription(item)}
        .errorMessage=${errors}
        .disabled=${this.effectiveDisabled}
      >
        ${
          preview
            ? this.renderPart('file-upload-item-preview', itemState, {
                tag: 'tp-image',
                properties: {
                  slot: 'media',
                  class: 'preview',
                  '.src': item.previewUrl,
                  '.alt': '',
                  '.fit': 'cover',
                  '.placeholder': 'none',
                  '.loading': 'eager',
                },
              })
            : html`<tp-icon
                slot="media"
                aria-hidden="true"
                .icon=${previewable(item.file) ? imageIcon : fileTextIcon}
              ></tp-icon>`
        }
        ${
          item.status === 'uploading'
            ? this.renderPart('file-upload-item-progress', itemState, {
                tag: 'tp-progress',
                properties: {
                  class: 'progress',
                  '.value': item.progress,
                  '.label': this.#t('progress', { name }),
                },
              })
            : nothing
        }
        ${
          item.status === 'error' && this.retryable && this.uploader && !this.readOnly
            ? this.renderPart('file-upload-item-retry', itemState, {
                tag: 'tp-button',
                properties: {
                  slot: 'actions',
                  '.variant': 'ghost',
                  '.size': 'icon-xs',
                  '.icon': refreshIcon,
                  '.disabled': busy,
                  '.ariaLabel': this.#t('retry', { name }),
                  '@click': (event: Event) => this.#retry(item, event),
                },
              })
            : nothing
        }
        ${
          this.removable && !this.readOnly
            ? this.renderPart('file-upload-item-delete', itemState, {
                tag: 'tp-button',
                properties: {
                  slot: 'actions',
                  '.variant': 'ghost',
                  '.size': 'icon-xs',
                  '.icon': xIcon,
                  '.disabled': this.effectiveDisabled,
                  '.ariaLabel': this.#t('remove', { name }),
                  '@click': (event: Event) => this.#remove(item.id, 'chip-remove-press', event),
                },
              })
            : nothing
        }
      </tp-attachment>`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-file-upload': TpFileUpload;
  }
}
