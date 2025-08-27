import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, Users, Globe, Target, BarChart3, Zap, Shield, Clock, Star, Award, TrendingDown, AlertTriangle, CheckCircle, XCircle, Info, ExternalLink, Download, Share2, Filter, SortAsc, SortDesc, Calendar, MapPin, Building2, Briefcase, Globe2, Network, BarChart, PieChart, LineChart, Activity, Eye, Bot, BarChart3 as BarChartIcon } from 'lucide-react';
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

// New Dashboard Feature Cards
interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  iconBgColor: string;
  children: React.ReactNode;
}

function DashboardCard({ title, icon, iconBgColor, children }: DashboardCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
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

  return (
    <DashboardCard
      title="AI Visibility Score"
      icon={<Eye className="w-5 h-5 text-white" />}
      iconBgColor="bg-green-500"
    >
      <div className="text-center">
        <div className={`text-4xl font-bold ${getScoreColor(displayScore)} mb-2`}>
          {displayScore}
        </div>
        <div className="text-gray-600 mb-2">out of 100</div>
        <div className={`text-lg font-semibold ${getScoreColor(displayScore)} mb-3`}>
          {getScoreLabel(displayScore)}
        </div>
        {industry && (
          <div className="text-sm text-green-600 font-medium mb-3">
            Industry: {industry}
          </div>
        )}
        
        {/* SEMrush Metrics Display */}
        {metrics && (
          <div className="text-xs text-gray-600 space-y-1 mb-3 text-left">
            <div className="flex justify-between">
              <span>Brand Mentions:</span>
              <span className="font-medium">{metrics.brandMentions}</span>
            </div>
            <div className="flex justify-between">
              <span>Competitor Median:</span>
              <span className="font-medium">{metrics.medianCompetitorMentions}</span>
            </div>
            <div className="flex justify-between">
              <span>Share of Voice:</span>
              <span className="font-medium">{metrics.shareOfVoice}%</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Position:</span>
              <span className="font-medium">{metrics.averagePosition}</span>
            </div>
            <div className="flex justify-between">
              <span>Sentiment:</span>
              <span className={`font-medium ${
                metrics.sentiment === 'Positive' ? 'text-green-600' : 
                metrics.sentiment === 'Negative' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {metrics.sentiment}
              </span>
            </div>
          </div>
        )}
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div 
            className={`h-3 rounded-full ${getProgressColor(displayScore)} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, displayScore))}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mb-2">
          {score === 0 ? 'No data available' : `Raw score: ${score.toFixed(1)}/10`}
        </div>
      </div>
    </DashboardCard>
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
    <DashboardCard
      title="LLM Presence"
      icon={<Bot className="w-5 h-5 text-white" />}
      iconBgColor="bg-blue-500"
    >
      <div className="space-y-3">
        {llmServices.map((service) => {
          const isAvailable = currentStatus[service.key];
          
          return (
            <div key={service.key} className="flex items-center justify-between">
              <span className="text-gray-700">{service.name}</span>
              <div className={`flex items-center ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                {isAvailable ? (
                  <>
                    {service.icon}
                    <span className="ml-1 text-sm">Available</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span className="ml-1 text-sm">Not Available</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        
        <div className="pt-2 border-t border-gray-200">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{availableServices}/{totalServices}</div>
            <div className="text-sm text-gray-600">AI Models Available</div>
            {aiScores && (
              <div className="text-xs text-gray-400 mt-1">
                Based on actual AI analysis scores
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardCard>
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
        <div className="text-gray-600 mb-2">
          {benchmark.rank} in your industry
        </div>
        {industry && (
          <div className="text-sm text-purple-600 font-medium mb-3">
            Industry: {industry}
          </div>
        )}
        <div className="text-lg font-semibold text-gray-700 mb-3">
          Score: {benchmark.score}/100
        </div>
        <div className="text-sm text-gray-500 mb-3">
          Raw: {benchmark.rawScore.toFixed(1)}/10
        </div>
        <div className="flex justify-center space-x-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-8 rounded-sm ${
                i < filledBars ? 'bg-purple-500' : 'bg-gray-200'
              }`}
            ></div>
          ))}
        </div>
        <div className="text-sm text-gray-600">
          {competitors?.length || 0} competitors analyzed
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
  const [analysisType, setAnalysisType] = useState<'root-domain' | 'subdomain' | 'subfolder'>('root-domain');
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
        if (parsed.originalInput) setInputValue(parsed.originalInput);
        if (parsed.inputType) setInputType(parsed.inputType);
        if (parsed.analysisType) setAnalysisType(parsed.analysisType);
        if (parsed.data) setAnalysisResult(parsed.data);
        
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
  const detectUrlType = (url: string): 'root-domain' | 'subdomain' | 'subfolder' => {
    try {
      // Remove protocol and www
      let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      // Split by slashes to get path parts
      const urlParts = cleanUrl.split('/');
      const domainPart = urlParts[0]; // Get the domain part
      
      // Check if it's a subdomain (has more than 2 dots in domain)
      const domainDots = (domainPart.match(/\./g) || []).length;
      
      if (domainDots > 1) {
        // More than 1 dot means subdomain (e.g., blog.cloudfuze.com)
        return 'subdomain';
      } else if (urlParts.length > 1 && urlParts[1].trim() !== '') {
        // Has path after domain (e.g., cloudfuze.com/blog)
        return 'subfolder';
      } else {
        // Just domain (e.g., cloudfuze.com)
        return 'root-domain';
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
      brandMentions: geminiBreakdown.mentionsScore || 0,
      medianCompetitorMentions: Math.round(averageAIScore * 10) / 10,
      shareOfVoice: Math.round((totalScore / 10) * 100 * 100) / 100, // Convert to percentage
      averagePosition: geminiBreakdown.positionScore || 0,
      searchVolume: 'N/A', // Not available in current API
      sentiment: geminiBreakdown.sentimentScore > 0.5 ? 'Positive' : 
                 geminiBreakdown.sentimentScore < 0.3 ? 'Negative' : 'Neutral',
      platformBreakdown: aiScores,
      totalMentions: geminiBreakdown.mentionsScore || 0
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Overview</h1>
          <p className="text-gray-600 mt-2">Welcome to kabini.ai - Your AI-Powered Content Enhancement Platform</p>
        </div>
      </div>

      {/* Unified Website Analysis Dashboard Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
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
              <div className="relative dropdown-container ml-1">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-4 py-4 border-2 border-blue-600 bg-white text-gray-700 font-medium text-lg h-[60px] min-w-[140px] flex items-center justify-between hover:bg-gray-50 transition-colors rounded-r-xl"
                >
                  <span>{analysisType === 'root-domain' ? 'Root Domain' : analysisType === 'subdomain' ? 'Subdomain' : 'Subfolder'}</span>
                  <svg className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-600 rounded-xl shadow-lg z-10 min-w-[140px]">
                    <div className="py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAnalysisType('root-domain');
                          setShowDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                          analysisType === 'root-domain' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Root Domain</span>
                          {analysisType === 'root-domain' && (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAnalysisType('subdomain');
                          setShowDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                          analysisType === 'subdomain' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Subdomain</span>
                          {analysisType === 'subdomain' && (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAnalysisType('subfolder');
                          setShowDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                          analysisType === 'subfolder' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Subfolder</span>
                          {analysisType === 'subfolder' && (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || !inputValue.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg w-full lg:w-auto min-w-[140px] h-[60px]"
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
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors w-full lg:w-auto min-w-[120px] h-[60px]"
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

        {/* Dashboard Cards - Show when we have analysis results */}
        {analysisResult && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <AIVisibilityScoreCard 
              score={getAIVisibilityScore(analysisResult)} 
              industry={analysisResult?.industry}
              metrics={getAIVisibilityMetrics(analysisResult)}
            />
            <LLMPresenceCard 
              serviceStatus={analysisResult?.serviceStatus} 
              aiScores={analysisResult?.competitors?.[0]?.aiScores}
            />
            <CompetitorBenchmarkCard 
              competitors={analysisResult?.competitors || []}
              industry={analysisResult?.industry}
            />
          </div>
        )}

        {/* Analysis Results and Competitor Table (post-analysis) */}
        {analysisResult && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Analysis Results for <span className="text-blue-700">{analysisResult.company}</span></h3>
                  {analysisResult.originalInput && analysisResult.originalInput !== analysisResult.company && (
                    <p className="text-sm text-gray-600 mt-1">
                      📍 Analyzed from: <span className="font-medium">{analysisResult.originalInput}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 hover:text-gray-900" onClick={clearAnalysisData}>Clear</button>
                </div>
              </div>
            </div>
            
            {/* Add error boundary for AIVisibilityTable */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitor Analysis</h3>
              {analysisResult.competitors && Array.isArray(analysisResult.competitors) ? (
                <AIVisibilityTable data={analysisResult} />
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
                          hasCompetitors: !!analysisResult.competitors,
                          competitorsType: typeof analysisResult.competitors,
                          isArray: Array.isArray(analysisResult.competitors),
                          dataKeys: Object.keys(analysisResult)
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 