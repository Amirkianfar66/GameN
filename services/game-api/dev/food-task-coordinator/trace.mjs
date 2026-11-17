import {AsyncLocalStorage} from 'node:async_hooks';
import {performance} from 'node:perf_hooks';

/** Loopback diagnostics. Fields are operation labels, monotonic times, status
 * codes and hashed storage references. No input, identity or document data. */
export function createFoodStorageTrace(write) {
  const context = new AsyncLocalStorage();
  let sequence = 0;
  const emit = (event, detail = {}) => write({event, ms: performance.now(), ...context.getStore(), ...detail});
  const codeOf = error => typeof error?.code === 'number' || typeof error?.code === 'string' ? error.code : 'error';
  function span(event, details, invoke) {
    const spanId = ++sequence;
    emit(`${event}:start`, {spanId, ...details});
    return Promise.resolve().then(invoke).then(result => {
      emit(`${event}:end`, {spanId});
      return result;
    }, error => {
      emit(`${event}:end`, {spanId, code: codeOf(error)});
      throw error;
    });
  }
  const scope = (values, invoke) => context.run({...context.getStore(), ...values}, invoke);
  function instrumentFirestore(db) {
    const transactions = db.runTransaction.bind(db);
    return new Proxy(db, {get(target, property) {
      if (property !== 'runTransaction') {
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return (work, options) => {
        let attempt = 0;
        const txId = ++sequence;
        return scope({txId}, () => span('sdk-transaction', {readOnly: options?.readOnly === true}, () => transactions(raw => {
          const next = ++attempt;
          const originalCommit = raw.commit;
          const originalRollback = raw.rollback;
          // The SDK retries on the same transaction object. Restore patched
          // methods before delegating so a retry cannot wrap an older attempt.
          const wrapSettlement = (method, original) => (...args) => {
            raw.commit = originalCommit;
            raw.rollback = originalRollback;
            return scope({attempt: next}, () => span(`sdk-${method}`, {}, () => original.call(raw, ...args)));
          };
          raw.commit = wrapSettlement('commit', originalCommit);
          raw.rollback = wrapSettlement('rollback', originalRollback);
          const callable = new Proxy(raw, {get(tx, member) {
            const value = Reflect.get(tx, member, tx);
            if (member === 'get' || member === 'getAll') {
              return (...refs) => span('sdk-read', {refs: refs.map(ref => ref.path?.split('/').at(-1)?.slice(0, 20) ?? 'query')},
                () => value.call(raw, ...refs));
            }
            if (member === 'set' || member === 'create' || member === 'delete') {
              return (ref, ...args) => {
                emit('sdk-write', {method: member, ref: ref.path?.split('/').at(-1)?.slice(0, 20)});
                return value.call(raw, ref, ...args);
              };
            }
            return typeof value === 'function' ? value.bind(raw) : value;
          }});
          return scope({attempt: next}, () => span('sdk-attempt', {}, () => work(callable)));
        }, options)));
      };
    }});
  }
  function logical(role, key, invoke) {
    const record = key.startsWith('prototypeFoodTask/') ? key.split('/')[2] : key.split('/')[0];
    return scope({record}, () => role === 'read' ? span('store-read', {}, invoke) : invoke());
  }
  return {emit, instrumentFirestore, logical, operation: (operation, invoke) => scope({operation, opId: ++sequence},
    () => span('operation', {}, invoke))};
}
