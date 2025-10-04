// Utility functions to clear all analysis data and session state
// This ensures fresh pages after login/logout

import { apiService } from '../services/apiService';

export const clearAllAnalysisData = () => {
  console.log('🧹 Clearing analysis data for fresh session...');
  
  // Clear only analysis-related localStorage keys (not essential app data)
  const keysToClear = [
    // QA Generation - Note: preserving FAQ sessions by not clearing user-specific keys
    'llm_qa_current_work',
    'enhance_content_state',
    
    // AI Visibility Analysis
    'ai_visibility_current_session',
    'ai_visibility_analysis_data',
    
    // Content Analysis
    'content_analysis_current_session',
    'content_analysis_data',
    
    // Structure Analysis
    'structure_analysis_current_session',
    'structure_analysis_data',
    
    // Competitor URLs
    'llm_competitor_urls',
    
    // Session Manager data
    'session_index',
    'session_manager_sessions',
    
    // Statistics state
    'statistics_state',
    
    // Shopify connections - clear on logout
    'shopify_connections',
    
    // Any other analysis-related keys
    'current_analysis_session',
    'analysis_data',
    'analysis_results'
  ];
  
  // Clear specific keys
  keysToClear.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`🧹 Cleared: ${key}`);
    } catch (error) {
      console.warn(`🧹 Failed to clear ${key}:`, error);
    }
  });
  
  // Clear all keys that start with specific prefixes (but be more selective)
  const prefixesToClear = [
    'enhance_content_cache_',
    'analysis_cache_',
    'ai_visibility_',
    'content_analysis_',
    'structure_analysis_'
  ];
  
  prefixesToClear.forEach(prefix => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
          console.log(`🧹 Cleared prefixed key: ${key}`);
        }
      });
    } catch (error) {
      console.warn(`🧹 Failed to clear keys with prefix ${prefix}:`, error);
    }
  });
  
  console.log('🧹 Analysis data clearing completed');
};

export const clearUserSpecificData = (userId?: string) => {
  console.log('🧹 Clearing user-specific data...');
  
  if (userId) {
    // Clear user-specific session data (but preserve FAQ sessions)
    const userSpecificKeys = [
      `user_${userId}_sessions`,
      `user_${userId}_analysis_data`,
      `user_${userId}_current_session`
    ];
    
    userSpecificKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`🧹 Cleared user-specific key: ${key}`);
      } catch (error) {
        console.warn(`🧹 Failed to clear user-specific key ${key}:`, error);
      }
    });
    
    // Also clear any keys that match the FAQ pattern but are not FAQ sessions
    const keysToCheck = Object.keys(localStorage);
    keysToCheck.forEach(key => {
      if (key.startsWith('llm_qa_') && key.endsWith(`_${userId}`)) {
        // Only clear non-FAQ session keys
        if (!key.includes('sessions') && !key.includes('current_session')) {
          try {
            localStorage.removeItem(key);
            console.log(`🧹 Cleared FAQ-related key: ${key}`);
          } catch (error) {
            console.warn(`🧹 Failed to clear FAQ-related key ${key}:`, error);
          }
        }
      }
    });
  }
  
  console.log('🧹 User-specific data clearing completed');
};

export const clearAnalysisState = () => {
  console.log('🧹 Clearing analysis state...');
  
  // Clear any in-memory state that might persist
  // This function can be called to reset component state
  
  // Clear session storage as well
  try {
    sessionStorage.clear();
    console.log('🧹 Cleared sessionStorage');
  } catch (error) {
    console.warn('🧹 Failed to clear sessionStorage:', error);
  }
  
  console.log('🧹 Analysis state clearing completed');
};

// Function to disconnect all Shopify connections
export const disconnectAllShopifyConnections = async () => {
  console.log('🔌 Disconnecting all Shopify connections...');
  
  try {
    // Get current Shopify connections from localStorage
    const connections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
    
    if (connections.length === 0) {
      console.log('🔌 No Shopify connections to disconnect');
      return;
    }
    
    // Disconnect each connection via API
    const disconnectPromises = connections.map(async (connection: any) => {
      try {
        await apiService.disconnectShopify(connection.shop);
        console.log(`🔌 Successfully disconnected from ${connection.shop}`);
      } catch (error) {
        console.warn(`🔌 Failed to disconnect from ${connection.shop} via API:`, error);
        // Continue with other disconnections even if one fails
      }
    });
    
    // Wait for all disconnections to complete
    await Promise.allSettled(disconnectPromises);
    
    console.log('🔌 All Shopify connections disconnected');
  } catch (error) {
    console.warn('🔌 Error during Shopify disconnection:', error);
    // Continue with cleanup even if Shopify disconnection fails
  }
};

// Main function to call on login/logout
export const performFullCleanup = async (userId?: string) => {
  console.log('🧹 Performing analysis cleanup for fresh session...');
  
  // Disconnect Shopify connections first
  await disconnectAllShopifyConnections();
  
  // Clear all other data
  clearAllAnalysisData();
  clearUserSpecificData(userId);
  clearAnalysisState();
  
  console.log('🧹 Analysis cleanup completed - ready for fresh analysis');
};
