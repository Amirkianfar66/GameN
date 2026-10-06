import type { SeatId } from '@mothership/contracts';

// Element ids that a host may need to address. They never vary with a role.
export const SHELL_IDS = {
  main: 'ms-main',
  title: 'ms-title',
  blockedHeading: 'ms-blocked-heading',
  privateToggle: 'ms-private-toggle',
  privatePanel: 'ms-private-panel',
  reduceMotion: 'ms-reduce-motion',
  /** The Shot card's title. It is not redrawn as the card changes step, so it can hold focus while a command is in flight. */
  shotTitle: 'ms-shot-title',
  /** The line that says what the Shot card's current step is asking or reporting. */
  shotStep: 'ms-shot-step',
  shotOpen: 'ms-shot-open',
  shotBack: 'ms-shot-back',
  shotConfirm: 'ms-shot-confirm',
  shotCheck: 'ms-shot-check',
  shotDismiss: 'ms-shot-dismiss',
} as const;

export function shotTargetId(seatId: SeatId): string {
  return `ms-shot-target-${seatId}`;
}
