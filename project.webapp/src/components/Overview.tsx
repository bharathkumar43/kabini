import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, Users, Globe, Target, BarChart3, Zap, Shield, Clock, Star, Award, TrendingDown, AlertTriangle, CheckCircle, XCircle, Info, ExternalLink, Download, Share2, Filter, SortAsc, SortDesc, Calendar, MapPin, Building2, Briefcase, Globe2, Network, BarChart, PieChart, LineChart, Activity, Eye, Bot, BarChart3 as BarChartIcon, Plus, Settings, Edit3, RefreshCcw } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SessionData } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { historyService } from '../services/historyService';
import { sessionManager } from '../services/sessionManager';
import type { HistoryItem, QAHistoryItem } from '../types';

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
        className="bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-50 mt-auto"
        onClick={onClick}
      >
        {button}
      </button>
    </div>
  );
}

// New Dashboard Feature Cards
interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  iconBgColor: string;
  children: React.ReactNode;
}

function DashboardCard({ title, icon, iconBgColor, children }: DashboardCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow h-full min-h-[320px] lg:h-[360px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className={`w-10 h-10 rounded-full ${iconBgColor} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      {children}
    </div>
  );
}

// Sentiment Analysis Component
function SentimentAnalysisCard({ competitors, company }: { 
  competitors: any[], 
  company?: string 
}) {
  // Calculate sentiment percentages based on brand mentions
  const calculateSentiment = () => {
    if (!competitors || competitors.length === 0) {
      return { positive: 0, neutral: 0, negative: 0, total: 0, drivers: { positive: [], neutral: [], negative: [] } };
    }

    let totalMentions = 0;
    let positiveMentions = 0;
    let neutralMentions = 0;
    let negativeMentions = 0;
    
    const positiveDrivers: string[] = [];
    const neutralDrivers: string[] = [];
    const negativeDrivers: string[] = [];

    competitors.forEach((competitor: any) => {
      // Extract sentiment data from competitor analysis
      const breakdowns = competitor.breakdowns || {};
      const geminiBreakdown = breakdowns.gemini || {};
      
      // Count mentions by sentiment
      const mentions = geminiBreakdown.mentionsScore || 0;
      const sentiment = geminiBreakdown.sentimentScore || 0.5;
      
      totalMentions += mentions;
      
      // Categorize sentiment (0-0.3: negative, 0.3-0.7: neutral, 0.7-1: positive)
      if (sentiment < 0.3) {
        negativeMentions += mentions;
        negativeDrivers.push(competitor.name || 'Unknown');
      } else if (sentiment > 0.7) {
        positiveMentions += mentions;
        positiveDrivers.push(competitor.name || 'Unknown');
      } else {
        neutralMentions += mentions;
        neutralDrivers.push(competitor.name || 'Unknown');
      }
    });

    // Calculate percentages
    let positivePercent = totalMentions > 0 ? (positiveMentions / totalMentions) * 100 : 0;
    let neutralPercent = totalMentions > 0 ? (neutralMentions / totalMentions) * 100 : 0;
    let negativePercent = totalMentions > 0 ? (negativeMentions / totalMentions) * 100 : 0;

    // Apply override logic: if negative is 100%, show as Neutral 80% and Negative 20%
    if (negativePercent === 100) {
      neutralPercent = 80;
      negativePercent = 20;
      positivePercent = 0;
    }

    return {
      positive: Math.round(positivePercent * 100) / 100,
      neutral: Math.round(neutralPercent * 100) / 100,
      negative: Math.round(negativePercent * 100) / 100,
      total: totalMentions,
      drivers: {
        positive: positiveDrivers.slice(0, 3), // Top 3 positive drivers
        neutral: neutralDrivers.slice(0, 3),   // Top 3 neutral drivers
        negative: negativeDrivers.slice(0, 3)  // Top 3 negative drivers
      }
    };
  };

  const sentiment = calculateSentiment();
  // Determine dominant sentiment based on highest percentage
  const dominantSentiment = sentiment.neutral > sentiment.positive && sentiment.neutral > sentiment.negative ? 'Neutral' :
                           sentiment.positive > sentiment.negative ? 'Positive' : 'Negative';
  const sentimentColor = dominantSentiment === 'Positive' ? 'text-green-600' : 
                        dominantSentiment === 'Negative' ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow h-full min-h-[320px] lg:h-[360px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sentiment Analysis</h3>
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Overall Sentiment */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${sentimentColor}`}>
            {dominantSentiment}
          </div>
          
        </div>

        {/* Sentiment Percentages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Positive</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${sentiment.positive}%` }}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">{sentiment.positive}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Neutral</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${sentiment.neutral}%` }}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">{sentiment.neutral}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Negative</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${sentiment.negative}%` }}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">{sentiment.negative}%</span>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

// AI Visibility Score Component
function AIVisibilityScoreCard({ score, industry, metrics }: { 
  score: number, 
  industry?: string, 
  metrics?: any 
}) {
  // Validate and convert score from 0-10 scale to 0-100 scale for display
  const validateScore = (rawScore: number): number => {
    // Ensure score is within valid range (0-10)
    const clampedScore = Math.max(0, Math.min(10, rawScore));
    // Convert to 0-100 scale
    return Math.round(clampedScore * 10);
  };
  
  const displayScore = validateScore(score);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  // Ring chart values
  const pct = Math.min(100, Math.max(0, displayScore));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow h-full min-h-[280px] flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">AI Visibility Score</h3>
        <div className="w-14 h-14 relative">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
            <circle cx="36" cy="36" r={radius} stroke="#2563eb" strokeWidth="8" fill="none" strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900">{pct}%</div>
        </div>
        </div>
        
      <div className="flex items-center gap-2 mb-6">
        <div className="text-5xl font-extrabold text-gray-900">{pct}</div>
        <div className="text-2xl font-bold text-gray-400">%</div>
      </div>

      <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
        <span className="text-green-600">↗</span>
        +8% vs last week
        </div>

      <div className="mt-auto">
        <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 text-sm font-medium">
          View Detailed Analysis →
        </button>
      </div>
    </div>
  );
}

// LLM Presence Component
function LLMPresenceCard({ serviceStatus, aiScores }: { 
  serviceStatus: any, 
  aiScores?: any
}) {
  const llmServices = [
    { name: 'ChatGPT', key: 'chatgpt', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Gemini', key: 'gemini', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Perplexity', key: 'perplexity', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Claude', key: 'claude', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  // Determine availability based ONLY on actual AI scores from backend
  const getLLMAvailability = () => {
    const availability: Record<string, boolean> = {
      chatgpt: false,
      gemini: false,
      perplexity: false,
      claude: false
    };

    if (aiScores) {
      // Only mark as available if there's a real score > 0
      // No fallback to serviceStatus - only real data counts
      availability.chatgpt = aiScores.chatgpt !== undefined && aiScores.chatgpt > 0;
      availability.gemini = aiScores.gemini !== undefined && aiScores.gemini > 0;
      availability.perplexity = aiScores.perplexity !== undefined && aiScores.perplexity > 0;
      availability.claude = aiScores.claude !== undefined && aiScores.claude > 0;
    }
    // Removed fallback to serviceStatus - if no aiScores, all are false

    return availability;
  };

  const currentStatus = getLLMAvailability();
  
  // Count available services
  const availableServices = llmServices.filter(service => currentStatus[service.key]).length;
  const totalServices = llmServices.length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow h-full min-h-[280px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Platform Presence</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { key: 'chatgpt', label: 'ChatGPT' },
          { key: 'gemini', label: 'Gemini' },
          { key: 'claude', label: 'Claude' },
          { key: 'perplexity', label: 'Perplexity' }
        ].map((svc) => {
          const isAvailable = currentStatus[svc.key];
          const score = typeof aiScores?.[svc.key] === 'number' ? Math.min(100, Math.max(0, Math.round(aiScores[svc.key] * 10))) : 0;
          const note = isAvailable ? (score >= 70 ? 'Strong presence' : score >= 60 ? 'Good coverage' : 'Needs attention') : 'Not available';
          return (
            <div key={svc.key} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-700 mb-1">{svc.label}</div>
              <div className={`text-2xl font-bold ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>{score}%</div>
              <div className="text-xs text-gray-500 mt-1">{note}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto">
        <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 text-sm font-medium">Platform Deep Dive →</button>
      </div>
    </div>
  );
}

// Competitor Benchmark Component
function CompetitorBenchmarkCard({ competitors, industry }: { competitors: any[], industry?: string }) {
  const getBenchmarkStatus = (competitors: any[]) => {
    if (!competitors || competitors.length === 0) return { status: 'No Data', rank: 'N/A', color: 'text-gray-500', score: 0, rawScore: 0 };
    
    // Calculate average score (scores are on 0-10 scale, convert to 0-100 for display)
    const avgScore = competitors.reduce((sum, comp) => sum + (comp.totalScore || 0), 0) / competitors.length;
    const displayScore = Math.round(avgScore * 10);
    
    if (displayScore >= 80) return { status: 'Excellent', rank: 'Top 10%', color: 'text-purple-600', score: displayScore, rawScore: avgScore };
    if (displayScore >= 70) return { status: 'Above Average', rank: 'Top 25%', color: 'text-blue-600', score: displayScore, rawScore: avgScore };
    if (displayScore >= 60) return { status: 'Average', rank: 'Top 50%', color: 'text-yellow-600', score: displayScore, rawScore: avgScore };
    if (displayScore >= 50) return { status: 'Below Average', rank: 'Bottom 50%', color: 'text-orange-600', score: displayScore, rawScore: avgScore };
    return { status: 'Poor', rank: 'Bottom 25%', color: 'text-red-600', score: displayScore, rawScore: avgScore };
  };

  const benchmark = getBenchmarkStatus(competitors);
  const filledBars = Math.min(5, Math.max(1, Math.ceil((competitors?.length || 0) / 2)));

  return (
    <DashboardCard
      title="Competitor Benchmark"
      icon={<BarChartIcon className="w-5 h-5 text-white" />}
      iconBgColor="bg-purple-500"
    >
      <div className="text-center">
        <div className={`text-2xl font-bold ${benchmark.color} mb-2`}>
          {benchmark.status}
        </div>
        
        <div className="text-lg font-semibold text-gray-700 mb-3">
          Score: {benchmark.score}/100
        </div>
      </div>
    </DashboardCard>
  );
}

export function Overview() {
  const { user } = useAuth();
  const [sessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  // keep but unused in this page variant
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);
  const navigate = useNavigate();
  
  // Unified analysis state
  const [inputValue, setInputValue] = useState(() => {
    try {
      const saved = localStorage.getItem('overview_market_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.originalInput || '';
      }
      return '';
    } catch { return ''; }
  });
  const [analysisType, setAnalysisType] = useState<'root-domain' | 'exact-url'>('root-domain');
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
  const [analysisResult, setAnalysisResult] = useState<any | null>(() => {
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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Add New Competitor state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [isUrlInput, setIsUrlInput] = useState(false);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  
  // History data state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Persist and rehydrate dashboard analysis state
  const OVERVIEW_CACHE_KEY = 'overview_market_analysis';

  const persistOverviewCache = (data?: any) => {
    try {
      const payload = {
        company: data?.company || (analysisResult && analysisResult.company) || undefined,
        originalInput: inputValue,
        inputType,
        industry: data?.industry || (analysisResult && analysisResult.industry) || undefined,
        analysisType,
        data: data ?? analysisResult ?? null,
        timestamp: Date.now(),
      };
      localStorage.setItem(OVERVIEW_CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[Overview] Failed to persist cache:', e);
    }
  };

  // Auto-persist whenever inputs or results change
  useEffect(() => {
    persistOverviewCache();
  }, [analysisResult, inputValue, inputType, analysisType]);

  // Load history items from service
  useEffect(() => {
    const items = historyService.getHistoryItems();
    setHistoryItems(items);
    console.log('[Overview] Loaded history items:', items.length);
  }, [refreshKey]);

  // Restore cached data on mount (prefer explicit overview cache, then session)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('overview_market_analysis');
      if (cached) {
        const parsed = JSON.parse(cached);
        setInputValue(parsed.originalInput || '');
        setInputType(parsed.inputType || 'company');
        setAnalysisResult(parsed.data || null);
        console.log('[Overview] Restored from local cache');
        return;
      }
    } catch (e) {
      console.warn('[Overview] Failed to parse local cache, falling back to session:', e);
    }

    const session = sessionManager.getLatestAnalysisSession('overview', user?.id);
    if (session) {
      setInputValue(session.inputValue || '');
      setInputType(session.inputType || 'company');
      setAnalysisResult(session.data);
      console.log('[Overview] Restored analysis session:', session);
    } else {
      console.log('[Overview] No previous analysis session found - starting fresh');
    }
  }, [user?.id]);

  // Check if this is a fresh session (no previous data)
  const [isFreshSession, setIsFreshSession] = useState(false);
  
  useEffect(() => {
    const session = sessionManager.getLatestAnalysisSession('overview', user?.id);
    setIsFreshSession(!session);
  }, [user?.id]);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Detect URL type automatically
  const detectUrlType = (url: string): 'root-domain' | 'exact-url' => {
    try {
      // Remove protocol and www
      let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      // Split by slashes to get path parts
      const urlParts = cleanUrl.split('/');
      const domainPart = urlParts[0]; // Get the domain part
      
      // Check if it's a root domain (just domain, no path)
      if (urlParts.length === 1 || (urlParts.length > 1 && urlParts[1].trim() === '')) {
        return 'root-domain';
      } else {
        // Has path or subdomain - treat as exact URL
        return 'exact-url';
      }
    } catch (error) {
      console.error('Error detecting URL type:', error);
      return 'root-domain'; // Default fallback
    }
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

  // Detect industry from company name or URL
  const detectIndustry = (companyName: string, url?: string): string => {
    const name = companyName.toLowerCase();
    const fullUrl = url?.toLowerCase() || '';
    
    // More specific industry detection logic
    if (name.includes('cloud') && (name.includes('migration') || name.includes('migrate') || name.includes('transform'))) {
      return 'Cloud Migration & Transformation';
    }
    
    if (name.includes('cloud') || name.includes('aws') || name.includes('azure') || name.includes('gcp') || 
        name.includes('kubernetes') || name.includes('docker') || name.includes('devops')) {
      return 'Cloud Computing & DevOps';
    }
    
    if (name.includes('ai') || name.includes('artificial intelligence') || name.includes('machine learning') || 
        name.includes('ml') || name.includes('deep learning') || name.includes('neural')) {
      return 'Artificial Intelligence & ML';
    }
    
    if (name.includes('cyber') || name.includes('security') || name.includes('firewall') || name.includes('vpn') ||
        name.includes('threat') || name.includes('protection')) {
      return 'Cybersecurity';
    }
    
    if (name.includes('data') && (name.includes('analytics') || name.includes('warehouse') || name.includes('lake') || 
        name.includes('science') || name.includes('mining'))) {
      return 'Data Analytics & Science';
    }
    
    if (name.includes('saas') || name.includes('software as a service') || name.includes('platform') ||
        name.includes('api') || name.includes('integration')) {
      return 'SaaS & Platform Services';
    }
    
    if (name.includes('tech') || name.includes('software') || name.includes('digital') || name.includes('innovation')) {
      return 'Technology & Software';
    }
    
    if (name.includes('bank') || name.includes('finance') || name.includes('credit') || name.includes('loan') ||
        name.includes('payment') || name.includes('fintech') || name.includes('investment')) {
      return 'Financial Services & Fintech';
    }
    
    if (name.includes('health') || name.includes('medical') || name.includes('pharma') || name.includes('care') ||
        name.includes('biotech') || name.includes('telehealth')) {
      return 'Healthcare & Biotech';
    }
    
    if (name.includes('retail') || name.includes('shop') || name.includes('store') || name.includes('commerce') ||
        name.includes('ecommerce') || name.includes('marketplace')) {
      return 'Retail & E-commerce';
    }
    
    if (name.includes('edu') || name.includes('school') || name.includes('university') || name.includes('college') ||
        name.includes('learning') || name.includes('training')) {
      return 'Education & Training';
    }
    
    if (name.includes('media') || name.includes('news') || name.includes('entertainment') || name.includes('tv') ||
        name.includes('content') || name.includes('publishing')) {
      return 'Media & Entertainment';
    }
    
    if (name.includes('auto') || name.includes('car') || name.includes('vehicle') || name.includes('transport') ||
        name.includes('logistics') || name.includes('supply chain')) {
      return 'Automotive & Transportation';
    }
    
    if (name.includes('food') || name.includes('restaurant') || name.includes('cafe') || name.includes('dining') ||
        name.includes('delivery') || name.includes('catering')) {
      return 'Food & Beverage';
    }
    
    if (name.includes('real') || name.includes('estate') || name.includes('property') || name.includes('housing') ||
        name.includes('construction') || name.includes('architecture')) {
      return 'Real Estate & Construction';
    }
    
    if (name.includes('energy') || name.includes('oil') || name.includes('gas') || name.includes('power') ||
        name.includes('renewable') || name.includes('solar') || name.includes('wind')) {
      return 'Energy & Utilities';
    }
    
    if (name.includes('consulting') || name.includes('consultant') || name.includes('advisory') || 
        name.includes('strategy') || name.includes('management')) {
      return 'Consulting & Advisory';
    }
    
    // Default industry for unknown companies
    return 'Business Services';
  };

  // Clear cached analysis data
  const clearAnalysisData = () => {
    try {
      localStorage.removeItem('overview_market_analysis');
      setAnalysisResult(null);
      setInputValue('');
      setInputType('company');
      setAnalysisError(null);
      setShowSuccessMessage(false);
      console.log('[Overview] Analysis data cleared');
    } catch (error) {
      console.error('[Overview] Error clearing analysis data:', error);
    }
  };

  // Unified Analysis Function
  const startAnalysis = async () => {
    // Validate required fields
    if (!inputValue.trim()) {
      setAnalysisError('Please enter a company name or URL to analyze.');
      return;
    }
    
    // Auto-detect if input is a URL and extract company name
    let finalCompanyName = inputValue.trim();
    let detectedInputType: 'company' | 'url' = 'company';
    
    if (inputValue.includes('http://') || inputValue.includes('https://') || inputValue.includes('www.')) {
      finalCompanyName = extractCompanyFromUrl(inputValue);
      detectedInputType = 'url';
      console.log('[Overview] Detected URL, extracted company name:', finalCompanyName);
    }
    
    // Detect industry from company name and URL
    const detectedIndustry = detectIndustry(finalCompanyName, inputValue);
    console.log('[Overview] Detected industry:', detectedIndustry);
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setShowSuccessMessage(false);
    
    try {
      const abortController = new AbortController();
      setAbortController(abortController);
      
      console.log('[Overview] Starting AI visibility analysis for:', finalCompanyName);
      console.log('[Overview] Detected industry:', detectedIndustry);
      
      const analysisResults = await apiService.getAIVisibilityAnalysis(
        finalCompanyName,
        detectedIndustry,
        { signal: abortController.signal }
      );
      
      console.log('[Overview] Analysis results received:', analysisResults);
      
      if (analysisResults.success && analysisResults.data) {
        console.log('[Overview] Setting analysis result:', analysisResults.data);
        
        // Add detected industry to the analysis result
        const enhancedResult = {
          ...analysisResults.data,
          industry: detectedIndustry,
          originalInput: inputValue,
          inputType: detectedInputType, // Add input type to the cached data
          analysisType: analysisType // Add analysis type to the cached data
        };
        
        setAnalysisResult(enhancedResult);
        setShowSuccessMessage(true);
        
        // Save to history
        try {
          const competitors = analysisResults.data.competitors || [];
          const historyItem = {
            id: `ai-visibility-${Date.now()}`,
            type: 'ai-visibility' as const,
            name: `AI Visibility Analysis - ${finalCompanyName}`,
            timestamp: new Date().toISOString(),
            status: 'completed' as const,
            company: finalCompanyName,
            industry: detectedIndustry,
            analysis: {
              competitors: competitors.map((comp: any) => ({
                name: comp.name,
                mentions: comp.mentions || 0,
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
                averageVisibilityScore: competitors.reduce((sum: number, comp: any) => sum + (comp.mentions || 0), 0) / Math.max(competitors.length, 1),
                topCompetitor: competitors.length > 0 ? competitors.reduce((top: any, comp: any) => 
                  (comp.mentions || 0) > (top.mentions || 0) ? comp : top
                ).name : 'None'
              }
            }
          };
          
          try {
            await historyService.addHistoryItem(historyItem);
            
            // Dispatch custom event to notify other components (like History) that new analysis was created
            window.dispatchEvent(new CustomEvent('new-analysis-created', { 
              detail: { type: 'ai-visibility', timestamp: new Date().toISOString() } 
            }));
            
            console.log('[Overview] Analysis saved to history:', historyItem);
          } catch (error) {
            console.error('[Overview] Failed to save analysis to history:', error);
            // Still dispatch the event even if history save fails
            window.dispatchEvent(new CustomEvent('new-analysis-created', { 
              detail: { type: 'ai-visibility', timestamp: new Date().toISOString() } 
            }));
          }
        } catch (e) {
          console.warn('Failed to save analysis to history:', e);
        }
        
        // Cache the results
        try {
          localStorage.setItem('overview_market_analysis', JSON.stringify({
            company: finalCompanyName,
            originalInput: inputValue,
            inputType: detectedInputType,
            industry: detectedIndustry,
            analysisType: analysisType, // Cache analysis type
            data: enhancedResult,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('Failed to cache analysis results:', e);
        }
      } else {
        console.error('[Overview] Analysis failed:', analysisResults.error);
        setAnalysisError(analysisResults.error || 'Analysis failed. Please try again.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Analysis was cancelled');
        return;
      }
      console.error('AI analysis error:', error);
      setAnalysisError(error.message || 'Analysis failed. Please try again.');
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

  // Helper to get AI Visibility Score from analysis result using actual API structure
  const getAIVisibilityScore = (result: any) => {
    // Check for direct score fields first
    if (result?.aiVisibilityScore !== undefined && result?.aiVisibilityScore !== null) {
      return result.aiVisibilityScore;
    }
    if (result?.totalScore !== undefined && result?.totalScore !== null) {
      return result.totalScore;
    }
    if (result?.visibilityScore !== undefined && result?.visibilityScore !== null) {
      return result.visibilityScore;
    }
    
    // If no direct score, try to get from competitors (they contain the actual scores)
    if (result?.competitors && result.competitors.length > 0) {
      // Look for the main company score in competitors
      const mainCompany = result.competitors.find((comp: any) => 
        comp.name?.toLowerCase() === result.company?.toLowerCase()
      );
      
      if (mainCompany?.totalScore !== undefined && mainCompany?.totalScore !== null) {
        return mainCompany.totalScore;
      }
      
      // Fallback: calculate average from all competitors
      const validScores = result.competitors
        .filter((comp: any) => comp.totalScore !== undefined && comp.totalScore !== null)
        .map((comp: any) => comp.totalScore);
      
      if (validScores.length > 0) {
        const avgScore = validScores.reduce((sum: number, score: number) => sum + score, 0) / validScores.length;
        return avgScore;
      }
    }
    
    return 0; // Default fallback
  };

  // Helper to get detailed AI Visibility metrics from actual API structure
  const getAIVisibilityMetrics = (result: any) => {
    if (!result?.competitors || result.competitors.length === 0) {
      return null;
    }

    // Find the main company data in competitors
    const mainCompany = result.competitors.find((comp: any) => 
      comp.name?.toLowerCase() === result.company?.toLowerCase()
    );
    
    if (!mainCompany) {
      return null;
    }

    // Extract metrics from the actual API structure
    const totalScore = mainCompany.totalScore || 0;
    const aiScores = mainCompany.aiScores || {};
    const breakdowns = mainCompany.breakdowns || {};
    
    // Calculate average AI score across all platforms
    const platformScores = Object.values(aiScores).filter(score => typeof score === 'number');
    const averageAIScore = platformScores.length > 0 
      ? platformScores.reduce((sum: number, score: number) => sum + score, 0) / platformScores.length 
      : 0;
    
    // Get Gemini breakdown (most detailed data available)
    const geminiBreakdown = breakdowns.gemini || {};
    
    return {
      aiVisibilityScore: Math.min(10, Math.max(0, totalScore)),
      brandMentions: Number((geminiBreakdown.mentionsScore || 0).toFixed(5)),
      medianCompetitorMentions: Number((Math.round(averageAIScore * 10) / 10).toFixed(5)),
      shareOfVoice: Number((Math.round((totalScore / 10) * 100 * 100) / 100).toFixed(5)),
      averagePosition: Number((geminiBreakdown.positionScore || 0).toFixed(5)),
      searchVolume: 'N/A', // Not available in current API
      sentiment: geminiBreakdown.sentimentScore > 0.5 ? 'Positive' : 
                 geminiBreakdown.sentimentScore < 0.3 ? 'Negative' : 'Neutral',
      platformBreakdown: aiScores,
      totalMentions: Number((geminiBreakdown.mentionsScore || 0).toFixed(5))
    };
  };

  // Helper functions for competitor analysis
  const getScoreColor = (score: number) => {
    if (score >= 2.5) return 'bg-green-500';
    if (score >= 1.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreClass = (score: number) => {
    if (score >= 2.5) return 'text-green-600 font-semibold';
    if (score >= 1.5) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const formatScore = (score: number) => {
    return score.toFixed(4);
  };

  // Handle adding new competitor
  const handleAddCompetitor = async () => {
    if (!newCompetitorName.trim()) {
      alert('Please enter a competitor name');
      return;
    }

    // Check if competitor already exists
    if (analysisResult?.competitors?.some((c: any) => c.name.toLowerCase() === newCompetitorName.toLowerCase())) {
      alert('This competitor is already in the analysis');
      return;
    }

    setIsAddingCompetitor(true);
    try {
      // Simulate adding competitor (in real implementation, this would call the API)
      const newCompetitor = {
        name: newCompetitorName.trim(),
        citationCount: Math.floor(Math.random() * 500) + 100,
        aiScores: {
          gemini: (Math.random() * 10 + 2).toFixed(4),
          perplexity: (Math.random() * 0.2).toFixed(4),
          claude: (Math.random() * 0.2).toFixed(4),
          chatgpt: 5.0000
        },
        totalScore: Math.random() * 5 + 1
      };
      
      // Update the analysis result with new competitor
      const updatedCompetitors = [...(analysisResult?.competitors || []), newCompetitor];
      const updated = { ...analysisResult, competitors: updatedCompetitors };
      setAnalysisResult(updated);
      persistOverviewCache(updated);
      
      setNewCompetitorName('');
      setShowAddForm(false);
      alert(`${newCompetitorName} has been added successfully!`);
      
    } catch (error: any) {
      console.error('Error adding competitor:', error);
      alert(`Failed to add competitor: ${error.message}`);
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  // Handle deleting competitor
  const handleDeleteCompetitor = (index: number) => {
    const competitorName = analysisResult?.competitors?.[index]?.name;
    if (window.confirm(`Are you sure you want to remove "${competitorName}" from the analysis?`)) {
      const updatedCompetitors = analysisResult?.competitors?.filter((_: any, i: number) => i !== index) || [];
      const updated = { ...analysisResult, competitors: updatedCompetitors };
      setAnalysisResult(updated);
      persistOverviewCache(updated);
    }
  };

  // Static saved views for dashboard preview
  const savedViewsStatic = [
    { title: 'Competitor Analysis Q4', updated: '2 days ago' },
    { title: 'Shopping Visibility Trends', updated: '1 week ago' },
    { title: 'Authority Score Deep Dive', updated: '3 days ago' },
  ];

  return (
    <div className="w-full max-w-full mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Welcome {user?.displayName?.split(' ')[0] || user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-600 mt-2">Welcome to kabini.ai - Your AI-Powered Content Enhancement Platform</p>
        </div>
      </div>

      {/* Unified Website Analysis Dashboard Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Website Analysis Dashboard</h2>
          <p className="text-gray-600 text-lg">Enter your website URL or company name to get instant AI visibility insights and market positioning.</p>
        </div>
        
        <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <div className="flex">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  setInputValue(value);
                  // Auto-detect URL type when URL is entered
                  if (value.includes('http://') || value.includes('https://') || value.includes('www.')) {
                    const detectedType = detectUrlType(value);
                    setAnalysisType(detectedType);
                    console.log('[Overview] Auto-detected URL type:', detectedType);
                  }
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  setInputValue(value);
                  // Auto-detect URL type when URL is pasted
                  if (value.includes('http://') || value.includes('https://') || value.includes('www.')) {
                    const detectedType = detectUrlType(value);
                    setAnalysisType(detectedType);
                    console.log('[Overview] Auto-detected URL type (pasted):', detectedType);
                  }
                })}
                onKeyDown={handleKeyDown}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isAnalyzing && inputValue.trim()) {
                    startAnalysis();
                  }
                }}
                required
                placeholder="Enter company name or URL"
                className="flex-1 px-4 py-4 border-2 border-blue-600 rounded-l-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg h-[60px]"
                disabled={isAnalyzing}
              />

            </div>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || !inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg w-full lg:w-auto min-w-[140px] h-[60px]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Analyze Now
                </>
              )}
            </button>
            {isAnalyzing && (
              <button
                onClick={() => { try { abortController?.abort(); } catch {}; setIsAnalyzing(false); }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full lg:w-auto min-w-[120px] h-[60px]"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {analysisError && (
          <div className="mb-6 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{analysisError}</div>
        )}
        {showSuccessMessage && (
          <div className="mb-6 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">✅ Analysis completed successfully! Results are ready below.</div>
        )}

        {/* Overview Heading - Always show when there's analysis data */}
        {analysisResult && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          </div>
        )}



        {/* Dashboard Cards Removed - Keeping only the analysis results */}

        {/* Analysis Results and Competitor Table (post-analysis) */}
        {analysisResult && (
          <div className="space-y-6">
            
                        {/* Dashboard Cards - Show when we have analysis results */}
            {/* Canva-style responsive layout using existing colors/components */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 mb-6 lg:mb-8">
              <div className="lg:col-span-6 h-full">
              <AIVisibilityScoreCard 
                score={getAIVisibilityScore(analysisResult)} 
                industry={analysisResult?.industry}
                metrics={getAIVisibilityMetrics(analysisResult)}
              />
              </div>
              <div className="lg:col-span-6 h-full">
              <LLMPresenceCard 
                serviceStatus={analysisResult?.serviceStatus} 
                aiScores={analysisResult?.competitors?.[0]?.aiScores}
              />
              </div>
            </div>

            {/* Weekly Performance Summary (Canva-style) */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Weekly Performance Summary</h3>
                <button onClick={() => navigate('/statistics')} className="bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium shadow-sm">
                  View Detailed Analytics →
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Market Share Growth */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-900 font-medium">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span>Market Share Growth</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">+12%</span>
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900">{(() => {
                    const metrics = getAIVisibilityMetrics(analysisResult);
                    const val = Math.max(0, Math.min(100, Math.round((metrics?.shareOfVoice || 0))));
                    return `${val}%`;
                  })()}</div>
                  <div className="text-xs text-gray-600 mt-1">Visibility share increase vs. prior period</div>
                  <div className="mt-2 text-xs text-gray-500">Market position strengthening</div>
                </div>

                {/* Performance Highlights */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="text-gray-900 font-medium mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-blue-600" />
                    Performance Highlights
                  </div>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-center justify-between">
                      <span>Retail Partner Mentions</span>
                      <span className="text-green-600">+18%</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Brand Authority Score</span>
                      <span className="text-green-600">+8%</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Search Prominence</span>
                      <span className="text-green-600">+15%</span>
                    </li>
                  </ul>
                </div>

                {/* Areas for Improvement */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="text-gray-900 font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Areas for Improvement
                  </div>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-center justify-between">
                      <span>E‑commerce Platform Presence</span>
                      <span className="text-red-600">−15%</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Shopping Query Coverage</span>
                      <span className="text-red-600">−5%</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>AI Assistant Visibility</span>
                      <span className="text-red-600">−12%</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6 lg:mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => navigate('/configuration')} className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-5 text-left shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1"><span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-600"><Plus className="w-4 h-4" /></span> Add Site/Product</div>
                  <div className="text-sm text-gray-600">Connect new properties to monitor</div>
                </button>
                <button onClick={() => navigate('/content-structure-analysis')} className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-5 text-left shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1"><span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-purple-50 text-purple-600"><Settings className="w-4 h-4" /></span> Optimize Schema</div>
                  <div className="text-sm text-gray-600">Fix structured data issues</div>
                </button>
                <button onClick={() => navigate('/enhance-content')} className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-5 text-left shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1"><span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-orange-50 text-orange-600"><Edit3 className="w-4 h-4" /></span> Generate Content</div>
                  <div className="text-sm text-gray-600">Create AI‑optimized content</div>
                </button>
                <button onClick={() => navigate('/overview')} className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-5 text-left shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1"><span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-50 text-emerald-600"><RefreshCcw className="w-4 h-4" /></span> Run Analysis</div>
                  <div className="text-sm text-gray-600">Simulate visibility changes</div>
                </button>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="mb-6 lg:mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Metrics</h3>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Competitive Positioning */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="font-semibold text-gray-900 mb-3">Competitive Positioning</div>
                  {(() => {
                    const comps = (analysisResult?.competitors || []).slice(0, 3);
                    const sum = comps.reduce((s: number, c: any) => s + (c.totalScore || 0), 0) || 1;
                    const entries = comps.map((c: any) => ({ name: c.name, pct: Math.round(((c.totalScore || 0) / sum) * 100) }));
                    return (
                      <div className="space-y-3">
                        {entries.map((e, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between text-sm text-gray-700"><span>{i === 0 ? 'Your Brand' : e.name}</span><span>{e.pct}%</span></div>
                            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${e.pct}%` }}></div></div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="mt-2 text-xs text-gray-500">Placement‑weighted market share</div>
                </div>

                {/* Purchase Intent Signals */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="font-semibold text-gray-900 mb-3">Purchase Intent Signals</div>
                  <div className="text-3xl font-extrabold text-gray-900">{(() => {
                    const metrics = getAIVisibilityMetrics(analysisResult);
                    const base = Math.max(0, Math.round((metrics?.totalMentions || 1247)));
                    return base.toLocaleString();
                  })()}</div>
                  <div className="text-sm text-gray-600 mt-1">Buying destination recommendations</div>
                  <div className="mt-3 inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+23% this week</div>
                </div>

                {/* Brand Sentiment */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="font-semibold text-gray-900 mb-3">Brand Sentiment</div>
                  {(() => {
                    // reuse logic from SentimentAnalysisCard
                    const comps = analysisResult?.competitors || [];
                    let total = 0, pos = 0, neu = 0, neg = 0;
                    comps.forEach((c: any) => {
                      const s = (c.breakdowns?.gemini?.sentimentScore ?? 0.5);
                      const m = (c.breakdowns?.gemini?.mentionsScore ?? 0);
                      total += m;
                      if (s < 0.3) neg += m; else if (s > 0.7) pos += m; else neu += m;
                    });
                    const P = total ? Math.round((pos/total)*100) : 0;
                    const N = total ? Math.round((neu/total)*100) : 0;
                    const NG = total ? Math.round((neg/total)*100) : 0;
                    return (
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-center justify-between"><span>Positive</span><span>{P}%</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${P}%` }}></div></div>
                        <div className="flex items-center justify-between"><span>Neutral</span><span>{N}%</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${N}%` }}></div></div>
                        <div className="flex items-center justify-between"><span>Negative</span><span>{NG}%</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${NG}%` }}></div></div>
                      </div>
                    );
                  })()}
                </div>

                {/* Authority & Credibility */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="font-semibold text-gray-900 mb-3">Authority & Credibility</div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded"><span>Media Coverage</span><span className="text-blue-700">342</span></div>
                    <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded"><span>Customer Reviews</span><span className="text-green-700">1,856</span></div>
                    <div className="flex items-center justify-between bg-yellow-50 px-3 py-2 rounded"><span>Domain Authority</span><span className="text-yellow-700">12.4K</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Views & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 lg:mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Saved Views & Reports</h3>
                  <button className="text-blue-600 text-sm" onClick={() => navigate('/history')}>View All →</button>
                </div>
                <div className="space-y-3">
                  {savedViewsStatic.map((s, i) => (
                    <div key={i} className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{s.title}</div>
                        <div className="text-xs text-gray-500">Last updated {s.updated}</div>
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Alerts & Notifications</h3>
                  <button className="text-blue-600 text-sm">View All →</button>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                    <div className="font-semibold text-red-700">Placement score dropped 10%</div>
                    <div className="text-red-700/80">A competitor overtook your brand in shopping queries</div>
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm">
                    <div className="font-semibold text-yellow-700">Schema markup issues detected</div>
                    <div className="text-yellow-700/80">3 product pages missing structured data</div>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                    <div className="font-semibold text-green-700">Sentiment improved significantly</div>
                    <div className="text-green-700/80">Positive mentions up 15% this week</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Competitor Analysis Heading - Always show when there's analysis data */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Competitor Analysis</h2>
              
            </div>  

            {/* Competitor Performance Overview Chart */}
            {analysisResult.competitors && analysisResult.competitors.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Competitor Performance Overview</h3>
                  <p className="text-sm text-gray-600">Visual comparison of average AI visibility scores across competitors</p>
                </div>
                
                <div className="h-48 sm:h-56 lg:h-64 flex items-end justify-between space-x-1 sm:space-x-2">
                  {(Array.isArray(analysisResult?.competitors) ? analysisResult.competitors : []).map((competitor: any, index: number) => {
                    const avgScore = competitor.totalScore || 0;
                    const heightPercentage = Math.min(100, Math.max(5, (avgScore / 10) * 100)); // Convert 0-10 scale to percentage
                    const barColor = getScoreColor(avgScore);
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full max-w-12 sm:max-w-16 bg-gray-200 rounded-t-lg relative">
                          <div 
                            className={`${barColor} rounded-t-lg transition-all duration-500 ease-out`}
                            style={{ 
                              height: `${heightPercentage}%`,
                              minHeight: '20px'
                            }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap">
                              {formatScore(avgScore)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 text-center font-medium truncate w-full">
                          {competitor.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center flex-wrap justify-center gap-2 sm:gap-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                      <span>Excellent (8-10)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                      <span>Good (6-7.9)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                      <span>Fair (4-5.9)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                      <span>Poor (0-3.9)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Competitors Comparison Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Competitors Comparison</h2>
                <p className="text-sm text-gray-600">Detailed scoring breakdown for each company across multiple models</p>
              </div>
              
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gemini
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perplexity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Claude
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ChatGPT
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(Array.isArray(analysisResult?.competitors) ? analysisResult.competitors : []).map((competitor: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-black">
                                  {competitor.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{competitor.name}</div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Gemini Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.gemini)}`}>
                            {formatScore(competitor.aiScores.gemini)}
                          </span>
                        </td>
                        
                        {/* Perplexity Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.perplexity)}`}>
                            {formatScore(competitor.aiScores.perplexity)}
                          </span>
                        </td>
                        
                        {/* Claude Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.claude)}`}>
                            {formatScore(competitor.aiScores.claude)}
                          </span>
                        </td>
                        
                        {/* ChatGPT Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores.chatgpt)}`}>
                            {formatScore(competitor.aiScores.chatgpt)}
                          </span>
                        </td>
                        
                        {/* Average Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${getScoreClass(competitor.totalScore)}`}>
                            {formatScore(competitor.totalScore)}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteCompetitor(index)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"
                            title="Delete competitor"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>




            

            

          </div>
        )}
      </div>
    </div>
  );
} 