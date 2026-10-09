import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { downloadIcon } from '../../../icons/download.js';
import { fileTextIcon } from '../../../icons/file-text.js';
import { plusIcon } from '../../../icons/plus.js';
import { emptyStateIcons } from '../../../icons/empty-state.js';
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

interface Upload {
  id: number;
  filename: string;
  size: number;
  kind: string;
  status: 'uploading' | 'complete';
  progress: number;
}

const initialUploads: readonly Upload[] = [
  {
    id: 1,
    filename: 'Pilot onboarding walkthrough.mp4',
    size: 48_200_000,
    kind: 'Video',
    status: 'uploading',
    progress: 46,
  },
  {
    id: 2,
    filename: 'Launch brief.md',
    size: 4_820,
    kind: 'Markdown',
    status: 'complete',
    progress: 100,
  },
  {
    id: 3,
    filename: 'Release checklist.csv',
    size: 1_640,
    kind: 'Spreadsheet',
    status: 'complete',
    progress: 100,
  },
  {
    id: 4,
    filename: 'Research synthesis.pdf',
    size: 2_380_000,
    kind: 'PDF',
    status: 'complete',
    progress: 100,
  },
];

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

const bytes = (size: number) =>
  size >= 1_000_000
    ? `${(size / 1_000_000).toFixed(1)} MB`
    : size >= 1_000
      ? `${Math.round(size / 1_000)} KB`
      : `${size} B`;

/** Advances simulated uploads until they complete; cleared when the workspace disconnects. */
function simulateUploads(host: WorkspaceHost) {
  host.retain('files.uploads', () => {
    const timer = setInterval(() => {
      const uploads = host.view<readonly Upload[]>('files.uploads', initialUploads);
      if (!uploads.some((upload) => upload.status === 'uploading')) return;
      const next = uploads.map((upload) => {
        if (upload.status !== 'uploading') return upload;
        const progress = Math.min(100, upload.progress + 6);
        if (progress === 100) host.notify(`${upload.filename} uploaded`);
        return {
          ...upload,
          progress,
          status: progress === 100 ? ('complete' as const) : upload.status,
        };
      });
      host.setView('files.uploads', next);
    }, 700);
    return () => clearInterval(timer);
  });
}

const embedSnippet = `<tp-media-player content-title="Atlas launch teaser">
  <video src="https://cdn.studio.example/atlas/teaser.mp4" playsinline preload="metadata">
    <track kind="captions" srclang="en" label="English" src="teaser.en.vtt" default>
  </video>
  <tp-media-video-layout></tp-media-video-layout>
</tp-media-player>
<script type="module" src="https://cdn.studio.example/atlas/player.js"></script>`;

export function renderFiles(host: WorkspaceHost): TemplateResult {
  simulateUploads(host);
  const uploads = host.view<readonly Upload[]>('files.uploads', initialUploads);
  const browse = () => host.querySelector<HTMLInputElement>('#files-upload')?.click();
  const add = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []).map((file, index) => ({
      id: Date.now() + index,
      filename: file.name,
      size: file.size,
      kind: file.type || 'File',
      status: 'uploading' as const,
      progress: 0,
    }));
    input.value = '';
    if (picked.length) host.setView('files.uploads', [...picked, ...uploads]);
  };
  const uploading = uploads.filter((upload) => upload.status === 'uploading').length;

  return html`<div class="workspace-stack-lg">
    <div class="workspace-row workspace-between">
      <div class="workspace-stack">
        <h2>Files &amp; media</h2>
        <p class="workspace-muted">Launch assets, references and deliverables in one place.</p>
      </div>
      <tp-button variant="outline" @click=${browse}
        ><tp-icon slot="icon-start" .icon=${plusIcon}></tp-icon>Add files</tp-button
      >
      <input hidden id="files-upload" type="file" multiple @change=${add} />
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
          <p slot="description">
            ${uploading ? `${uploading} uploading · ` : ''}${uploads.length} files in this project
          </p>
          <div class="workspace-stack">
            <tp-empty-state
              class="files-dropzone"
              media-treatment="icon"
              title="Drop files to upload"
              description="Images, video, PDF or Markdown up to 200 MB."
            >
              <tp-icon slot="media" .icon=${emptyStateIcons.cloud}></tp-icon>
              <tp-button slot="actions" variant="outline" size="sm" @click=${browse}
                >Browse files</tp-button
              >
            </tp-empty-state>
            ${repeat(
              uploads,
              (upload) => upload.id,
              (upload) =>
                upload.status === 'uploading'
                  ? html`<tp-attachment .filename=${upload.filename} status="uploading">
                      <div slot="description" class="files-progress">
                        <tp-progress
                          .label=${`Uploading ${upload.filename}`}
                          .value=${upload.progress}
                        ></tp-progress>
                        <span class="workspace-muted workspace-small"
                          >${upload.progress}% of ${bytes(upload.size)}</span
                        >
                      </div>
                      <tp-button
                        slot="actions"
                        variant="ghost"
                        size="sm"
                        @click=${() => {
                          host.setView(
                            'files.uploads',
                            uploads.filter((entry) => entry.id !== upload.id),
                          );
                          host.notify(`Upload of ${upload.filename} cancelled`);
                        }}
                        >Cancel</tp-button
                      >
                    </tp-attachment>`
                  : html`<tp-attachment
                      .filename=${upload.filename}
                      .description=${`${upload.kind} · ${bytes(upload.size)}`}
                      status="complete"
                      removable
                      @tp-remove=${(e: CustomEvent) => {
                        if (e.defaultPrevented) return;
                        host.setView(
                          'files.uploads',
                          uploads.filter((entry) => entry.id !== upload.id),
                        );
                        host.notify(`${upload.filename} removed`);
                      }}
                    >
                      <tp-icon slot="media" .icon=${fileTextIcon}></tp-icon>
                      <tp-tooltip slot="actions">
                        <tp-button
                          slot="trigger"
                          variant="ghost"
                          size="icon-sm"
                          .ariaLabel=${`Download ${upload.filename}`}
                          .icon=${downloadIcon}
                          @click=${() => host.notify(`Downloading ${upload.filename}`)}
                        ></tp-button>
                        Download
                      </tp-tooltip>
                    </tp-attachment>`,
            )}
            ${uploads.length ? nothing : html`<p class="workspace-muted workspace-small">No files yet.</p>`}
          </div>
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
