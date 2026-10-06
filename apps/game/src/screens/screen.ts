import { isCurrent, resolveScreen, SHELL_IDS } from '@mothership/presentation';
import type { Announcer, Cue, Director, IssuedCue, LiveAnnouncement, PhaseFacts, ShellEnvironment, ShellIntent } from '@mothership/presentation';
import type { SeatId } from '@mothership/contracts';
import { estimateDeadline, millisecondsToNextSecond } from '../clock/deadline.js';
import type { ClientPorts } from '../ports.js';
import type { AudienceSession } from '../session/audience-session.js';

/**
 * One thing for the page's live region to say. A new seq means say it, even if the text
 * repeats. The public and the private line are numbered separately, each from 1, and a
 * number only ever goes up within its own channel: nothing about one channel can be read
 * from the other's numbers.
 */
export interface SpokenLine {
  readonly seq: number;
  readonly politeness: 'polite' | 'assertive';
  readonly text: string;
}

/**
 * One cue for the page to show once. A consumer keeps the highest seq it has shown, per
 * list, and shows what is above it. Public and private cues are numbered separately, each
 * from 1, and a number only ever goes up within its own list: the public list is the same
 * whether or not this seat was ever given a private cue.
 */
export interface FrameCue {
  readonly seq: number;
  readonly cue: Cue;
}

/**
 * How long a cue may be started, and how late an event may make one. Client-side technical
 * values, neither a game rule, and neither delays or changes anything the model shows. They
 * are the two windows the Designer proposed (docs/design/motion-storyboards.md, "Cue
 * freshness", in the Designer's pull request #45) and Frontend agreed. Neither is measured on
 * a device or against a real event feed.
 */
export interface CueTiming {
  /**
   * The start window. A cue leaves the frame this long after it was issued, if nothing took
   * it out sooner, so a renderer that first reads the frame later than that does not start
   * it. A treatment that has started is the renderer's to finish: leaving the frame does
   * not cut it.
   */
  readonly lifetimeMs: number;
  /**
   * An event that arrives after its view is a cue only if the view has been on screen for
   * no longer than this. Later than that, the fact has long been shown and the moment is over.
   */
  readonly maxLatenessMs: number;
}
export const DEFAULT_CUE_TIMING: CueTiming = { lifetimeMs: 1_000, maxLatenessMs: 1_000 };

interface LiveCue extends FrameCue {
  /** By this device's monotonic clock. Not part of the frame. */
  readonly expiresAt: number;
  /** For a cue about the phase: the phase it was issued for. Not part of the frame. */
  readonly phaseId: string | null;
}

/** What anyone at the table may know about one seat, as far as a cue is concerned. */
export interface PublicSeatFacts {
  readonly seatId: SeatId;
  readonly location: string;
  readonly health: string;
}

/**
 * Whether the public fact a cue belongs to still stands on the screen: the phase it was
 * issued for is the phase shown, the seat is where the cue put it, the seat's health is
 * what the cue said. A cue about a seat that is no longer listed has nothing to stand on.
 */
function factStands(live: LiveCue, phaseId: string, seats: readonly PublicSeatFacts[]): boolean {
  const { cue } = live;
  switch (cue.kind) {
    case 'phase-change':
    case 'round-transition':
      return live.phaseId === phaseId;
    case 'public-move':
      return seats.find(seat => seat.seatId === cue.seatId)?.location === cue.to;
    case 'status-change':
      return seats.find(seat => seat.seatId === cue.seatId)?.health === cue.health;
    case 'registration':
      return true;
  }
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
   * Every cue that may be shown right now for what anyone at the table may see, in the
   * order issued. A cue is emphasis for something the model already shows: a page that
   * ignores this list loses no fact, and nothing ever waits for a cue to finish.
   *
   * What is in the list does not depend on how the facts were delivered. A cue is added
   * when the director issues it for the view on screen: with the view when its event came
   * first, with the event when the view came first. It stays until one of these takes it
   * out, and it never comes back:
   *   - the public fact it belongs to changes again: a newer phase, or a newer place or
   *     health of the same seat. A public cue belongs to one fact, not to a view;
   *   - the match is no longer on screen in the foreground, or its feed is no longer current;
   *   - its lifetime, which is the window in which it may be started, is over.
   * Nothing else takes it out, moves it or renumbers it. In particular a new view that
   * changes no public fact does not: on a phone the public list, its order and its numbers
   * are the same whatever this seat does in private at that moment, so nothing private can
   * be read from a public cue that stopped short.
   * So a consumer that reads only the latest frame sees every public cue that is still due,
   * and one that starts reading late finds nothing older than a cue's lifetime. It never
   * misses a fact: those are in the model.
   */
  readonly cues: readonly FrameCue[];
  /**
   * Cues that belong to this seat alone. They are in the list only while private content is
   * on screen, and gone the moment it is not. A private cue is about the seat's own command,
   * not about a view, so a new view does not take it out; its lifetime does, and so does
   * everything that takes a public cue out except a new view.
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
  /** The public facts about each seat that a cue can belong to. */
  readonly seatsOf: (view: View) => readonly PublicSeatFacts[];
  /** Called for every redraw and before every intent is judged, so it may bring other state up to date. */
  readonly buildInput: (environment: ShellEnvironment, view: View | null, local: LocalState) => Input;
  readonly buildModel: (input: Input) => Model;
  readonly announcer: Announcer<Input>;
  /** Decides which of the session's events become cues, and when. */
  readonly director: Director<View, Event>;
  /** Cues from a source other than the event feed. Asked on every redraw, once the input is built. */
  readonly moreCues?: () => IssuedCue[];
  readonly cueTiming?: Partial<CueTiming> | undefined;
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
  // One counter per channel. A shared one would let the public numbers show that something
  // private had been said or shown in between.
  let publicSpokenSeq = 0;
  let privateSpokenSeq = 0;
  let focus: ScreenFrame<Model>['focus'] = null;
  let focusSeq = 0;
  /** The current focus request names an element that exists only inside the private panel. */
  let focusIsPrivate = false;
  let privacyEpoch = 0;
  let privateWasOpen = false;
  const cueTiming: CueTiming = { ...DEFAULT_CUE_TIMING, ...config.cueTiming };
  let cues: readonly LiveCue[] = [];
  let privateCues: readonly LiveCue[] = [];
  let publicCueSeq = 0;
  let privateCueSeq = 0;
  /** The view on screen, and when it came on screen. */
  let cueView: View | null = null;
  let cueViewSince = 0;
  /** What is public in that view, and when a view first showed it. A view that changes only something private leaves both. */
  let cuePublicFacts: string | null = null;
  let cuePublicSince = 0;
  /** What the director made of events that arrived since the last redraw. */
  let eventCues: IssuedCue[] = [];
  let tick: unknown = null;
  let cueExpiry: unknown = null;
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

  /** What the frame hands out: the cue and its number, and nothing about this device's clock. */
  const published = (list: readonly LiveCue[]): readonly FrameCue[] => (list.length === 0 ? NO_CUES : list.map(({ seq, cue }) => ({ seq, cue })));
  let frame: ScreenFrame<Model> = { model: compute().model, announcement, privateAnnouncement, focus, privacyEpoch, cues: NO_CUES, privateCues: NO_CUES };
  let frameCues: readonly LiveCue[] = cues;
  let framePrivateCues: readonly LiveCue[] = privateCues;
  let drawn = JSON.stringify(frame.model);

  function refresh(focusFor?: (model: Model) => string | null): void {
    if (disposed) return;
    if (tick !== null) ports.scheduler.clearTimeout(tick);
    tick = null;
    if (cueExpiry !== null) ports.scheduler.clearTimeout(cueExpiry);
    cueExpiry = null;

    const { input, model, remainingMs, view, current } = compute();
    const privateOpen = local.pageVisible && local.privateRevealed;
    if (privateWasOpen && !privateOpen) {
      privacyEpoch += 1;
      // Once private content has left the screen the frame carries no private line either,
      // no private cue, and no request to focus something that only a phone able to act
      // would have.
      privateAnnouncement = null;
      privateCues = [];
      if (focusIsPrivate) focus = null;
      focusIsPrivate = false;
    }
    privateWasOpen = privateOpen;

    // The director is told where the screen stands on every redraw, so it judges each event
    // against the view that is actually shown. Only a view known to be current counts.
    const now = ports.clock.now();
    const fromEvents = eventCues;
    eventCues = [];
    const withView = current && view !== null ? director.onView(view) : [];
    if (!current || view === null) director.suspend();
    const fromElsewhere = config.moreCues ? config.moreCues() : [];

    // A public cue belongs to one public fact: the phase on screen, or where a seat is, or
    // its health. It is taken out early only when that fact has changed again. A view that
    // changes no public fact leaves every public cue exactly as it was: such a view arrives
    // when only something private changed, this seat's own registration for one, and a
    // public cue that stopped short at that moment would show an onlooker that it had. A
    // private cue belongs to this seat's own command, so a new view leaves it alone too.
    // With no match in front of the player on a current feed, nothing issued earlier is
    // still due, public or private.
    const matchShowing = model.screen === 'match' && local.pageVisible && current && view !== null;
    if (view !== cueView) {
      cueView = view;
      cueViewSince = now;
      const facts = view === null ? null : JSON.stringify([config.phaseOf(view).id, config.seatsOf(view).map(seat => [seat.seatId, seat.location, seat.health])]);
      if (facts !== cuePublicFacts) {
        cuePublicFacts = facts;
        cuePublicSince = now;
      }
    }
    if (view !== null && cues.length > 0) {
      const phaseId = config.phaseOf(view).id;
      const seats = config.seatsOf(view);
      if (cues.some(cue => !factStands(cue, phaseId, seats))) cues = cues.filter(cue => factStands(cue, phaseId, seats));
    }
    if (!matchShowing) {
      if (cues.length > 0) cues = [];
      if (privateCues.length > 0) privateCues = [];
    }
    // The rest leave when their time is up, whether or not anyone showed them.
    if (cues.some(cue => cue.expiresAt <= now)) cues = cues.filter(cue => cue.expiresAt > now);
    if (privateCues.some(cue => cue.expiresAt <= now)) privateCues = privateCues.filter(cue => cue.expiresAt > now);

    // An event that came after its view is a cue only while what it states is still new on
    // screen. Two clocks: a private fact is as new as the view that brought it; a public fact
    // is as old as the view that last changed something public. A view that changes only
    // something private must make an old public fact neither new again nor old sooner.
    const late = (privacy: IssuedCue['privacy']): boolean => now - (privacy === 'private' ? cueViewSince : cuePublicSince) > cueTiming.maxLatenessMs;
    const issued = [...fromEvents.filter(item => !late(item.privacy)), ...withView, ...fromElsewhere];
    // A cue is shown now or not at all: one that cannot be shown takes no number and is
    // never kept for a later frame. A private cue belongs inside the open private panel.
    const addedPublic: LiveCue[] = [];
    const addedPrivate: LiveCue[] = [];
    for (const { cue, privacy } of issued) {
      if (!matchShowing) continue;
      if (privacy === 'private') {
        if (!privateOpen) continue;
        privateCueSeq += 1;
        addedPrivate.push({ seq: privateCueSeq, cue, expiresAt: now + cueTiming.lifetimeMs, phaseId: null });
      } else {
        publicCueSeq += 1;
        // A cue is issued for the view on screen, so the phase it is about is the phase shown.
        addedPublic.push({ seq: publicCueSeq, cue, expiresAt: now + cueTiming.lifetimeMs, phaseId: view === null ? null : config.phaseOf(view).id });
      }
    }
    if (addedPublic.length > 0) cues = [...cues, ...addedPublic];
    if (addedPrivate.length > 0) privateCues = [...privateCues, ...addedPrivate];
    // Nothing waits for this timer. It only takes a cue out of the frame when its time is up,
    // so that a frame read late never offers an old cue as a new one.
    const nextExpiry = Math.min(...cues.map(cue => cue.expiresAt), ...privateCues.map(cue => cue.expiresAt));
    if (Number.isFinite(nextExpiry)) {
      cueExpiry = ports.scheduler.setTimeout(() => {
        cueExpiry = null;
        refresh();
      }, Math.max(0, nextExpiry - now));
    }

    const say = (seq: number, lines: readonly LiveAnnouncement[]): SpokenLine => ({
      seq,
      politeness: lines.some(line => line.politeness === 'assertive') ? 'assertive' : 'polite',
      text: lines.map(line => line.text).join(' '),
    });
    const lines = config.announcer.next(input);
    const open = lines.filter(line => line.private !== true);
    // A private line is spoken only in front of an open private panel, whatever produced it.
    const secret = privateOpen ? lines.filter(line => line.private === true) : [];
    if (open.length > 0) {
      publicSpokenSeq += 1;
      announcement = say(publicSpokenSeq, open);
    }
    if (secret.length > 0) {
      privateSpokenSeq += 1;
      privateAnnouncement = say(privateSpokenSeq, secret);
    }
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
      && focus === frame.focus && privacyEpoch === frame.privacyEpoch && cues === frameCues && privateCues === framePrivateCues
    ) return;
    drawn = serialized;
    frame = {
      model, announcement, privateAnnouncement, focus, privacyEpoch,
      cues: cues === frameCues ? frame.cues : published(cues), privateCues: privateCues === framePrivateCues ? frame.privateCues : published(privateCues),
    };
    frameCues = cues;
    framePrivateCues = privateCues;
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
      if (cueExpiry !== null) ports.scheduler.clearTimeout(cueExpiry);
      cueExpiry = null;
      stopSession?.();
      stopEvents?.();
      stopWatching?.();
      session.dispose();
      config.dispose?.();
      listeners.clear();
    },
  };
}
