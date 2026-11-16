globalThis[Symbol.for('mothership:dev-only')]=true;

import {parseFoodTaskReceipt, TimestampSchema} from '@mothership/contracts';

const limit = 512;

export function foodInputKind(command) {
  if (command.type === 'TASK_ANSWER') return command.answer;
  if (command.type !== 'TASK_PRESS') return command.type;
  const input = command.input;
  return input.kind === 'HOLD' ? 'HOLD_' + input.edge : input.kind;
}

// Joins inside this tab use the original command ID. The exported rows contain
// only trial ordinals and bounded observations. No packets or identities leave.
export function createFoodTrialTrace({now, timeOriginMs, seatId}) {
  const inputs = [], rows = new Map();
  const dropped = {inputs: 0, commands: 0, attempts: 0};
  const offset = (from, to) => from !== null && to !== null ? to - from : null;
  const rowsAt = ids => ids.flatMap(id => rows.has(id) ? [rows.get(id)] : []);
  return {
    input({kind, eventType, trusted, disabled}) {
      if (inputs.length === limit) { dropped.inputs++; return null; }
      const entry = {number: inputs.length + 1, kind, eventType, trusted, disabled, atMs: now(), submitted: false};
      inputs.push(entry);
      return entry.number;
    },

    dispatch(request, inputNumber, transport) {
      const id = request.commandId;
      let row = rows.get(id);
      if (!row) {
        if (rows.size === limit) { dropped.commands++; return transport(); }
        const kind = foodInputKind(request.command), event = inputs[inputNumber - 1];
        const input = event?.kind === kind ? event : null;
        if (input) input.submitted = true;
        row = {
          request,
          observation: {
            number: rows.size + 1, kind, inputNumber: input?.number ?? null, attempts: [],
            pendingDomAtMs: null, pendingRenderAtMs: null, receipt: null, controllerStatus: null,
            authority: null,
          },
        };
        rows.set(id, row);
      }
      return observeAttempt(row, 'command', transport);
    },

    lookup(context, transport) {
      const row = rows.get(context.commandId);
      return row ? observeAttempt(row, 'lookup', transport) : transport();
    },

    feedback(feedback) {
      const observation = rows.get(feedback?.commandId)?.observation;
      if (observation) observation.controllerStatus = feedback.status;
    },

    pendingDom(commandId, confirmAfterRender) {
      const row = rows.get(commandId)?.observation;
      if (!row || row.pendingDomAtMs !== null) return;
      row.pendingDomAtMs = now();
      return () => {
        if (confirmAfterRender()) row.pendingRenderAtMs = now();
      };
    },

    // The adapter supplies exact command-to-frame correlation. A revision
    // advance alone is never a witness. A paint sample is recorded only if the
    // same state remains present after a visible rendering opportunity.
    projected({epoch, sequence, receivedAtMs, publishedAtServerMs = null, commandIds, production = false}, witness) {
      const atMs = now();
      if (!Number.isFinite(receivedAtMs) || receivedAtMs > atMs) return [];
      const slot = production ? 'observedEffect' : 'authority';
      const matches = (production ? [...rows.values()] : rowsAt(commandIds)).flatMap(({request, observation: row}) => {
        if (row[slot]?.renderAtMs != null || receivedAtMs < row.attempts[0].sentAtMs) return [];
        const outcome = witness(request);
        return outcome ? [{request, row, outcome}] : [];
      });
      // The production stream carries no command witness. Report only a unique
      // visible change matching a submitted input, separately from its receipt.
      if (production && matches.length !== 1) return [];
      return matches.map(({request, row, outcome}) => {
        const effect = {epoch, sequence, receivedAtMs, publishedAtServerMs, domAtMs: atMs, renderAtMs: null, outcome};
        row[slot] = effect;
        return () => {
          if (row[slot] === effect && witness(request) === outcome) effect.renderAtMs = now();
        };
      });
    },

    report() {
      return structuredClone({
        clock: {domain: 'document performance.now', timeOriginMs, publicationDomain: 'coordinator process performance.now'},
        inputs, dropped,
        commands: [...rows.values()].map(({observation: row}) => {
          const input = inputs[row.inputNumber - 1];
          const inputAt = input?.trusted ? input.atMs : null;
          const settled = row.receipt?.status === 'accepted' && ['APPLIED', 'GESTURE_CLOSED', 'RECOVERED_CLOSED'].includes(row.receipt.effect);
          const authority = settled ? row.authority : null, observed = settled ? row.observedEffect ?? null : null;
          return {
            ...row, authority, observedEffect: observed,
            eventToPendingDomMs: offset(inputAt, row.pendingDomAtMs),
            eventToPendingRenderMs: offset(inputAt, row.pendingRenderAtMs),
            eventToVerifiedReceiptMs: offset(inputAt, row.receipt?.atMs ?? null),
            eventToAuthoritativeFrameMs: offset(inputAt, authority?.receivedAtMs ?? null),
            eventToAuthoritativeDomMs: offset(inputAt, authority?.domAtMs ?? null),
            eventToAuthoritativeRenderMs: offset(inputAt, authority?.renderAtMs ?? null),
            eventToObservedEffectFrameMs: offset(inputAt, observed?.receivedAtMs ?? null),
            eventToObservedEffectDomMs: offset(inputAt, observed?.domAtMs ?? null),
            eventToObservedEffectRenderMs: offset(inputAt, observed?.renderAtMs ?? null),
          };
        }),
      });
    },
  };

  async function observeAttempt(row, source, transport) {
    const {observation} = row;
    const attempt = {source, sentAtMs: now(), replyAtMs: null, disposition: 'waiting'};
    if (observation.attempts.length < 16) observation.attempts.push(attempt);
    else dropped.attempts++;
    let answer;
    try {
      // Invoke in the original call stack. In-flight DOWN, READ or receipt
      // operations cannot delay an independent causal UP.
      answer = await transport();
    } catch (error) {
      attempt.replyAtMs = now();
      attempt.disposition = 'transport-error';
      throw error;
    }
    attempt.replyAtMs = now();
    if (!answer || answer.receipt === null) {
      attempt.disposition = 'unknown';
      return answer;
    }
    try {
      const receipt = parseFoodTaskReceipt(answer.receipt, row.request, seatId);
      if (!receipt || !TimestampSchema.safeParse(answer.serverTimeMs).success || receipt.receivedAt > answer.serverTimeMs) {
        throw Error('Unverified receipt clock');
      }
      attempt.disposition = receipt.status;
      observation.receipt ??= {
        atMs: attempt.replyAtMs, source, status: receipt.status,
        authorityStampMs: receipt.receivedAt,
        effect: receipt.status === 'accepted' && receipt.result.kind === 'INPUT' ? receipt.result.effect : null,
        requestState: receipt.status === 'accepted' && receipt.result.kind === 'REQUEST' ? receipt.result.state : null,
        code: receipt.status === 'rejected' ? receipt.code : null,
      };
    } catch {
      attempt.disposition = 'unverified';
    }
    return answer;
  }
}
