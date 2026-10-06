import type { App } from 'firebase-admin/app';
import { getFunctions } from 'firebase-admin/functions';
import { IdentifierSchema } from '@mothership/contracts';
import type { AdvanceIfExpiredResponse, ApiFailure } from '@mothership/contracts';
import { deadlineTaskId } from '@mothership/game-api';
import type { DeadlineIntent, EnqueueDeadline } from '@mothership/game-api';

export interface DeadlinePayload {
  matchId: string;
  phaseId: string;
  deadlineToken: string;
}

export interface DeadlineQueue {
  enqueue(payload: DeadlinePayload, options: { id: string; scheduleTime: Date }): Promise<void>;
}

export interface DeadlineService {
  runDeadline(payload: DeadlinePayload): Promise<AdvanceIfExpiredResponse | ApiFailure>;
}

// Invoke only behind a trusted queue/IAM boundary. Auth metadata from the task SDK is not
// independently verified here and must never be used to turn this into a player endpoint.
export function createTrustedDeadlineHandler(service: DeadlineService) {
  return async (payload: unknown): Promise<void> => {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)
      || Object.keys(payload).length !== 3
      || !Object.keys(payload).every(key => ['matchId', 'phaseId', 'deadlineToken'].includes(key))
      || !('matchId' in payload) || !IdentifierSchema.safeParse(payload.matchId).success
      || !('phaseId' in payload) || !IdentifierSchema.safeParse(payload.phaseId).success
      || !('deadlineToken' in payload) || !IdentifierSchema.safeParse(payload.deadlineToken).success) {
      throw new Error('Invalid deadline task payload');
    }
    let result: AdvanceIfExpiredResponse | ApiFailure;
    try {
      result = await service.runDeadline({
        matchId: payload.matchId as string,
        phaseId: payload.phaseId as string,
        deadlineToken: payload.deadlineToken as string,
      });
    } catch {
      throw new Error('Deadline evaluation unavailable');
    }
    if ('ok' in result && result.ok === false) {
      if (result.error.code === 'UNSUPPORTED_PROTOCOL') throw new Error('Deadline pinned version unsupported');
      throw new Error('Deadline evaluation unavailable');
    }
    // Both advanced and stale/duplicate unchanged results acknowledge the task.
  };
}

function taskAlreadyExists(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || !('code' in error)) return false;
  // Firebase Admin maps the Cloud Tasks ALREADY_EXISTS response to this documented code.
  return error.code === 'functions/task-already-exists' || error.code === 'ALREADY_EXISTS' || error.code === 6;
}

export function createDeadlineEnqueuer(queue: DeadlineQueue): EnqueueDeadline {
  return async (intent: DeadlineIntent): Promise<void> => {
    const { matchId, phaseId, deadlineToken, taskId, endsAt } = intent;
    if (![matchId, phaseId, deadlineToken].every(value => IdentifierSchema.safeParse(value).success)
      || taskId !== deadlineTaskId(matchId, phaseId, deadlineToken)
      || !Number.isSafeInteger(endsAt) || endsAt < 0 || !Number.isFinite(new Date(endsAt).getTime())) {
      throw new Error('Invalid durable deadline intent');
    }
    try {
      await queue.enqueue({ matchId, phaseId, deadlineToken }, { id: taskId, scheduleTime: new Date(endsAt) });
    } catch (error) {
      if (!taskAlreadyExists(error)) throw error;
      // Enqueue/ack may have failed after Cloud Tasks accepted the stable ID. Repair can acknowledge it.
    }
  };
}

// Lazy factory only. No queue, IAM resource or external call is created at module load.
// A staging invoker policy and repair runner must be reviewed before connecting this adapter.
export function createFirebaseDeadlineEnqueuer(app: App, functionName: string): EnqueueDeadline {
  return createDeadlineEnqueuer(getFunctions(app).taskQueue<DeadlinePayload>(functionName));
}
