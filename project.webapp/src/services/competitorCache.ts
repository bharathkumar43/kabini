export interface CachedCompetitorsEntry {
  targetKey: string;
  company?: string;
  competitors: string[];
  savedAt: number;
}

const STORAGE_KEY = 'kabini_competitor_cache_v1';

function loadCache(): Record<string, CachedCompetitorsEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CachedCompetitorsEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // best-effort cache
  }
}

export function normalizeTarget(input: string): string {
  try {
    let candidate = (input || '').trim();
    try { candidate = decodeURIComponent(candidate); } catch {}
    if (/%2F|%3A/i.test(candidate)) { try { candidate = decodeURIComponent(candidate); } catch {} }
    // If looks like URL/domain, use hostname without www
    if (candidate.includes('.') || /https?:\/\//i.test(candidate) || candidate.includes('://')) {
      let raw = candidate;
      if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./, '');
      return host.toLowerCase();
    }
    // Fallback to company slug
    return candidate.toLowerCase();
  } catch {
    return String(input || '').toLowerCase();
  }
}

export function setCachedCompetitors(input: string, competitors: string[], company?: string) {
  const cache = loadCache();
  const targetKey = normalizeTarget(input);
  cache[targetKey] = {
    targetKey,
    company,
    competitors: Array.from(new Set((competitors || []).filter(Boolean).map(s => String(s)))) ,
    savedAt: Date.now()
  };
  saveCache(cache);
}

export function getCachedCompetitors(input: string): CachedCompetitorsEntry | null {
  const cache = loadCache();
  const targetKey = normalizeTarget(input);
  return cache[targetKey] || null;
}

export function clearCachedCompetitors(input?: string) {
  if (!input) {
    saveCache({});
    return;
  }
  const cache = loadCache();
  const targetKey = normalizeTarget(input);
  if (cache[targetKey]) {
    delete cache[targetKey];
    saveCache(cache);
  }
}




