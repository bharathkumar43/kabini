/**
 * User-specific state manager for persistent analysis state across navigation
 * Handles:
 * - User-specific localStorage keys
 * - State persistence when navigating away
 * - State restoration when returning
 * - "New Analysis" intent tracking
 */

export type PageType = 
  | 'overview' 
  | 'product-insights' 
  | 'competitor-insight'
  | 'structure-analysis' 
  | 'content-analysis'
  | 'ai-visibility';

export interface PageState {
  data: any;
  timestamp: number;
  isNewAnalysis: boolean; // Flag to indicate if "New Analysis" was clicked
  isAnalyzing?: boolean; // Flag to indicate analysis is in progress
  analysisStartTime?: number; // When the analysis started
  analysisParams?: any; // Parameters for the analysis (to check/retry)
}

class UserStateManager {
  private getUserId(): string {
    // Get user ID from localStorage (set by AuthContext)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id || user.email || user.name || 'anonymous';
      } catch (e) {
        console.error('[UserStateManager] Failed to parse user:', e);
      }
    }
    return 'anonymous';
  }

  private getKey(pageType: PageType): string {
    const userId = this.getUserId();
    return `kabini_${pageType}_state_${userId}`;
  }

  private getIntentKey(pageType: PageType): string {
    const userId = this.getUserId();
    return `kabini_${pageType}_intent_${userId}`;
  }

  /**
   * Save page state (called when navigating away or after analysis completes)
   */
  saveState(pageType: PageType, data: any, options?: { isAnalyzing?: boolean; analysisParams?: any }): void {
    try {
      const state: PageState = {
        data,
        timestamp: Date.now(),
        isNewAnalysis: false,
        isAnalyzing: options?.isAnalyzing || false,
        analysisStartTime: options?.isAnalyzing ? Date.now() : undefined,
        analysisParams: options?.analysisParams
      };
      
      const key = this.getKey(pageType);
      localStorage.setItem(key, JSON.stringify(state));
      
      console.log(`[UserStateManager] Saved state for ${pageType}:`, {
        hasData: !!data,
        isAnalyzing: state.isAnalyzing,
        timestamp: state.timestamp
      });
    } catch (error) {
      console.error(`[UserStateManager] Failed to save state for ${pageType}:`, error);
    }
  }

  /**
   * Mark that analysis is starting (save loading state with params)
   */
  markAnalysisStarted(pageType: PageType, analysisParams: any): void {
    try {
      const existingState = this.restoreState(pageType, Infinity); // Get current state without age check
      const state: PageState = {
        data: existingState || null,
        timestamp: Date.now(),
        isNewAnalysis: false,
        isAnalyzing: true,
        analysisStartTime: Date.now(),
        analysisParams
      };
      
      const key = this.getKey(pageType);
      localStorage.setItem(key, JSON.stringify(state));
      
      console.log(`[UserStateManager] Marked analysis started for ${pageType}:`, analysisParams);
    } catch (error) {
      console.error(`[UserStateManager] Failed to mark analysis started for ${pageType}:`, error);
    }
  }

  /**
   * Mark that analysis is completed (clear loading state, save results)
   */
  markAnalysisCompleted(pageType: PageType, resultData: any): void {
    try {
      const state: PageState = {
        data: resultData,
        timestamp: Date.now(),
        isNewAnalysis: false,
        isAnalyzing: false,
        analysisStartTime: undefined,
        analysisParams: undefined
      };
      
      const key = this.getKey(pageType);
      localStorage.setItem(key, JSON.stringify(state));
      
      console.log(`[UserStateManager] Marked analysis completed for ${pageType}`);
    } catch (error) {
      console.error(`[UserStateManager] Failed to mark analysis completed for ${pageType}:`, error);
    }
  }

  /**
   * Check if analysis is currently in progress
   */
  isAnalysisInProgress(pageType: PageType, maxAge: number = 5 * 60 * 1000): boolean {
    try {
      const key = this.getKey(pageType);
      const stateStr = localStorage.getItem(key);
      
      if (!stateStr) return false;

      const state: PageState = JSON.parse(stateStr);
      
      if (!state.isAnalyzing || !state.analysisStartTime) return false;

      // Check if analysis is too old (probably failed/stuck)
      const age = Date.now() - state.analysisStartTime;
      if (age > maxAge) {
        console.log(`[UserStateManager] Analysis too old for ${pageType} (${Math.round(age / 1000)}s), marking as stale`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[UserStateManager] Failed to check analysis progress for ${pageType}:`, error);
      return false;
    }
  }

  /**
   * Get analysis parameters (for displaying or checking progress)
   */
  getAnalysisParams(pageType: PageType): any | null {
    try {
      const key = this.getKey(pageType);
      const stateStr = localStorage.getItem(key);
      
      if (!stateStr) return null;

      const state: PageState = JSON.parse(stateStr);
      return state.analysisParams || null;
    } catch (error) {
      console.error(`[UserStateManager] Failed to get analysis params for ${pageType}:`, error);
      return null;
    }
  }

  /**
   * Mark that user clicked "New Analysis" (clear intent)
   */
  markNewAnalysis(pageType: PageType): void {
    try {
      const intentKey = this.getIntentKey(pageType);
      localStorage.setItem(intentKey, 'new');
      
      console.log(`[UserStateManager] Marked new analysis intent for ${pageType}`);
    } catch (error) {
      console.error(`[UserStateManager] Failed to mark new analysis for ${pageType}:`, error);
    }
  }

  /**
   * Clear the "New Analysis" intent (called after successfully loading fresh state)
   */
  clearNewAnalysisIntent(pageType: PageType): void {
    try {
      const intentKey = this.getIntentKey(pageType);
      localStorage.removeItem(intentKey);
      
      console.log(`[UserStateManager] Cleared new analysis intent for ${pageType}`);
    } catch (error) {
      console.error(`[UserStateManager] Failed to clear intent for ${pageType}:`, error);
    }
  }

  /**
   * Check if user intended to start a new analysis
   */
  hasNewAnalysisIntent(pageType: PageType): boolean {
    try {
      const intentKey = this.getIntentKey(pageType);
      const intent = localStorage.getItem(intentKey);
      return intent === 'new';
    } catch (error) {
      console.error(`[UserStateManager] Failed to check intent for ${pageType}:`, error);
      return false;
    }
  }

  /**
   * Restore page state (called on component mount)
   * Returns null if:
   * - No saved state exists
   * - User clicked "New Analysis" last time
   * - State is too old (>24 hours)
   */
  restoreState(pageType: PageType, maxAge: number = 24 * 60 * 60 * 1000): any | null {
    try {
      // Check if user intended to start new analysis
      if (this.hasNewAnalysisIntent(pageType)) {
        console.log(`[UserStateManager] User clicked "New Analysis" - not restoring state for ${pageType}`);
        this.clearNewAnalysisIntent(pageType);
        this.clearState(pageType);
        return null;
      }

      const key = this.getKey(pageType);
      const stateStr = localStorage.getItem(key);
      
      if (!stateStr) {
        console.log(`[UserStateManager] No saved state for ${pageType}`);
        return null;
      }

      const state: PageState = JSON.parse(stateStr);
      
      // Check if state is too old
      const age = Date.now() - state.timestamp;
      if (age > maxAge) {
        console.log(`[UserStateManager] State too old for ${pageType} (${Math.round(age / 1000 / 60)} minutes)`);
        this.clearState(pageType);
        return null;
      }

      console.log(`[UserStateManager] Restored state for ${pageType}:`, {
        hasData: !!state.data,
        age: Math.round(age / 1000 / 60) + ' minutes'
      });

      return state.data;
    } catch (error) {
      console.error(`[UserStateManager] Failed to restore state for ${pageType}:`, error);
      return null;
    }
  }

  /**
   * Clear page state (called on logout or explicit clear)
   */
  clearState(pageType: PageType): void {
    try {
      const key = this.getKey(pageType);
      const intentKey = this.getIntentKey(pageType);
      localStorage.removeItem(key);
      localStorage.removeItem(intentKey);
      
      console.log(`[UserStateManager] Cleared state for ${pageType}`);
    } catch (error) {
      console.error(`[UserStateManager] Failed to clear state for ${pageType}:`, error);
    }
  }

  /**
   * Clear all user-specific state (called on logout)
   */
  clearAllUserState(): void {
    try {
      const userId = this.getUserId();
      const keysToRemove: string[] = [];
      
      // Find all user-specific keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(`_${userId}`)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all user-specific keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log(`[UserStateManager] Cleared all state for user ${userId}:`, keysToRemove.length, 'keys removed');
    } catch (error) {
      console.error('[UserStateManager] Failed to clear all user state:', error);
    }
  }

  /**
   * Get current user ID (for debugging)
   */
  getCurrentUserId(): string {
    return this.getUserId();
  }
}

export const userStateManager = new UserStateManager();

