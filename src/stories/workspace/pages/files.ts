import { html, nothing, type TemplateResult } from 'lit';
import { plusIcon } from '../../../icons/plus.js';
import { eyeIcon } from '../../../icons/eye.js';
import { eyeOffIcon } from '../../../icons/eye-off.js';
import { fileTextIcon } from '../../../icons/file-text.js';
import { folderIcon } from '../../../icons/folder.js';
import { imageIcon } from '../../../icons/image.js';
import { lockIcon } from '../../../icons/lock.js';
import { squareIcon } from '../../../icons/square.js';
import { navigationIcons } from '../../../icons/navigation.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import type { Layer, LayerState } from '../../../widgets/layers/types.js';
import type { TpLayers } from '../../../widgets/layers/layers.js';
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
import type { PageView, WorkspaceHost } from '../host.js';
import './files.css';

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

/** Campaign routes; each previews the headline motion it proposes. */
const directions = [
  ['Make room for better work.', '01 / Clarity', 'primary', 'split'],
  ['Good work happens together.', '02 / Collaboration', 'muted', 'mirror'],
  ['Less friction. More momentum.', '03 / Focus', 'dark', 'stroke'],
] as const;
type Motion = (typeof directions)[number][3];
/** A direction's headline with its motion; it replays each time its slide comes into view. */
const headline = (text: string, motion: Motion) =>
  motion === 'split'
    ? html`<tp-mo-text-split split="words" mask="words" reveal="up" reveal-repeat
        >${text}</tp-mo-text-split
      >`
    : motion === 'mirror'
      ? html`<tp-mo-text-mirror reveal-repeat>${text}</tp-mo-text-mirror>`
      : html`<tp-mo-text-stroke split="chars" stagger="35" reveal-repeat
          >${text}</tp-mo-text-stroke
        >`;
/** One direction per view on narrow screens; wider, the next one peeks in. */
const directionsLayout = {
  layout: { itemsPerView: 1, gap: 16 },
  breakpoints: { 720: { layout: { itemsPerView: 1.6, gap: 16 } } },
};
const motionLabel: Record<Motion, string> = {
  split: 'Words rise into place',
  mirror: 'Halves slide together',
  stroke: 'Letters draw, then fill',
};

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

/** The project's folders; the tree selects one and opens the README. */
interface Folder {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
  readonly file?: boolean;
  readonly children?: readonly Folder[];
}
const folders: readonly Folder[] = [
  {
    value: 'atlas',
    label: 'Atlas launch',
    children: [
      {
        value: 'brand',
        label: 'Brand',
        children: [
          { value: 'brand/logos', label: 'Logos', count: 8 },
          { value: 'brand/type', label: 'Typography', count: 3 },
        ],
      },
      {
        value: 'campaign',
        label: 'Campaign',
        children: [
          { value: 'campaign/directions', label: 'Directions', count: 3 },
          { value: 'campaign/cuts', label: 'Teaser cuts', count: 5 },
          { value: 'campaign/stills', label: 'Stills', count: 12 },
        ],
      },
      {
        value: 'mockups',
        label: 'Mockups',
        children: [
          { value: 'mockups/landing', label: 'Landing page', count: 4 },
          { value: 'mockups/store', label: 'Store listing', count: 2 },
        ],
      },
      {
        value: 'research',
        label: 'Research',
        children: [
          { value: 'research/interviews', label: 'Interviews', count: 12 },
          { value: 'research/audit', label: 'Audit notes', count: 6 },
        ],
      },
      { value: 'readme', label: 'README.md', file: true },
    ],
  },
];

/** What a folder holds: generated names, owners, ages and sizes, stable per folder. */
interface FolderFile {
  readonly name: string;
  readonly owner: string;
  readonly days: number;
  readonly size: number;
}
const folderNames: Record<string, (index: number) => string> = {
  'brand/logos': (i) =>
    `atlas-logo-${['mark', 'wordmark', 'lockup', 'mono'][i % 4]}${i < 4 ? '' : '-dark'}.svg`,
  'brand/type': (i) => ['Type scale.pdf', 'Heading specimens.png', 'Licenses.md'][i]!,
  'campaign/directions': (i) => `Direction 0${i + 1}.key`,
  'campaign/cuts': (i) => `Teaser cut ${['A', 'B', 'C', 'D', 'final'][i]}.mp4`,
  'campaign/stills': (i) =>
    `still-${String(i + 1).padStart(2, '0')}-${['16x9', '1x1', '4x3'][i % 3]}.png`,
  'mockups/landing': (i) => `Landing v${i + 1}${i === 3 ? '' : ' draft'}.fig`,
  'mockups/store': (i) => `Store listing ${['iOS', 'Android'][i]}.fig`,
  'research/interviews': (i) => `Interview ${String(i + 1).padStart(2, '0')} notes.md`,
  'research/audit': (i) =>
    `Audit ${['checkout', 'onboarding', 'settings', 'board', 'files', 'summary'][i]}.md`,
};
const owners = ['Mara Quist', 'Ines Duarte', 'Theo Brandt', 'Ravi Nair'];
const folderList = (folders: readonly Folder[]): Folder[] =>
  folders.flatMap((folder) => [folder, ...folderList(folder.children ?? [])]);
function folderFiles(folder: Folder): FolderFile[] {
  const name = folderNames[folder.value];
  return Array.from({ length: folder.count ?? 0 }, (_, index) => ({
    name: name?.(index) ?? `File ${index + 1}`,
    owner: owners[(index + folder.value.length) % owners.length]!,
    days: (index * 3 + folder.value.length) % 20,
    size: ((Math.imul(index + 1, 2654435761) >>> 0) % 4_800_000) + 48_000,
  }));
}
const sizeText = (bytes: number) =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000 - 3_600_000);

const folderItem = (folder: Folder): TemplateResult =>
  html`<tp-tree-item value=${folder.value}
    ><tp-icon slot="leading" .icon=${folder.file ? fileTextIcon : folderIcon}></tp-icon
    >${folder.label}${
      folder.count === undefined
        ? nothing
        : html`<span slot="trailing" class="workspace-muted workspace-small">${folder.count}</span>`
    }${folder.children?.map(folderItem) ?? nothing}</tp-tree-item
  >`;

const readme = [
  '# Atlas launch',
  '',
  'Shared files for the Atlas pilot launch. Everything here is the latest approved version unless its name ends in `draft`.',
  '',
  '## Folders',
  '',
  '| Folder | Owner | What lives here |',
  '| :--- | :--- | :--- |',
  '| Brand | Ines | Logos, type and color tokens |',
  '| Campaign | Mara | Directions, teaser cuts and stills |',
  '| Mockups | Theo | Landing page and store listing designs |',
  '| Research | Ravi | Pilot interviews and audit notes |',
  '',
  '## Before you upload',
  '',
  '- [x] Export stills at 2x and name them `surface-ratio.png`',
  '- [x] Add captions to every video',
  '- [ ] Move superseded cuts to *Campaign / Archive*',
  '',
  '> [!NOTE]',
  '> Share links open read-only. Ask Mara for edit access to Campaign.',
  '',
].join('\n');

/** Scouting photos from the library's sample images; the last source is missing on purpose. */
const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=640&q=75&auto=format&fit=crop`;
const locations = [
  ['1497366754035-f200968a6e72', 'Lisbon office, open floor', 'skeleton'],
  ['1497215728101-856f4ea42174', 'Oslo studio, window desks', 'spinner'],
  ['1548516173-3cabfa4607e9', 'Toronto rooftop terrace', 'skeleton'],
  ['0000000000000-000000000000', 'Berlin loft, not uploaded yet', 'skeleton'],
] as const;

const shareLink = 'https://atlas.example/s/launch-files-7Qm2';

/** Layers of the landing page mockup; the preview hides what the stack hides. */
const visibility = (visible = true): LayerState => ({
  name: 'visibility',
  label: 'Visibility',
  value: visible ? 'visible' : 'hidden',
  values: [
    { value: 'visible', icon: eyeIcon },
    { value: 'hidden', icon: eyeOffIcon, dims: true },
  ],
});
const lock = (locked = false): LayerState => ({
  name: 'locked',
  label: 'Lock',
  value: locked ? 'locked' : 'unlocked',
  values: [{ value: 'locked', icon: lockIcon }, { value: 'unlocked' }],
});
const mockupLayers: readonly Layer[] = [
  { id: 'mockup-logo', label: 'Logo', icon: imageIcon, states: [lock(), visibility()] },
  {
    id: 'mockup-hero',
    label: 'Hero',
    icon: folderIcon,
    states: [lock(), visibility()],
    children: [
      {
        id: 'mockup-headline',
        label: 'Headline',
        icon: fileTextIcon,
        states: [lock(), visibility()],
      },
      {
        id: 'mockup-subhead',
        label: 'Subhead',
        icon: fileTextIcon,
        states: [lock(), visibility()],
      },
      { id: 'mockup-cta', label: 'Join button', icon: squareIcon, states: [lock(), visibility()] },
      { id: 'mockup-photo', label: 'Hero photo', icon: imageIcon, states: [lock(), visibility()] },
    ],
  },
  {
    id: 'mockup-background',
    label: 'Background',
    icon: squareIcon,
    states: [lock(true), visibility()],
  },
];
/** Ids of the layers hidden by their own visibility or by a group around them. */
function hiddenLayers(layers: readonly Layer[], hidden = new Set<string>(), parentHidden = false) {
  for (const layer of layers) {
    const off =
      parentHidden ||
      layer.states?.find((state) => state.name === 'visibility')?.value === 'hidden';
    if (off) hidden.add(layer.id);
    if (layer.children) hiddenLayers(layer.children, hidden, off);
  }
  return hidden;
}

type FilesTab = 'files' | 'media' | 'campaign';

/** The selected folder's files, the README when it is selected, and a drop zone for uploads. */
function renderFolder(host: WorkspaceHost, value: string) {
  if (value === 'readme')
    return html`<tp-card id="files-readme">
      <h2 slot="header">README.md</h2>
      <p slot="description">Atlas launch · updated by Mara</p>
      <tp-markdown
        size="sm"
        heading-offset="2"
        id-prefix="files-readme-"
        .source=${readme}
      ></tp-markdown>
    </tp-card>`;
  const all = folderList(folders);
  const folder = all.find((entry) => entry.value === value) ?? all[0]!;
  const parent = all.find((entry) => entry.children?.includes(folder));
  const files = folderFiles(folder);
  return html`<tp-card>
    <h2 slot="header">${folder.label}</h2>
    <p slot="description">
      ${parent && parent.value !== 'atlas' ? `${parent.label} · ` : ''}${files.length} files
    </p>
    ${
      files.length
        ? html`<tp-table class="files-table" label=${`Files in ${folder.label}`} sticky-header>
            <tp-table-header>
              <tp-table-row>
                <tp-table-head scope="col">Name</tp-table-head>
                <tp-table-head scope="col">Owner</tp-table-head>
                <tp-table-head scope="col">Modified</tp-table-head>
                <tp-table-head scope="col" class="files-number">Size</tp-table-head>
              </tp-table-row>
            </tp-table-header>
            <tp-table-body>
              ${files.map(
                (file) =>
                  html`<tp-table-row>
                    <tp-table-cell>${file.name}</tp-table-cell>
                    <tp-table-cell>${file.owner}</tp-table-cell>
                    <tp-table-cell
                      ><tp-time mode="relative" .datetime=${daysAgo(file.days)}></tp-time
                    ></tp-table-cell>
                    <tp-table-cell class="files-number">${sizeText(file.size)}</tp-table-cell>
                  </tp-table-row>`,
              )}
            </tp-table-body>
          </tp-table>`
        : html`<tp-empty-state title="Choose a folder" description="Its files show here.">
            <tp-icon slot="media" .icon=${folderIcon}></tp-icon>
          </tp-empty-state>`
    }
    <tp-file-upload
      slot="footer"
      class="files-drop"
      id="files-upload"
      name="files"
      multiple
      size="sm"
      accept="image/*,video/*,application/pdf,.md,.csv"
      max-file-size="200MB"
      paste="document"
      .uploader=${demoUploader}
      @tp-upload-complete=${(event: CustomEvent<{ item: FileUploadItem }>) =>
        host.notify(`${event.detail.item.file.name} uploaded to ${folder.label}`, {
          type: 'success',
        })}
    >
      <span slot="title">Drop files into ${folder.label}</span>
    </tp-file-upload>
  </tp-card>`;
}

function renderMedia(host: WorkspaceHost) {
  return html`<div class="workspace-columns">
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
          <tp-popover label="Embed the teaser" placement="block-start end">
            <tp-button slot="trigger" variant="outline" size="sm">Embed</tp-button>
            <span slot="title">Embed the teaser</span>
            <span slot="description">Paste into a pilot partner's page.</span>
            <tp-code-block
              class="files-embed"
              language="html"
              label="embed.html"
              line-numbers
              highlight-lines="3-4"
              .code=${embedSnippet}
            ></tp-code-block>
          </tp-popover>
        </div>
      </tp-card>
      <tp-card>
        <h2 slot="header">Exported stills</h2>
        <p slot="description">Frames pulled from the teaser for social and store pages.</p>
        <tp-attachment-group aria-label="Exported stills">
          ${stills.map(
            ([filename, description]) =>
              html`<tp-attachment
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
        <tp-button
          slot="footer"
          variant="outline"
          @click=${() => host.setView('files.folder', 'campaign/stills')}
          >Open the Stills folder</tp-button
        >
      </tp-card>
    </div>
    <tp-card>
      <h2 slot="header">Location scouting</h2>
      <p slot="description">Photos for the launch shoot in each pilot city.</p>
      <div class="files-gallery">
        ${locations.map(
          ([id, caption, placeholder]) =>
            html`<figure class="files-photo">
              <tp-image
                .ratio=${4 / 3}
                placeholder=${placeholder}
                zoom="in"
                src=${photo(id)}
                alt=${caption}
              ></tp-image>
              <figcaption class="workspace-muted workspace-small">${caption}</figcaption>
            </figure>`,
        )}
      </div>
    </tp-card>`;
}

/** Benefits on the landing page, revealed as the preview scrolls to them. */
const benefits = [
  ['One place for the plan', 'Tasks, files and decisions stay together.'],
  ['Ready in ten minutes', 'Import a plan and invite the team in one step.'],
  ['Made for keyboards', 'Every action has a shortcut and a focus ring.'],
] as const;

function renderCampaign(host: WorkspaceHost) {
  const layers = host.view<readonly Layer[]>('files.layers', mockupLayers);
  const hidden = hiddenLayers(layers);
  const layerHidden = (id: string) => hidden.has(id) || undefined;
  return html`<tp-card>
      <h2 slot="header">Creative directions</h2>
      <p slot="description">Three routes for the pilot, each with its headline motion.</p>
      <tp-carousel label="Campaign directions" .options=${directionsLayout}>
        ${directions.map(
          ([title, subtitle, tone, motion]) =>
            html`<tp-aspect-ratio .ratio=${16 / 9}>
              <div class="files-art" data-tone=${tone}>
                <span class="workspace-small">ATLAS / STUDIO NORTH</span>
                <strong>${headline(title, motion)}</strong>
                <span>${subtitle} · ${motionLabel[motion]}</span>
              </div>
            </tp-aspect-ratio>`,
        )}
      </tp-carousel>
    </tp-card>

    <tp-card>
      <h2 slot="header">Landing page</h2>
      <p slot="description">Mockups / Landing page · version 4 · scroll the preview</p>
      <tp-badge slot="action" variant="outline">In review</tp-badge>
      <div class="files-mockup">
        <div class="files-mockup-frame">
          <tp-cursor scope="region"></tp-cursor>
          <tp-scroll-area class="files-mockup-scroll" aria-label="Landing page preview">
            <div class="files-mockup-page">
              <div
                class="files-mockup-background"
                ?data-layer-hidden=${layerHidden('mockup-background')}
              ></div>
              <span class="files-mockup-logo" ?data-layer-hidden=${layerHidden('mockup-logo')}
                >ATLAS</span
              >
              <div class="files-mockup-hero">
                <div class="workspace-stack">
                  <strong ?data-layer-hidden=${layerHidden('mockup-headline')}
                    >Make room for better work.</strong
                  >
                  <span class="workspace-muted" ?data-layer-hidden=${layerHidden('mockup-subhead')}
                    >Plans, files and conversations in one calm place.</span
                  >
                  <div ?data-layer-hidden=${layerHidden('mockup-cta')}>
                    <tp-mo-segment-border
                      ><tp-button size="sm">Join the pilot</tp-button
                      ><tp-mo-border-segment
                        origin="top-left"
                        draw="0% 0%, 0% 100%"
                        duration="600"
                      ></tp-mo-border-segment
                    ></tp-mo-segment-border>
                  </div>
                </div>
                <tp-image
                  ?data-layer-hidden=${layerHidden('mockup-photo')}
                  .ratio=${4 / 3}
                  src=${photo('1494337480532-3725c85fd2ab')}
                  alt=""
                ></tp-image>
              </div>
              <tp-scroll-trigger class="files-mockup-benefits" stagger="120" reveal="fade up">
                ${benefits.map(
                  ([title, text]) =>
                    html`<div class="files-mockup-benefit">
                      <strong>${title}</strong><span class="workspace-muted">${text}</span>
                    </div>`,
                )}
              </tp-scroll-trigger>
              <tp-mo-glow-border class="files-mockup-plan">
                <tp-card size="sm">
                  <h3 slot="header">Pilot plan</h3>
                  <p slot="description">Free until the general release</p>
                  <span class="workspace-muted">Up to 20 members, every feature.</span>
                </tp-card>
              </tp-mo-glow-border>
            </div>
          </tp-scroll-area>
        </div>
        <tp-card size="sm">
          <tp-layers
            label="Landing page layers"
            size="sm"
            can-rename
            default-expanded='["mockup-hero"]'
            default-value='["mockup-headline"]'
            .layers=${layers}
            @tp-layers-change=${(event: TpValueChangeEvent<readonly Layer[]>) => {
              if (event.defaultPrevented) return;
              (event.currentTarget as TpLayers).layers = event.detail.value;
              host.setView('files.layers', event.detail.value);
            }}
          ></tp-layers>
        </tp-card>
      </div>
    </tp-card>`;
}

/** Project files: folders and their files, the media library and the campaign work, as tabs. */
export function renderFiles(host: WorkspaceHost): PageView {
  const tab = host.view<FilesTab>('files.tab', 'files');
  const folder = host.view<string>('files.folder', 'campaign/stills');
  const upload = async () => {
    if (folder === 'readme') host.setView('files.folder', 'campaign/stills');
    host.setView('files.tab', 'files');
    await host.updateComplete;
    host.querySelector<TpFileUpload>('#files-upload')?.openFilePicker();
  };
  const share = html`<tp-popover label="Share launch files" placement="block-end end">
    <tp-button slot="trigger" variant="outline" size="sm"
      ><tp-icon slot="icon-start" .icon=${navigationIcons.share}></tp-icon>Share</tp-button
    >
    <span slot="title">Share launch files</span>
    <span slot="description">Anyone with the link can view this project's files.</span>
    <tp-stack gap="4">
      <tp-qr-code
        class="files-share-code"
        value=${shareLink}
        label="Scan to open the Atlas launch files"
      ></tp-qr-code>
      <tp-field label="Share link">
        <tp-input-group>
          <tp-input readonly default-value=${shareLink}></tp-input>
          <tp-copy-button
            slot="action"
            value=${shareLink}
            label="Copy share link"
            copied-label="Link copied"
          ></tp-copy-button>
        </tp-input-group>
      </tp-field>
    </tp-stack>
  </tp-popover>`;
  const body = html`<tp-tabs
    label="File views"
    .value=${tab}
    @tp-value-change=${(event: TpValueChangeEvent<FilesTab>) => {
      if (event.target !== event.currentTarget) return;
      host.accept(event, (value) => host.setView('files.tab', value));
    }}
  >
    <button slot="tab" value="files">All files</button>
    <button slot="tab" value="media">Media</button>
    <button slot="tab" value="campaign">Campaign</button>
    <div slot="panel" value="files" class="files-panel">
      ${
        tab === 'files'
          ? html`<div class="files-layout">
              <tp-card size="sm" class="files-folders">
                <h2 slot="header">Folders</h2>
                <tp-tree-view
                  label="Project folders"
                  size="sm"
                  default-expanded='["atlas", "campaign"]'
                  .value=${[folder]}
                  @tp-value-change=${(event: TpValueChangeEvent<string[]>) =>
                    host.accept(event, (value) => {
                      if (value[0]) host.setView('files.folder', value[0]);
                    })}
                  >${folders.map(folderItem)}</tp-tree-view
                >
                <div slot="footer" class="files-storage">
                  <tp-progress label="Storage used" .value=${42}></tp-progress>
                  <span class="workspace-muted workspace-small">4.2 GB of 10 GB used</span>
                </div>
              </tp-card>
              ${renderFolder(host, folder)}
            </div>`
          : nothing
      }
    </div>
    <div slot="panel" value="media" class="files-panel">
      ${tab === 'media' ? renderMedia(host) : nothing}
    </div>
    <div slot="panel" value="campaign" class="files-panel">
      ${tab === 'campaign' ? renderCampaign(host) : nothing}
    </div>
  </tp-tabs>`;
  return {
    title: 'Files',
    description: 'Launch assets, references and deliverables.',
    actions: html`${share}<tp-button size="sm" @click=${upload}
        ><tp-icon slot="icon-start" .icon=${plusIcon}></tp-icon>Upload</tp-button
      >`,
    body,
  };
}
