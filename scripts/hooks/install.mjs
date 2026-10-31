// Points git at the repository's hooks in `.githooks` on `npm install`. CI and copies outside a git
// checkout (a packed or installed package) skip it.
import { execFileSync } from 'node:child_process';

if (!process.env.CI) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'core.hooksPath', '.githooks']);
  } catch {
    // Not a git checkout: there is nothing to install.
  }
}
