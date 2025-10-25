import { apiService } from './apiService';
import { normalizeTarget, getCachedCompetitors, setCachedCompetitors } from './competitorCache';
import { getTargetAnalysis, precomputeAll, TargetAnalysisBundle } from './targetAnalysisCache';

export type PageType = 'dashboard' | 'competitor-insight' | 'product-insights';

export const AnalysisEvents = {
  EVT_PARTIAL: 'target-analysis:partial',
  EVT_FULL: 'target-analysis:full'
} as const;

function emit(name: string, bundle: TargetAnalysisBundle) {
  window.dispatchEvent(new CustomEvent(name, { detail: bundle }));
}

const toPct = (v: number) => Math.round(Math.min(100, Math.max(0, Number(v || 0) * 10)));

async function phase1For(page: PageType, target: string, industry?: string): Promise<TargetAnalysisBundle | null> {
  const key = normalizeTarget(target);
  const existing = getTargetAnalysis(target);

  if (page === 'dashboard') {
    const r = await apiService.analyzeSingleCompetitor(target, industry).catch(() => null);
    const main = r?.data;
    if (!main) return existing || null;
    const s = main.aiScores || {};
    const aiVisibilityScore = toPct(((+s.chatgpt||0)+(+s.gemini||0)+(+s.claude||0)+(+s.perplexity||0))/4);
    const partial: TargetAnalysisBundle = {
      target, targetKey: key,
      company: target,
      competitors: [main],
      computed: { aiVisibilityScore },
      savedAt: Date.now()
    };
    emit(AnalysisEvents.EVT_PARTIAL, partial);
    return partial;
  }

  if (page === 'competitor-insight') {
    const names = getCachedCompetitors(target)?.competitors || [];
    if (names.length) {
      const few = names.slice(0, 4);
      const details = await Promise.allSettled(few.map(n => apiService.analyzeSingleCompetitor(n, industry)));
      const competitors = details.map(d => d.status === 'fulfilled' ? d.value?.data : null).filter(Boolean);
      if (competitors.length) {
        const partial: TargetAnalysisBundle = {
          target, targetKey: key,
          company: getCachedCompetitors(target)?.company || target,
          competitors,
          savedAt: Date.now()
        };
        emit(AnalysisEvents.EVT_PARTIAL, partial);
        return partial;
      }
    }
    return existing || null;
  }

  if (page === 'product-insights') {
    const looksLikeUrl = /https?:\/\//i.test(target) || target.includes('.');
    if (!looksLikeUrl) return existing || null;
    const content = await apiService.analyzeContentStructure('', target).catch(() => null);
    if (!content?.analysis) return existing || null;
    const partial: TargetAnalysisBundle = {
      target, targetKey: key,
      company: target,
      competitors: existing?.competitors || [],
      contentAnalysis: content.analysis,
      savedAt: Date.now()
    };
    emit(AnalysisEvents.EVT_PARTIAL, partial);
    return partial;
  }

  return existing || null;
}

export async function runPhasedAnalysis(page: PageType, target: string, industry?: string) {
  await phase1For(page, target, industry);
  const full = await precomputeAll(target, industry).catch(() => null);
  if (full?.competitors?.length) {
    const names = full.competitors.map((c: any) => c?.name).filter(Boolean);
    if (names.length) setCachedCompetitors(target, names, full.company);
  }
  if (full) emit(AnalysisEvents.EVT_FULL, full);
}




