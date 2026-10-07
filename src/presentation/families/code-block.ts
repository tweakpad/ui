import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { codeBlockAppearance } from '../recipes/code-block.js';

const definition: ComponentDefinition = {
  name: 'Code block',
  tagName: 'tp-code-block',
  kind: 'presentational-primitive',
  sourceNode: 'ucl21-code-block',
  states: ['collapsed', 'expanded', 'wrap', 'line-numbers', 'highlighted', 'inserted', 'deleted'],
  parts: [
    {
      name: 'code-block',
      publicName: 'Root',
      presentationKeys: ['code-block'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'code-block-header',
      publicName: 'Header',
      presentationKeys: ['code-block-header'],
      cardinality: 'zero or one descendant of Root, present when a title exists',
    },
    {
      name: 'code-block-title',
      publicName: 'Title',
      presentationKeys: ['code-block-title'],
      cardinality: 'zero or one descendant of Header',
    },
    {
      name: 'code-block-language',
      publicName: 'Language',
      presentationKeys: ['code-block-language'],
      cardinality: 'zero or one descendant of Header',
    },
    {
      name: 'code-block-copy',
      publicName: 'Copy',
      presentationKeys: ['code-block-copy'],
      cardinality: 'zero or one descendant of Root, present unless copyable is false',
    },
    {
      name: 'code-block-viewport',
      publicName: 'Viewport',
      presentationKeys: ['code-block-viewport'],
      cardinality: 'exactly one descendant of Root',
    },
    {
      name: 'code-block-line',
      publicName: 'Line',
      presentationKeys: ['code-block-line'],
      cardinality: 'one per source line, descendants of Viewport',
    },
    {
      name: 'code-block-line-number',
      publicName: 'Line number',
      presentationKeys: ['code-block-line-number'],
      cardinality: 'one per Line when line numbers are shown',
    },
    {
      name: 'code-block-line-marker',
      publicName: 'Line marker',
      presentationKeys: ['code-block-line-marker'],
      cardinality: 'one per Line when diff lines are set',
    },
    {
      name: 'code-block-token',
      publicName: 'Token',
      presentationKeys: ['code-block-token'],
      cardinality: 'zero or more descendants of each Line',
    },
    {
      name: 'code-block-expand',
      publicName: 'Expand',
      presentationKeys: ['code-block-expand'],
      cardinality: 'zero or one descendant of Root, present when collapsible',
    },
  ],
};

export const codeBlockPresentation = definePresentation({
  definition,
  bindings: {
    'tp-code-block': {
      "[part~='code-block']": 'code-block',
      "[part~='header']": 'code-block-header',
      "[part~='title']": 'code-block-title',
      "[part~='language']": 'code-block-language',
      '.copy': 'code-block-copy',
      "[part~='viewport']": 'code-block-viewport',
      "[part~='line']": 'code-block-line',
      "[part~='line-number']": 'code-block-line-number',
      "[part~='line-marker']": 'code-block-line-marker',
      "[part~='token']": 'code-block-token',
      "[part~='expand']": 'code-block-expand',
    },
  },
  sources: [codeBlockAppearance],
  complete: true,
});
