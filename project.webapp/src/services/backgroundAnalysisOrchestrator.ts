/**
 * Background Analysis Orchestrator
 * - Runs full analysis for all 3 pages in parallel (fire-and-forget)
 * - Stores results in unified cache
 * - Silent operation (no UI feedback)
 */

import { apiService } from './apiService';
import { unifiedCache } from './unifiedCache';

export type PageType = 'dashboard' | 'competitorInsight' | 'productInsight';

interface AnalysisOptions {
  target: string;
  originalInput: string;
  industry?: string;
  currentPage: PageType;
  userId?: string;
}

class BackgroundAnalysisOrchestrator {
  private runningAnalyses = new Set<string>(); // track ongoing analyses
  
  /**
   * Get unique key for tracking
   */
  private getTrackingKey(target: string, page: PageType): string {
    return `${target}:${page}`;
  }

  /**
   * Check if analysis is already running
   */
  private isRunning(target: string, page: PageType): boolean {
    return this.runningAnalyses.has(this.getTrackingKey(target, page));
  }

  /**
   * Mark analysis as running
   */
  private markRunning(target: string, page: PageType): void {
    this.runningAnalyses.add(this.getTrackingKey(target, page));
  }

  /**
   * Mark analysis as complete
   */
  private markComplete(target: string, page: PageType): void {
    this.runningAnalyses.delete(this.getTrackingKey(target, page));
  }

  /**
   * Run Dashboard analysis
   */
  private async runDashboardAnalysis(target: string, originalInput: string, industry?: string): Promise<any> {
    console.log('[BackgroundOrchestrator] Running Dashboard analysis for:', target);
    
    try {
      // Dashboard ALWAYS runs fresh analysis (it's the source of truth)
      // Other pages can reuse Dashboard's competitor data
      console.log('[BackgroundOrchestrator] Dashboard - Running fresh competitor detection (always)');
      
      // Step 1: Analyze single competitor (main company)
      const mainAnalysis = await apiService.analyzeSingleCompetitor(target, industry);
      const main = mainAnalysis?.data;
      
      if (!main) {
        console.warn('[BackgroundOrchestrator] No main competitor data for dashboard');
        return null;
      }

      // Step 2: Get full visibility analysis with competitors (specify Dashboard page type)
      const visibilityAnalysis = await apiService.getAIVisibilityAnalysis(target, industry, { pageType: 'dashboard' });
      const competitors = visibilityAnalysis?.data?.competitors || [main];
      const company = visibilityAnalysis?.data?.company || target;

      console.log('[BackgroundOrchestrator] Dashboard - Detected competitors:', competitors.length);
      console.log('[BackgroundOrchestrator] Dashboard - Competitor names:', competitors.map((c: any) => c?.name || c).join(', '));

      // Build dashboard result
      const result = {
        company,
        competitors,
        targetUrl: originalInput,
        originalInput,
        timestamp: Date.now()
      };

      console.log('[BackgroundOrchestrator] Dashboard analysis complete:', target);
      return result;
    } catch (error) {
      console.error('[BackgroundOrchestrator] Dashboard analysis failed:', error);
      return null;
    }
  }

  /**
   * Run Competitor Insight analysis
   */
  private async runCompetitorInsightAnalysis(target: string, originalInput: string, industry?: string): Promise<any> {
    console.log('[BackgroundOrchestrator] Running Competitor Insight analysis for:', target);
    
    try {
      // Priority 1: Check if Dashboard already has good competitor data (≥2 competitors)
      const cached = unifiedCache.get(target);
      let response;
      
      if (cached?.dashboard?.competitors && cached.dashboard.competitors.length >= 2) {
        console.log('[BackgroundOrchestrator] Competitor Insight - ✅ Reusing competitors from Dashboard cache:', cached.dashboard.competitors.length);
        // Use cached dashboard data instead of making new API call
        response = {
          success: true,
          data: {
            company: cached.dashboard.company,
            competitors: cached.dashboard.competitors,
            industry: industry
          }
        };
      } 
      // Priority 2: If running in foreground (user clicked Analyze on this page), run fresh
      else {
        console.log('[BackgroundOrchestrator] Competitor Insight - Running fresh competitor detection');
        // Get full visibility analysis from API (specify Competitor Insight page type)
        response = await apiService.getAIVisibilityAnalysis(target, industry, { pageType: 'competitorInsight' });
      }
      
      if (!response?.success || !response?.data) {
        console.warn('[BackgroundOrchestrator] No competitor insight data');
        return null;
      }

      const competitors = response?.data?.competitors || [];
      console.log('[BackgroundOrchestrator] Competitor Insight - Final competitors count:', competitors.length);
      console.log('[BackgroundOrchestrator] Competitor Insight - Competitor names:', competitors.map((c: any) => c?.name || c).join(', '));
      
      // Log warning if only 1 competitor, but STILL SAVE to cache
      if (competitors.length < 2) {
        console.warn('[BackgroundOrchestrator] Competitor Insight - Only 1 competitor detected');
        console.warn('[BackgroundOrchestrator] Competitor Insight - This will be saved. Dashboard will run fresh analysis in background.');
      }

      const result = {
        ...response.data,
        targetUrl: originalInput,
        originalInput,
        timestamp: Date.now()
      };

      console.log('[BackgroundOrchestrator] Competitor Insight analysis complete:', target);
      return result;
    } catch (error) {
      console.error('[BackgroundOrchestrator] Competitor Insight analysis failed:', error);
      return null;
    }
  }

  /**
   * Run Product Insight analysis
   */
  private async runProductInsightAnalysis(target: string, originalInput: string, industry?: string): Promise<any> {
    console.log('[BackgroundOrchestrator] Running Product Insight analysis for:', target);
    
    try {
      // CRITICAL: Product Insight NEEDS multiple competitors to display its cards properly
      // Check if we have good cached data first
      const cached = unifiedCache.get(target);
      let competitors = [];
      let company = target;
      
      // Priority 1: Try to use competitors from Dashboard (most reliable)
      if (cached?.dashboard?.competitors && cached.dashboard.competitors.length >= 2) {
        console.log('[BackgroundOrchestrator] Product Insight - ✅ Reusing competitors from Dashboard cache:', cached.dashboard.competitors.length);
        competitors = cached.dashboard.competitors;
        company = cached.dashboard.company || target;
      } 
      // Priority 2: Try Competitor Insight cache
      else if (cached?.competitorInsight?.competitors && cached.competitorInsight.competitors.length >= 2) {
        console.log('[BackgroundOrchestrator] Product Insight - ✅ Reusing competitors from Competitor Insight cache:', cached.competitorInsight.competitors.length);
        competitors = cached.competitorInsight.competitors;
        company = cached.competitorInsight.company || target;
      } 
      // Priority 3: No good cached data - Just fetch competitors (not full Dashboard)
      else {
        console.log('[BackgroundOrchestrator] Product Insight - No cached competitors found');
        console.log('[BackgroundOrchestrator] Product Insight - Fetching competitor list only (lightweight)...');
        
        // Just fetch competitor list from API (specify Product Insight page type for optimized analysis)
        const visibilityResponse = await apiService.getAIVisibilityAnalysis(target, industry, { pageType: 'productInsight' });
        competitors = visibilityResponse?.data?.competitors || [];
        company = visibilityResponse?.data?.company || target;
        
        console.log('[BackgroundOrchestrator] Product Insight - Fetched competitors:', competitors.length);
        console.log('[BackgroundOrchestrator] Product Insight - Competitor names:', competitors.map((c: any) => c?.name || c).join(', '));
        
        // Log if limited competitors (but still proceed - background Dashboard will run full analysis)
        if (competitors.length < 2) {
          console.warn('[BackgroundOrchestrator] Product Insight - Only 1 competitor in initial fetch');
          console.warn('[BackgroundOrchestrator] Product Insight - Full Dashboard analysis will run in background to get more');
        }
      }

      // Step 2: Analyze content structure (if URL-like)
      const looksLikeUrl = /https?:\/\//i.test(target) || target.includes('.');
      let contentAnalysis = null;
      
      if (looksLikeUrl) {
        try {
          const contentResponse = await apiService.analyzeContentStructure('', target);
          contentAnalysis = contentResponse?.analysis;
        } catch (error) {
          console.warn('[BackgroundOrchestrator] Content analysis failed:', error);
        }
      }

      // Step 3: Calculate scores
      const analysisData = contentAnalysis || {};
      
      // Calculate AI Visibility from competitor data
      let aiVisibilityScore = 0;
      if (competitors.length > 0) {
        const match = competitors.find((c: any) => {
          const targetLower = target.toLowerCase();
          const nameLower = (c?.name || '').toLowerCase();
          const domainLower = (c?.domain || '').toLowerCase();
          return nameLower.includes(targetLower) || targetLower.includes(nameLower) || 
                 domainLower.includes(targetLower) || targetLower.includes(domainLower);
        });
        
        if (match) {
          aiVisibilityScore = (match.totalScore || 0) * 10; // Convert 0-10 to 0-100
        }
      }

      const result = {
        company,
        competitors,
        targetScores: {
          aiReadinessScore: analysisData?.geoScoreTotal || 0,
          aiVisibilityScore,
          seoScore: analysisData?.seoScore || 0,
          contentQualityScore: analysisData?.contentQualityScoreTotal || 0
        },
        targetUrl: originalInput,
        originalInput,
        timestamp: Date.now()
      };

      console.log('[BackgroundOrchestrator] Product Insight analysis complete:', target);
      return result;
    } catch (error) {
      console.error('[BackgroundOrchestrator] Product Insight analysis failed:', error);
      return null;
    }
  }

  /**
   * Run analysis for a specific page
   */
  private async runPageAnalysis(page: PageType, target: string, originalInput: string, industry?: string): Promise<any> {
    switch (page) {
      case 'dashboard':
        return this.runDashboardAnalysis(target, originalInput, industry);
      case 'competitorInsight':
        return this.runCompetitorInsightAnalysis(target, originalInput, industry);
      case 'productInsight':
        return this.runProductInsightAnalysis(target, originalInput, industry);
      default:
        return null;
    }
  }

  /**
   * Main orchestrator: Run all page analyses in parallel
   * Fire-and-forget background operation
   */
  async runFullAnalysis(options: AnalysisOptions): Promise<void> {
    const { target, originalInput, industry, currentPage } = options;
    
    console.log('[BackgroundOrchestrator] Starting full analysis for:', target);
    console.log('[BackgroundOrchestrator] Current page:', currentPage);
    
    // Check cache first
    const cached = unifiedCache.get(target);
    
    // Determine which pages need analysis
    const pagesToAnalyze: PageType[] = [];
    
    if (!cached?.dashboard) pagesToAnalyze.push('dashboard');
    if (!cached?.competitorInsight) pagesToAnalyze.push('competitorInsight');
    if (!cached?.productInsight) pagesToAnalyze.push('productInsight');
    
    // Remove current page from background analysis (already running in foreground)
    const backgroundPages = pagesToAnalyze.filter(p => p !== currentPage);
    
    if (backgroundPages.length === 0) {
      console.log('[BackgroundOrchestrator] All pages already cached, skipping background analysis');
      return;
    }
    
    console.log('[BackgroundOrchestrator] Background pages to analyze:', backgroundPages);
    
    // Fire-and-forget: run all in parallel
    backgroundPages.forEach(page => {
      // Skip if already running
      if (this.isRunning(target, page)) {
        console.log('[BackgroundOrchestrator] Already running:', page, 'for', target);
        return;
      }
      
      this.markRunning(target, page);
      
      // Run async without waiting
      this.runPageAnalysis(page, target, originalInput, industry)
        .then(result => {
          if (result) {
            // Store in cache
            unifiedCache.setPage(target, originalInput, page, result);
            console.log('[BackgroundOrchestrator] ✅ Background analysis complete for:', page, target);
          }
        })
        .catch(error => {
          console.error('[BackgroundOrchestrator] ❌ Background analysis failed for:', page, error);
        })
        .finally(() => {
          this.markComplete(target, page);
        });
    });
  }

  /**
   * Get current page analysis (foreground) with cache fallback
   */
  async getCurrentPageAnalysis(
    page: PageType,
    target: string,
    originalInput: string,
    industry?: string
  ): Promise<any> {
    // Check cache first
    const cached = unifiedCache.getPage(target, page);
    if (cached) {
      console.log('[BackgroundOrchestrator] Using cached data for:', page, target);
      return cached;
    }
    
    // Run fresh analysis
    console.log('[BackgroundOrchestrator] Running fresh analysis for:', page, target);
    const result = await this.runPageAnalysis(page, target, originalInput, industry);
    
    if (result) {
      // Store in cache
      unifiedCache.setPage(target, originalInput, page, result);
    }
    
    return result;
  }

  /**
   * Clear all running analyses (cleanup on unmount)
   */
  clearAll(): void {
    this.runningAnalyses.clear();
  }
}

// Export singleton instance
export const backgroundOrchestrator = new BackgroundAnalysisOrchestrator();

