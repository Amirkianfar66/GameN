import { isCurrent, resolveScreen, SHELL_IDS } from '@mothership/presentation';
import type { Announcer, Cue, Director, IssuedCue, LiveAnnouncement, PhaseFacts, ShellEnvironment, ShellIntent } from '@mothership/presentation';
import { estimateDeadline, millisecondsToNextSecond } from '../clock/deadline.js';
import type { ClientPorts } from '../ports.js';
import type { AudienceSession } from '../session/audience-session.js';

/** One thing for the page's live region to say. A new seq means say it, even if the text repeats; seq only ever goes up. */
export interface SpokenLine {
  readonly seq: number;
  readonly politeness: 'polite' | 'assertive';
  readonly text: string;
}

/** One cue for the page to show once. A new seq means show it; seq only ever goes up, across both lists of a frame. */
export interface FrameCue {
  readonly seq: number;
  readonly cue: Cue;
}

const NO_CUES: readonly FrameCue[] = Object.freeze([]);

export interface ScreenFrame<Model> {
  readonly model: Model;
  /** What anyone at the table could be told: connection, phase, time, public status. */
  readonly announcement: SpokenLine | null;
  /**
   * What belongs to this seat alone, on a channel of its own so a host never mixes the two.
   * It is set only while private content is on screen and is gone from the frame once it is
   * not; whatever a host put into the document for it must go at the same moment.
   */
  readonly privateAnnouncement: SpokenLine | null;
  /**
   * Set when the screen itself was replaced, or the player moved a step, and focus should
   * follow. A new seq means move focus; seq only ever goes up. A request made inside the
   * private panel is gone from the frame once private content leaves the screen.
   */
  readonly focus: { readonly seq: number; readonly targetId: string } | null;
  /**
   * Goes up each time private content leaves the screen. Whatever private text a host put
   * into the document outside the model's own markup, a spoken line for instance, must
   * leave with it.
   */
  readonly privacyEpoch: number;
  /**
   * The cues issued most recently for what anyone at the table may see, in order. A cue is
   * emphasis for something the model already shows: a page that ignores this list loses no
   * fact, and nothing ever waits for a cue to finish. One is put here at the moment its
   * fact reaches a match that is on screen in the foreground, or never.
   */
  readonly cues: readonly FrameCue[];
  /**
   * The same for cues that belong to this seat alone. Filled only while private content is
   * on screen, and empty again the moment it is not.
   */
  readonly privateCues: readonly FrameCue[];
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

/** What handling a surface-specific intent led to. */
export interface IntentOutcome<Model> {
  /** New device-local state, when the intent changed it. */
  readonly local?: LocalState;
  /** Given the model the intent produced, names the element focus should move to. */
  readonly focus?: (model: Model) => string | null;
}

interface ScreenConfig<View, Event, Input, Model> {
  readonly session: AudienceSession<View, Event>;
  readonly ports: ClientPorts;
  readonly host: ScreenHost;
  readonly phaseOf: (view: View) => PhaseFacts;
  /** Called for every redraw and before every intent is judged, so it may bring other state up to date. */
  readonly buildInput: (environment: ShellEnvironment, view: View | null, local: LocalState) => Input;
  readonly buildModel: (input: Input) => Model;
  readonly announcer: Announcer<Input>;
  /** Decides which of the session's events become cues, and when. */
  readonly director: Director<View, Event>;
  /** Cues from a source other than the event feed. Asked on every redraw, once the input is built. */
  readonly moreCues?: () => IssuedCue[];
  /** Surface-specific intents. Returns null when the intent is not handled or changed nothing. */
  readonly handleIntent: (intent: ShellIntent, context: { readonly local: LocalState; readonly model: Model }) => IntentOutcome<Model> | null;
  /** Other sources of change that should redraw the screen. Returns the function that stops watching. */
  readonly watch?: (onChange: () => void) => () => void;
  readonly dispose?: () => void;
}

export function createScreen<View, Event, Input, Model extends { readonly screen: string }>(
  config: ScreenConfig<View, Event, Input, Model>,
): ScreenController<Model> {
  const { session, ports, director } = config;
  const listeners = new Set<() => void>();
  let local: LocalState = { pageVisible: true, privateRevealed: false, deviceReducedMotion: false, motionChoice: null };
  let announcement: SpokenLine | null = null;
  let privateAnnouncement: SpokenLine | null = null;
  let spokenSeq = 0;
  let focus: ScreenFrame<Model>['focus'] = null;
  let focusSeq = 0;
  /** The current focus request names an element that exists only inside the private panel. */
  let focusIsPrivate = false;
  let privacyEpoch = 0;
  let privateWasOpen = false;
  let cues = NO_CUES;
  let privateCues = NO_CUES;
  let cueSeq = 0;
  /** What the director made of events that arrived since the last redraw. */
  let eventCues: IssuedCue[] = [];
  let tick: unknown = null;
  let stopSession: (() => void) | null = null;
  let stopEvents: (() => void) | null = null;
  let stopWatching: (() => void) | null = null;
  let disposed = false;

  function compute(): { input: Input; model: Model; remainingMs: number | null; view: View | null; current: boolean } {
    const state = session.getState();
    const deadline = state.view === null ? { kind: 'unsynced' } as const : estimateDeadline(config.phaseOf(state.view), session.readClock());
    const environment: ShellEnvironment = {
      mode: session.mode,
      connection: state.connection,
      problem: state.problem,
      deadline,
      motion: { reducedMotion: local.motionChoice ?? local.deviceReducedMotion, followsDevice: local.motionChoice === null },
    };
    // A private panel never outlives the screen it was opened on: when the match returns
    // after a recovery screen, it is shown again only if the player asks again.
    if (local.privateRevealed && resolveScreen(environment, state.view !== null) !== 'match') local = { ...local, privateRevealed: false };
    const input = config.buildInput(environment, state.view, local);
    return {
      input, model: config.buildModel(input), remainingMs: deadline.kind === 'running' ? deadline.remainingMs : null,
      view: state.view, current: isCurrent(environment),
    };
  }

  let frame: ScreenFrame<Model> = { model: compute().model, announcement, privateAnnouncement, focus, privacyEpoch, cues, privateCues };
  let drawn = JSON.stringify(frame.model);

  function refresh(focusFor?: (model: Model) => string | null): void {
    if (disposed) return;
    if (tick !== null) ports.scheduler.clearTimeout(tick);
    tick = null;

    const { input, model, remainingMs, view, current } = compute();
    const privateOpen = local.pageVisible && local.privateRevealed;
    if (privateWasOpen && !privateOpen) {
      privacyEpoch += 1;
      // Once private content has left the screen the frame carries no private line either,
      // no private cue, and no request to focus something that only a phone able to act
      // would have.
      privateAnnouncement = null;
      privateCues = NO_CUES;
      if (focusIsPrivate) focus = null;
      focusIsPrivate = false;
    }
    privateWasOpen = privateOpen;

    // The director is told where the screen stands on every redraw, so it judges each event
    // against the view that is actually shown. Only a view known to be current counts.
    const issued = eventCues;
    eventCues = [];
    if (current && view !== null) issued.push(...director.onView(view));
    else director.suspend();
    if (config.moreCues) issued.push(...config.moreCues());
    // A cue is shown now or not at all. With no match in front of the player there is
    // nothing to emphasize, and a private cue belongs inside the open private panel.
    const matchShowing = model.screen === 'match' && local.pageVisible;
    const nextPublic: FrameCue[] = [];
    const nextPrivate: FrameCue[] = [];
    for (const { cue, privacy } of issued) {
      const list = privacy === 'private' ? (privateOpen ? nextPrivate : null) : matchShowing ? nextPublic : null;
      if (list === null) continue;
      cueSeq += 1;
      list.push({ seq: cueSeq, cue });
    }
    if (nextPublic.length > 0) cues = nextPublic;
    if (nextPrivate.length > 0) privateCues = nextPrivate;

    const say = (lines: readonly LiveAnnouncement[]): SpokenLine => {
      spokenSeq += 1;
      return {
        seq: spokenSeq,
        politeness: lines.some(line => line.politeness === 'assertive') ? 'assertive' : 'polite',
        text: lines.map(line => line.text).join(' '),
      };
    };
    const lines = config.announcer.next(input);
    const open = lines.filter(line => line.private !== true);
    // A private line is spoken only in front of an open private panel, whatever produced it.
    const secret = privateOpen ? lines.filter(line => line.private === true) : [];
    if (open.length > 0) announcement = say(open);
    if (secret.length > 0) privateAnnouncement = say(secret);
    const blocked = model.screen === 'blocked' && frame.model.screen !== 'blocked';
    const requested = blocked ? SHELL_IDS.blockedHeading : focusFor?.(model) ?? null;
    if (requested !== null) {
      focusSeq += 1;
      focus = { seq: focusSeq, targetId: requested };
      // Only a surface's own intents ask for focus besides a recovery screen, and on a phone
      // those all come from inside the private panel.
      focusIsPrivate = !blocked;
    }

    // One redraw per displayed second while a match is on screen in the foreground. A timer
    // that fires a moment early finds the same second still showing and waits out the rest.
    if (remainingMs !== null && local.pageVisible && model.screen === 'match') {
      tick = ports.scheduler.setTimeout(() => {
        tick = null;
        refresh();
      }, millisecondsToNextSecond(remainingMs));
    }

    // Nothing to draw, say, focus, emphasize or withdraw: keep the frame's identity and tell nobody.
    const serialized = JSON.stringify(model);
    if (
      serialized === drawn && announcement === frame.announcement && privateAnnouncement === frame.privateAnnouncement
      && focus === frame.focus && privacyEpoch === frame.privacyEpoch && cues === frame.cues && privateCues === frame.privateCues
    ) return;
    drawn = serialized;
    frame = { model, announcement, privateAnnouncement, focus, privacyEpoch, cues, privateCues };
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
      // The intent is judged against the present, not against the last frame that was drawn.
      const outcome = config.handleIntent(intent, { local, model: compute().model });
      if (outcome?.local !== undefined) local = outcome.local;
      refresh(outcome?.focus);
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
      stopSession = session.subscribe(() => refresh());
      // Every change of state has been drawn by the time an event is handed over, so the
      // director already knows the view the event is to be judged against.
      stopEvents = session.subscribeEvents(event => {
        eventCues.push(...director.onEvent(event));
        if (eventCues.length > 0) refresh();
      });
      stopWatching = config.watch?.(() => refresh()) ?? null;
      session.start();
      refresh();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (tick !== null) ports.scheduler.clearTimeout(tick);
      tick = null;
      stopSession?.();
      stopEvents?.();
      stopWatching?.();
      session.dispose();
      config.dispose?.();
      listeners.clear();
    },
  };
}
