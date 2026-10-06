import { SHELL_IDS } from '@mothership/presentation';
import type { Announcer, PhaseFacts, ShellEnvironment, ShellIntent } from '@mothership/presentation';
import { estimateDeadline, millisecondsToNextSecond } from '../clock/deadline.js';
import type { ClientPorts } from '../ports.js';
import type { AudienceSession } from '../session/audience-session.js';

export interface ScreenFrame<Model> {
  readonly model: Model;
  /** Text for the page's live region. A new seq means it should be spoken, even if the text repeats. */
  readonly announcement: { readonly seq: number; readonly politeness: 'polite' | 'assertive'; readonly text: string } | null;
  /** Set when the screen itself was replaced and focus should follow the new content. */
  readonly focus: { readonly seq: number; readonly targetId: string } | null;
}

/** What only the embedding page can do. */
export interface ScreenHost {
  reload(): void;
}

export interface ScreenController<Model> {
  /** Returns the same object until something changes, so it can back an external-store hook. */
  getFrame(): ScreenFrame<Model>;
  subscribe(listener: () => void): () => void;
  dispatch(intent: ShellIntent): void;
  /** Backgrounding closes the private panel and stops the countdown; returning re-measures time. */
  setPageVisible(visible: boolean): void;
  setDeviceReducedMotion(reduced: boolean): void;
  start(): void;
  dispose(): void;
}

/** State that belongs to this device alone. It is never sent anywhere and never persisted. */
export interface LocalState {
  readonly pageVisible: boolean;
  /** The player has opened the private panel. Never true by default, never restored. */
  readonly privateRevealed: boolean;
  readonly deviceReducedMotion: boolean;
  /** null while the player has not overridden the device setting. */
  readonly motionChoice: boolean | null;
}

interface ScreenConfig<View, Input, Model> {
  readonly session: AudienceSession<View>;
  readonly ports: ClientPorts;
  readonly host: ScreenHost;
  readonly phaseOf: (view: View) => PhaseFacts;
  readonly buildInput: (environment: ShellEnvironment, view: View | null, local: LocalState) => Input;
  readonly buildModel: (input: Input) => Model;
  readonly announcer: Announcer<Input>;
  /** Surface-specific intents. Returns the new local state, or null when the intent is not handled. */
  readonly reduceLocal: (local: LocalState, intent: ShellIntent, model: Model) => LocalState | null;
}

export function createScreen<View, Input, Model extends { readonly screen: string }>(
  config: ScreenConfig<View, Input, Model>,
): ScreenController<Model> {
  const { session, ports } = config;
  const listeners = new Set<() => void>();
  let local: LocalState = { pageVisible: true, privateRevealed: false, deviceReducedMotion: false, motionChoice: null };
  let announcement: ScreenFrame<Model>['announcement'] = null;
  let focus: ScreenFrame<Model>['focus'] = null;
  let tick: unknown = null;
  let stopSession: (() => void) | null = null;
  let disposed = false;

  function compute(): { input: Input; model: Model; remainingMs: number | null } {
    const state = session.getState();
    const deadline = state.view === null ? { kind: 'unsynced' } as const : estimateDeadline(config.phaseOf(state.view), session.readClock());
    const environment: ShellEnvironment = {
      mode: session.mode,
      connection: state.connection,
      problem: state.problem,
      deadline,
      motion: { reducedMotion: local.motionChoice ?? local.deviceReducedMotion, followsDevice: local.motionChoice === null },
    };
    const input = config.buildInput(environment, state.view, local);
    return { input, model: config.buildModel(input), remainingMs: deadline.kind === 'running' ? deadline.remainingMs : null };
  }

  let frame: ScreenFrame<Model> = { model: compute().model, announcement, focus };
  let drawn = JSON.stringify(frame.model);

  function refresh(): void {
    if (disposed) return;
    if (tick !== null) ports.scheduler.clearTimeout(tick);
    tick = null;

    const { input, model, remainingMs } = compute();
    // A private panel never outlives the screen it was opened on: when the match returns
    // after a recovery screen, it is shown again only if the player asks again.
    if (model.screen !== 'match' && local.privateRevealed) local = { ...local, privateRevealed: false };

    const spoken = config.announcer.next(input);
    const previousAnnouncement = announcement;
    const previousFocus = focus;
    if (spoken.length > 0) {
      announcement = {
        seq: (announcement?.seq ?? 0) + 1,
        politeness: spoken.some(item => item.politeness === 'assertive') ? 'assertive' : 'polite',
        text: spoken.map(item => item.text).join(' '),
      };
    }
    if (model.screen === 'blocked' && frame.model.screen !== 'blocked') {
      focus = { seq: (focus?.seq ?? 0) + 1, targetId: SHELL_IDS.blockedHeading };
    }

    // One redraw per displayed second while a match is on screen in the foreground. A timer
    // that fires a moment early finds the same second still showing and waits out the rest.
    if (remainingMs !== null && local.pageVisible && model.screen === 'match') {
      tick = ports.scheduler.setTimeout(() => {
        tick = null;
        refresh();
      }, millisecondsToNextSecond(remainingMs));
    }

    // Nothing to draw, say or focus: keep the frame's identity and tell nobody.
    const serialized = JSON.stringify(model);
    if (serialized === drawn && announcement === previousAnnouncement && focus === previousFocus) return;
    drawn = serialized;
    frame = { model, announcement, focus };
    for (const listener of [...listeners]) listener();
  }

  function setLocal(next: LocalState): void {
    local = next;
    refresh();
  }

  return {
    getFrame: () => frame,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(intent) {
      if (disposed) return;
      if (intent.type === 'session/reconnect') return session.reconnect();
      if (intent.type === 'app/reload') return config.host.reload();
      if (intent.type === 'settings/reduce-motion') return setLocal({ ...local, motionChoice: intent.checked });
      const next = config.reduceLocal(local, intent, frame.model);
      if (next !== null) setLocal(next);
    },
    setPageVisible(visible) {
      if (disposed || visible === local.pageVisible) return;
      // Leaving closes the private panel for good; coming back does not reopen it.
      local = { ...local, pageVisible: visible, privateRevealed: visible ? local.privateRevealed : false };
      if (visible) session.resyncClock();
      refresh();
    },
    setDeviceReducedMotion(reduced) {
      if (disposed || reduced === local.deviceReducedMotion) return;
      setLocal({ ...local, deviceReducedMotion: reduced });
    },
    start() {
      if (disposed || stopSession) return;
      stopSession = session.subscribe(refresh);
      session.start();
      refresh();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (tick !== null) ports.scheduler.clearTimeout(tick);
      tick = null;
      stopSession?.();
      session.dispose();
      listeners.clear();
    },
  };
}
