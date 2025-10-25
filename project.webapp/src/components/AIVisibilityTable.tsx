import React, { useState, useEffect, useRef } from 'react';
import { computeMonthlyGrowth } from '../utils/formulas';
import { apiService } from '../services/apiService';

interface VisibilityBreakdown {
  mentionsScore: number;
  positionScore: number;
  sentimentScore: number;
  brandMentionsScore: number;
}

interface KeyMetrics {
  mentionsCount: number;
  position: number;
  sentiment: number;
  brandMentions: number;
  positiveWords: number;
  negativeWords: number;
}

interface CompetitorAnalysis {
  name: string;
  citationCount: number;
  aiScores: {
    gemini: number;
    perplexity: number;
    claude: number;
    chatgpt: number;
  };
  totalScore: number;
  breakdowns: {
    gemini: VisibilityBreakdown;
    perplexity: VisibilityBreakdown;
    claude: VisibilityBreakdown;
    chatgpt: VisibilityBreakdown;
  };
  keyMetrics: {
    gemini: KeyMetrics;
    perplexity: KeyMetrics;
    claude: KeyMetrics;
    chatgpt: KeyMetrics;
  };
  scrapedData?: any;
  analysis: {
    gemini: string;
    perplexity: string;
    claude: string;
    chatgpt: string;
  };
  audienceProfile?: {
    audience?: Array<{ label: string; confidence: number }>;
    demographics?: {
      region?: { label?: string; confidence?: number };
      companySize?: { label?: string; confidence?: number };
      industryFocus?: { label?: string; confidence?: number };
    };
  } | null;
  aiTraffic?: {
    byModel?: Record<string, number>;
    global?: number;
    weightedGlobal?: number;
  };
  citations?: {
    perModel?: Record<string, {
      citationCount: number;
      totalQueries: number;
      citationRate: number;
      rawCitationScore: number;
      citationScore: number;
    }>;
    global?: {
      citationCount: number;
      totalQueries: number;
      citationRate: number;
      rawCitationScore?: number;
      citationScore?: number;
      equalWeightedGlobal?: number;
    };
  };
  snippets?: Record<string, string>;
}

interface AIVisibilityTableProps {
  data: {
    company: string;
    industry: string;
    competitors: CompetitorAnalysis[];
  };
}

const AIVisibilityTable: React.FC<AIVisibilityTableProps> = ({ data }) => {
  console.log('[AIVisibilityTable] Rendering with data:', data);
  
  // Sorting state for traffic metrics table
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  // Dropdown state removed; keep no state for dropdowns
  // Backlink table sorting and dropdown state
  const [backlinkSortConfig, setBacklinkSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  // Dropdown state removed; keep no state for dropdowns
  
  // Add error boundary state
  const [hasError, setHasError] = useState(false);

  // Old dropdown handlers removed

  // Single-click sorter: cycles asc -> desc -> none
  const cycleTrafficSort = (key: string) => {
    setSortConfig(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' } as const;
      if (prev.direction === 'asc') return { key, direction: 'desc' } as const;
      return null;
    });
  };

  // Old backlink dropdown handlers removed

  const cycleBacklinkSort = (key: string) => {
    setBacklinkSortConfig(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' } as const;
      if (prev.direction === 'asc') return { key, direction: 'desc' } as const;
      return null;
    });
  };

  // Get sorted competitors for traffic metrics
  const getSortedCompetitors = () => {
    if (!sortConfig) return competitors;

    return [...competitors].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortConfig.key) {
        case 'estimatedVisits':
          aValue = getTrafficMetricsFor(a).estimatedVisits;
          bValue = getTrafficMetricsFor(b).estimatedVisits;
          break;
        case 'pagesPerVisit':
          aValue = getTrafficMetricsFor(a).pagesPerVisit;
          bValue = getTrafficMetricsFor(b).pagesPerVisit;
          break;
        case 'bounceRate':
          aValue = getTrafficMetricsFor(a).bounceRate;
          bValue = getTrafficMetricsFor(b).bounceRate;
          break;
        case 'uniqueVisitors':
          aValue = getTrafficMetricsFor(a).uniqueVisitors;
          bValue = getTrafficMetricsFor(b).uniqueVisitors;
          break;
        case 'avgDuration':
          aValue = getTrafficMetricsFor(a).avgDuration;
          bValue = getTrafficMetricsFor(b).avgDuration;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };
  const [errorMessage, setErrorMessage] = useState('');
  
  const [competitors, setCompetitors] = useState(data.competitors || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [isUrlInput, setIsUrlInput] = useState(false);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationWarning, setValidationWarning] = useState('');
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  
  // Deterministic traffic metrics generator to prevent page sections from shifting on click
  const getTrafficMetricsFor = (comp: CompetitorAnalysis) => {
    const name = comp.name || '';
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0; // 32-bit
    }
    const seed = Math.abs(hash % 1000) / 1000; // 0..1
    const score = comp.totalScore || 0;
    const estimatedVisits = Math.floor(score * 10000) + Math.floor(seed * 50000);
    const uniqueVisitors = Math.floor(estimatedVisits * 0.8);
    const pagesPerVisit = parseFloat((2 + score * 0.3 + seed * 0.2).toFixed(1));
    const avgDuration = Math.floor(score * 60 + 30 + seed * 30);
    const bounceRate = Math.max(20, 80 - score * 5 - Math.floor(seed * 5));
    return { estimatedVisits, uniqueVisitors, pagesPerVisit, avgDuration, bounceRate };
  };

  // Utility: stable 0..1 seed from a name and salt
  const seeded = (name: string, salt: string): number => {
    const key = `${name}::${salt}`;
    let h = 0;
    for (let i = 0; i < key.length; i += 1) {
      h = (h << 5) - h + key.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h % 1000) / 1000;
  };

  // Colors for legends/dots - light, user-friendly palette
  // Soft pastels and light colors for better UX
  const LEGEND_COLORS = [
    '#60a5fa', // blue-400 (Good)
    '#34d399', // emerald-400 (Excellent)
    '#fbbf24', // amber-400
    '#f472b6', // pink-400
    '#a78bfa', // violet-400
    '#22d3ee', // cyan-400
    '#fb7185', // rose-400 (Poor)
    '#4ade80', // green-400
    '#fde047', // yellow-300
    '#2dd4bf', // teal-400
  ];
  const getColorForName = (name: string): string => {
    const idx = Math.floor(seeded(name || 'unknown', 'color') * LEGEND_COLORS.length);
    return LEGEND_COLORS[idx];
  };

  // Optional model usage weights (1 = equal weighting)
  const MODEL_USAGE_WEIGHTS = {
    chatgpt: 1,
    gemini: 1,
    perplexity: 1,
    claude: 1,
  } as const;

  // Tooltip state for Growth Quadrant dots
  const [hoveredPoint, setHoveredPoint] = useState<null | { left: number; top: number; name: string; traffic: number; growth: number }>(null);
  // Tooltip state for AI Channel Mix stacked bars
  const [hoveredChannel, setHoveredChannel] = useState<null | { left: number; top: number; competitor: string; platform: string; percent: number; visits: number }>(null);
  const channelContainerRef = useRef<HTMLDivElement | null>(null);

  // Deterministic generators for other sections so values don't change on re-render
  // Replace classic channel mix with AI platform mix (ChatGPT, Gemini, Perplexity, Claude)
  const getChannelMixFor = (comp: CompetitorAnalysis) => {
    // Derive percentages from actual AI scores with small epsilon so tiny but non-zero values are visible
    const eps = 0.1;
    const rawChat = Math.max(0, Number(comp.aiScores.chatgpt) || 0) * MODEL_USAGE_WEIGHTS.chatgpt;
    const rawGem = Math.max(0, Number(comp.aiScores.gemini) || 0) * MODEL_USAGE_WEIGHTS.gemini;
    const rawPerp = Math.max(0, Number(comp.aiScores.perplexity) || 0) * MODEL_USAGE_WEIGHTS.perplexity;
    const rawCl = Math.max(0, Number(comp.aiScores.claude) || 0) * MODEL_USAGE_WEIGHTS.claude;

    const chatgptVisits = rawChat > 0 ? rawChat + eps : 0;
    const geminiVisits = rawGem > 0 ? rawGem + eps : 0;
    const perplexityVisits = rawPerp > 0 ? rawPerp + eps : 0;
    const claudeVisits = rawCl > 0 ? rawCl + eps : 0;
    const totalAI = Math.max(1e-6, chatgptVisits + geminiVisits + perplexityVisits + claudeVisits);

    const chatgpt = (chatgptVisits / totalAI) * 100;
    const gemini = (geminiVisits / totalAI) * 100;
    const perplexity = (perplexityVisits / totalAI) * 100;
    const claude = (claudeVisits / totalAI) * 100;

    return { chatgpt, gemini, perplexity, claude };
  };

  const getChannelVisitsFor = (comp: CompetitorAnalysis) => {
    // Use raw scores to compute comparable visit weights
    const scale = 1000; // display scaling only
    const eps = 0.1;
    const chatBase = Math.max(0, Number(comp.aiScores.chatgpt) || 0) * MODEL_USAGE_WEIGHTS.chatgpt;
    const gemBase = Math.max(0, Number(comp.aiScores.gemini) || 0) * MODEL_USAGE_WEIGHTS.gemini;
    const perpBase = Math.max(0, Number(comp.aiScores.perplexity) || 0) * MODEL_USAGE_WEIGHTS.perplexity;
    const claBase = Math.max(0, Number(comp.aiScores.claude) || 0) * MODEL_USAGE_WEIGHTS.claude;
    const chatgptVisits = Math.max(0, Math.round(((chatBase) + (chatBase > 0 ? eps : 0)) * scale));
    const geminiVisits = Math.max(0, Math.round(((gemBase) + (gemBase > 0 ? eps : 0)) * scale));
    const perplexityVisits = Math.max(0, Math.round(((perpBase) + (perpBase > 0 ? eps : 0)) * scale));
    const claudeVisits = Math.max(0, Math.round(((claBase) + (claBase > 0 ? eps : 0)) * scale));
    const totalAI = Math.max(1, chatgptVisits + geminiVisits + perplexityVisits + claudeVisits);
    return { chatgptVisits, geminiVisits, perplexityVisits, claudeVisits, totalAI };
  };

  const getGrowthFor = (comp: CompetitorAnalysis) => {
    // Create distinct growth patterns for each company to ensure quadrant distribution
    const nameHash = seeded(comp.name, 'growth');
    const scoreHash = seeded(comp.name, 'score');
    
    // Create four distinct growth categories based on company characteristics
    let growthScore;
    if (nameHash < 0.25) {
      // Game Changers: High growth, low traffic (will be positioned top-left)
      growthScore = 60 + (scoreHash * 40); // 60-100% growth
    } else if (nameHash < 0.5) {
      // Leaders: High growth, high traffic (will be positioned top-right)
      growthScore = 40 + (scoreHash * 40); // 40-80% growth
    } else if (nameHash < 0.75) {
      // Niche Players: Low growth, low traffic (will be positioned bottom-left)
      growthScore = -20 + (scoreHash * 30); // -20% to 10% growth
    } else {
      // Established Players: Low growth, high traffic (will be positioned bottom-right)
      growthScore = -10 + (scoreHash * 20); // -10% to 10% growth
    }
    
    return { growthScore: Math.round(growthScore) };
  };

  const getCompetitionGapFor = (comp: CompetitorAnalysis) => {
    const missing = Math.floor(seeded(comp.name, 'missing') * 200) + 50;
    const opportunity = Math.floor((comp.totalScore || 0) * 10 + seeded(comp.name, 'opportunity') * 20);
    return { missingKeywords: missing, opportunityScore: opportunity };
  };

  const getBacklinksFor = (comp: CompetitorAnalysis) => {
    const base = (comp.totalScore || 0) * 1000;
    const rand = seeded(comp.name, 'backlinks') * 5000;
    const totalBacklinks = Math.floor(base + rand);
    const referringDomains = Math.floor(totalBacklinks * 0.3 + seeded(comp.name, 'refDomains') * 200);
    const dofollowBacklinks = Math.floor(totalBacklinks * 0.8);
    const nofollowBacklinks = totalBacklinks - dofollowBacklinks;
    return { totalBacklinks, referringDomains, dofollowBacklinks, nofollowBacklinks };
  };
  
  // Validate data structure
  useEffect(() => {
    if (!data || !data.competitors) {
      console.error('[AIVisibilityTable] Invalid data structure:', data);
      setHasError(true);
      setErrorMessage('Invalid data structure received');
      return;
    }
    
    if (!Array.isArray(data.competitors)) {
      console.error('[AIVisibilityTable] Competitors is not an array:', data.competitors);
      setHasError(true);
      setErrorMessage('Competitors data is not in expected format');
      return;
    }
    
    setHasError(false);
    setErrorMessage('');
    console.log('[AIVisibilityTable] Data validation passed, competitors count:', data.competitors.length);
  }, [data]);

  const handleDeleteCompetitor = (index: number) => {
    const competitorName = competitors[index].name;
    if (window.confirm(`Are you sure you want to remove "${competitorName}" from the analysis?`)) {
      const updatedCompetitors = competitors.filter((_, i) => i !== index);
      setCompetitors(updatedCompetitors);
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitorName.trim()) {
      alert('Please enter a competitor name');
      return;
    }

    // Check if competitor already exists
    if (competitors.some(c => c.name.toLowerCase() === newCompetitorName.toLowerCase())) {
      alert('This competitor is already in the analysis');
      return;
    }

    // Helper: extract and validate domain
    const normalizeDomainFromInput = (raw: string) => {
      try {
        let input = raw.trim();
        if (!/^https?:\/\//i.test(input)) {
          input = `https://${input}`;
        }
        const u = new URL(input);
        return u.hostname.toLowerCase();
      } catch {
        return raw.toLowerCase();
      }
    };
    const isLikelyDomainName = (value: string) => {
      const v = value.toLowerCase();
      return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(v);
    };
    const verifyDomainExists = async (domain: string): Promise<boolean> => {
      try {
        // Use Google's DNS-over-HTTPS API to check A records
        const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`);
        if (!res.ok) return false;
        const json = await res.json();
        return json && json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
      } catch {
        return false;
      }
    };

    setValidationWarning('');
    setIsCheckingDomain(true);
    const domainCandidate = normalizeDomainFromInput(newCompetitorName);
    const looksDomain = isLikelyDomainName(domainCandidate);
    let domainOk = false;
    if (looksDomain) {
      domainOk = await verifyDomainExists(domainCandidate);
    }
    setIsCheckingDomain(false);

    if (!looksDomain || !domainOk) {
      setValidationWarning('Please enter a valid domain (e.g., example.com). If you prefer, switch to Company Name.');
      // Keep the user in domain mode to correct, but offer toggle below
      setIsUrlInput(true);
      return;
    }

    console.log('[AIVisibilityTable] Adding competitor:', newCompetitorName);
    console.log('[AIVisibilityTable] Current industry:', data.industry);
    
    setIsAddingCompetitor(true);
    try {
      const response = await apiService.analyzeSingleCompetitor(newCompetitorName, data.industry);
      console.log('[AIVisibilityTable] API response received:', response);
      
      // Handle the backend response format: { success: true, data: competitorData }
      let newCompetitor;
      if (response && response.success && response.data) {
        newCompetitor = response.data;
        console.log('[AIVisibilityTable] Extracted competitor data:', newCompetitor);
      } else if (response && response.name) {
        // Direct competitor data (fallback)
        newCompetitor = response;
        console.log('[AIVisibilityTable] Using direct competitor data:', newCompetitor);
      } else {
        throw new Error('Invalid response format from API');
      }
      
      if (!newCompetitor || !newCompetitor.name) {
        throw new Error('Invalid competitor data received from API');
      }
      
      const updatedCompetitors = [...competitors, newCompetitor];
      console.log('[AIVisibilityTable] Updated competitors list:', updatedCompetitors);
      
      setCompetitors(updatedCompetitors);
      setNewCompetitorName('');
      setShowAddForm(false);
      setSuccessMessage(`${newCompetitorName} has been added successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding competitor:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to add competitor: ${message}`);
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-600 bg-emerald-100'; // Excellent (8-10)
    if (score >= 6) return 'text-sky-600 bg-sky-100'; // Good (6-7.9)
    if (score >= 4) return 'text-amber-600 bg-amber-100'; // Fair (4-5.9)
    return 'text-rose-600 bg-rose-100'; // Poor (0-3.9)
  };

  const getScoreClass = (score: number) => {
    if (score >= 8) return 'text-emerald-600 font-semibold'; // Excellent (8-10)
    if (score >= 6) return 'text-sky-600 font-semibold'; // Good (6-7.9)
    if (score >= 4) return 'text-amber-600 font-semibold'; // Fair (4-5.9)
    return 'text-rose-600 font-semibold'; // Poor (0-3.9)
  };

  // Bar color mapping to match legend colors (Excellent=emerald, Good=sky, Fair=amber, Poor=rose)
  const getBarColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-400'; // Excellent (8-10)
    if (score >= 6) return 'bg-sky-400'; // Good (6-7.9)
    if (score >= 4) return 'bg-amber-400'; // Fair (4-5.9)
    return 'bg-rose-400'; // Poor (0-3.9)
  };

  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined || isNaN(score)) {
      return '0.0000';
    }
    return Number(score).toFixed(4);
  };



  // Show error state if there's an issue
  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Competitor Data</h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Summary Cards removed - Keeping only the competitor analysis functionality */}

      {/* Competitor Performance Chart */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-black">Competitor Performance Overview</h3>
            <p className="text-sm text-gray-600">Visual comparison of average AI visibility scores across competitors</p>
          </div>
          
          <div className="h-48 sm:h-56 lg:h-64 overflow-x-auto overflow-y-visible">
            <div className="flex items-end h-full gap-3 sm:gap-4 min-w-max px-2 pb-2">
            {competitors.map((competitor, index) => {
              const avgScore = competitor.totalScore || 0;
              // Adjust range: scale 0-10 to 0-100% but with better distribution
              const heightPercentage = Math.min(95, Math.max(10, (avgScore / 10) * 85 + 10)); // 10-95% range
              const barColor = getBarColor(avgScore);
              
              return (
                <div key={index} className="flex-none w-12 sm:w-16 h-full flex flex-col justify-end items-center relative">
                  {/* Score display at the bottom */}
                  <div className="mb-1 text-xs font-semibold text-gray-800 text-center whitespace-nowrap">
                    {formatScore(avgScore)}
                  </div>
                  
                  <div className="w-full h-full bg-gray-200 rounded-t-lg relative">
                    <div 
                      className={`${barColor} rounded-t-lg transition-all duration-500 ease-out absolute bottom-0 left-0 w-full`}
                      style={{ 
                        height: `${heightPercentage}%`,
                        minHeight: '20px'
                      }}
                    />
                  </div>
                  
                  {/* Company name at the bottom */}
                  <div className="mt-2 text-xs text-gray-600 text-center font-medium truncate w-full">
                    {competitor.name}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className="inline-flex items-center flex-wrap justify-center gap-2 sm:gap-4 text-xs text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-emerald-400 rounded mr-1"></div>
                <span>Excellent (8-10)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-sky-400 rounded mr-1"></div>
                <span>Good (6-7.9)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-amber-400 rounded mr-1"></div>
                <span>Fair (4-5.9)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-rose-400 rounded mr-1"></div>
                <span>Poor (0-3.9)</span>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}


      {/* Main Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">Market Analysis Results</h2>
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
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RAVI
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competitors.map((competitor, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-black">
                            {competitor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-black">{competitor.name}</div>
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
                  {/* RAVI */}
                  {/* <td className="px-6 py-4 whitespace-nowrap">
                    {typeof (competitor as any).ravi?.rounded === 'number' ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {(competitor as any).ravi.rounded}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td> */}
                  
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
  );
};



export default AIVisibilityTable; 