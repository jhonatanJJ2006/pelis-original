/** Caché en memoria con TTL y tamaño máximo (por proceso). */
export class TtlCache<V> {
  private map = new Map<string, { value: V; expires: number }>();
  constructor(private readonly maxEntries = 5000) {}

  get(key: string, now = Date.now()): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires <= now) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V, ttlMs: number, now = Date.now()): void {
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: now + ttlMs });
  }

  clear(): void {
    this.map.clear();
  }
}
