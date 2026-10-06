import type { PlayerView, PublicView, SeatId } from '@mothership/contracts';

// Derived from the audience views so this package never restates a contract enum.
export type PublicSeat = PublicView['seats'][number];
export type LocationName = PublicSeat['location'];
export type HealthState = PublicSeat['health'];
export type PhaseFacts = PublicView['phase'];
export type RoleName = PlayerView['self']['role'];

/** Which backend a client is attached to. Fixture and emulator are always labeled on screen. */
export type DataSourceMode = 'fixture' | 'emulator' | 'production';

/** connecting: no view yet. live: fed and current. stale: last known view, feed interrupted. */
export type ConnectionStatus = 'connecting' | 'live' | 'stale';

/**
 * incompatible-protocol and integrity replace the match with a recovery screen.
 * unreadable-update keeps the last readable view and marks it stale.
 */
export type ShellProblem = 'incompatible-protocol' | 'integrity' | 'unreadable-update';

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

export interface PlayerShellInput extends ShellEnvironment {
  readonly view: PlayerView | null;
  readonly privacy: {
    /** The page is backgrounded: nothing private is put in the document, whatever was open. */
    readonly concealed: boolean;
    /** The player has deliberately opened the private panel. Closed is the default. */
    readonly revealed: boolean;
  };
}

export interface TableShellInput extends ShellEnvironment {
  readonly view: PublicView | null;
}

/** Actions a shell control can request. The host forwards them; it never acts on its own. */
export type ShellIntent =
  | { readonly type: 'private/toggle' }
  | { readonly type: 'session/reconnect' }
  | { readonly type: 'app/reload' }
  | { readonly type: 'settings/reduce-motion'; readonly checked: boolean };
export type ShellIntentType = ShellIntent['type'];

export type MarkerKind = 'self' | 'turn' | 'health' | 'jail' | 'captain';
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

export interface ActionCardModel {
  readonly id: 'shot';
  readonly title: string;
  readonly status: 'available' | 'unavailable';
  readonly statusLabel: string;
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

interface ShellModelBase {
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

export interface TableMatchModel {
  readonly phase: PhaseStripModel;
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

export interface LiveAnnouncement {
  readonly politeness: 'polite' | 'assertive';
  readonly text: string;
}
