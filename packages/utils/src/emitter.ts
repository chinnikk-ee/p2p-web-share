/**
 * Minimal, fully-typed event emitter used by the transfer engine. Returning an
 * unsubscribe function from `on` makes cleanup in React effects trivial.
 */
export type EventRecord = Record<string, unknown>;
export type Listener<T> = (payload: T) => void;

export class TypedEmitter<Events extends object> {
  private readonly listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const set = (this.listeners[event] ??= new Set());
    set.add(listener);
    return () => this.off(event, listener);
  }

  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const off = this.on(event, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((listener) => {
      listener(payload);
    });
  }

  removeAllListeners(): void {
    (Object.keys(this.listeners) as (keyof Events)[]).forEach((key) => {
      delete this.listeners[key];
    });
  }
}
