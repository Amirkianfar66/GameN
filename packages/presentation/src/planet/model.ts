import type { PlanetBoardView, PlanetCommand, PlanetPlayerView, PlanetPublicView, PlanetRole, PlanetSlotId, SeatId } from '@mothership/contracts';

export type PlanetCommandType = PlanetCommand['type'];
export type PlanetView = PlanetPublicView | PlanetPlayerView;
export type PlanetPanel = 'board'|'actions'|'card'|'promises'|'windows'|'navigation'|'hospital';
export interface PlanetIdentity { readonly seatId: SeatId; readonly characterId: string | null; readonly displayName: string | null }
export interface PlanetChoice { readonly value: string; readonly label: string }
export interface PlanetActionModel {
  readonly type: PlanetCommandType; readonly label: string;
  readonly step: 'targets'|'slots'|'faction'|'direction'|'number'|'promise'|'confirm'|'sending'|'accepted'|'rejected'|'unknown';
  readonly selected: readonly string[]; readonly choices: readonly PlanetChoice[];
  readonly prompt: string; readonly confirmation: string | null; readonly canConfirm: boolean;
}
export interface PlanetScreenModel {
  readonly protocolVersion: 3; readonly versions: PlanetView['versions']|null; readonly surface: 'player'|'display'; readonly mode: 'authenticated'|'synthetic';
  readonly connection: 'connecting'|'live'|'stale'|'error'; readonly message: string | null;
  readonly matchId: string; readonly playerCount:7|8|9|null; readonly round: number | null; readonly revision: number | null;
  readonly board: PlanetBoardView | null; readonly boardLabel: string | null;
  readonly phase: { readonly id: string; readonly kind: string; readonly remainingMs: number | null; readonly trusted: boolean; readonly expired: boolean } | null;
  readonly offices: PlanetPublicView['offices'] | null; readonly talk: PlanetPublicView['hackSession'];
  readonly navigation: PlanetPublicView['navigation'] | null; readonly result: PlanetPublicView['result'];
  readonly endReveal: PlanetPublicView['endReveal']; readonly lastTally: PlanetPublicView['lastTally'];
  readonly identities: readonly PlanetIdentity[]; readonly panel: PlanetPanel; readonly concealed: boolean;
  readonly activeSeatId: SeatId | null; readonly ownSeatId: SeatId | null; readonly canPass: boolean; readonly canMove: boolean; readonly moveRooms:readonly ('Room A'|'Room B'|'Command Room')[]; readonly dark: boolean;
  readonly action: PlanetActionModel | null;
  readonly privateArea: null | {
    readonly role?: { readonly name: PlanetRole; readonly faction: string; readonly guide: string; readonly device: string | null };
    readonly abilities?: PlanetPlayerView['abilities']; readonly knowledge?: PlanetPlayerView['knowledge'];
    readonly resources?: { readonly ordinaryWeapons: number; readonly roleActionSpent: boolean; readonly movementSpent: boolean };
    readonly offers?: PlanetPlayerView['offers']; readonly promises?: PlanetPlayerView['promises']; readonly promiseQuota?: PlanetPlayerView['promiseQuota'];
    readonly windows?: PlanetPlayerView['windows']; readonly navigation?: PlanetPlayerView['privateNavigation'];
    readonly captainCommands?:PlanetPlayerView['abilities']['captainCommands']; readonly ownBallot?:PlanetPlayerView['ownBallot']; readonly blackoutTargeting?: PlanetPlayerView['blackoutTargeting']; readonly panelAttemptSpent?: boolean; readonly hackFeedback?: PlanetPlayerView['hackFeedback'];
  };
  readonly presentation: null | {readonly nowMs:number;readonly startedAt:number;readonly endsAt:number|null;readonly events:PlanetView['events'];readonly blackout:PlanetView['blackout'];readonly clone:PlanetPlayerView['abilities']['clone']};
  readonly recovery: null | { readonly status: 'unknown'|'checking'; readonly canCheck: boolean; readonly canRetry: boolean };
}
export const PLANET_ACTION_LABELS: Readonly<Record<PlanetCommandType,string>> = Object.freeze({
 PASS_TURN:'Pass',MOVE:'Move',REGISTER_SHOT:'Shoot',PROTECT:'Grant Protection',RESCUE:'Rescue',SUPPLY:'Supply',SCAN:'Scan',SUBMIT_CODE:'Submit final Code',ACTIVATE_SHIP_HACK:'Hack Spaceship',ENGINEER_SUPPRESS:'Suppress navigation',ACTIVATE_BLACKHOLE:'Activate Blackhole',ACTIVATE_CLONE:'Activate Clone',REQUEST_BLACKOUT:'Request Blackout',SELECT_BLACKOUT_SLOT:'Choose fixed slot',CAPTAIN_RELEASE:'Release',CAPTAIN_EJECT:'Eject',APPOINT_OFFICER:'Appoint Officer',BLOCK_MOVE:'Block movement',CHOOSE_NAV_DIRECTION:'Choose tie direction',CONFIRM_NAVIGATION:'Acknowledge direction',VOTE:'Vote',REQUEST_HACK:'Private talk',DECLARE_HACK_SIDE:'Declare side',PANEL_CODE:'Hospital panel',OFFER_PROMISE:'Offer a Promise',ACCEPT_PROMISE:'Accept Promise',DECLINE_PROMISE:'Decline Promise',SHOW_WINDOW:'Show drawing',
});
export const PLANET_ROLE_GUIDE: Readonly<Record<PlanetRole,string>> = Object.freeze({
 Insider:'Your unmapped trio is Undercover, Alien and Doctor. Together with your own number it forms the Code.',
 Doctor:'Two injections are shared with the Hospital panel in your current state. A registered Rescue resolves later; it does not revive an eliminated player.',
 'Blue Disabler':'Use only the Blackout controls offered by your current view. During darkness, select a fixed position in your bound room.',
 Supplier:'Your Supply opportunity is in Round 3. Choose two distinct offered players. No later replenishment is promised.',
 Undercover:'You begin with one ordinary weapon. Your authorized Protection grants activate at their stated round. Ordinary shooting begins in Round 4.',
 Hacker:'Scan privately; a wrong guess blocks the whole next round. From Round 2 you have one final Code attempt. Correct Code unlocks Hack Spaceship without activating it; eligible activation uses your Role Action.',
 Alien:'You receive no complete Code. Clone follows its authoritative expiry round. Use eligible secret Blackhole while holding an office before turns; surviving after personally using Blackhole permits co-victory at either planet.',
 'Red Disabler':'You know Undercover. Use only the Blackout controls offered by your current view, with fixed room coordinates during darkness.',
 Engineer:'Once per match, your eligible Role Action captures the opposite room’s current player identities. Their navigation weight is suppressed through this round; later movement does not change those identities.',
});
const DEVICES: Readonly<Partial<Record<PlanetRole,string>>> = Object.freeze({Doctor:'cracker',Insider:'insider','Blue Disabler':'blue-disabler',Supplier:'supplier',Undercover:'undercover',Hacker:'hacker',Alien:'alien','Red Disabler':'red-disabler'});
export function planetRoleLook(role:PlanetRole,faction:string){return {name:role,faction,guide:PLANET_ROLE_GUIDE[role],device:DEVICES[role]??null};}
export function planetRolePresentation(view: PlanetPlayerView) { return planetRoleLook(view.self.role,view.self.faction); }
export const PLANET_WINDOW_ENDPOINTS = Object.freeze({A_B:['Room A','Room B'],A_HOSPITAL:['Room A','Hospital'],B_JAIL:['Room B','Jail']} as const);
export const PLANET_DRAWING_STATIONS: Readonly<Partial<Record<PlanetSlotId,PlanetPlayerView['windows'][number]['windowId']>>> = Object.freeze({A1:'A_B',B1:'A_B',A2:'A_HOSPITAL',B2:'B_JAIL'});
export function ownPlanetWindows(view: PlanetPlayerView,options?:{readonly dark:boolean}): PlanetPlayerView['windows'] {
 const own=view.board.seats.find(s=>s.seatId===view.self.seatId);
 if(!own||own.health==='Eliminated'||own.location===null||view.phase.kind==='BLACKOUT'&&(options?.dark??true))return [];
 return view.windows.filter(w=>(PLANET_WINDOW_ENDPOINTS[w.windowId] as readonly string[]).includes(own.location!))
  .map(w=>({...w,canDraw:w.canDraw&&own.slotId!==null&&PLANET_DRAWING_STATIONS[own.slotId]===w.windowId,drawings:w.drawings.filter(d=>d.windowId===w.windowId&&d.round===view.round)}));
}
export function planetIsPlayer(view: PlanetView): view is PlanetPlayerView { return 'self' in view; }
export function planetConfirmation(command: PlanetCommand): string {
 switch(command.type){
  case 'SCAN':return `Scan Player ${command.targetSeatId.slice(5)} with a ${command.guess} faction guess? A wrong guess also blocks the next whole round.`;
  case 'SUPPLY':return `Supply Players ${command.targetSeatIds.map(id=>id.slice(5)).join(' and ')}? This uses the Round 3 Supply opportunity.`;
  case 'VOTE':return command.targetSeatId===null?'Register an abstention?':`Register your ballot for Player ${command.targetSeatId.slice(5)}?`;
  case 'DECLARE_HACK_SIDE':return `Declare ${command.declaredSide} to your private-talk partner? This is an unverified claim.`;
  case 'CHOOSE_NAV_DIRECTION':return `Choose ${command.direction} for the actual navigation tie?`;
  case 'SELECT_BLACKOUT_SLOT':return `Register fixed position ${command.slotId} in your bound room? The strike resolves authoritatively.`;
  case 'MOVE':return `Move to ${command.destination}, ${command.slotId}? Entering or repositioning spends this round’s movement.`;
  case 'SUBMIT_CODE':return `Submit the one final Code attempt: ${command.seatIds.map(id=>id.slice(5)).join(', ')}? A wrong attempt cannot be retried.`;
  case 'ACTIVATE_SHIP_HACK':return 'Activate Hack Spaceship? This spends the Role Action and, if retained, forces Red for the normal single move.';
  case 'ENGINEER_SUPPRESS':return 'Capture the opposite room’s current identities for navigation suppression through this round?';
  case 'ACTIVATE_BLACKHOLE':return 'Secretly activate Blackhole? This spends its global lifetime use and this round’s Role Action.';
  case 'PANEL_CODE':return `Submit Player ${command.doctorSeatId.slice(5)} as Doctor’s number? An accepted attempt is not an immediate heal.`;
  case 'CAPTAIN_RELEASE':return 'Release the living physical Jail occupants? Hospital detention reservations are unaffected.';
  case 'CAPTAIN_EJECT':return 'Eject all physical Jail occupants? Hospital detention reservations are unaffected.';
  case 'CONFIRM_NAVIGATION':return 'Acknowledge the final direction? Acknowledgement cannot change or veto it.';
  case 'SHOW_WINDOW':return 'Show this drawing to this window? It becomes an immutable, unverified claim until this round ends.';
  case 'OFFER_PROMISE':return `Offer ${PLANET_PROMISE_LABELS[command.kind]} to Player ${command.recipientSeatId.slice(5)}${command.targetSeatId?` for Jail-vote target Player ${command.targetSeatId.slice(5)}`:''}? Quota is consumed only after acceptance.`;
  case 'ACCEPT_PROMISE':return 'Accept these exact terms? This uses your incoming Promise quota for the match; actions are never forced.';
  default:return `${PLANET_ACTION_LABELS[command.type]}${'targetSeatId' in command&&command.targetSeatId?` — Player ${command.targetSeatId.slice(5)}`:''}?`;
 }
}

export const PLANET_PROMISE_LABELS = Object.freeze({CAPTAIN_SUPPORT:'Captain Support',OFFICER_SELECTION:'Officer Selection',JAIL_VOTE:'Jail Vote',NO_JAIL_VOTE:'No Jail Vote',MEET_A:'Meet in Room A',MEET_B:'Meet in Room B'});
export function planetPromiseTerms(p:Pick<PlanetPlayerView['promises'][number],'kind'|'giverSeatId'|'recipientSeatId'|'targetSeatId'|'round'|'electionId'>):string {
 const giver=`Player ${p.giverSeatId.slice(5)}`,recipient=`Player ${p.recipientSeatId.slice(5)}`;
 switch(p.kind){
  case 'CAPTAIN_SUPPORT':return `${giver} votes for ${recipient} in every applicable ballot, including runoffs, of the specified next Captain election agreed in Round ${p.round}.`;
  case 'OFFICER_SELECTION':return `If ${giver} wins the specified next Captain election, appoint ${recipient} as Officer.`;
  case 'JAIL_VOTE':return `${giver} votes for Player ${p.targetSeatId?.slice(5)} at the next Jail vote of Round ${p.round}; admission is not required.`;
  case 'NO_JAIL_VOTE':return `${giver} does not vote for ${recipient} at the next Jail vote of Round ${p.round}.`;
  case 'MEET_A':return `${giver} and ${recipient} are both in Room A at voting start after Sync in Round ${p.round}.`;
  case 'MEET_B':return `${giver} and ${recipient} are both in Room B at voting start after Sync in Round ${p.round}.`;
 }
}
