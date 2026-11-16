import type {PlanetServiceRequest, PlanetServiceResponse, SeatId} from '@mothership/contracts';

/** Private storage/worker version. It does not version the game or client wire. */
export const PLANET_FOOD_INBOX_VERSION = 'food-inbox-1' as const;

/** Stored creation profile. Missing profiles retain the ordered Session path. */
export const PLANET_FOOD_OWNER_INBOX_PROFILE = 'food-owner-inbox-1' as const;

export interface PlanetFoodInboxScope {
  readonly version: typeof PLANET_FOOD_INBOX_VERSION;
  readonly matchId: string;
  readonly phaseId: string;
  readonly taskId: string;
}

/** Trusted consequence of normal authorization, never accepted from a client. */
export interface PlanetFoodInboxBinding {
  readonly uid: string;
  readonly seatId: SeatId | null;
  readonly revision: number | null;
}

export type PlanetFoodInboxRequest = Extract<PlanetServiceRequest, {operation:
  'foodCommand' | 'foodHeartbeat' | 'abort' | 'issueRecovery' | 'redeemRecovery' | 'command'}>;

export interface PlanetFoodInboxIntent {
  readonly id: string;
  readonly scope: PlanetFoodInboxScope;
  readonly binding: PlanetFoodInboxBinding;
  readonly request: PlanetFoodInboxRequest;
  readonly fingerprint: string;
}

/** Server receipt time begins at the later successful ordered append. */
export interface PlanetFoodIntakeReceipt {
  readonly kind: 'queued';
  readonly id: string;
  readonly duplicate: boolean;
}

export interface PlanetFoodInboxOwner {
  readonly id: string;
  readonly epoch: number;
  readonly expiresAt: number;
}

export type PlanetFoodInboxProgress =
  | {readonly kind: 'admitted'; readonly sequence: number; readonly admittedAt: number}
  | {readonly kind: 'resolved'; readonly response: PlanetServiceResponse};

/** Private wake only. The dispatcher keeps the current browser wire unchanged. */
export interface PlanetFoodInboxWake {
  readonly kind: 'food-inbox';
  readonly id: string;
  readonly scope: PlanetFoodInboxScope;
  readonly wakeAt: number;
}

export type PlanetFoodInboxWorkResult =
  | {readonly status: 'idle' | 'stale'}
  | {readonly status: 'processed'; readonly intentId: string; readonly progress: PlanetFoodInboxProgress};

/** Private Cloud Task adapter. Successful duplicate enqueues fulfill this call. */
export type EnqueuePlanetFoodInboxWake = (wake: PlanetFoodInboxWake) => Promise<void>;
