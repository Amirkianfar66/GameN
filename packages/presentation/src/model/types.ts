import type { FullPlayerView, FullPublicView, PlayerView, PublicView, SeatId } from '@mothership/contracts';

/** A composed public view of either wire protocol. The shells read what both have, and what protocol 2 adds when it is there. */
export type PublicFacts = PublicView | FullPublicView;
/** A composed view of either wire protocol and either audience. */
export type AudienceFacts = PublicFacts | PlayerView | FullPlayerView;

// Derived from the audience views so this package never restates a contract enum.
export type PublicSeat = PublicFacts['seats'][number];
export type LocationName = PublicSeat['location'];
export type HealthState = PublicSeat['health'];
export type PhaseFacts = PublicFacts['phase'];
export type RoleName = (PlayerView | FullPlayerView)['self']['role'];
export type FactionName = NonNullable<FullPublicView['seats'][number]['revealedFaction']>;

/** Which backend a client is attached to. Fixture and emulator are always labeled on screen. */
export type DataSourceMode = 'fixture' | 'emulator' | 'production';

/** connecting: no view yet. live: fed and current. stale: last known view, feed interrupted. */
export type ConnectionStatus = 'connecting' | 'live' | 'stale';

/**
 * incompatible-protocol, integrity, no-access and access-unconfirmed replace the match with
 * a recovery screen. no-access: the server refused this identity the view, so nothing it
 * sent before may be shown any longer. access-unconfirmed: the server did not let this
 * device read, and that answer alone does not say why: on a deployed project it is also
 * what a sign-in or attestation that could not be confirmed looks like. Nothing is shown,
 * nothing is said to be lost, and the device may ask again. unreadable-update keeps the
 * last readable view and marks it stale.
 */
export type ShellProblem = 'incompatible-protocol' | 'integrity' | 'no-access' | 'access-unconfirmed' | 'unreadable-update';

/** A local estimate of the trusted phase deadline. It never advances or closes a phase. */
export type DeadlineEstimate =
  | { readonly kind: 'none' }
  | { readonly kind: 'unsynced' }
  | { readonly kind: 'running'; readonly remainingMs: number }
  | { readonly kind: 'expired' };

export interface MotionSettingsInput {
  /** Effective preference after combining the device setting and the player's own choice. */
  readonly reducedMotion: boolean;
  /** True while the value still follows the device setting. */
  readonly followsDevice: boolean;
}

export interface ShellEnvironment {
  readonly mode: DataSourceMode;
  readonly connection: ConnectionStatus;
  readonly problem: ShellProblem | null;
  readonly deadline: DeadlineEstimate;
  readonly motion: MotionSettingsInput;
}

/**
 * Where the player's own shot stands on this device, as far as this device knows. It is
 * driven by the command flow and by server answers, never by a guess: "registered" means
 * the server said so, and registration is not an outcome.
 *
 * armed: a control that has only just appeared does nothing yet. The second tap of a double
 * tap lands wherever the screen has drawn the next control.
 */
export type ShotFlowInput =
  /**
   * Nothing in progress. registered is set while this device knows that its own command is
   * registered; the target is known only on the page that sent it, never after a reload.
   */
  | { readonly step: 'idle'; readonly registered: { readonly targetSeatId: SeatId | null } | null }
  | { readonly step: 'targeting' }
  | { readonly step: 'confirming'; readonly targetSeatId: SeatId; readonly armed: boolean }
  | { readonly step: 'submitting' }
  /**
   * No usable answer arrived; the client is finding out what happened. recovered: the page
   * was reloaded while the command was unresolved, and only its identifier survived.
   */
  | { readonly step: 'checking'; readonly recovered: boolean }
  /**
   * Automatic checking gave up. Nothing is assumed either way. phaseOver: the phase the
   * command was sent in has ended, so it can no longer be newly accepted.
   */
  | { readonly step: 'unknown'; readonly recovered: boolean; readonly phaseOver: boolean; readonly armed: boolean }
  /**
   * pending: the view still lists the command, or has not had the chance to yet. Once it is
   * false the registration is in the past, and the report must not speak of it as waiting.
   */
  | { readonly step: 'registered'; readonly targetSeatId: SeatId | null; readonly pending: boolean; readonly armed: boolean }
  /** The server answered with a rejection receipt. */
  | { readonly step: 'rejected'; readonly code: ShotRejectionCode; readonly armed: boolean }
  /** Known not to be registered, without a receipt saying so. */
  | { readonly step: 'not-registered'; readonly reason: ShotNotRegisteredReason; readonly armed: boolean };
export type ShotRejectionCode = 'PHASE_CLOSED' | 'NOT_ALLOWED';
/**
 * NOT_SENT: the request never left this device. PHASE_OVER: after a reload, no receipt
 * existed once the command's phase had ended. The others are the server's own safe errors.
 */
export type ShotNotRegisteredReason = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INVALID_REQUEST' | 'UNSUPPORTED_PROTOCOL' | 'COMMAND_ID_CONFLICT' | 'NOT_SENT' | 'PHASE_OVER';

export interface PlayerShellInput extends ShellEnvironment {
  readonly view: PlayerView | null;
  readonly privacy: {
    /** The page is backgrounded: nothing private is put in the document, whatever was open. */
    readonly concealed: boolean;
    /** The player has deliberately opened the private panel. Closed is the default. */
    readonly revealed: boolean;
  };
  readonly shot: ShotFlowInput;
}

export interface TableShellInput extends ShellEnvironment {
  readonly view: PublicFacts | null;
}

/** Where a player may move, as the server names it. */
export type Destination = FullPlayerView['self']['movementDestinations'][number];
/**
 * An action that names one seat: an ordinary shot, a Disabler's attack, a grant of
 * Protection, a Rescue, a request for a Hack, a showdown shot. Each is offered only while
 * the player's own view lists seats for it.
 */
export type TargetActionKind = 'shot' | 'disable' | 'protect' | 'rescue' | 'hack' | 'showdown-shot';
/**
 * A ballot that names one seat or nobody: a vote in a Captain election or a Jail vote, and
 * the Captain's choice of the jailed player to ask a release vote for. Naming nobody is an
 * abstention, or no request.
 */
export type SeatBallotKind = 'vote' | 'release-choice';
/** A ballot on the release the Captain asked for: yes, no, or an abstention. */
export type ReleaseVoteKind = 'release-vote';
/**
 * An action whose choice has more than one part, picked one after another: a Scan names a
 * seat and a guessed faction, a Supply names two seats, a Code attempt names four.
 */
export type CompoundActionKind = 'scan' | 'supply' | 'code';
export type ActionKind = 'pass' | 'move' | TargetActionKind | SeatBallotKind | ReleaseVoteKind | CompoundActionKind;
/** What a player picked for one action. It exists on the page that picked it and is never stored. */
export type ActionChoice =
  | { readonly kind: 'pass' }
  | { readonly kind: 'move'; readonly destination: Destination }
  | { readonly kind: TargetActionKind; readonly targetSeatId: SeatId }
  | { readonly kind: SeatBallotKind; readonly targetSeatId: SeatId | null }
  | { readonly kind: ReleaseVoteKind; readonly approve: boolean | null }
  | { readonly kind: 'scan'; readonly targetSeatId: SeatId; readonly guess: FactionName }
  | { readonly kind: 'supply'; readonly targetSeatIds: readonly [SeatId, SeatId] }
  | { readonly kind: 'code'; readonly seatIds: readonly [SeatId, SeatId, SeatId, SeatId] };
/**
 * Why a command is known not to have been accepted without a rejection receipt. NOT_SENT:
 * the request never left this device. PHASE_OVER: after a reload, no receipt existed once
 * the command's phase had ended. The others are the server's own safe failures.
 */
export type NotAcceptedReason =
  | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INVALID_REQUEST' | 'UNSUPPORTED_PROTOCOL' | 'COMMAND_ID_CONFLICT' | 'REQUEST_ID_CONFLICT'
  // Decided by this device, not by the server: nothing was sent, or nothing that the server ever looked at.
  | 'NOT_SENT' | 'NOT_RECORDED' | 'PHASE_OVER';

/**
 * Where the player's own command stands under wire protocol 2, as far as this device
 * knows. One command at a time for the seat, whatever its kind. choice is null on a
 * reloaded page, which kept the command's identifiers and nothing about it.
 */
export type ActionFlowState =
  | { readonly step: 'idle' }
  /** picked: the parts already chosen of a choice that has several, in the order they were picked. Absent when there are none. */
  | { readonly step: 'choosing'; readonly kind: ActionKind; readonly picked?: readonly string[] }
  | { readonly step: 'confirming'; readonly choice: ActionChoice; readonly armed: boolean }
  | { readonly step: 'submitting'; readonly choice: ActionChoice | null }
  | { readonly step: 'checking'; readonly choice: ActionChoice | null; readonly recovered: boolean }
  | { readonly step: 'unknown'; readonly choice: ActionChoice | null; readonly recovered: boolean; readonly phaseOver: boolean; readonly armed: boolean }
  /** The server accepted it. For a queued command that is a registration and not an outcome; a move has already happened. */
  | { readonly step: 'accepted'; readonly choice: ActionChoice | null; readonly armed: boolean }
  | { readonly step: 'rejected'; readonly choice: ActionChoice | null; readonly code: ShotRejectionCode; readonly armed: boolean }
  | { readonly step: 'not-accepted'; readonly choice: ActionChoice | null; readonly reason: NotAcceptedReason; readonly armed: boolean };

/** A player's phone connected to a backend that speaks wire protocol 2. */
export interface ConnectedPlayerInput extends ShellEnvironment {
  readonly view: FullPlayerView | null;
  readonly privacy: PlayerShellInput['privacy'];
  readonly action: ActionFlowState;
}

/** Actions a shell control can request. The host forwards them; it never acts on its own. */
export type ShellIntent =
  | { readonly type: 'private/toggle' }
  | { readonly type: 'session/reconnect' }
  | { readonly type: 'app/reload' }
  | { readonly type: 'settings/reduce-motion'; readonly checked: boolean }
  | { readonly type: 'shot/open' }
  | { readonly type: 'shot/choose-target'; readonly seatId: SeatId }
  | { readonly type: 'shot/back' }
  | { readonly type: 'shot/confirm' }
  | { readonly type: 'shot/check-again' }
  | { readonly type: 'shot/dismiss' }
  | { readonly type: 'action/pass' }
  | { readonly type: 'action/open'; readonly kind: ActionKind }
  /** value names a destination, a seat or an answer, exactly as the control carried it. The screen checks it against what is offered. */
  | { readonly type: 'action/choose'; readonly value: string }
  | { readonly type: 'action/back' }
  | { readonly type: 'action/confirm' }
  | { readonly type: 'action/check-again' }
  | { readonly type: 'action/dismiss' };
export type ShellIntentType = ShellIntent['type'];

export type MarkerKind = 'self' | 'turn' | 'health' | 'jail' | 'captain' | 'faction';
export interface MarkerModel {
  readonly kind: MarkerKind;
  /** Selects a shape and border treatment. Meaning is always carried by the label. */
  readonly variant: string;
  readonly label: string;
}

export interface SeatModel {
  readonly seatId: SeatId;
  readonly number: number;
  /** "Player 3", or "Player 3 (you)" on that player's own phone. */
  readonly label: string;
  readonly isSelf: boolean;
  readonly isActive: boolean;
  readonly location: LocationName;
  readonly health: HealthState;
  readonly jailed: boolean;
  readonly captain: boolean;
  readonly markers: readonly MarkerModel[];
}

export interface ZoneModel {
  readonly id: string;
  readonly name: LocationName;
  readonly seats: readonly SeatModel[];
  readonly emptyText: string;
  readonly containsSelf: boolean;
}

export type TimerModel =
  | { readonly state: 'running'; readonly display: string; readonly spoken: string; readonly finalSeconds: boolean }
  | { readonly state: 'expired'; readonly display: string; readonly spoken: string; readonly note: string }
  | { readonly state: 'syncing'; readonly display: string; readonly spoken: string }
  | { readonly state: 'none'; readonly spoken: string };

export interface PhaseStripModel {
  readonly roundLabel: string;
  readonly phaseLabel: string;
  readonly detail: string | null;
  readonly timer: TimerModel;
}

export interface BannerModel {
  readonly id: string;
  readonly kind: 'data-source' | 'connection';
  readonly variant: 'fixture' | 'emulator' | 'stale' | 'unreadable';
  readonly text: string;
  readonly action: { readonly intent: ShellIntentType; readonly label: string } | null;
}

export interface BlockedModel {
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly action: { readonly intent: ShellIntentType; readonly label: string };
}

export interface SettingsModel {
  readonly heading: string;
  readonly reduceMotion: { readonly label: string; readonly checked: boolean; readonly hint: string };
}

export interface MatchDetailsModel {
  readonly summary: string;
  readonly entries: readonly { readonly term: string; readonly value: string }[];
}

export interface CardButtonModel {
  readonly id: string;
  readonly label: string;
  readonly intent: Exclude<ShellIntentType, 'shot/choose-target' | 'settings/reduce-motion' | 'action/open' | 'action/choose'>;
  readonly primary: boolean;
  /** Drawn, reachable and named, but not active yet. It is never removed from the tab order. */
  readonly disabled: boolean;
}

export interface ShotTargetModel {
  readonly seatId: SeatId;
  readonly number: number;
  readonly label: string;
  /** The target's public status in words, exactly as every other player can see it. */
  readonly detail: string;
}

/** What the Shot card shows below its title and status. One step is on screen at a time. */
export type ShotCardBody =
  | {
    readonly step: 'idle';
    /** Present only when the interface would let the player start now. The server still decides. */
    readonly open: CardButtonModel | null;
    /** Why there is no way to start, in terms of facts this player may know. */
    readonly reason: string | null;
    /** A registration this seat already has. */
    readonly note: string | null;
  }
  | {
    readonly step: 'targeting'; readonly prompt: string; readonly note: string; readonly targets: readonly ShotTargetModel[];
    readonly emptyText: string; readonly back: CardButtonModel;
  }
  | { readonly step: 'confirming'; readonly prompt: string; readonly consequence: string; readonly confirm: CardButtonModel; readonly back: CardButtonModel }
  | { readonly step: 'busy'; readonly text: string }
  | {
    readonly step: 'result';
    readonly outcome: 'registered' | 'not-registered' | 'unknown';
    readonly text: string;
    readonly detail: string | null;
    readonly action: CardButtonModel;
    /** A second way on, where there is one: leaving an unknown result once its phase is over. */
    readonly secondary: CardButtonModel | null;
  };

export type ShotCardStatus = 'available' | 'unavailable' | 'targeting' | 'confirming' | 'submitting' | 'checking' | 'unknown' | 'registered' | 'was-registered' | 'not-registered';

export interface ActionCardModel {
  readonly id: 'shot';
  readonly title: string;
  /** The step the card is in, by name. Never an outcome: "registered" is not "resolved". */
  readonly status: ShotCardStatus;
  readonly statusLabel: string;
  /** True from the moment the player picks the card up until its command is settled. */
  readonly selected: boolean;
  readonly body: ShotCardBody;
}

export interface ActionsModel {
  readonly heading: string;
  readonly notice: string | null;
  readonly cards: readonly ActionCardModel[];
}

/**
 * Everything on a phone that is private to its seat: the role and what the seat can do.
 * It is one panel, closed by default, because in early rounds merely having an available
 * action identifies a role to anyone who glimpses the screen.
 */
export interface PrivateAreaModel {
  readonly heading: string;
  readonly hint: string;
  readonly open: boolean;
  readonly toggleLabel: string;
  /** Present only while open in the foreground. Closed, nothing private is in the model at all. */
  readonly content: {
    readonly role: { readonly label: string; readonly name: RoleName };
    readonly actions: ActionsModel;
  } | null;
}

/** What every screen has, whatever the surface or the wire protocol behind it. */
export interface ShellModelBase {
  readonly title: string;
  readonly screen: 'connecting' | 'match' | 'blocked';
  readonly mode: DataSourceMode;
  readonly connection: ConnectionStatus;
  readonly motion: 'full' | 'reduced';
  readonly banners: readonly BannerModel[];
  readonly blocked: BlockedModel | null;
  readonly connectingText: string;
  readonly settings: SettingsModel;
}

export interface PlayerMatchModel {
  readonly identity: { readonly seatId: SeatId; readonly number: number; readonly label: string };
  readonly phase: PhaseStripModel;
  readonly location: {
    readonly heading: string;
    readonly name: LocationName;
    readonly statusLabel: string;
    /** The viewer's own seat, limited to the same public facts every other player sees. */
    readonly self: SeatModel;
    readonly othersHeading: string;
    readonly others: readonly SeatModel[];
    readonly aloneText: string;
  };
  readonly privateArea: PrivateAreaModel;
  readonly roster: { readonly heading: string; readonly zones: readonly ZoneModel[] };
  readonly details: MatchDetailsModel;
}

export interface PlayerShellModel extends ShellModelBase {
  readonly surface: 'player';
  readonly match: PlayerMatchModel | null;
}

/**
 * What every audience may know about voting: what is being voted on now, and the latest
 * count the server published. Never who voted for what: a ballot is known to its voter only.
 */
export interface VotePanelModel {
  readonly heading: string;
  /** The vote that is open, from the public ballot. Null outside a voting phase. */
  readonly current: { readonly title: string; readonly lines: readonly string[] } | null;
  /** The latest count the server published. It stays until the next one replaces it. */
  readonly lastTally: {
    readonly heading: string;
    readonly title: string;
    /** One row for each seat that could be voted for, in seat order. Empty for a release vote. */
    readonly counts: readonly { readonly seatId: SeatId; readonly label: string; readonly votes: number }[];
    readonly lines: readonly string[];
  } | null;
}

/**
 * How a match ended, the same for every audience: the winner the server names, or that the
 * host ended it. The roles and the Code are shown only when the server's view carries them.
 */
export interface ResultModel {
  readonly heading: string;
  readonly outcome: string;
  readonly lines: readonly string[];
  readonly reveal: {
    readonly heading: string;
    readonly columns: { readonly player: string; readonly role: string };
    readonly roles: readonly { readonly seatId: SeatId; readonly label: string; readonly role: RoleName }[];
    readonly code: string;
  } | null;
}

export interface TableMatchModel {
  readonly phase: PhaseStripModel;
  /** Null while the match is being played, and for a view that cannot carry an end. */
  readonly result: ResultModel | null;
  /** Null for a view that has no voting facts, and while there is nothing to say about a vote. */
  readonly vote: VotePanelModel | null;
  readonly board: { readonly heading: string; readonly zones: readonly ZoneModel[] };
  readonly roster: {
    readonly heading: string;
    readonly caption: string;
    readonly columns: { readonly player: string; readonly location: string; readonly health: string; readonly status: string };
    /** status lists the seat's turn, Jail and Captain markers by name; each stays its own fact. */
    readonly rows: readonly { readonly seat: SeatModel; readonly status: string }[];
  };
  readonly details: MatchDetailsModel;
}

export interface TableShellModel extends ShellModelBase {
  readonly surface: 'table';
  readonly match: TableMatchModel | null;
}

/** One thing a player may pick for an action: a place, a player or an answer, as the server offers it. */
export interface ActionChoiceModel {
  readonly id: string;
  /** What the control carries back: the destination, the seat identifier, or the name of an answer. */
  readonly value: string;
  readonly label: string;
  /** A target's public status in words; nothing for a place or an answer. */
  readonly detail: string | null;
  /** The seat's number for its token; null for a place or an answer. */
  readonly number: number | null;
}

/** One kind of action as it stands while nothing is in progress. */
export interface ActionOfferModel {
  readonly kind: ActionKind;
  readonly label: string;
  readonly statusLabel: string;
  /** Present only when the server offers at least one choice now, on a fresh view. */
  readonly open: { readonly id: string; readonly label: string } | null;
}

export type ConnectedActionBody =
  | { readonly step: 'idle'; readonly offers: readonly ActionOfferModel[]; readonly note: string | null }
  | {
    readonly step: 'choosing'; readonly prompt: string; readonly note: string; readonly choices: readonly ActionChoiceModel[]; readonly back: CardButtonModel;
    /** What has been picked so far of a choice that has several parts, in words; null when nothing has. */
    readonly progress: string | null;
    /** Private picks, used only while the player is explicitly choosing on their own board. */
    readonly pickedSeatIds: readonly SeatId[];
  }
  | { readonly step: 'confirming'; readonly prompt: string; readonly consequence: string; readonly confirm: CardButtonModel; readonly back: CardButtonModel }
  | { readonly step: 'busy'; readonly text: string }
  | {
    readonly step: 'result';
    readonly outcome: 'accepted' | 'not-accepted' | 'unknown';
    readonly text: string;
    readonly detail: string | null;
    // One control. A command whose outcome is unknown can be asked about again and cannot be put away.
    readonly action: CardButtonModel;
  };

export type ConnectedActionStatus = 'idle' | 'choosing' | 'confirming' | 'submitting' | 'checking' | 'unknown' | 'accepted' | 'not-accepted';

/** The one card for the player's own command. One command at a time, so one card. */
export interface ConnectedActionCardModel {
  readonly title: string;
  /** The action the card is about, or null when idle or when a reloaded page does not know it. */
  readonly kind: ActionKind | null;
  readonly status: ConnectedActionStatus;
  readonly statusLabel: string;
  /** True from the moment the player picks an action up until its command is settled. */
  readonly selected: boolean;
  readonly body: ConnectedActionBody;
  /** What this command marks on the player's own board. */
  readonly board: ActionBoardMarksModel;
}

/**
 * What the player's own command marks on their own comic board: seats and a room, from the
 * command's own choice and the server's offer, and nothing else. It exists only in a card,
 * so only while the private panel is open or a Pass of the player's own is on its way.
 */
export interface ActionBoardMarksModel {
  /** Seats that get a press area now: exactly the seats the view offers for the next part. */
  readonly eligible: readonly SeatId[];
  /** Seats chosen so far, in the order they were chosen. */
  readonly picked: readonly SeatId[];
  /** Supply and a Code attempt number their picks; a single chosen seat is checked instead. */
  readonly numbered: boolean;
  /** The chosen seats while the command is on its way to the server. */
  readonly pending: readonly SeatId[];
  /** While a seat is being chosen or confirmed, every other character is drawn faint. */
  readonly faint: boolean;
  /** A move being confirmed or sent: a tentative place in that room until the view shows the player there. */
  readonly move: { readonly destination: LocationName; readonly state: 'tentative' | 'pending' } | null;
}

export interface ConnectedPrivateAreaModel {
  readonly heading: string;
  readonly hint: string;
  readonly open: boolean;
  readonly toggleLabel: string;
  /** Present only while open in the foreground. Closed, nothing private is in the model at all. */
  readonly content: {
    readonly role: { readonly label: string; readonly name: RoleName };
    /** While the server says this seat is in a Hack: who with. Known to the two of them only. */
    readonly hack: string | null;
    /** While the server's view says this seat has voted in the open vote: its own ballot, as the server recorded it. */
    readonly ballot: string | null;
    /**
     * What the server's view tells this seat and nobody else: what its role knows, the
     * results it has been given, and what it holds. Null when the view says none of it.
     */
    readonly knowledge: { readonly heading: string; readonly items: readonly string[] } | null;
    readonly actions: { readonly heading: string; readonly notice: string | null; readonly card: ConnectedActionCardModel };
  } | null;
}

export interface ConnectedPlayerMatchModel extends Omit<PlayerMatchModel, 'privateArea'> {
  /** Ending your own turn is role-neutral; it does not require revealing the private card. */
  /**
   * inRules is false only in a match whose ruleset has no Pass (the legacy tuple) and whose
   * view does not offer one, so the control is left out instead of being unavailable forever.
   */
  readonly passTurn: { readonly available: boolean; readonly inRules: boolean; readonly card: ConnectedActionCardModel | null };
  readonly privateArea: ConnectedPrivateAreaModel;
  /** The public facts of a vote, the same on every phone and on the shared display. */
  readonly vote: VotePanelModel | null;
  /** How the match ended, once it has. The same on every phone and on the shared display. */
  readonly result: ResultModel | null;
}

export interface ConnectedPlayerShellModel extends ShellModelBase {
  readonly surface: 'player';
  readonly match: ConnectedPlayerMatchModel | null;
}

export interface LiveAnnouncement {
  readonly politeness: 'polite' | 'assertive';
  readonly text: string;
  /**
   * The text states something private to this seat. A host may speak it only while the
   * private panel is open and must remove it from the document when the panel closes.
   */
  readonly private?: true;
}
