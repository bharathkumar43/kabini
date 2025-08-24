import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, Users, Globe, Target, BarChart3, Zap, Shield, Clock, Star, Award, TrendingDown, AlertTriangle, CheckCircle, XCircle, Info, ExternalLink, Download, Share2, Filter, SortAsc, SortDesc, Calendar, MapPin, Building2, Briefcase, Globe2, Network, BarChart, PieChart, LineChart, Activity } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SessionData } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { historyService } from '../services/historyService';
import type { HistoryItem, QAHistoryItem } from '../types';
import AIVisibilityTable from './AIVisibilityTable';
import { handleInputChange as handleEmojiFilteredInput, handlePaste, handleKeyDown } from '../utils/emojiFilter';

const SESSIONS_KEY = 'llm_qa_sessions';
const CURRENT_SESSION_KEY = 'llm_qa_current_session';

// SVG/mini-visuals for each feature
const BarChartSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect x="2" y="12" width="5" height="10" fill="#3b82f6"/><rect x="10" y="6" width="5" height="16" fill="#60a5fa"/><rect x="18" y="2" width="5" height="20" fill="#2563eb"/><rect x="26" y="8" width="5" height="14" fill="#93c5fd"/><rect x="34" y="16" width="5" height="6" fill="#1e40af"/></svg>
);
const PieChartSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><circle cx="12" cy="12" r="10" fill="#fbbf24"/><path d="M12 2 A10 10 0 0 1 22 12 L12 12 Z" fill="#f59e42"/></svg>
);
const MagicWandSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect x="18" y="4" width="4" height="16" rx="2" fill="#a21caf"/><circle cx="20" cy="4" r="3" fill="#f472b6"/><circle cx="20" cy="20" r="2" fill="#f472b6"/></svg>
);
const StructureSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect x="6" y="10" width="8" height="8" fill="#10b981"/><rect x="26" y="6" width="8" height="8" fill="#34d399"/><rect x="16" y="2" width="8" height="8" fill="#6ee7b7"/><path d="M14 14 L20 10 L26 14" stroke="#10b981" strokeWidth="2" fill="none"/></svg>
);
const CalendarSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect x="6" y="6" width="28" height="14" rx="3" fill="#f87171"/><rect x="10" y="10" width="6" height="6" fill="#fff"/><rect x="24" y="10" width="6" height="6" fill="#fff"/></svg>
);
const LineChartSVG = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><polyline points="2,22 10,10 18,14 26,6 34,18 38,10" fill="none" stroke="#6366f1" strokeWidth="2"/><circle cx="10" cy="10" r="2" fill="#6366f1"/><circle cx="26" cy="6" r="2" fill="#6366f1"/><circle cx="34" cy="18" r="2" fill="#6366f1"/></svg>
);

interface FeatureCardProps {
  title: string;
  description: string;
  button: string;
  onClick: () => void;
  icon: React.ReactNode;
  visual?: React.ReactNode;
}

function FeatureCard({ title, description, button, onClick, icon, visual }: FeatureCardProps) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow hover:shadow-lg transition flex flex-col justify-between">
      <div>
        <div className="mb-3 flex items-center justify-between">
          {icon}
          {visual && <div className="ml-auto">{visual}</div>}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="mb-4 text-gray-600">{description}</p>
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-auto"
        onClick={onClick}
      >
        {button}
      </button>
    </div>
  );
}

export function Overview() {
  const { user } = useAuth();
  const [sessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  // keep but unused in this page variant
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);
  const navigate = useNavigate();
  
  // Company analysis state
  const [companyName, setCompanyName] = useState(() => {
    try {
      const saved = localStorage.getItem('overview_market_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.originalInput || '';
      }
      return '';
    } catch { return ''; }
  });
  const [industry, setIndustry] = useState(() => {
    try {
      const saved = localStorage.getItem('overview_market_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.industry || '';
      }
      return '';
    } catch { return ''; }
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputType, setInputType] = useState<'company' | 'url'>(() => {
    try {
      const saved = localStorage.getItem('overview_market_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.inputType || 'company';
      }
      return 'company';
    } catch { return 'company'; }
  });
  const [aiResult, setAiResult] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('overview_market_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Extract the actual analysis data from the cached structure
        return parsed.data || parsed;
      }
      return null;
    } catch { return null; }
  });
  const [aiError, setAiError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // History data state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load history items from service
  useEffect(() => {
    const items = historyService.getHistoryItems();
    setHistoryItems(items);
    console.log('[Overview] Loaded history items:', items.length);
  }, [refreshKey]);

  // Restore cached analysis data on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('overview_market_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[Overview] Restoring cached analysis data:', parsed);
        
        // Restore all cached values
        if (parsed.originalInput) setCompanyName(parsed.originalInput);
        if (parsed.industry) setIndustry(parsed.industry);
        if (parsed.inputType) setInputType(parsed.inputType);
        if (parsed.data) setAiResult(parsed.data);
        
        console.log('[Overview] Cached data restored successfully');
      }
    } catch (error) {
      console.error('[Overview] Error restoring cached data:', error);
    }
  }, []);

  // Listen for storage changes to auto-refresh
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'comprehensive_history' || e.key === 'sessions') {
        console.log('[Overview] Storage changed, refreshing data');
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check for changes every 3 seconds (fallback)
    const interval = setInterval(() => {
      const currentItems = historyService.getHistoryItems();
      if (currentItems.length !== historyItems.length) {
        console.log('[Overview] Item count changed, refreshing data');
        setRefreshKey(prev => prev + 1);
      }
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [historyItems.length]);

  // Only include sessions for the logged-in user
  const userSessions = user ? sessions.filter(s => s.userId === user.id) : [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTotalCost = () => {
    // Calculate from sessions
    const sessionsCost = userSessions.reduce((sum, session) => {
      return sum + parseFloat(session.statistics?.totalCost || '0');
    }, 0);
    
    // Calculate from history items
    const historyCost = historyItems.reduce((sum, item) => {
      if (item.type === 'qa') {
        const qaItem = item as QAHistoryItem;
        return sum + parseFloat(qaItem.sessionData.statistics?.totalCost || '0');
      }
      return sum;
    }, 0);
    
    const totalCost = sessionsCost + historyCost;
    console.log('[Overview] Total cost calculation:', { sessionsCost, historyCost, totalCost });
    return totalCost;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTotalQuestions = () => {
    // Calculate from sessions
    const sessionsQuestions = userSessions.reduce((sum, session) => {
      return sum + (session.qaData?.length || 0);
    }, 0);
    
    // Calculate from history items
    const historyQuestions = historyItems.reduce((sum, item) => {
      if (item.type === 'qa') {
        const qaItem = item as QAHistoryItem;
        return sum + (qaItem.sessionData.qaData?.length || 0);
      }
      return sum;
    }, 0);
    
    const totalQuestions = sessionsQuestions + historyQuestions;
    console.log('[Overview] Total questions calculation:', { sessionsQuestions, historyQuestions, totalQuestions });
    return totalQuestions;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getAverageAccuracy = () => {
    // Get all QA items from sessions
    const sessionQAItems = userSessions.flatMap(session => session.qaData);
    
    // Get all QA items from history
    const historyQAItems = historyItems
      .filter(item => item.type === 'qa')
      .flatMap(item => (item as QAHistoryItem).sessionData.qaData);
    
    // Combine all QA items
    const allQAItems = [...sessionQAItems, ...historyQAItems];
    
    if (allQAItems.length === 0) return 0;
    
    // Calculate average accuracy from individual QA items
    const accuracyValues = allQAItems
      .map(qa => parseFloat(qa.accuracy || '0'))
      .filter(accuracy => accuracy > 0);
    
    if (accuracyValues.length === 0) return 0;
    
    const avgAccuracy = accuracyValues.reduce((sum, acc) => sum + acc, 0) / accuracyValues.length;
    console.log('[Overview] Average accuracy calculation:', { 
      sessionQAItems: sessionQAItems.length, 
      historyQAItems: historyQAItems.length, 
      totalQAItems: allQAItems.length,
      accuracyValues: accuracyValues.length,
      avgAccuracy 
    });
    return avgAccuracy;
  };

  // Extract company name from URL
  const extractCompanyFromUrl = (url: string): string => {
    try {
      // Remove protocol and www if present
      let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      // Remove path, query parameters, and fragments
      domain = domain.split('/')[0].split('?')[0].split('#')[0];
      
      // Remove common TLDs and get the main part
      const domainParts = domain.split('.');
      if (domainParts.length >= 2) {
        // For domains like "company.com" or "company.co.uk"
        return domainParts[domainParts.length - 2];
      }
      
      return domain;
    } catch (error) {
      console.error('Error extracting company from URL:', error);
      return url; // Fallback to original input
    }
  };

  // Clear cached analysis data
  const clearAnalysisData = () => {
    try {
      localStorage.removeItem('overview_market_analysis');
      setAiResult(null);
      setCompanyName('');
      setIndustry('');
      setInputType('company');
      setAiError(null);
      setShowSuccessMessage(false);
      console.log('[Overview] Analysis data cleared');
    } catch (error) {
      console.error('[Overview] Error clearing analysis data:', error);
    }
  };

  // Run AI visibility analysis and render competitors inline
  const startCompanyAnalysis = async () => {
    // Validate required fields
    if (!companyName.trim()) {
      setAiError('Please enter a company name or URL to analyze.');
      return;
    }
    
    // Auto-detect if input is a URL and extract company name
    let finalCompanyName = companyName.trim();
    let detectedInputType: 'company' | 'url' = 'company';
    
    if (companyName.includes('http://') || companyName.includes('https://') || companyName.includes('www.')) {
      finalCompanyName = extractCompanyFromUrl(companyName);
      detectedInputType = 'url';
      console.log('[Overview] Detected URL, extracted company name:', finalCompanyName);
    }
    
    setIsAnalyzing(true);
    setAiError(null);
    setShowSuccessMessage(false);
    
    try {
      const abortController = new AbortController();
      setAbortController(abortController);
      
      console.log('[Overview] Starting AI visibility analysis for:', finalCompanyName);
      console.log('[Overview] Industry:', industry);
      
      const analysisResults = await apiService.getAIVisibilityAnalysis(
        finalCompanyName,
        industry || undefined,
        { signal: abortController.signal }
      );
      
      console.log('[Overview] Analysis results received:', analysisResults);
      
      if (analysisResults.success && analysisResults.data) {
        console.log('[Overview] Setting AI result:', analysisResults.data);
        setAiResult(analysisResults.data);
        setShowSuccessMessage(true);
        
        // Save to history
        try {
          const competitors = analysisResults.data.competitors || [];
          const historyItem = {
            id: `ai-visibility-${Date.now()}`,
            type: 'ai-visibility' as const,
            name: `AI Visibility Analysis - ${finalCompanyName}`,
            timestamp: new Date().toISOString(),
            company: finalCompanyName,
            industry: industry || undefined,
            analysis: {
              competitors: competitors.map((comp: any) => ({
                name: comp.name,
                visibilityScores: {
                  gemini: comp.aiScores?.gemini || 0,
                  perplexity: comp.aiScores?.perplexity || 0,
                  claude: comp.aiScores?.claude || 0,
                  chatgpt: comp.aiScores?.chatgpt || 0,
                  average: comp.totalScore || 0
                },
                status: 'success' as const
              })),
              serviceStatus: analysisResults.data.serviceStatus || {
                gemini: true,
                perplexity: true,
                claude: true,
                chatgpt: true
              },
              summary: {
                totalCompetitors: competitors.length,
                averageVisibilityScore: competitors.reduce((sum: number, comp: any) => sum + (comp.totalScore || 0), 0) / Math.max(competitors.length, 1),
                topCompetitor: competitors.length > 0 ? competitors.reduce((top: any, comp: any) => 
                  (comp.totalScore || 0) > (top.totalScore || 0) ? comp : top
                ).name : 'None'
              }
            }
          };
          
          historyService.addHistoryItem(historyItem);
          console.log('[Overview] Analysis saved to history:', historyItem);
        } catch (e) {
          console.warn('Failed to save analysis to history:', e);
        }
        
        // Cache the results
        try {
          localStorage.setItem('overview_market_analysis', JSON.stringify({
            company: finalCompanyName,
            originalInput: companyName,
            inputType: detectedInputType,
            industry: industry || '',
            data: analysisResults.data,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('Failed to cache analysis results:', e);
        }
      } else {
        console.error('[Overview] Analysis failed:', analysisResults.error);
        setAiError(analysisResults.error || 'Analysis failed. Please try again.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Analysis was cancelled');
        return;
      }
      console.error('AI analysis error:', error);
      setAiError(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAbortController(null);
    }
  };

  // Stats grid intentionally removed to focus on faster market analysis UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stats: Array<never> = [];

  // Recent sessions not used on this page variant
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recentSessions: Array<never> = [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Overview</h1>
          <p className="text-gray-600 mt-2">Welcome to kabini.ai - Your AI-Powered Content Enhancement Platform</p>
        </div>
        {/* Removed Refresh and AI Powered buttons per request */}
      </div>

      {/* Quick Company Analysis Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Company Analysis</h2>
            <p className="text-gray-600">Enter a company name or URL to analyze market position and competitors</p>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={companyName}
              onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                setCompanyName(value);
              })}
              onPaste={(e) => handlePaste(e, (value) => {
                setCompanyName(value);
              })}
              onKeyDown={handleKeyDown}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isAnalyzing && companyName.trim()) {
                  startCompanyAnalysis();
                }
              }}
              required
              placeholder="Enter company name or URL (e.g., cloudfuze or https://cloudfuze.com) *"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-gray-900 placeholder-gray-500"
              disabled={isAnalyzing}
            />
            {companyName.includes('http://') || companyName.includes('https://') || companyName.includes('www.') ? (
              <div className="mt-2 text-sm text-blue-600">
                📍 Detected URL - will extract company name: <span className="font-medium">{extractCompanyFromUrl(companyName)}</span>
              </div>
            ) : null}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={industry}
              onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                setIndustry(value);
              })}
              onPaste={(e) => handlePaste(e, (value) => {
                setIndustry(value);
              })}
              onKeyDown={handleKeyDown}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isAnalyzing && companyName.trim()) {
                  startCompanyAnalysis();
                }
              }}
              placeholder="Industry (optional)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-gray-900 placeholder-gray-500"
              disabled={isAnalyzing}
            />
          </div>
          <button
            onClick={startCompanyAnalysis}
            disabled={isAnalyzing || !companyName.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Analyze
              </>
            )}
          </button>
          {isAnalyzing && (
            <button
              onClick={() => { try { abortController?.abort(); } catch {}; setIsAnalyzing(false); }}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          )}
        </div>

        {aiError && (
          <div className="mt-4 text-red-700 bg-red-50 border border-red-200 rounded px-4 py-2">{aiError}</div>
        )}
        {showSuccessMessage && (
          <div className="mt-4 text-green-700 bg-green-50 border border-green-200 rounded px-4 py-2">✅ Analysis completed successfully! Results are ready below.</div>
        )}
      </div>

      {/* Stats Grid removed per request */}

      {/* AI Service Status + Competitors Table (post-analysis) */}
      {aiResult && (
        <>
          {aiResult.serviceStatus && (
            <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">AI Service Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${aiResult.serviceStatus.gemini ? 'bg-green-500' : 'bg-red-500'}`}></span><span>Gemini: {aiResult.serviceStatus.gemini ? 'Available' : 'Overloaded'}</span></div>
                <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${aiResult.serviceStatus.perplexity ? 'bg-green-500' : 'bg-red-500'}`}></span><span>Perplexity: {aiResult.serviceStatus.perplexity ? 'Available' : 'Overloaded'}</span></div>
                <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${aiResult.serviceStatus.claude ? 'bg-green-500' : 'bg-red-500'}`}></span><span>Claude: {aiResult.serviceStatus.claude ? 'Available' : 'Overloaded'}</span></div>
                <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${aiResult.serviceStatus.chatgpt ? 'bg-green-500' : 'bg-red-500'}`}></span><span>ChatGPT: {aiResult.serviceStatus.chatgpt ? 'Available' : 'Overloaded'}</span></div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Analysis Results for <span className="text-blue-700">{aiResult.company}</span></h3>
                  {aiResult.originalInput && aiResult.originalInput !== aiResult.company && (
                    <p className="text-sm text-gray-600 mt-1">
                      📍 Analyzed from: <span className="font-medium">{aiResult.originalInput}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800" onClick={() => { setAiError(null); startCompanyAnalysis(); }}>Re‑Analyze</button>
                  <button className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 hover:text-gray-900" onClick={clearAnalysisData}>Clear</button>
                </div>
              </div>
            </div>
            
            {/* Add error boundary for AIVisibilityTable */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitor Analysis</h3>
              {aiResult.competitors && Array.isArray(aiResult.competitors) ? (
                <AIVisibilityTable data={aiResult} />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Data Structure Issue</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Competitors data is missing or in unexpected format. 
                        <br />
                        <strong>Debug Info:</strong> {JSON.stringify({
                          hasCompetitors: !!aiResult.competitors,
                          competitorsType: typeof aiResult.competitors,
                          isArray: Array.isArray(aiResult.competitors),
                          dataKeys: Object.keys(aiResult)
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Platform Features section removed as requested */}
    </div>
  );
} 