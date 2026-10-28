import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { mediaPlayerAppearance } from '../recipes/media-player.js';

const mediaButtonBindings = {
  ':host': 'media-button',
  'tp-button': 'media-button-control',
  "[part~='mark']": 'media-button-mark',
  "[part~='text']": 'media-button-text',
  'tp-button[data-media-text]': 'media-button-text-control',
};

const definition: ComponentDefinition = {
  name: 'Media player',
  tagName: 'tp-media-player',
  kind: 'compound-reexport',
  // tp-media-controls `visibility`: `auto` overlays the media, `always` stays in flow (audio).
  axes: [{ name: 'visibility', values: ['auto', 'always'], default: 'auto' }],
  parts: [
    {
      name: 'media-player',
      description: 'The player root.',
    },
    {
      name: 'media-container',
      description: 'The container that holds the media and its controls and goes fullscreen.',
    },
    {
      name: 'media-element',
      description: 'The video or audio element.',
    },
    { name: 'media-poster', description: 'The poster shown before playback.' },
    {
      name: 'media-poster-image',
      description: 'The poster image.',
    },
    { name: 'media-title', description: 'The title of the media.' },
    {
      name: 'media-controls',
      description: 'The controls overlay; `visibility` decides whether it hides while idle.',
      axes: ['visibility'],
    },
    {
      name: 'media-controls-backdrop',
      description: 'The shade behind overlaid controls.',
      axes: ['visibility'],
    },
    { name: 'media-controls-group', description: 'A row of controls.' },
    { name: 'media-button', description: 'A media button host.' },
    {
      name: 'media-button-control',
      description: 'The composed Button of a media button.',
    },
    {
      name: 'media-button-mark',
      description: 'The icon or text of a media button.',
    },
    {
      name: 'media-button-text',
      description: 'The visible text of a text button, such as the playback rate.',
    },
    {
      name: 'media-button-text-control',
      description: 'The composed Button of a text button.',
    },
    {
      name: 'media-button-live-dot',
      description: 'The live indicator dot of the live button.',
    },
    { name: 'media-time-slider', description: 'The seek timeline.' },
    {
      name: 'media-time-slider-preview',
      description: 'The preview that follows the pointer over the timeline.',
    },
    { name: 'media-thumbnail', description: 'A thumbnail of the media at a time.' },
    {
      name: 'media-thumbnail-image',
      description: 'The thumbnail image.',
    },
    {
      name: 'media-chapter-title',
      description: 'The title of the current chapter.',
    },
    { name: 'media-volume-slider', description: 'The volume slider.' },
    {
      name: 'media-volume-popover',
      description: 'The volume popover host.',
    },
    {
      name: 'media-settings-menu',
      description: 'The settings menu host.',
    },
    {
      name: 'media-settings-hint',
      description: 'The selected option shown beside a settings group.',
    },
    { name: 'media-time', description: 'A time readout.' },
    {
      name: 'media-time-value',
      description: 'The formatted time.',
    },
    {
      name: 'media-time-sign',
      description: 'The minus sign of a remaining time.',
    },
    {
      name: 'media-radio-group',
      description: 'A settings radio group, such as playback speed.',
    },
    {
      name: 'media-buffering-indicator',
      description: 'The spinner shown while the media buffers.',
    },
    { name: 'media-error-dialog', description: 'The dialog shown when the media fails.' },
    {
      name: 'media-indicator',
      description: 'A transient indicator of a change, such as the volume.',
    },
    {
      name: 'media-indicator-content',
      description: 'The content of an indicator.',
    },
    {
      name: 'media-indicator-value',
      description: 'The value an indicator shows.',
    },
    {
      name: 'media-indicator-fill',
      description: 'The level bar of an indicator.',
    },
    {
      name: 'media-layout',
      description: 'A default layout host.',
    },
    {
      name: 'media-layout-region',
      description: 'A region of a default layout, such as the bottom bar.',
    },
  ],
};

export const mediaPlayerPresentation = definePresentation({
  definition,
  bindings: {
    'tp-media-player': {
      ':host': 'media-player',
    },
    'tp-media-container': {
      ':host': 'media-container',
    },
    'tp-media-poster': {
      ':host': 'media-poster',
      "[part~='image']": 'media-poster-image',
    },
    'tp-media-title': {
      ':host': 'media-title',
    },
    'tp-media-controls': {
      ':host': 'media-controls',
      "[part~='backdrop']": 'media-controls-backdrop',
    },
    'tp-media-controls-group': {
      ':host': 'media-controls-group',
    },
    'tp-media-hotkey': {},
    'tp-media-gesture': {},
    'tp-media-play-button': mediaButtonBindings,
    'tp-media-mute-button': mediaButtonBindings,
    'tp-media-seek-button': mediaButtonBindings,
    'tp-media-fullscreen-button': mediaButtonBindings,
    'tp-media-pip-button': mediaButtonBindings,
    'tp-media-captions-button': mediaButtonBindings,
    'tp-media-playback-rate-button': mediaButtonBindings,
    'tp-media-remote-playback-button': mediaButtonBindings,
    'tp-media-live-button': { ...mediaButtonBindings, "[part~='icon']": 'media-button-live-dot' },
    'tp-media-time': {
      ':host': 'media-time',
      'tp-button': 'media-button-control',
      "[part~='time']": 'media-time-value',
      "[part~='sign']": 'media-time-sign',
    },
    'tp-media-buffering-indicator': {
      ':host': 'media-buffering-indicator',
    },
    'tp-media-error-dialog': {
      ':host': 'media-error-dialog',
    },
    'tp-media-status-indicator': {
      ':host': 'media-indicator',
      "[part~='content']": 'media-indicator-content',
      "[part~='value']": 'media-indicator-value',
      "[part~='fill']": 'media-indicator-fill',
    },
    'tp-media-seek-indicator': {
      ':host': 'media-indicator',
      "[part~='content']": 'media-indicator-content',
      "[part~='value']": 'media-indicator-value',
      "[part~='fill']": 'media-indicator-fill',
    },
    'tp-media-volume-indicator': {
      ':host': 'media-indicator',
      "[part~='content']": 'media-indicator-content',
      "[part~='value']": 'media-indicator-value',
      "[part~='fill']": 'media-indicator-fill',
    },
    'tp-media-time-slider': {
      ':host': 'media-time-slider',
    },
    'tp-media-volume-slider': {
      ':host': 'media-volume-slider',
    },
    'tp-media-time-slider-preview': {
      ':host': 'media-time-slider-preview',
    },
    'tp-media-thumbnail': {
      ':host': 'media-thumbnail',
      "[part~='image']": 'media-thumbnail-image',
    },
    'tp-media-chapter-title': {
      ':host': 'media-chapter-title',
    },
    'tp-media-playback-rate-radio-group': {
      ':host': 'media-radio-group',
    },
    'tp-media-captions-radio-group': {
      ':host': 'media-radio-group',
    },
    'tp-media-audio-track-radio-group': {
      ':host': 'media-radio-group',
    },
    'tp-media-quality-radio-group': {
      ':host': 'media-radio-group',
    },
    'tp-media-volume-popover': {
      ':host': 'media-volume-popover',
    },
    'tp-media-settings-menu': {
      ':host': 'media-settings-menu',
      "tp-button[part~='trigger']": 'media-button-control',
    },
    'tp-media-video-layout': {
      ':host': 'media-layout',
      "[part~='top']": 'media-layout-region',
      "[part~='center']": 'media-layout-region',
      "[part~='bottom-start']": 'media-layout-region',
      "[part~='bottom-end']": 'media-layout-region',
      "[part~='bar']": 'media-layout-region',
      "[part~='time']": 'media-layout-region',
      "[part~='secondary']": 'media-layout-region',
    },
    'tp-media-audio-layout': {
      ':host': 'media-layout',
      "[part~='top']": 'media-layout-region',
      "[part~='center']": 'media-layout-region',
      "[part~='bottom-start']": 'media-layout-region',
      "[part~='bottom-end']": 'media-layout-region',
      "[part~='bar']": 'media-layout-region',
      "[part~='time']": 'media-layout-region',
      "[part~='secondary']": 'media-layout-region',
    },
  },
  sources: [mediaPlayerAppearance],
});
