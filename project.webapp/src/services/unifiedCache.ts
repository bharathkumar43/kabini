/**
 * Unified Cache Service
 * - Stores analysis results for all pages (Dashboard, Competitor Insight, Product Insight)
 * - 1-hour TTL per session
 * - Size-based automatic cleanup
 * - Both frontend (localStorage) and backend sync
 */

const CACHE_KEY = 'kabini_unified_analysis_cache';
const MAX_CACHE_SIZE_MB = 50; // 50MB max for frontend
const TTL_MS = 60 * 60 * 1000; // 1 hour

export interface CachedAnalysis {
  target: string; // normalized key (e.g., "zara" or "zara.com")
  targetOriginal: string; // original input
  timestamp: number;
  expiresAt: number;
  
  // Analysis results for each page
  dashboard?: any;
  competitorInsight?: any;
  productInsight?: any;
  
  // Metadata
  size: number; // estimated size in bytes
}

interface CacheStore {
  analyses: Record<string, CachedAnalysis>;
  totalSize: number; // total size in bytes
  lastCleanup: number;
}

class UnifiedCacheService {
  private store: CacheStore;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.store = this.load();
    this.startAutoCleanup();
  }

  /**
   * Normalize target input for consistent cache keys
   */
  private normalizeTarget(input: string): string {
    const lower = input.toLowerCase().trim();
    // Remove protocol and www
    return lower.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').split('/')[0];
  }

  /**
   * Calculate size of an object in bytes (approximate)
   */
  private calculateSize(obj: any): number {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      return JSON.stringify(obj).length * 2; // fallback: ~2 bytes per char
    }
  }

  /**
   * Load cache from localStorage
   */
  private load(): CacheStore {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Remove expired entries on load
        this.cleanExpired(parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('[UnifiedCache] Failed to load cache:', error);
    }
    return { analyses: {}, totalSize: 0, lastCleanup: Date.now() };
  }

  /**
   * Save cache to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.store));
    } catch (error) {
      console.warn('[UnifiedCache] Failed to save cache (quota exceeded?):', error);
      // If quota exceeded, do emergency cleanup
      this.emergencyCleanup();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(this.store));
      } catch {
        console.error('[UnifiedCache] Emergency cleanup failed, clearing entire cache');
        this.clearAll();
      }
    }
  }

  /**
   * Remove expired entries
   */
  private cleanExpired(store: CacheStore = this.store): void {
    const now = Date.now();
    let cleaned = false;
    
    for (const key in store.analyses) {
      if (store.analyses[key].expiresAt < now) {
        store.totalSize -= store.analyses[key].size;
        delete store.analyses[key];
        cleaned = true;
      }
    }
    
    if (cleaned) {
      store.lastCleanup = now;
      console.log('[UnifiedCache] Cleaned expired entries. New size:', this.formatSize(store.totalSize));
    }
  }

  /**
   * Emergency cleanup when storage quota exceeded
   * Remove oldest 50% of entries
   */
  private emergencyCleanup(): void {
    console.warn('[UnifiedCache] Emergency cleanup triggered!');
    
    const entries = Object.entries(this.store.analyses)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const toRemove = Math.ceil(entries.length / 2);
    
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      this.store.totalSize -= entry.size;
      delete this.store.analyses[entry.key];
    }
    
    console.log('[UnifiedCache] Emergency cleanup complete. Removed', toRemove, 'entries');
  }

  /**
   * Size-based cleanup when exceeding max size
   * Remove oldest entries until under limit
   */
  private sizeBasedCleanup(): void {
    const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
    
    if (this.store.totalSize <= maxBytes) return;
    
    console.log('[UnifiedCache] Size limit exceeded. Running cleanup...');
    console.log('[UnifiedCache] Current size:', this.formatSize(this.store.totalSize));
    
    const entries = Object.entries(this.store.analyses)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.timestamp - b.timestamp); // oldest first
    
    let removed = 0;
    while (this.store.totalSize > maxBytes && entries.length > 0) {
      const entry = entries.shift();
      if (entry) {
        this.store.totalSize -= entry.size;
        delete this.store.analyses[entry.key];
        removed++;
      }
    }
    
    console.log('[UnifiedCache] Cleanup complete. Removed', removed, 'entries');
    console.log('[UnifiedCache] New size:', this.formatSize(this.store.totalSize));
  }

  /**
   * Format size in human-readable format
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  /**
   * Start automatic cleanup timer (every 5 minutes)
   */
  private startAutoCleanup(): void {
    this.syncTimer = setInterval(() => {
      this.cleanExpired();
      this.sizeBasedCleanup();
      this.save();
    }, 5 * 60 * 1000); // every 5 minutes
  }

  /**
   * Stop automatic cleanup timer
   */
  stopAutoCleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Get cached analysis for a target
   */
  get(target: string): CachedAnalysis | null {
    const key = this.normalizeTarget(target);
    const cached = this.store.analyses[key];
    
    if (!cached) return null;
    
    // Check if expired
    if (cached.expiresAt < Date.now()) {
      this.delete(target);
      return null;
    }
    
    console.log('[UnifiedCache] Cache HIT for:', key);
    return cached;
  }

  /**
   * Get specific page data from cache
   */
  getPage(target: string, page: 'dashboard' | 'competitorInsight' | 'productInsight'): any | null {
    const cached = this.get(target);
    return cached?.[page] || null;
  }

  /**
   * Set or update cached analysis
   */
  set(target: string, originalInput: string, data: Partial<Omit<CachedAnalysis, 'target' | 'targetOriginal' | 'timestamp' | 'expiresAt' | 'size'>>): void {
    const key = this.normalizeTarget(target);
    const now = Date.now();
    
    // Get existing entry or create new
    const existing = this.store.analyses[key];
    const merged = {
      target: key,
      targetOriginal: originalInput,
      timestamp: existing?.timestamp || now,
      expiresAt: now + TTL_MS,
      dashboard: data.dashboard || existing?.dashboard,
      competitorInsight: data.competitorInsight || existing?.competitorInsight,
      productInsight: data.productInsight || existing?.productInsight,
      size: 0 // calculated below
    };
    
    // Calculate size
    merged.size = this.calculateSize(merged);
    
    // Update total size
    if (existing) {
      this.store.totalSize -= existing.size;
    }
    this.store.totalSize += merged.size;
    
    this.store.analyses[key] = merged;
    
    console.log('[UnifiedCache] Set cache for:', key);
    console.log('[UnifiedCache] Total size:', this.formatSize(this.store.totalSize));
    
    // Check size limits
    this.sizeBasedCleanup();
    
    // Save to localStorage
    this.save();
  }

  /**
   * Update specific page data
   */
  setPage(target: string, originalInput: string, page: 'dashboard' | 'competitorInsight' | 'productInsight', data: any): void {
    this.set(target, originalInput, { [page]: data });
  }

  /**
   * Delete cached analysis
   */
  delete(target: string): void {
    const key = this.normalizeTarget(target);
    const existing = this.store.analyses[key];
    
    if (existing) {
      this.store.totalSize -= existing.size;
      delete this.store.analyses[key];
      this.save();
      console.log('[UnifiedCache] Deleted cache for:', key);
    }
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.store = { analyses: {}, totalSize: 0, lastCleanup: Date.now() };
    this.save();
    console.log('[UnifiedCache] Cleared all cache');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Object.values(this.store.analyses);
    const now = Date.now();
    const valid = entries.filter(e => e.expiresAt > now);
    
    return {
      totalEntries: entries.length,
      validEntries: valid.length,
      expiredEntries: entries.length - valid.length,
      totalSize: this.formatSize(this.store.totalSize),
      totalSizeBytes: this.store.totalSize,
      maxSize: this.formatSize(MAX_CACHE_SIZE_MB * 1024 * 1024),
      usagePercent: ((this.store.totalSize / (MAX_CACHE_SIZE_MB * 1024 * 1024)) * 100).toFixed(2) + '%',
      lastCleanup: new Date(this.store.lastCleanup).toISOString()
    };
  }

  /**
   * List all cached targets
   */
  listTargets(): string[] {
    return Object.keys(this.store.analyses);
  }
}

// Export singleton instance
export const unifiedCache = new UnifiedCacheService();


