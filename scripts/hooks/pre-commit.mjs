// Lints the staged files with the tools and file sets of `npm run lint`, so a commit cannot carry an
// error CI would reject. The file sets come from the `format:check` and `lint:css` scripts; ESLint
// applies its own configuration. It reads the working tree, so a partly staged file is checked as it
// is on disk. Skip once with `git commit --no-verify`.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';

const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
const globs = (script) => [...scripts[script].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const staged = execFileSync(
  'git',
  ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter((file) => file && existsSync(file));
const matching = (patterns) =>
  staged.filter((file) => patterns.some((pattern) => matchesGlob(file, pattern)));

const steps = [
  ['prettier', ['--check'], matching(globs('format:check'))],
  ['eslint', ['--no-warn-ignored'], staged.filter((file) => /\.[cm]?[jt]sx?$/.test(file))],
  ['stylelint', [], matching(globs('lint:css'))],
];
let failed = false;
for (const [tool, options, files] of steps) {
  if (!files.length) continue;
  const result = spawnSync('npx', ['--no', '--', tool, ...options, ...files], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    failed = true;
    console.error(`pre-commit: ${tool} failed on the staged files.`);
  }
}
if (failed) {
  console.error(
    'pre-commit: fix the errors above (`npm run format`, `npx eslint --fix`, `npx stylelint --fix`), stage them and commit again.',
  );
  process.exit(1);
}
