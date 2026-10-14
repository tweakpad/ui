import { html, type TemplateResult } from 'lit';
import type { CollisionPolicy, PositioningOffsetContext } from '../../foundation/positioning.js';
import type { SurfaceFocusTarget } from '../../foundation/surface-focus.js';
import type { TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';

/** One Mark: the spy states of a top-level Item and the deeper Items after it. */
export interface TableOfContentsMark {
  readonly active: boolean;
  readonly current: boolean;
}

export interface CompactTableOfContentsOptions {
  /** The Title text naming the Trigger and the Popup. */
  readonly name: string;
  readonly side: 'inline-start' | 'inline-end';
  readonly openDelay: number;
  readonly closeDelay: number;
  readonly marks: readonly TableOfContentsMark[];
  /** The Title and List, rendered into the Popup. */
  readonly body: TemplateResult;
  readonly initialFocus: SurfaceFocusTarget;
  readonly onOpenChange: (event: TpSurfaceOpenChangeEvent) => void;
  /** Called when the card has finished opening or closing. */
  readonly onOpenChangeComplete: (event: CustomEvent<{ open: boolean }>) => void;
}

/** The Popup overlaps the Trigger by its whole extent, so the card covers the strip. */
const coverTrigger = ({ side, anchor }: PositioningOffsetContext): number =>
  -(side === 'left' || side === 'right' ? anchor.width : anchor.height);

/** The card flips to the Trigger's other edge and shifts along it to stay in view. */
const collisionAvoidance: CollisionPolicy = { side: 'flip', align: 'shift' };

/**
 * The compact variant: a Popover whose Trigger is a ghost Button over the Marks. The Marks share
 * the Button's grid cell and paint above it, so the strip keeps their size and the Button's
 * hover fill stays behind them.
 */
export function renderCompactTableOfContents(options: CompactTableOfContentsOptions) {
  return html`<tp-popover
      part="popover"
      class="popover"
      label=${options.name}
      .portal=${false}
      .openOnHover=${true}
      .openDelay=${options.openDelay}
      .closeDelay=${options.closeDelay}
      .side=${options.side}
      .align=${'center'}
      .sideOffset=${coverTrigger}
      .collisionAvoidance=${collisionAvoidance}
      .initialFocus=${options.initialFocus}
      @tp-open-change=${options.onOpenChange}
      @tp-open-change-complete=${options.onOpenChangeComplete}
      ><tp-button
        slot="trigger"
        part="trigger"
        class="trigger"
        variant="ghost"
        .ariaLabel=${options.name}
      ></tp-button
      >${options.body}</tp-popover
    ><span part="marks" class="marks" aria-hidden="true"
      >${options.marks.map(
        (mark) =>
          html`<span
            part="mark"
            class="mark"
            ?data-active=${mark.active}
            ?data-current=${mark.current}
          ></span>`,
      )}</span
    >`;
}
