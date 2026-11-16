import type {FoodTaskCommandRequest, FoodTaskPlayerView, FoodTaskPublicView, FoodTaskReceipt, PlanetPlayerView, SeatId} from '@mothership/contracts';
import type {PlanetGameState} from '@mothership/engine';
import type {PlanetPersistence} from '../../dist/planet-game.js';

export type FoodReceiptContext = Omit<FoodTaskCommandRequest, 'command'>;
export type OwnerToken = Readonly<{id: string; epoch: number; expiresAt: number}>;
export interface FoodSnapshot {
  phase: 'published';
  serverTimeMs: number;
  fresh: boolean;
  publicView: FoodTaskPublicView;
  playerView: FoodTaskPlayerView | null;
  ordinaryPlayerView: PlanetPlayerView | null;
}
export interface FoodFrame extends FoodSnapshot {
  frameEpoch: string;
  frameSequence: number;
}
export interface PrototypeStore extends PlanetPersistence {
  watch(key: string, changed: () => void, failed: (error: unknown) => void): () => void;
}
interface TaskSeed {
  session: {
    state: PlanetGameState;
    status: 'running';
    hostUid: string;
    displays: string[];
    members: {uid: string | null; seatId: SeatId; controller: 'human' | 'bot'; bindingRevision: number}[];
    foodService: {leases: Partial<Record<SeatId, {taskId: string; expiresAt: number; offline: boolean}>>};
  };
}
interface Admission {phase: 'durably-admitted'; admittedAt: number}
export interface FoodTaskCoordinator {
  openTask(seed: TaskSeed): Promise<string>;
  acquire(taskId: string, ownerId: string): Promise<OwnerToken | null>;
  restore(taskId: string, owner: OwnerToken): Promise<{processed: number; pending: number; nextAt: number | null; returned: boolean}>;
  submit(taskId: string, uid: string, input: FoodTaskCommandRequest): Promise<Admission & {commandId: string; duplicate: boolean}>;
  heartbeat(taskId: string, uid: string): Promise<Admission>;
  runDue(taskId: string, owner: OwnerToken, options?: {beforeCommit?: (kind: string) => Promise<void>}): Promise<{nextAt: number | null; pending: number | null}>;
  receipt(taskId: string, uid: string, context: FoodReceiptContext): Promise<Admission | {phase: 'applied'; admittedAt: number; receipt: FoodTaskReceipt | null; refusal: string | null} | null>;
  snapshot(taskId: string, uid: string): Promise<FoodSnapshot>;
  subscribe(taskId: string, uid: string, publish: (frame: FoodFrame) => void, failed: (error: unknown) => void): () => void;
  clockSample(taskId: string, uid: string): Promise<{receivedAt: number; serverTimeMs: number}>;
  wakeOnAdmission(taskId: string, wake: () => void, failed: (error: unknown) => void): () => void;
}
export function createFoodTaskCoordinator(options: {
  store: PrototypeStore;
  engine?: typeof import('@mothership/engine');
  clock?: () => number;
  randomSamples?: () => number[];
  onEvent?: (row: Readonly<{stage: string; localMs: number; [key: string]: unknown}>) => void;
}): FoodTaskCoordinator;
