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
    },
    {
      name: 'media-container',
    },
    {
      name: 'media-element',
    },
    { name: 'media-poster' },
    {
      name: 'media-poster-image',
    },
    { name: 'media-title' },
    {
      name: 'media-controls',
      axes: ['visibility'],
    },
    {
      name: 'media-controls-backdrop',
      axes: ['visibility'],
    },
    { name: 'media-controls-group' },
    { name: 'media-button' },
    {
      name: 'media-button-control',
    },
    {
      name: 'media-button-mark',
    },
    {
      name: 'media-button-text',
    },
    {
      name: 'media-button-text-control',
    },
    {
      name: 'media-button-live-dot',
    },
    { name: 'media-time-slider' },
    {
      name: 'media-time-slider-preview',
    },
    { name: 'media-thumbnail' },
    {
      name: 'media-thumbnail-image',
    },
    {
      name: 'media-chapter-title',
    },
    { name: 'media-volume-slider' },
    {
      name: 'media-volume-popover',
    },
    {
      name: 'media-settings-menu',
    },
    {
      name: 'media-settings-hint',
    },
    { name: 'media-time' },
    {
      name: 'media-time-value',
    },
    {
      name: 'media-time-sign',
    },
    {
      name: 'media-radio-group',
    },
    {
      name: 'media-buffering-indicator',
    },
    { name: 'media-error-dialog' },
    {
      name: 'media-indicator',
    },
    {
      name: 'media-indicator-content',
    },
    {
      name: 'media-indicator-value',
    },
    {
      name: 'media-indicator-fill',
    },
    {
      name: 'media-layout',
    },
    {
      name: 'media-layout-region',
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
