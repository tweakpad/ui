import { css } from 'lit';
import type { MotionRoleDefinition } from '../foundation/motion.js';
import { TpHoverSurface } from './anchored-surface.js';
import { TpDialog, dialogMotionRoles as overlayMotionRoles } from './dialog/dialog.js';
export { TpDialog, overlayMotionRoles };
export { TpAlertDialog } from './alert-dialog/index.js';

export class TpDrawer extends TpDialog {
  static tagName = 'tp-drawer';
  static override properties = {
    ...TpDialog.properties,
    side: { type: String, reflect: true },
  };
  static override styles = [
    TpDialog.styles,
    css`
      .content {
        inset: 0 0 0 auto;
        margin: 0;
        inline-size: min(26rem, 90vw);
        block-size: 100%;
        max-block-size: none;
        grid-template-rows: auto 1fr auto;
        border-radius: 0;
        transform: translateX(0);
        transition: transform calc(var(--tp-duration-normal) * var(--tp-motion-scale))
          var(--tp-easing-standard);
      }

      .portal[data-state='starting'] .content,
      .portal[data-state='ending'] .content {
        transform: translateX(100%);
      }

      :host([side='left']) .content {
        inset: 0 auto 0 0;
      }

      :host([side='left']) .portal[data-state='starting'] .content,
      :host([side='left']) .portal[data-state='ending'] .content {
        transform: translateX(-100%);
      }

      .content[data-tp-motion-driven] {
        transition: none !important;
      }
    `,
  ];
  side: 'left' | 'right' = 'right';
  protected override get animateDefaultExit(): boolean {
    return true;
  }
  protected override motionTargets(): Array<{
    target: HTMLElement | null;
    role: MotionRoleDefinition;
  }> {
    return [
      ...super.motionTargets(),
      {
        target: this.renderRoot.querySelector<HTMLElement>('.content'),
        role: overlayMotionRoles.surface,
      },
    ];
  }
  protected override get partPrefix(): string {
    return 'drawer';
  }
}

export class TpSidePanel extends TpDrawer {
  static tagName = 'tp-side-panel';
  protected override get partPrefix(): string {
    return 'side-panel';
  }
}

export * from './popover/index.js';
export class TpPreviewCard extends TpHoverSurface {
  static tagName = 'tp-preview-card';
  protected override get overlayRole(): string {
    return 'group';
  }
  protected override get partPrefix(): string {
    return 'preview-card';
  }
}
export { TpTooltip } from './tooltip/index.js';
