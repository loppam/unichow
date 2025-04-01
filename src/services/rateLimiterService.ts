interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // in milliseconds
}

class RateLimiterService {
  private static instance: RateLimiterService;
  private requestCounts: Map<string, number[]>;
  private configs: Map<string, RateLimitConfig>;

  private constructor() {
    this.requestCounts = new Map();
    this.configs = new Map();
  }

  static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  setConfig(key: string, config: RateLimitConfig): void {
    this.configs.set(key, config);
  }

  async checkRateLimit(key: string): Promise<boolean> {
    const config = this.configs.get(key);
    if (!config) return true;

    const now = Date.now();
    const timestamps = this.requestCounts.get(key) || [];

    // Remove timestamps outside the time window
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < config.timeWindow
    );

    if (validTimestamps.length >= config.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requestCounts.set(key, validTimestamps);
    return true;
  }

  clear(key: string): void {
    this.requestCounts.delete(key);
  }

  clearAll(): void {
    this.requestCounts.clear();
  }
}

export const rateLimiterService = RateLimiterService.getInstance();
