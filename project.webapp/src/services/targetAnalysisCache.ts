import { apiService } from './apiService';
import { normalizeTarget, getCachedCompetitors, setCachedCompetitors } from './competitorCache';

export type TargetKey = string;

export interface TargetAnalysisBundle {
  target: string;
  targetKey: TargetKey;
  company?: string;
  competitors: any[];
  visibilityRaw?: any;
  contentAnalysis?: any;
  computed?: {
    aiVisibilityScore?: number;
    shareOfVoice?: number;
    sentimentPct?: { pos: number; neu: number; neg: number };
  };
  savedAt: number;
}

const STORAGE_KEY = 'kabini_target_analysis_cache_v1';
const TTL_MS = 15 * 60 * 1000; // 15 minutes
const inflight = new Map<TargetKey, Promise<TargetAnalysisBundle>>();

function load(): Record<string, TargetAnalysisBundle> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function save(store: Record<string, TargetAnalysisBundle>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
}

export function getTargetAnalysis(input: string): TargetAnalysisBundle | null {
  const store = load();
  const key = normalizeTarget(input);
  const entry = store[key];
  if (!entry) return null;
  // allow stale reads; caller may refresh
  return entry;
}

const toPct = (v: number) => Math.round(Math.min(100, Math.max(0, Number(v || 0) * 10)));

export async function precomputeAll(input: string, industry?: string): Promise<TargetAnalysisBundle> {
  const targetKey = normalizeTarget(input);
  if (inflight.has(targetKey)) return inflight.get(targetKey)!;

  const p = (async () => {
    const urlOrCompany = input.trim();
    const cachedNames = getCachedCompetitors(urlOrCompany)?.competitors || [];

    // 1) Competitor set
    let competitors: any[] = [];
    let companyLabel = getCachedCompetitors(urlOrCompany)?.company;

    if (cachedNames.length) {
      const details = await Promise.allSettled(
        cachedNames.slice(0, 8).map(n => apiService.analyzeSingleCompetitor(n, industry))
      );
      competitors = details
        .map(r => (r.status === 'fulfilled' ? r.value?.data : null))
        .filter(Boolean);
    } else {
      const vis = await apiService.getAIVisibilityAnalysis(urlOrCompany, industry);
      const names = (vis?.data?.competitors || []).map((c: any) => c?.name).filter(Boolean);
      competitors = vis?.data?.competitors || [];
      companyLabel = vis?.data?.company || companyLabel;
      if (names.length) setCachedCompetitors(urlOrCompany, names, companyLabel);
    }

    // If competitors are names only, ensure we have scored details
    if (competitors.length && !competitors[0]?.aiScores) {
      const details = await Promise.allSettled(
        competitors.slice(0, 8).map((c: any) => apiService.analyzeSingleCompetitor(c.name || c, industry))
      );
      const enriched = details
        .map(r => (r.status === 'fulfilled' ? r.value?.data : null))
        .filter(Boolean);
      if (enriched.length) competitors = enriched;
    }

    // 2) Content analysis if URL-like
    const looksLikeUrl = /https?:\/\//i.test(urlOrCompany) || urlOrCompany.includes('.');
    const contentAnalysis = looksLikeUrl
      ? (await apiService.analyzeContentStructure('', urlOrCompany))?.analysis
      : undefined;

    // 3) Derived metrics
    const main = competitors[0];
    const s = main?.aiScores || {};
    const aiVisibilityScore = main ? toPct(((+s.chatgpt||0)+(+s.gemini||0)+(+s.claude||0)+(+s.perplexity||0))/4) : 0;

    const mentionsOf = (c: any) => Number(c?.keyMetrics?.gemini?.brandMentions || c?.keyMetrics?.gemini?.mentionsCount || 0);
    const totalMentions = (competitors || []).reduce((sum: number, c: any) => sum + mentionsOf(c), 0) || 0;
    const shareOfVoice = totalMentions && main ? Math.round((mentionsOf(main) / totalMentions) * 1000) / 10 : 0;

    const sentimentVal = Number(
      main?.breakdowns?.gemini?.sentimentScore || main?.keyMetrics?.gemini?.sentimentScore || 0.5
    );
    const sentimentPct = {
      pos: Math.round((sentimentVal > 0.7 ? 1 : 0) * 100),
      neu: Math.round((sentimentVal <= 0.7 && sentimentVal >= 0.3 ? 1 : 0) * 100),
      neg: Math.round((sentimentVal < 0.3 ? 1 : 0) * 100),
    };

    const bundle: TargetAnalysisBundle = {
      target: input,
      targetKey,
      company: companyLabel || input,
      competitors,
      contentAnalysis,
      computed: { aiVisibilityScore, shareOfVoice, sentimentPct },
      savedAt: Date.now(),
    };

    const store = load();
    store[targetKey] = bundle;
    save(store);
    return bundle;
  })();

  inflight.set(targetKey, p);
  try { return await p; } finally { inflight.delete(targetKey); }
}




