import { html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { plusIcon } from '../../../icons/plus.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import type {
  FileUploadItem,
  FileUploader,
  TpFileUpload,
} from '../../../components/file-upload/index.js';
import {
  sampleCaptionsEn,
  sampleCaptionsEs,
  sampleChapters,
  samplePoster,
  sampleThumbnails,
  sampleVideo,
} from '../../media.js';
import type { WorkspaceHost } from '../host.js';
import './files.css';

/** Sample project files, small enough to allocate in the browser. */
let samples: File[] | undefined;
const initialFiles = (): File[] =>
  (samples ??= [
    new File(['# Launch brief\n'.repeat(300)], 'Launch brief.md', {
      type: 'text/markdown',
      lastModified: 1,
    }),
    new File(['item,owner,done\n'.repeat(100)], 'Release checklist.csv', {
      type: 'text/csv',
      lastModified: 2,
    }),
    new File([new Uint8Array(2_380_000)], 'Research synthesis.pdf', {
      type: 'application/pdf',
      lastModified: 3,
    }),
  ]);

/** Simulated transfer: progress over a few seconds; the component owns the queue and abort. */
const demoUploader: FileUploader = (item, { signal, onProgress }) =>
  new Promise((resolve, reject) => {
    let loaded = 0;
    const total = Math.max(item.file.size, 1);
    const timer = setInterval(() => {
      loaded = Math.min(total, loaded + total / 12);
      onProgress(loaded, total);
      if (loaded >= total) {
        clearInterval(timer);
        resolve({ url: `https://files.example.com/${encodeURIComponent(item.file.name)}` });
      }
    }, 400);
    signal.addEventListener('abort', () => {
      clearInterval(timer);
      reject(signal.reason);
    });
  });

/** Files restored from the workspace view are already uploaded. */
const restored = new WeakSet<TpFileUpload>();
function markUploaded(element: Element | undefined) {
  const upload = element as TpFileUpload | undefined;
  if (!upload || restored.has(upload)) return;
  restored.add(upload);
  void upload.updateComplete.then(() => {
    for (const item of upload.items)
      if (item.status === 'queued') upload.setItemState(item, { status: 'complete' });
  });
}

const directions = [
  ['Make room for better work.', '01 / Clarity', 'primary'],
  ['Good work happens together.', '02 / Collaboration', 'muted'],
  ['Less friction. More momentum.', '03 / Focus', 'dark'],
] as const;

const stills = [
  ['Hero still · 16:9', 'Exported 2 h ago'],
  ['Social cut · 1:1', 'Exported yesterday'],
  ['Store listing · 4:3', 'Exported Oct 2'],
] as const;

const embedSnippet = `<tp-media-player content-title="Atlas launch teaser">
  <video src="https://cdn.studio.example/atlas/teaser.mp4" playsinline preload="metadata">
    <track kind="captions" srclang="en" label="English" src="teaser.en.vtt" default>
  </video>
  <tp-media-video-layout></tp-media-video-layout>
</tp-media-player>
<script type="module" src="https://cdn.studio.example/atlas/player.js"></script>`;

export function renderFiles(host: WorkspaceHost): TemplateResult {
  const files = host.view<readonly File[]>('files.uploads', initialFiles());
  const browse = () => host.querySelector<TpFileUpload>('#files-upload')?.openFilePicker();

  return html`<div class="workspace-stack-lg">
    <div class="workspace-row workspace-between">
      <div class="workspace-stack">
        <h2>Files &amp; media</h2>
        <p class="workspace-muted">Launch assets, references and deliverables in one place.</p>
      </div>
      <tp-button variant="outline" @click=${browse}
        ><tp-icon slot="icon-start" .icon=${plusIcon}></tp-icon>Add files</tp-button
      >
    </div>

    <div class="workspace-columns">
      <div class="workspace-stack-lg">
        <tp-card>
          <h2 slot="header">Launch teaser</h2>
          <p slot="description">Final cut for the pilot announcement · 0:30</p>
          <tp-badge slot="action" variant="secondary">Approved</tp-badge>
          <tp-media-player content-title="Atlas launch teaser" poster=${samplePoster}>
            <video
              src=${sampleVideo}
              width="1280"
              height="720"
              preload="metadata"
              playsinline
              crossorigin="anonymous"
            >
              <track kind="captions" srclang="en" label="English" src=${sampleCaptionsEn} />
              <track kind="captions" srclang="es" label="Español" src=${sampleCaptionsEs} />
              <track kind="chapters" srclang="en" src=${sampleChapters} />
              <track kind="metadata" label="thumbnails" src=${sampleThumbnails} />
            </video>
            <tp-media-video-layout></tp-media-video-layout>
          </tp-media-player>
          <div slot="footer" class="workspace-row workspace-between files-footer">
            <span class="workspace-muted workspace-small">Captions in English and Spanish</span>
            <tp-button
              variant="outline"
              size="sm"
              @click=${() => host.notify('Share link copied to the clipboard')}
              >Copy share link</tp-button
            >
          </div>
        </tp-card>

        <tp-card>
          <h2 slot="header">Creative directions</h2>
          <p slot="description">Three campaign routes for the pilot.</p>
          <tp-carousel label="Campaign directions">
            ${directions.map(
              ([title, subtitle, tone]) =>
                html`<tp-aspect-ratio .ratio=${16 / 9}>
                  <div class="files-art" data-tone=${tone}>
                    <span class="workspace-small">ATLAS / STUDIO NORTH</span>
                    <strong>${title}</strong>
                    <span>${subtitle}</span>
                  </div>
                </tp-aspect-ratio>`,
            )}
          </tp-carousel>
        </tp-card>
      </div>

      <div class="workspace-stack-lg">
        <tp-card>
          <h2 slot="header">Uploads</h2>
          <p slot="description">${files.length} files in this project</p>
          <tp-file-upload
            id="files-upload"
            name="files"
            multiple
            size="sm"
            show-trigger
            accept="image/*,video/*,application/pdf,.md,.csv"
            max-file-size="200MB"
            paste="document"
            .defaultValue=${files}
            .uploader=${demoUploader}
            ${ref(markUploaded)}
            @tp-value-change=${(event: TpValueChangeEvent<readonly File[]>) =>
              queueMicrotask(() => {
                if (!event.defaultPrevented) host.setView('files.uploads', event.detail.value);
              })}
            @tp-upload-complete=${(event: CustomEvent<{ item: FileUploadItem }>) =>
              host.notify(`${event.detail.item.file.name} uploaded`)}
          >
            <span slot="title">Drop files to upload</span>
          </tp-file-upload>
        </tp-card>

        <tp-card>
          <h2 slot="header">Exported stills</h2>
          <p slot="description">Frames pulled from the teaser for social and store pages.</p>
          <tp-attachment-group aria-label="Exported stills">
            ${stills.map(
              ([filename, description]) =>
                html`<tp-attachment
                  orientation="vertical"
                  media-treatment="image"
                  size="sm"
                  .filename=${filename}
                  .description=${description}
                  status="complete"
                >
                  <img slot="media" src=${samplePoster} alt="" />
                </tp-attachment>`,
            )}
          </tp-attachment-group>
        </tp-card>

        <tp-card>
          <h2 slot="header">Embed the teaser</h2>
          <p slot="description">Paste into a pilot partner's page.</p>
          <tp-code-block
            language="html"
            label="embed.html"
            line-numbers
            highlight-lines="3-4"
            .code=${embedSnippet}
          ></tp-code-block>
        </tp-card>
      </div>
    </div>
  </div>`;
}
