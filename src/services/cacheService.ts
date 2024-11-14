const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as T;
    }
    return null;
  },

  set(key: string, data: any): void {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },

  invalidate(key: string): void {
    cache.delete(key);
  },

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  }
}; 