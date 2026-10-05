// Prompts and choices mirror the local shadcn base Questionnaire examples.
export const questionnaireData = {
  multiple: {
    questions: [
      {
        name: 'context',
        title: 'What context should the agent inspect?',
        description: 'Select every source that may affect the implementation.',
        required: true,
        kind: 'multiple',
        choices: [
          {
            value: 'source',
            label: 'Relevant source files',
          },
          {
            value: 'tests',
            label: 'Existing tests',
          },
          {
            value: 'docs',
            label: 'Architecture documentation',
          },
          {
            value: 'history',
            label: 'Recent commit history',
          },
        ],
      },
    ],
    submit: 'Share context',
  },
  freeform: {
    questions: [
      {
        name: 'approach',
        title: 'How should the agent approach this refactor?',
        description: 'Choose a strategy or write a more specific instruction.',
        required: true,
        choices: [
          {
            value: 'incremental',
            label: 'Make the smallest safe change',
          },
          {
            value: 'module',
            label: 'Refactor one module at a time',
          },
          {
            value: 'rewrite',
            label: 'Replace the implementation completely',
          },
        ],
        input: {
          label: 'Another refactoring approach',
          placeholder: 'Describe another approach…',
        },
      },
    ],
    submit: 'Use this approach',
  },
  skip: {
    questions: [
      {
        name: 'task',
        title: 'What kind of change is this?',
        description: 'Choose the category that best describes the work.',
        required: true,
        choices: [
          {
            value: 'feature',
            label: 'New feature',
          },
          {
            value: 'fix',
            label: 'Bug fix',
          },
          {
            value: 'refactor',
            label: 'Refactor',
          },
        ],
      },
      {
        name: 'constraints',
        title: 'Are there any implementation constraints?',
        description: 'Answer if needed, or intentionally skip this question.',
        skippable: true,
        choices: [
          {
            value: 'no-dependencies',
            label: 'Do not add dependencies',
          },
          {
            value: 'no-migrations',
            label: 'Do not change the database',
          },
          {
            value: 'preserve-api',
            label: 'Preserve the public API',
          },
        ],
        input: {
          label: 'Another implementation constraint',
          placeholder: 'Describe another constraint…',
        },
      },
      {
        name: 'review',
        title: 'How should the work be reviewed?',
        description: 'Choose the checks the agent should complete before handoff.',
        required: true,
        choices: [
          {
            value: 'tests',
            label: 'Run the test suite',
          },
          {
            value: 'diff',
            label: 'Review the final diff',
          },
          {
            value: 'both',
            label: 'Tests and diff review',
          },
        ],
      },
    ],
    submit: 'Submit brief',
  },
  shortcuts: {
    questions: [
      {
        name: 'action',
        title: 'What should the agent do next?',
        description: 'Use the displayed shortcut or navigate with the keyboard.',
        required: true,
        choices: [
          {
            value: 'inspect',
            label: 'Inspect the implementation',
          },
          {
            value: 'tests',
            label: 'Run the relevant tests',
          },
          {
            value: 'patch',
            label: 'Prepare the patch',
          },
        ],
      },
    ],
    submit: 'Confirm action',
  },
  validation: {
    questions: [
      {
        name: 'detail',
        title: 'How much detail should the answer include?',
        description: 'Choose the response depth.',
        required: true,
        choices: [
          {
            value: 'summary',
            label: 'Concise summary',
          },
          {
            value: 'complete',
            label: 'Complete answer',
          },
        ],
      },
      {
        name: 'audience',
        title: 'Who will read the answer?',
        description: 'Public answers require complete context.',
        required: true,
        choices: [
          {
            value: 'team',
            label: 'My team',
          },
          {
            value: 'public',
            label: 'Public audience',
          },
        ],
      },
    ],
    submit: 'Validate answers',
  },
  controlled: {
    questions: [
      {
        name: 'scope',
        title: 'What may the agent change?',
        description: 'The host stores the active checkpoint while Questionnaire navigates.',
        required: true,
        choices: [
          {
            value: 'component',
            label: 'Only the target component',
          },
          {
            value: 'tests',
            label: 'Component and related tests',
          },
          {
            value: 'feature',
            label: 'The complete feature area',
          },
        ],
      },
      {
        name: 'checks',
        title: 'Which verification level should it use?',
        required: true,
        choices: [
          {
            value: 'targeted',
            label: 'Targeted tests',
          },
          {
            value: 'package',
            label: 'Package tests and typecheck',
          },
          {
            value: 'full',
            label: 'Full workspace verification',
          },
        ],
      },
      {
        name: 'output',
        title: 'What should the agent return when finished?',
        required: true,
        choices: [
          {
            value: 'summary',
            label: 'Concise summary',
          },
          {
            value: 'diff',
            label: 'Summary with changed files',
          },
          {
            value: 'handoff',
            label: 'Detailed implementation handoff',
          },
        ],
      },
    ],
    submit: 'Save workflow',
  },
  resume: {
    questions: [
      {
        name: 'change',
        title: 'What kind of migration is this?',
        description: 'This answer was saved during the previous session.',
        required: true,
        choices: [
          {
            value: 'incremental',
            label: 'Incremental migration',
            defaultChecked: true,
          },
          {
            value: 'cutover',
            label: 'Single cutover',
          },
        ],
      },
      {
        name: 'verification',
        title: 'How should the migration be verified?',
        description: 'These checks were selected during the previous session.',
        required: true,
        kind: 'multiple',
        choices: [
          {
            value: 'tests',
            label: 'Run migration tests',
            defaultChecked: true,
          },
          {
            value: 'typecheck',
            label: 'Run the typecheck',
            defaultChecked: true,
          },
          {
            value: 'manual',
            label: 'Perform a manual smoke test',
          },
        ],
      },
      {
        name: 'notes',
        title: 'Anything else the agent should remember?',
        description: 'This note was saved with the draft.',
        skippable: true,
        input: {
          label: 'Saved migration note',
          defaultValue: 'Keep the existing public API stable.',
        },
      },
    ],
    submit: 'Update draft',
  },
  conditional: {
    questions: [
      {
        name: 'runtime',
        title: 'Where should the agent run?',
        description: 'Cloud runs add an environment question to this flow.',
        required: true,
        choices: [
          {
            value: 'local',
            label: 'Local workspace',
          },
          {
            value: 'cloud',
            label: 'Cloud workspace',
          },
        ],
      },
      {
        name: 'environment',
        title: 'Which cloud environment should it use?',
        required: true,
        choices: [
          {
            value: 'preview',
            label: 'Preview',
          },
          {
            value: 'staging',
            label: 'Staging',
          },
          {
            value: 'isolated',
            label: 'Isolated sandbox',
          },
        ],
      },
      {
        name: 'approval',
        title: 'When should the agent request approval?',
        required: true,
        choices: [
          {
            value: 'writes',
            label: 'Before writing files',
          },
          {
            value: 'commands',
            label: 'Before running commands',
          },
          {
            value: 'sensitive',
            label: 'Only for sensitive actions',
          },
        ],
      },
    ],
    submit: 'Save execution plan',
  },
  'navigation-state': {
    questions: [
      {
        name: 'permission',
        title: 'What may the agent modify?',
        description: 'Next is intentionally disabled until an answer is selected.',
        required: true,
        choices: [
          {
            value: 'files',
            label: 'Project files',
          },
          {
            value: 'tests',
            label: 'Project files and tests',
          },
          {
            value: 'config',
            label: 'Files, tests, and configuration',
          },
        ],
      },
      {
        name: 'verification',
        title: 'What must pass before completion?',
        required: true,
        choices: [
          {
            value: 'tests',
            label: 'Tests',
          },
          {
            value: 'types',
            label: 'Tests and types',
          },
          {
            value: 'all',
            label: 'Tests, types, and visual QA',
          },
        ],
      },
    ],
    submit: 'Save permissions',
  },
  progress: {
    questions: [
      {
        name: 'scope',
        title: 'How large is the change?',
        required: true,
        choices: [
          {
            value: 'small',
            label: 'Small patch',
          },
          {
            value: 'medium',
            label: 'Feature-sized change',
          },
          {
            value: 'large',
            label: 'Cross-package change',
          },
        ],
      },
      {
        name: 'strategy',
        title: 'How should commits be organized?',
        required: true,
        choices: [
          {
            value: 'single',
            label: 'Single commit',
          },
          {
            value: 'logical',
            label: 'Logical commits',
          },
          {
            value: 'squash',
            label: 'Squash before review',
          },
        ],
      },
      {
        name: 'tests',
        title: 'Which tests should run?',
        required: true,
        choices: [
          {
            value: 'targeted',
            label: 'Targeted tests',
          },
          {
            value: 'package',
            label: 'Package suite',
          },
          {
            value: 'workspace',
            label: 'Full workspace',
          },
        ],
      },
      {
        name: 'delivery',
        title: 'How should the work be delivered?',
        required: true,
        choices: [
          {
            value: 'patch',
            label: 'Patch only',
          },
          {
            value: 'commit',
            label: 'Committed locally',
          },
          {
            value: 'branch',
            label: 'Push a review branch',
          },
        ],
      },
    ],
    submit: 'Finish plan',
  },
  animated: {
    questions: [
      {
        name: 'task',
        title: 'What should the agent do?',
        description: 'Choose the task for this run.',
        required: true,
        choices: [
          {
            value: 'implement',
            label: 'Implement the requested change',
          },
          {
            value: 'debug',
            label: 'Debug the current behavior',
          },
          {
            value: 'review',
            label: 'Review the implementation',
          },
        ],
      },
      {
        name: 'review',
        title: 'How should the work be reviewed?',
        description: 'Select the verification depth.',
        required: true,
        choices: [
          {
            value: 'targeted',
            label: 'Targeted checks',
          },
          {
            value: 'complete',
            label: 'Complete test suite',
          },
          {
            value: 'manual',
            label: 'Tests and manual QA',
          },
        ],
      },
      {
        name: 'delivery',
        title: 'How should the result be delivered?',
        description: 'Choose the final handoff format.',
        required: true,
        choices: [
          {
            value: 'summary',
            label: 'Concise summary',
          },
          {
            value: 'diff',
            label: 'Summary and changed files',
          },
          {
            value: 'handoff',
            label: 'Detailed review handoff',
          },
        ],
      },
    ],
    submit: 'Save workflow',
  },
  card: {
    questions: [
      {
        name: 'task',
        title: 'What should the agent work on?',
        description: 'Choose the task that should be handled next.',
        required: true,
        choices: [
          {
            value: 'fix',
            label: 'Fix the failing tests',
          },
          {
            value: 'refactor',
            label: 'Refactor the data layer',
          },
          {
            value: 'docs',
            label: 'Update the integration guide',
          },
        ],
      },
      {
        name: 'output',
        title: 'What should the final handoff include?',
        description: 'Pick the level of detail needed for review.',
        required: true,
        choices: [
          {
            value: 'summary',
            label: 'Summary only',
          },
          {
            value: 'files',
            label: 'Summary and changed files',
          },
          {
            value: 'review',
            label: 'Full review handoff',
          },
        ],
      },
    ],
    submit: 'Create task',
  },
  dialog: {
    questions: [
      {
        name: 'scope',
        title: 'Which files are in scope?',
        description: 'Choose how broadly the agent can update the workspace.',
        required: true,
        choices: [
          {
            value: 'component',
            label: 'Component only',
          },
          {
            value: 'feature',
            label: 'Complete feature directory',
          },
          {
            value: 'workspace',
            label: 'Any related workspace file',
          },
        ],
      },
      {
        name: 'tests',
        title: 'How much verification is needed?',
        description: 'Choose the checks the agent should run before handoff.',
        required: true,
        choices: [
          {
            value: 'targeted',
            label: 'Targeted tests',
          },
          {
            value: 'package',
            label: 'Package tests',
          },
          {
            value: 'full',
            label: 'Full workspace verification',
          },
        ],
      },
    ],
    submit: 'Send answer',
  },
  default: {
    questions: [
      {
        choices: [
          {
            description: 'Show what the agent ran and what came back.',
            label: 'Tool call timeline',
            value: 'tool-calls',
          },
          {
            description: 'Ask before sensitive or destructive actions.',
            label: 'Approval checkpoints',
            value: 'approvals',
          },
          {
            description: 'Make delegated work and results easier to follow.',
            label: 'Sub-agent handoffs',
            value: 'handoffs',
          },
        ],
        description: 'Choose a direction or describe another task.',
        input: {
          label: 'Another agent feature',
          placeholder: 'Describe another feature…',
        },
        name: 'direction',
        required: true,
        title: 'What should the agent build next?',
      },
      {
        choices: [
          {
            label: 'Progress',
            value: 'progress',
          },
          {
            label: 'Decisions',
            value: 'decisions',
          },
          {
            label: 'Risks',
            value: 'risks',
          },
          {
            label: 'Next step',
            value: 'next-step',
          },
        ],
        description: 'Select all that apply, or skip this question.',
        name: 'signals',
        required: false,
        title: 'What should every progress update include?',
        kind: 'multiple',
        skippable: true,
      },
      {
        choices: [
          {
            label: 'Start now',
            value: 'now',
          },
          {
            label: 'Next development cycle',
            value: 'next-cycle',
          },
          {
            label: 'Add it to the backlog',
            value: 'backlog',
          },
        ],
        description: 'Choose when the agent should begin the work.',
        name: 'timing',
        required: true,
        title: 'When should work begin?',
      },
    ],
    submit: 'Save plan',
  },
};
