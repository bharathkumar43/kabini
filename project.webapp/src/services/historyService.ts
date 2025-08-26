import { HistoryItem, QAHistoryItem, AIVisibilityHistoryItem, ContentAnalysisHistoryItem, StructureAnalysisHistoryItem, SessionData } from '../types';
import { authService } from './authService';

// Get user-specific history key
const getHistoryKey = (): string => {
  // Try to get user ID from authService first (more reliable)
  const userId = authService.getCurrentUserId();
  if (userId) {
    console.log('[HistoryService] Using user-specific history key for user:', userId);
    return `comprehensive_history_${userId}`;
  }
  
  // Fallback to localStorage (for backward compatibility)
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.id) {
        console.log('[HistoryService] Using localStorage user ID for history key:', userData.id);
        return `comprehensive_history_${userData.id}`;
      }
    }
  } catch (edit) {
    console.warn('[HistoryService] Could not parse user data from localStorage');
  }
  
  // Fallback to anonymous storage for backward compatibility
  console.log('[HistoryService] Using anonymous history key (no user authenticated)');
  return 'comprehensive_history';
};

export interface HistoryService {
  addHistoryItem: (item: HistoryItem) => void;
  getHistoryItems: () => HistoryItem[];
  clearHistory: () => void;
  deleteHistoryItem: (id: string) => void;
  exportHistoryItem: (id: string) => { content: string; filename: string; mimeType: string } | null;
  exportAllHistory: () => { content: string; filename: string; mimeType: string };
  clearUserData: () => void;
}

class LocalHistoryService implements HistoryService {
  private getHistoryFromStorage(): HistoryItem[] {
    try {
      const historyKey = getHistoryKey();
      const stored = localStorage.getItem(historyKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading history from storage:', error);
      return [];
    }
  }

  private saveHistoryToStorage(items: HistoryItem[]): void {
    try {
      const historyKey = getHistoryKey();
      console.log('[HistoryService] Saving to storage:', items.length, 'items');
      console.log('[HistoryService] Items being saved:', items);
      localStorage.setItem(historyKey, JSON.stringify(items));
      console.log('[HistoryService] Successfully saved to localStorage with key:', historyKey);
    } catch (error) {
      console.error('Error saving history to storage:', error);
    }
  }

  addHistoryItem(item: HistoryItem): void {
    console.log('[HistoryService] Adding history item:', item);
    const items = this.getHistoryFromStorage();
    // Check if item already exists (by ID)
    const existingIndex = items.findIndex(existing => existing.id === item.id);
    
    if (existingIndex >= 0) {
      // Update existing item
      items[existingIndex] = item;
      console.log('[HistoryService] Updated existing item');
    } else {
      // Add new item at the beginning
      items.unshift(item);
      console.log('[HistoryService] Added new item, total items:', items.length);
    }
    
    this.saveHistoryToStorage(items);
  }

  getHistoryItems(): HistoryItem[] {
    const items = this.getHistoryFromStorage();
    console.log('[HistoryService] Getting history items:', items.length, 'items');
    
    // Filter out any sample data (items with 'sample-' prefix)
    const realItems = items.filter(item => !item.id.startsWith('sample-'));
    
    // Migrate existing AI Visibility Analysis items to include status field
    const migratedItems = realItems.map(item => {
      if (item.type === 'ai-visibility' && !item.status) {
        console.log('[HistoryService] Migrating AI Visibility item to include status:', item.id);
        return {
          ...item,
          status: 'completed' as const
        };
      }
      return item;
    });
    
    // Check if any items were migrated
    const hasChanges = migratedItems.some((item, index) => item !== realItems[index]);
    if (hasChanges) {
      console.log('[HistoryService] Migrated items, saving updated history');
      this.saveHistoryToStorage(migratedItems);
      return migratedItems;
    }
    
    if (realItems.length !== items.length) {
      console.log('[HistoryService] Filtered out sample data, keeping only real items:', realItems.length);
      this.saveHistoryToStorage(realItems);
    }
    
    return realItems;
  }

  clearHistory(): void {
    this.saveHistoryToStorage([]);
  }

  clearSampleData(): void {
    const items = this.getHistoryFromStorage();
    const realItems = items.filter(item => !item.id.startsWith('sample-'));
    this.saveHistoryToStorage(realItems);
    console.log('[HistoryService] Cleared sample data, kept', realItems.length, 'real items');
  }

  deleteHistoryItem(id: string): void {
    const items = this.getHistoryFromStorage();
    const filteredItems = items.filter(item => item.id !== id);
    this.saveHistoryToStorage(filteredItems);
  }

  exportHistoryItem(id: string): { content: string; filename: string; mimeType: string } | null {
    try {
      console.log('[HistoryService] Exporting item:', id);
      const items = this.getHistoryFromStorage();
      console.log('[HistoryService] All items:', items);
      const item = items.find(item => item.id === id);
      
      if (!item) {
        console.error('[HistoryService] Item not found:', id);
        return null;
      }

      console.log('[HistoryService] Found item:', item);
      const content = this.formatHistoryItemForExport(item);
      const filename = `${item.type}_${item.id}_${new Date().toISOString().split('T')[0]}.json`;
      
      return {
        content,
        filename,
        mimeType: 'application/json'
      };
    } catch (error) {
      console.error('[HistoryService] Error exporting item:', error);
      return null;
    }
  }

  exportAllHistory(): { content: string; filename: string; mimeType: string } {
    try {
      const items = this.getHistoryFromStorage();
      const content = JSON.stringify(items, null, 2);
      const filename = `complete_history_${new Date().toISOString().split('T')[0]}.json`;
      
      return {
        content,
        filename,
        mimeType: 'application/json'
      };
    } catch (error) {
      console.error('[HistoryService] Error exporting all history:', error);
      return {
        content: '[]',
        filename: 'empty_history.json',
        mimeType: 'application/json'
      };
    }
  }

  private formatHistoryItemForExport(item: HistoryItem): string {
    try {
      return JSON.stringify(item, null, 2);
    } catch (error) {
      console.error('[HistoryService] Error formatting item for export:', error);
      return JSON.stringify({ error: 'Could not format item', id: item.id, type: item.type });
    }
  }

  clearUserData(): void {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (currentUserId) {
        // Clear current user's history
        const userHistoryKey = `comprehensive_history_${currentUserId}`;
        localStorage.removeItem(userHistoryKey);
        console.log('[HistoryService] Cleared history data for user:', currentUserId);
      }
      
      // Also clear any other user-specific data that might exist
      const allKeys = Object.keys(localStorage);
      const userHistoryKeys = allKeys.filter(key => key.startsWith('comprehensive_history_'));
      
      userHistoryKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log('[HistoryService] Cleared additional user history key:', key);
        } catch (error) {
          console.warn('[HistoryService] Could not clear key:', key, error);
        }
      });
      
      console.log('[HistoryService] All user-specific data cleared');
    } catch (error) {
      console.error('[HistoryService] Error clearing user data:', error);
    }
  }
}

export const historyService = new LocalHistoryService(); 