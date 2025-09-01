import { useState, useEffect } from 'react';
import { User, BarChart3, FileText, History as HistoryIcon, DollarSign, Zap, Menu, X, Target, Globe, Plus, Loader2, RefreshCw, LogOut, Eye, Settings } from 'lucide-react';
import { ContentInput } from './components/ContentInput';
import { historyService } from './services/historyService';
import { Statistics } from './components/Statistics';
import Login from './components/Login';
import { useLocalStorage } from './hooks/useLocalStorage';
import { downloadFile } from './utils/fileUtils';
import type { QAItem, SessionData, User as UserType, QAHistoryItem } from './types';
import type { UrlData } from './components/ContentInput';
import { useAuth } from './contexts/AuthContext';
import { calculateCost } from './utils/pricing';
import { History } from './components/History';
import { apiService } from './services/apiService';
import { performFullCleanup } from './utils/sessionCleanup';

// Utility function to hash content for cache keys
const hashContent = (content: string): string => {
  let hash = 0;
  if (content.length === 0) return hash.toString();
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
};
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Overview } from './components/Overview.tsx';
import { CompetitorBenchmarking } from './components/CompetitorBenchmarking';
import { CompetitorInsight } from './components/AIVisibilityAnalysis';

// import SmartCompetitorAnalysis from './components/SmartCompetitorAnalysis';
// Content structure pages disabled
import { ContentStructureAnalysisRoute } from './components/ContentStructureAnalysisRoute';
import { ContentStructureLanding } from './components/ContentStructureLanding';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import NotificationTest from './components/ui/NotificationTest';

const SESSIONS_KEY = 'llm_qa_sessions';
const CURRENT_SESSION_KEY = 'llm_qa_current_session';
const COMPETITOR_URLS_KEY = 'llm_competitor_urls';
const QA_WORK_KEY = 'llm_qa_current_work';
const ENHANCE_CONTENT_KEY = 'enhance_content_state';
const ENHANCE_CONTENT_CACHE_KEY = 'enhance_content_cache_';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <Zap />, path: '/overview' },
          { label: 'Competitor Insight', icon: <Eye />, path: '/ai-visibility-analysis' },
  { label: 'Content Analyzer', icon: <FileText />, path: '/enhance-content' },
  // { label: 'Content Analysis', icon: <BarChart3 />, path: '/content-analysis' },
  { label: 'Structure Analysis', icon: <Target />, path: '/content-structure-analysis' },
  // { label: 'Smart Competitor Analysis', icon: <BarChart3 />, path: '/smart-competitor-analysis' },
  { label: 'History', icon: <HistoryIcon />, path: '/history' },
  { label: 'Statistics', icon: <BarChart3 />, path: '/statistics' },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
  user: UserType | null;
  currentPath: string;
}

function Sidebar({ isOpen, setIsOpen, onLogout, user, currentPath }: SidebarProps) {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 bg-white w-56 min-h-screen flex flex-col border-r border-gray-200 shadow-lg transform transition-transform duration-300 md:transform-none sidebar-responsive ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-3 border-b border-primary/10 header-responsive">
          <div className="flex items-center gap-3 flex-1 min-w-0 logo-container">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0 logo-icon">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-primary tracking-wide truncate logo-text">kabini.ai</span>
          </div>
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors p-1.5 rounded-md flex items-center justify-center flex-shrink-0 ml-2" 
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            {/* Professional X icon */}
            <div className="relative w-5 h-5 flex items-center justify-center">
              <div className="absolute w-4 h-0.5 bg-gray-600 rounded-full transform rotate-45"></div>
              <div className="absolute w-4 h-0.5 bg-gray-600 rounded-full transform -rotate-45"></div>
            </div>
          </button>
        </div>
        
        <nav className="flex-1 flex flex-col gap-1 mt-4 px-2 nav-responsive">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                className={`nav-item-responsive ${isActive ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="mt-auto user-profile-section">
          {/* User Profile Section */}
          <div className="user-profile-info">
            <div className="user-avatar">
              <User />
            </div>
            <div className="user-details">
              <div className="user-name">
                {user?.displayName || user?.name || 'User'}
              </div>
              <div className="user-email">
                {user?.email || ''}
              </div>
            </div>
          </div>
          
          {/* Logout Button - Clearly Separated */}
          <button 
            className="logout-button" 
            onClick={onLogout}
          >
            <LogOut />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ setIsOpen, onLogout }: { setIsOpen: (open: boolean) => void; onLogout: () => void }) {
  return (
    <header className="w-full bg-white border-b border-primary/10 flex items-center justify-between px-3 sm:px-6 py-3 relative z-30 header-responsive">
      <div className="logo-container">
        <div className="logo-icon bg-gradient-to-r from-primary to-accent rounded-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="logo-text text-xl font-extrabold tracking-wide">kabini.ai</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Logout button for mobile */}
        <button 
          className="md:hidden bg-black border border-black text-white px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-800 hover:border-gray-800 transition-all flex items-center gap-2" 
          onClick={onLogout}
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
        {/* Menu button for mobile */}
        <button 
          className="block md:hidden text-primary hover:text-accent transition-colors p-2 rounded-lg hover:bg-gray-100 flex items-center justify-center border border-gray-200 bg-white" 
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          {/* Hamburger menu icon - always visible with explicit styling */}
          <div className="relative w-6 h-6">
            <div className="absolute w-5 h-1 bg-black rounded-full top-1 left-0.5"></div>
            <div className="absolute w-5 h-1 bg-black rounded-full top-3 left-0.5"></div>
            <div className="absolute w-5 h-1 bg-black rounded-full top-5 left-0.5"></div>
          </div>
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="w-full bg-white border-t border-primary/10 text-center text-primary py-3 text-sm">
      © {new Date().getFullYear()} kabini.ai. All rights reserved.
    </footer>
  );
}

function QAGenerationPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  const [currentSession, setCurrentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [qaContent, setQaContent] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Question Generation State
  const [questionProvider, setQuestionProvider] = useState('gemini');
  const [questionModel, setQuestionModel] = useState('gemini-1.5-flash');
  
  // Answer Generation State
  const [answerProvider, setAnswerProvider] = useState('gemini');
  const [answerModel, setAnswerModel] = useState('gemini-1.5-flash');
  
  const [answerLoading, setAnswerLoading] = useState<{ [idx: number]: boolean }>({});
  const [urls, setUrls] = useState<UrlData[]>([]);

  // Content input state (moved from ContentInput component)
  const [content, setContent] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [metrics, setMetrics] = useState({
    totalTokens: 0,
    estimatedCost: 0,
    confidenceScore: 0,
    contentLength: 0
  });
  const [showAnalysisNotification, setShowAnalysisNotification] = useState(false);
  
  // File upload state
  const [fileUploading, setFileUploading] = useState(false);
  
  // Provider dropdown state
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showAnswerProviderDropdown, setShowAnswerProviderDropdown] = useState(false);
  
  // Answer generation loading state
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);
  
  // History sidebar state
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  
  // State for tracking user activity and component lifecycle
  const [lastUserActivity, setLastUserActivity] = useState(Date.now());
  const [isComponentActive, setIsComponentActive] = useState(true);

  // Restore state from localStorage on mount
  useEffect(() => {
    // Try to restore from the most recent cache entry
    const keys = Object.keys(localStorage).filter(key => key.startsWith(ENHANCE_CONTENT_CACHE_KEY));
    if (keys.length > 0) {
      // Find the most recently accessed cache entry
      let mostRecentKey = keys[0];
      let mostRecentTime = 0;
      
      keys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.lastAccessed && data.lastAccessed > mostRecentTime) {
            mostRecentTime = data.lastAccessed;
            mostRecentKey = key;
          }
      } catch {}
      });
      
      try {
        const saved = localStorage.getItem(mostRecentKey);
        if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.qaItems) setQaItems(parsed.qaItems);
        if (parsed.qaContent) setQaContent(parsed.qaContent);
          if (parsed.content) setContent(parsed.content);
          if (parsed.newUrl) setNewUrl(parsed.newUrl);
        if (parsed.selectedQuestions) setSelectedQuestions(parsed.selectedQuestions);
        // Don't restore questionCount - always start with 1
        if (typeof parsed.isProcessing === 'boolean') setIsProcessing(parsed.isProcessing);
          if (parsed.questionProvider) setQuestionProvider(parsed.questionProvider);
          if (parsed.questionModel) setQuestionModel(parsed.questionModel);
          if (parsed.answerProvider) setAnswerProvider(parsed.answerProvider);
          if (parsed.answerModel) setAnswerModel(parsed.answerModel);
        if (parsed.answerLoading) setAnswerLoading(parsed.answerLoading);
        if (parsed.urls) {
          // Reset any URLs that were in extracting/crawling state
          const resetUrls = parsed.urls.map(url => ({
            ...url,
            status: url.status === 'extracting' ? 'pending' : url.status
          }));
          setUrls(resetUrls);
        }
          if (parsed.metrics) setMetrics(parsed.metrics);
          if (parsed.extracting) setExtracting(parsed.extracting);
          // Don't restore crawling state - always start fresh
          // if (parsed.crawling) setCrawling(parsed.crawling);
          if (parsed.showAnalysisNotification) setShowAnalysisNotification(parsed.showAnalysisNotification);
          
          // Update the lastAccessed timestamp
          setTimeout(() => {
            const updatedData = { ...parsed, lastAccessed: Date.now() };
            localStorage.setItem(mostRecentKey, JSON.stringify(updatedData));
          }, 100);
        }
      } catch (error) {
        console.error('Error restoring enhance content state:', error);
      }
    }
  }, []);

  // Ensure crawling state is always false on mount
  useEffect(() => {
    setCrawling(false);
    setExtracting(false);
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (content.trim() || urls.length > 0 || qaItems.length > 0) {
      const contentHash = hashContent(content + urls.map(u => u.url).join(''));
      const cacheKey = ENHANCE_CONTENT_CACHE_KEY + contentHash;
      
    const state = {
      qaItems,
      qaContent,
        content,
        newUrl,
      selectedQuestions,
      questionCount,
      isProcessing,
        questionProvider,
        questionModel,
        answerProvider,
        answerModel,
      answerLoading,
        urls,
        metrics,
        extracting,
        crawling,
        showAnalysisNotification,
        lastAccessed: Date.now(),
        createdAt: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(state));
    }
  }, [qaItems, qaContent, content, newUrl, selectedQuestions, questionCount, isProcessing, questionProvider, questionModel, answerProvider, answerModel, answerLoading, urls, metrics, extracting, crawling, showAnalysisNotification]);

  // Defensive: Ensure sessions is always an array
  useEffect(() => {
    if (!Array.isArray(sessions)) {
      setSessions([]);
    }
  }, [sessions, setSessions]);

  // Auto-recalculate metrics for existing data if needed
  useEffect(() => {
    if (qaItems.length > 0 && qaContent && qaItems.some(item => item.answer && (!item.sentiment || item.sentiment === '' || item.geoScore === 0))) {
      console.log('[Metrics] Auto-recalculating metrics for existing data...');
      recalculateMetricsForExistingData();
    }
  }, [qaItems.length, qaContent]); // Only run when qaItems or qaContent changes



  // Initialize default session if none exists
  useEffect(() => {
    if (sessions.length === 0 && user) {
      const defaultSession: SessionData = {
        id: 'default',
        name: 'Default Session',
        type: 'question',
        timestamp: new Date().toISOString(),
        model: 'gemini-pro',
        blogContent: '',
        qaData: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
        statistics: {
          totalQuestions: 0,
          avgAccuracy: '0',
          avgCitationLikelihood: '0',
          totalCost: '0'
        },
        userId: user.id
      };
      setSessions([defaultSession]);
      setCurrentSession(defaultSession);
    }
  }, [sessions, setSessions, setCurrentSession, user]);

  // Store competitor URLs in localStorage whenever they change
  useEffect(() => {
    const urlList = urls.map(u => u.url);
    localStorage.setItem(COMPETITOR_URLS_KEY, JSON.stringify(urlList));
  }, [urls]);

  // User activity tracking
  useEffect(() => {
    const handleUserActivity = () => {
      setLastUserActivity(Date.now());
      setIsComponentActive(true);
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
    };
  }, []);

  // URL management functions (moved from ContentInput)
  const addUrl = () => {
    console.log('[Add URL] Function called with:', newUrl);
    if (newUrl.trim() && !urls.find(u => u.url === newUrl.trim())) {
      const newUrlData: UrlData = { url: newUrl.trim(), content: '', status: 'pending' };
      console.log('[Add URL] Adding URL to list:', newUrlData);
      setUrls([...urls, newUrlData]);
      setNewUrl('');
    } else {
      console.log('[Add URL] URL already exists or is empty');
    }
  };

  const removeUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const extractContentFromUrl = async (urlData: UrlData, index: number) => {
    const updatedUrls = [...urls];
    updatedUrls[index] = { ...urlData, status: 'extracting' };
    setUrls(updatedUrls);

    try {
      const result = await apiService.extractContentFromUrl(urlData.url);
      const extractedContent = result.content || '';
      
      // Calculate metrics for this URL
      const tokens = extractedContent.length / 4; // Rough estimate
      const cost = tokens * 0.0001; // Rough cost estimate
      const confidence = Math.random() * 0.3 + 0.7; // Mock confidence score
      
      updatedUrls[index] = {
        ...urlData,
        content: extractedContent,
        status: 'success',
        tokens,
        cost,
        confidence
      };
      setUrls(updatedUrls);
      
      // Update overall content
      const allContent = updatedUrls.map(u => u.content).join('\n\n') + '\n\n' + content;
      setContent(allContent);
      
      // Update metrics
      updateMetrics(allContent);
      
    } catch (err: any) {
      updatedUrls[index] = {
        ...urlData,
        status: 'error',
        error: err.message || 'Failed to extract content'
      };
      setUrls(updatedUrls);
    }
  };

  const crawlWebsite = async (urlData: UrlData, index: number) => {
    console.log('[Crawl Website] Function called for:', urlData.url, 'at index:', index);
    console.log('[Crawl Website] Call stack:', new Error().stack);
    
    const updatedUrls = [...urls];
    updatedUrls[index] = { ...urlData, status: 'extracting' };
    setUrls(updatedUrls);
    setCrawling(true);

    try {
      console.log(`🕷️ Starting website crawl for: ${urlData.url}`);
      const result = await apiService.crawlWebsite(urlData.url, {
        maxPages: 50,
        maxDepth: 3,
        timeout: 30000
      });
      
      if (result.success && result.result) {
        const crawledContent = result.result.content || '';
        
        // Calculate metrics for crawled content
        const tokens = crawledContent.length / 4; // Rough estimate
        const cost = tokens * 0.0001; // Rough cost estimate
        const confidence = Math.random() * 0.3 + 0.7; // Mock confidence score
        
        updatedUrls[index] = {
          ...urlData,
          content: crawledContent,
          status: 'success',
          tokens,
          cost,
          confidence
        };
        setUrls(updatedUrls);
        
        // Update overall content
        const allContent = updatedUrls.map(u => u.content).join('\n\n') + '\n\n' + content;
        setContent(allContent);
        
        // Update metrics
        updateMetrics(allContent);
        
        console.log(`✅ Website crawl completed! Found ${result.result.totalPages} pages with ${crawledContent.length} characters`);
      } else {
        throw new Error('Crawl failed');
      }
      
    } catch (err: any) {
      console.error('❌ Website crawl error:', err);
      updatedUrls[index] = {
        ...urlData,
        status: 'error',
        error: err.message || 'Failed to crawl website'
      };
      setUrls(updatedUrls);
    } finally {
      setCrawling(false);
    }
  };

  const updateMetrics = (text: string) => {
    const tokens = text.length / 4;
    const cost = tokens * 0.0001;
    const confidence = Math.random() * 0.2 + 0.8;
    
    setMetrics({
      totalTokens: Math.round(tokens),
      estimatedCost: parseFloat(cost.toFixed(4)),
      confidenceScore: parseFloat((confidence * 100).toFixed(1)),
      contentLength: text.length
    });
  };

  const handleSingleUrlExtract = async () => {
    if (!newUrl.trim()) return;
    
    console.log('[Single URL Extract] Function called with:', newUrl);
    
    // Clear any existing URLs and add the new one
    const newUrlData: UrlData = { url: newUrl.trim(), content: '', status: 'extracting' };
    setUrls([newUrlData]);
    
    try {
      const result = await apiService.extractContentFromUrl(newUrl.trim());
      const extractedContent = result.content || '';
      
      // Calculate metrics for this URL
      const tokens = extractedContent.length / 4; // Rough estimate
      const cost = tokens * 0.0001; // Rough cost estimate
      const confidence = Math.random() * 0.3 + 0.7; // Mock confidence score
      
      const updatedUrlData = {
        ...newUrlData,
        content: extractedContent,
        status: 'success',
        tokens,
        cost,
        confidence
      };
      setUrls([updatedUrlData]);
      
      // Update overall content
      setContent(extractedContent);
      
      // Update metrics
      updateMetrics(extractedContent);
      
      // Clear the input field
      setNewUrl('');
      
      console.log('[Single URL Extract] Successfully extracted content from:', newUrl);
    } catch (err: any) {
      const errorUrlData = {
        ...newUrlData,
        status: 'error',
        error: err.message || 'Failed to extract content'
      };
      setUrls([errorUrlData]);
      console.error('[Single URL Extract] Error:', err);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    updateMetrics(newContent);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(Math.max(48, textarea.scrollHeight), 300) + 'px';
    
    // Smart URL detection and processing
    if (newContent.trim()) {
      const contentType = detectContentType(newContent);
      if (contentType === 'url' && !urls.length) {
        // Auto-process URL if it's the only content
        setTimeout(() => handleSmartInput(newContent.trim()), 1000);
      }
    }
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileUploading(true);
    try {
      const text = await readFileContent(file);
      setContent(text);
      updateMetrics(text);
      
      // Clear URL input since we now have file content
      setNewUrl('');
      setUrls([]);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Failed to read file. Please try again.');
    } finally {
      setFileUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Auto-resize textarea when content changes
  useEffect(() => {
    const textarea = document.querySelector('textarea');
    if (textarea && content) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(Math.max(48, textarea.scrollHeight), 300) + 'px';
      }, 0);
    }
  }, [content]);

  // File content reader
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      if (file.type === 'application/pdf') {
        // For PDFs, we'll need a different approach
        reject(new Error('PDF files are not supported yet. Please convert to text first.'));
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Smart content detection
  const detectContentType = (input: string): 'url' | 'content' => {
    const urlPattern = /^https?:\/\/.+/i;
    return urlPattern.test(input.trim()) ? 'url' : 'content';
  };

  const handleSmartInput = (input: string) => {
    const contentType = detectContentType(input);
    
    if (contentType === 'url') {
      setNewUrl(input);
      // Auto-extract if it's a single URL
      if (!content.trim() && !urls.length) {
        setTimeout(() => handleSingleUrlExtract(), 100);
      }
    } else {
      setContent(input);
      updateMetrics(input);
    }
  };

  const handleNewAnalysis = () => {
    // Clear all cached data
    const keys = Object.keys(localStorage).filter(key => key.startsWith(ENHANCE_CONTENT_CACHE_KEY));
    keys.forEach(key => localStorage.removeItem(key));
    
    // Reset all state
    setQaItems([]);
    setQaContent('');
    setContent('');
    setNewUrl('');
    setSelectedQuestions([]);
    setUrls([]);
    setMetrics({
      totalTokens: 0,
      estimatedCost: 0,
      confidenceScore: 0,
      contentLength: 0
    });
    setExtracting(false);
    setShowAnalysisNotification(false);
    setIsProcessing(false);
    setAnswerLoading({});
    
    // Reset textarea height to original size
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = '48px';
      }
    }, 0);
  };

  const handleGenerateQA = async (items: QAItem[], content: string) => {
    // Calculate vector similarities for all questions
    const { calculateAndUpdateVectorSimilarities } = await import('./utils/vectorSimilarity');
    const itemsWithVectorSimilarity = await calculateAndUpdateVectorSimilarities(items, content);
    
    setQaItems(prev => [...prev, ...itemsWithVectorSimilarity]);
    setQaContent(content);
    
    // Calculate tokens and cost
    const totalInputTokens = items.reduce((sum, item) => sum + item.inputTokens, 0);
    const totalOutputTokens = items.reduce((sum, item) => sum + item.outputTokens, 0);
    const totalCost = calculateCost(totalInputTokens, totalOutputTokens, 'gemini-pro');
    
    // Check if we have an existing session for this content
    if (currentSession && currentSession.blogContent === content) {
      // Update existing session with new questions
      const updatedSession = {
        ...currentSession,
        qaData: [...currentSession.qaData, ...itemsWithVectorSimilarity],
        statistics: {
          ...currentSession.statistics,
          totalQuestions: currentSession.qaData.length + items.length,
          totalCost: (parseFloat(currentSession.statistics.totalCost) + totalCost).toString()
        }
      };
      
      console.log('[App] Updating existing session with new questions:', updatedSession);
      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
    } else {
      // Create new session for new content analysis
      const newSession: SessionData = {
        id: `qa-session-${Date.now()}`,
        name: `Q&A Session - ${new Date().toLocaleDateString()}`,
        type: 'question',
        timestamp: new Date().toISOString(),
        model: 'gemini-pro',
        questionProvider: questionProvider,
        answerProvider: answerProvider,
        questionModel: questionModel,
        answerModel: answerModel,
        blogContent: content,
        qaData: itemsWithVectorSimilarity,
        totalInputTokens,
        totalOutputTokens,
        statistics: {
          totalQuestions: items.length,
          avgAccuracy: '85',
          avgCitationLikelihood: '75',
          totalCost: totalCost.toString()
        },
        userId: user?.id || 'anonymous'
      };
      
      console.log('[App] Creating new session for new content analysis:', newSession);
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
    }
  };

  const handleGenerateAnswer = async (idx: number) => {
    setAnswerLoading((prev) => ({ ...prev, [idx]: true }));
    try {
      const item = qaItems[idx];
      const provider = answerProvider;
      const model = answerModel === 'gemini-pro' ? 'gemini-1.5-flash' : answerModel;
      const result = await apiService.generateAnswers({
        content: qaContent,
        questions: [item.question],
        provider,
        model
      });
      const answerObj = result.answers[0] || {};
      // Calculate metrics in parallel
      const [citation, accuracy] = await Promise.all([
        apiService.calculateCitationLikelihood({ answer: answerObj.answer, content: qaContent, provider, model }),
        apiService.calculateAccuracy({ answer: answerObj.answer, content: qaContent, provider, model })
      ]);
      
      // Calculate sentiment analysis for the overall content (not just individual answers)
      const { analyzeSentimentWithConfidence } = await import('./utils/analysis');
      const sentimentResult = analyzeSentimentWithConfidence(qaContent || '');
      const sentiment = sentimentResult.sentiment;
      
      // Calculate GEO score
      const { calculateGeoScoreV2 } = await import('./utils/analysis');
      const geoScoreResult = await calculateGeoScoreV2({
        accuracy: parseFloat(accuracy.accuracy) || 0,
        question: item.question,
        answer: answerObj.answer || '',
        importantQuestions: qaItems.map(qa => qa.question),
        allConfidences: qaItems.map(() => 85), // Default confidence
        sourceUrl: '', // Will be empty for now
        content: qaContent
      });
      
      // Calculate semantic relevance
      const semanticRelevance = Math.round((parseFloat(accuracy.accuracy) || 0) * 0.8 + (geoScoreResult.geoScore || 0) * 0.2);
      
      // Calculate vector similarity
      const { calculateAndUpdateVectorSimilarities } = await import('./utils/vectorSimilarity');
      const updatedQaData = await calculateAndUpdateVectorSimilarities([{
        question: item.question,
        answer: answerObj.answer || '',
        accuracy: null,
        sentiment: '',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        geoScore: 0,
        citationLikelihood: null
      }], qaContent);
      
      const vectorSimilarity = updatedQaData[0]?.vectorSimilarity || null;
      setQaItems(prev => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          answer: answerObj.answer || '',
          inputTokens: answerObj.inputTokens || 0,
          outputTokens: answerObj.outputTokens || 0,
          totalTokens: (answerObj.inputTokens || 0) + (answerObj.outputTokens || 0),
          cost: calculateCost(answerObj.inputTokens || 0, answerObj.outputTokens || 0, model),
          citationLikelihood: citation.citationLikelihood,
          accuracy: accuracy.accuracy,
          sentiment: sentiment,
          geoScore: geoScoreResult.geoScore,
          semanticRelevance: semanticRelevance.toString(),
          vectorSimilarity: vectorSimilarity,
          provider: answerProvider,
          model: answerModel
        };
        // Update existing session with new answer data
        if (currentSession) {
          const updatedSession = {
            ...currentSession,
            qaData: updated,
            statistics: {
              ...currentSession.statistics,
              totalQuestions: updated.length,
              totalCost: updated.reduce((sum, item) => sum + (item.cost || 0), 0).toString()
            }
          };
          
          console.log('[App] Updating existing session with answer data:', updatedSession);
          setCurrentSession(updatedSession);
          setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
        }
        return updated;
      });
    } catch (error) {
      console.error('Error generating answer:', error);
    } finally {
      setAnswerLoading((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handleSelectQuestion = (idx: number) => {
    setSelectedQuestions(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleSelectAll = () => {
    setSelectedQuestions(qaItems.map((_, idx) => idx));
  };

  const handleDeselectAll = () => {
    setSelectedQuestions([]);
  };

  const handleGenerateAnswersForSelected = async () => {
    setIsGeneratingAnswers(true);
    try {
      for (const idx of selectedQuestions) {
        await handleGenerateAnswer(idx);
      }
    } catch (error) {
      console.error('Error generating answers:', error);
    } finally {
      setIsGeneratingAnswers(false);
    }
  };

  // Session management functions
  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const downloadSession = (session: SessionData) => {
    const content = `Q&A Session - ${new Date(session.timestamp).toLocaleDateString()}\n\n` +
      `Content: ${session.blogContent}\n\n` +
      session.qaData.map((qa, index) => 
        `Q${index + 1}: ${qa.question}\n\nA${index + 1}: ${qa.answer || 'No answer generated'}\n\n`
      ).join('') +
      `Total Questions: ${session.statistics.totalQuestions}\n` +
      `Total Cost: ${session.statistics.totalCost}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${session.id}-${new Date(session.timestamp).toLocaleDateString().replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteSession = async (session: SessionData) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        const updatedSessions = sessions.filter(s => s.id !== session.id);
        setSessions(updatedSessions);
        
        // Remove from expanded sessions if it was expanded
        setExpandedSessions(prev => {
          const newSet = new Set(prev);
          newSet.delete(session.id);
          return newSet;
        });
        
        console.log('Session deleted successfully');
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  const getTotalCost = () => {
    return qaItems.reduce((sum, item) => sum + (item.cost || 0), 0);
  };

  // Function to recalculate metrics for existing QA items
  const recalculateMetricsForExistingData = async () => {
    console.log('[Metrics] Recalculating metrics for existing QA items...');
    
    const updatedQaItems = await Promise.all(
      qaItems.map(async (item, idx) => {
        // Skip if no answer exists
        if (!item.answer) {
          return item;
        }

        try {
          const provider = answerProvider;
          const model = answerModel === 'gemini-pro' ? 'gemini-1.5-flash' : answerModel;
          
          // Calculate metrics in parallel
          const [citation, accuracy] = await Promise.all([
            apiService.calculateCitationLikelihood({ answer: item.answer, content: qaContent, provider, model }),
            apiService.calculateAccuracy({ answer: item.answer, content: qaContent, provider, model })
          ]);
          
          // Calculate sentiment analysis for the overall content
          const { analyzeSentimentWithConfidence } = await import('./utils/analysis');
          const sentimentResult = analyzeSentimentWithConfidence(qaContent || '');
          const sentiment = sentimentResult.sentiment;
          
          // Calculate GEO score
          const { calculateGeoScoreV2 } = await import('./utils/analysis');
          const geoScoreResult = await calculateGeoScoreV2({
            accuracy: parseFloat(accuracy.accuracy) || 0,
            question: item.question,
            answer: item.answer || '',
            importantQuestions: qaItems.map(qa => qa.question),
            allConfidences: qaItems.map(() => 85), // Default confidence
            sourceUrl: '', // Will be empty for now
            content: qaContent
          });
          
          // Calculate semantic relevance
          const semanticRelevance = Math.round((parseFloat(accuracy.accuracy) || 0) * 0.8 + (geoScoreResult.geoScore || 0) * 0.2);
          
          // Calculate vector similarity
          const { calculateAndUpdateVectorSimilarities } = await import('./utils/vectorSimilarity');
          const updatedQaData = await calculateAndUpdateVectorSimilarities([{
            question: item.question,
            answer: item.answer || '',
            accuracy: null,
            sentiment: '',
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            cost: 0,
            geoScore: 0,
            citationLikelihood: null
          }], qaContent);
          
          const vectorSimilarity = updatedQaData[0]?.vectorSimilarity || null;
          
          return {
            ...item,
            citationLikelihood: citation.citationLikelihood,
            accuracy: accuracy.accuracy,
            sentiment: sentiment,
            geoScore: geoScoreResult.geoScore,
            semanticRelevance: semanticRelevance.toString(),
            vectorSimilarity: vectorSimilarity
          };
        } catch (error) {
          console.error(`[Metrics] Error recalculating metrics for item ${idx}:`, error);
          return item;
        }
      })
    );
    
    setQaItems(updatedQaItems);
    
    // Update session data
    if (currentSession && user) {
      const updatedSession = {
        ...currentSession,
        qaData: updatedQaItems,
        statistics: {
          ...currentSession.statistics,
          totalQuestions: updatedQaItems.length,
          totalCost: updatedQaItems.reduce((sum, item) => sum + (item.cost || 0), 0).toString()
        },
        userId: user.id
      };
      setCurrentSession(updatedSession);
      setSessions(sessions.map(s => s.id === currentSession.id ? updatedSession : s));
    }
    
    console.log('[Metrics] Metrics recalculation completed');
  };

  return (
    <div className="flex gap-8">
            {/* Main Content */}
      <div className="flex-1 space-y-8">
      {/* Content Input Section */}
      <div className="card bg-white border border-primary/10 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-8 h-8 text-black drop-shadow" />
          <h2 className="text-3xl font-extrabold text-black tracking-tight">Content Enhancement</h2>
        </div>
        
        <div className="space-y-8">
          {/* Unified Content Input */}
          <div>
            <label className="block text-base font-semibold text-black mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-black" />
              Paste your content or enter a URL
            </label>
            <div className="flex gap-3 items-center">
              <textarea
                value={content}
                onChange={handleContentChange}
                onPaste={e => {
                  const pastedText = e.clipboardData.getData('text');
                  if (pastedText.trim()) {
                    setTimeout(() => handleSmartInput(pastedText.trim()), 100);
                    // Immediate resize for better UX
                    setTimeout(() => {
                      const textarea = e.target as HTMLTextAreaElement;
                      textarea.style.height = 'auto';
                      textarea.style.height = Math.min(Math.max(48, textarea.scrollHeight), 300) + 'px';
                    }, 10);
                  }
                }}
                placeholder="Paste URL or content here..."
                rows={1}
                className="flex-1 bg-white border border-black/20 rounded-lg px-4 py-3 text-black text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 resize-none"
                style={{ 
                  minHeight: '48px', 
                  maxHeight: '300px'
                }}
              />
              {/* File Upload Button */}
              <div className="flex-shrink-0 flex items-center">
                <input
                  type="file"
                  id="file-upload"
                  accept=".txt,.md,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                    fileUploading 
                      ? 'bg-gray-400 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 shadow-lg border-2 border-green-700'
                  }`}
                  style={{ width: '48px', height: '48px' }}
                  title="Upload file (.txt, .md, .doc, .docx)"
                >
                  {fileUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                </label>
              </div>
            </div>
            

            
            {/* Single URL Display */}
            {urls.length > 0 && (
              <div className="space-y-2 mb-4">
                {urls.map((urlData, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg border border-black/10">
                    <div className="flex-1 min-w-0">
                      <div className="text-base text-black font-medium truncate">{urlData.url}</div>
                      {urlData.status === 'error' && (
                        <div className="text-xs text-red-600 mt-1">{urlData.error}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Crawl website button commented out - not needed */}
                      {/* {urlData.status !== 'extracting' && (
                        <button
                          onClick={() => crawlWebsite(urlData, index)}
                          disabled={crawling}
                          className="bg-red-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2 border-2 border-red-800 transform hover:scale-105"
                        >
                          {crawling ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Crawling...
                            </>
                          ) : (
                            <>
                              <Globe className="w-4 h-4" />
                              CRAWL WEBSITE
                            </>
                          )}
                        </button>
                      )} */}
                      
                      {/* Show loading spinner during extraction */}
                      {urlData.status === 'extracting' && (
                        <Loader2 className="w-5 h-5 animate-spin text-black" />
                      )}
                      
                      {/* Show success indicator */}
                      {urlData.status === 'success' && (
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      )}
                      
                      {/* Show error indicator */}
                      {urlData.status === 'error' && (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                      
                      <button
                        onClick={() => removeUrl(index)}
                        className="text-red-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-5 h-5 text-black" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>





          {/* Generate Questions Button */}
          <div className="flex items-center gap-4">
            {!user ? (
              <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-yellow-800">⚠️ Please log in to generate questions</span>
              </div>
            ) : (
              <div className="relative">
                                  <button
                    onClick={async () => {
                      if (!content.trim()) {
                        alert('Please enter some content first');
                        return;
                      }
                      setIsProcessing(true);
                      try {
                const clampedCount = Math.max(1, Math.min(10, questionCount));
                const result = await apiService.generateQuestions({ 
                  content, 
                  questionCount: clampedCount, 
                  provider: questionProvider, 
                  model: questionModel === 'gemini-pro' ? 'gemini-1.5-flash' : questionModel 
                });
                const qaItems: QAItem[] = result.questions.slice(0, clampedCount).map((q: string) => ({
                          question: q,
                          answer: '',
                          accuracy: '',
                          sentiment: '',
                          inputTokens: result.inputTokens || 0,
                          outputTokens: result.outputTokens || 0,
                          totalTokens: (result.inputTokens || 0) + (result.outputTokens || 0),
                          cost: 0,
                          geoScore: 0,
                          citationLikelihood: 0,
                          provider: questionProvider,
                          model: questionModel
                        }));
                        await handleGenerateQA(qaItems, content);
                      } catch (err: any) {
                        alert('Failed to generate questions: ' + (err.message || err));
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing || !content.trim()}
                    className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg shadow"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating AI Questions...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Generate AI Questions
                      </>
                    )}
                  </button>
                
                                  {/* Question Configuration Button */}
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 p-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-all duration-200 hover:scale-110 shadow-lg"
                    title="Select AI Provider"
                    onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  
                  {/* Provider Dropdown */}
                  {showProviderDropdown && (
                    <div className="absolute -top-2 -right-2 mt-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                      <div className="p-2">
                        <div className="text-sm font-medium text-gray-700 mb-2 sticky top-0 bg-white pb-1">Select AI Provider</div>
                        {['gemini', 'openai', 'perplexity'].map((provider) => (
                          <button
                            key={provider}
                            onClick={() => {
                              setQuestionProvider(provider);
                              setShowProviderDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 ${
                              questionProvider === provider
                                ? 'bg-gray-100 text-gray-900 font-medium'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            } !text-gray-700`}
                          >
                            {provider === 'gemini' ? 'Gemini' : 
                             provider === 'openai' ? 'ChatGPT' : 
                             provider === 'perplexity' ? 'Perplexity' : provider}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
            
            
          </div>
        </div>
      </div>
      {qaItems.length > 0 && (
        <div className="card mt-8 p-6 bg-white border border-black/10 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-black">Generated Questions</h3>
            <div className="text-sm text-gray-600">Select questions to generate answers</div>
          </div>
          
          
          
          {/* Questions List */}
          <ul className="space-y-4">
            {qaItems.map((item, idx) => (
              <li key={idx} className="p-6 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all duration-200">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(idx)}
                      onChange={() => handleSelectQuestion(idx)}
                      className="mt-1 accent-blue-600 w-5 h-5"
                    />
                    <div className="flex-1">
                                             <div className="font-semibold text-black text-base leading-relaxed">
                         {item.question}
                       </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    {/* Copy Q&A Button */}
                    {item.answer && (
                      <button
                        onClick={() => {
                          const qaText = `Q: ${item.question}\n\nA: ${item.answer}`;
                          navigator.clipboard.writeText(qaText).then(() => {
                            // Show success message
                            const button = event?.target as HTMLButtonElement;
                            if (button) {
                              const originalText = button.innerHTML;
                              button.innerHTML = '✓ Copied!';
                              button.className = 'p-2 bg-green-500 text-white rounded-full transition-all duration-200';
                              setTimeout(() => {
                                button.innerHTML = originalText;
                                button.className = 'p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-all duration-200 hover:scale-110';
                              }, 2000);
                            }
                          });
                        }}
                        className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-all duration-200 hover:scale-110 shadow-lg"
                        title="Copy Q&A to clipboard"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Reanalyze Answer Button */}
                    {item.answer && (
                      <button
                        onClick={() => handleGenerateAnswer(idx)}
                        disabled={answerLoading[idx]}
                        className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-all duration-200 hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Generate new answer"
                      >
                        {answerLoading[idx] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Answer Section */}
                {item.answer && (
                  <div className="ml-8 mb-4">
                                         <div className="text-black leading-relaxed text-sm">
                       <span className="font-bold text-blue-700">A:</span> {item.answer}
                     </div>
                  </div>
                )}

                

              </li>
            ))}
          </ul>
          
          {/* Generate Answers Button - Bottom Left */}
          <div className="mt-6 flex justify-start">
            <div className="relative">
              <button
                className="bg-green-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                onClick={handleGenerateAnswersForSelected}
                disabled={selectedQuestions.length === 0 || isGeneratingAnswers}
              >
                {isGeneratingAnswers ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Answers...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Generate Answers
                  </>
                )}
              </button>
              
              {/* Answer Configuration Button */}
              <button
                type="button"
                className="absolute -top-2 -right-2 p-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-all duration-200 hover:scale-110 shadow-lg"
                title="Select AI Provider for Answers"
                onClick={() => setShowAnswerProviderDropdown(!showAnswerProviderDropdown)}
              >
                <Settings className="w-3 h-3" />
              </button>
              
                            {/* Answer Provider Dropdown */}
              {showAnswerProviderDropdown && (
                <div className="absolute -top-2 -right-2 mt-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-sm font-medium text-gray-700 mb-2 sticky top-0 bg-white pb-1">Select AI Provider</div>
                    {['gemini', 'openai', 'perplexity'].map((provider) => (
                      <button
                        key={provider}
                        onClick={() => {
                          setAnswerProvider(provider);
                          setShowAnswerProviderDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 ${
                          answerProvider === provider
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        } !text-gray-700`}
                      >
                        {provider === 'gemini' ? 'Gemini' : 
                         provider === 'openai' ? 'ChatGPT' : 
                         provider === 'perplexity' ? 'Perplexity' : provider}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      
      {/* Right Sidebar */}
      <div className="w-80 space-y-6">
                {/* New Analysis Button */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <button
            onClick={handleNewAnalysis}
            className="w-full bg-white text-gray-700 font-bold px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 justify-start border border-gray-300 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Analysis
          </button>
        </div>
        
        {/* History Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800">History</h3>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sessions.slice(0, 10).map((session, idx) => (
              <div key={session.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200">
                {/* Session Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {session.name}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {session.blogContent && (
                      <div className="text-xs text-gray-600 truncate mt-1">
                        {session.blogContent.substring(0, 50)}...
                      </div>
                    )}
                  </div>
                  
                  {/* Expand/Collapse Button */}
                  <button
                    className="bg-white border border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200 p-1.5 rounded"
                    title="View details"
                    onClick={() => toggleSessionExpansion(session.id)}
                  >
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${expandedSessions.has(session.id) ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {/* Session Details - Expanded */}
                {expandedSessions.has(session.id) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 mb-2">
                      {session.statistics.totalQuestions} questions generated
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => downloadSession(session)}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors"
                        title="Download session"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                      
                      <button
                        onClick={() => deleteSession(session)}
                        className="flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded transition-colors"
                        title="Delete session"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                    
                    {/* Questions Preview */}
                    <div className="space-y-2">
                      {session.qaData.slice(0, 3).map((qa, qaIdx) => (
                        <div key={qaIdx} className="text-xs">
                          <div className="font-medium text-gray-800">Q{qaIdx + 1}: {qa.question}</div>
                          {qa.answer && (
                            <div className="text-gray-600 mt-1">{qa.answer.substring(0, 100)}...</div>
                          )}
                        </div>
                      ))}
                      {session.qaData.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{session.qaData.length - 3} more questions...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {sessions.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-4">
                No analysis history yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CostBreakdownPage() {
  const [sessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  const [currentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);

  const getTotalCost = () => {
    return sessions.reduce((sum, session) => {
      return sum + parseFloat(session.statistics?.totalCost || '0');
    }, 0);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-primary">Cost Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gray-800/50 rounded-lg border border-primary/20">
            <div className="text-3xl font-bold text-primary mb-2">
              ${getTotalCost().toFixed(2)}
            </div>
            <div className="text-gray-300">Total Cost</div>
          </div>
          <div className="text-center p-6 bg-gray-800/50 rounded-lg border border-primary/20">
            <div className="text-3xl font-bold text-primary mb-2">
              {currentSession?.qaData?.length || 0}
            </div>
            <div className="text-gray-300">Questions Generated</div>
          </div>
          <div className="text-center p-6 bg-gray-800/50 rounded-lg border border-primary/20">
            <div className="text-3xl font-bold text-primary mb-2">
              ${((currentSession?.qaData?.length || 0) * 0.01).toFixed(2)}
            </div>
            <div className="text-gray-300">Estimated Monthly</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, logout, user, refreshUser } = useAuth();
  
  console.log('[App] Authentication state:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    userEmail: user?.email
  });
  
  // Force refresh user data if authenticated but no user data
  useEffect(() => {
    if (isAuthenticated && !user && !isLoading) {
      console.log('[App] Authenticated but no user data, forcing refresh...');
      refreshUser();
    }
  }, [isAuthenticated, user, isLoading, refreshUser]);
  
  // Clear any stale localStorage data on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('[App] Clearing stale localStorage data...');
      const staleKeys = [
        'llm_qa_current_session',
        'structure_last_saved',
        'overview_market_analysis'
      ];
      
      staleKeys.forEach(key => {
        try {
          if (localStorage.getItem(key)) {
            console.log(`[App] Clearing stale localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.warn(`[App] Could not clear ${key}:`, e);
        }
      });
    }
  }, [isAuthenticated, user]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [sessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  const [currentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);

  // Get competitor domains from COMPETITOR_URLS_KEY
  let competitorDomains: string[] = [];
  try {
    const urlList = JSON.parse(localStorage.getItem(COMPETITOR_URLS_KEY) || '[]') as string[];
    competitorDomains = Array.from(new Set(urlList.map((url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return url;
      }
    }))).filter(Boolean);
  } catch {}

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary font-medium">Loading kabini.ai...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait while we verify your authentication...</p>
        </div>
      </div>
    );
  }
  
  // Show loading state if authenticated but user data is still loading
  if (isAuthenticated && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary font-medium">Loading user data...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait while we load your profile...</p>
        </div>
      </div>
    );
  }

  // Allow unauthenticated users to access /signup
  if (!isAuthenticated) {
    console.log('[App] User not authenticated, showing login page');
    return (
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/test-notifications" element={<NotificationTest />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  
  console.log('[App] User is authenticated, showing main app');

  // Note: Analysis data cleanup is now handled in AuthContext on login/logout
  // This prevents aggressive clearing that could cause blank pages

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        onLogout={handleLogout} 
        user={user} // Pass the logged-in user
        currentPath={location.pathname}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden content-responsive">
        <Topbar setIsOpen={setSidebarOpen} onLogout={handleLogout} />
        <main className="flex-1 p-responsive-md overflow-x-hidden overflow-y-auto text-black bg-white main-content-responsive">
          <div className="main-content-container">
            <Routes>
              <Route path="/overview" element={<Overview />} />
              <Route path="/ai-visibility-analysis" element={<CompetitorInsight />} />
              <Route path="/qa-generation" element={<QAGenerationPage />} />
              <Route path="/enhance-content" element={<QAGenerationPage />} />
              {/* Content Analysis disabled */}
              {/* <Route path="/content-analysis" element={<CompetitorBenchmarking competitorDomains={competitorDomains} />} /> */}
      
              {/* <Route path="/smart-competitor-analysis" element={<SmartCompetitorAnalysis />} /> */}
              <Route path="/content-structure-analysis" element={<ContentStructureAnalysisRoute />} />
              {/* <Route path="/content-structure-landing" element={<ContentStructureLanding />} /> */}
              <Route path="/history" element={<History qaItems={sessions.flatMap(s => s.qaData)} onExport={downloadFile} />} />
              <Route path="/statistics" element={<Statistics sessions={sessions} currentSession={currentSession} />} />
              <Route path="/CloudFuzeLLMQA" element={<Navigate to="/overview" replace />} />
              <Route path="/" element={<Navigate to="/overview" replace />} />
            </Routes>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;