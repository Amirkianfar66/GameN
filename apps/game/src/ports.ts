// Everything the client core needs from its host. Injecting these keeps the core free of
// browser globals, deterministic under test, and unable to read the device's wall clock.

export interface MonotonicClock {
  /** Milliseconds from an arbitrary origin. Only differences between readings are meaningful. */
  now(): number;
}

export interface Scheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ClientPorts {
  readonly clock: MonotonicClock;
  readonly scheduler: Scheduler;
}

/** A source of command identifiers. An identifier carries no meaning and is never reused. */
export interface IdSource {
  /** A new identifier that satisfies the shared contract's identifier format, e.g. a random UUID. */
  next(): string;
}

/**
 * The one thing a player's phone keeps across a page reload: the identifiers of a command
 * whose outcome is not yet known, so the reloaded page can ask what became of it instead of
 * offering the action again. It never holds a target, a role or any payload, and it is
 * emptied as soon as the outcome is known. A host backs it with per-tab session storage.
 */
export interface UnresolvedCommandStore {
  load(): string | null;
  save(value: string): void;
  clear(): void;
}

/** What a player's phone needs beyond a display: a way to name the commands it sends, and to recall an unresolved one. */
export interface PlayerPorts extends ClientPorts {
  readonly ids: IdSource;
  readonly unresolved: UnresolvedCommandStore;
}
