import React, { useState, useEffect } from 'react';
import { BarChart3, Loader2, TrendingUp, TrendingDown, Activity, Info } from 'lucide-react';
import { ChatGPTIcon, GeminiIcon, ClaudeIcon, PerplexityIcon } from './ui/AIPlatformIcons';

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

// Market Share Growth (Mentions) Component
export function MarketShareGrowthCard({ result }: { result: any }) {
  const [timePeriod, setTimePeriod] = useState<'week' | 'month'>('week');
  const [growthData, setGrowthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Get main company data
  const mainCompany = result?.competitors?.find((comp: any) => 
    comp.name?.toLowerCase() === result.company?.toLowerCase()
  ) || result?.competitors?.[0];

  // Calculate current mentions from analysis result
  const getCurrentMentions = () => {
    if (!mainCompany) return { total: 0, byPlatform: {} };

    const breakdowns = mainCompany.breakdowns || {};
    
    // Calculate mentions from key metrics or breakdowns
    const byPlatform = {
      chatgpt: Number(mainCompany?.keyMetrics?.chatgpt?.brandMentions || breakdowns?.chatgpt?.mentionsScore || 0),
      gemini: Number(mainCompany?.keyMetrics?.gemini?.brandMentions || breakdowns?.gemini?.mentionsScore || 0),
      claude: Number(mainCompany?.keyMetrics?.claude?.brandMentions || breakdowns?.claude?.mentionsScore || 0),
      perplexity: Number(mainCompany?.keyMetrics?.perplexity?.brandMentions || breakdowns?.perplexity?.mentionsScore || 0)
    };

    const total = Object.values(byPlatform).reduce((sum, val) => sum + val, 0);
    
    return { total, byPlatform };
  };

  const currentMentions = getCurrentMentions();

  // Fetch historical growth data
  useEffect(() => {
    const fetchGrowthData = async () => {
      if (!mainCompany?.name) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/geo-engagement-growth/${encodeURIComponent(mainCompany.name)}?period=${timePeriod}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setGrowthData(data);
          }
        }
      } catch (error) {
        console.error('[MarketShareGrowth] Failed to fetch growth data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrowthData();
  }, [mainCompany?.name, timePeriod]);

  // Calculate growth percentage
  const calculateGrowthPercentage = () => {
    if (!growthData?.growth?.geoTrend) return 0;
    return growthData.growth.geoTrend;
  };

  const growthPercentage = calculateGrowthPercentage();

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="w-4 h-4" />;
    if (growth < 0) return <TrendingDown className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getGrowthLabel = (growth: number) => {
    if (growth > 0) return 'Growing';
    if (growth < 0) return 'Declining';
    return 'Stable';
  };

  // Platform breakdown for mentions
  const platforms = [
    { 
      name: 'ChatGPT', 
      mentions: currentMentions.byPlatform.chatgpt, 
      color: 'bg-green-500',
      icon: <ChatGPTIcon size={16} className="text-white" />
    },
    { 
      name: 'Gemini', 
      mentions: currentMentions.byPlatform.gemini, 
      color: 'bg-blue-500',
      icon: <GeminiIcon size={16} className="text-white" />
    },
    { 
      name: 'Claude', 
      mentions: currentMentions.byPlatform.claude, 
      color: 'bg-purple-500',
      icon: <ClaudeIcon size={16} className="text-white" />
    },
    { 
      name: 'Perplexity', 
      mentions: currentMentions.byPlatform.perplexity, 
      color: 'bg-orange-500',
      icon: <PerplexityIcon size={16} className="text-white" />
    }
  ];

  return (
    <DashboardCard
      title="Market Share Growth (Mentions)"
      icon={<BarChart3 className="w-5 h-5 text-white" />}
      iconBgColor="bg-emerald-500"
    >
      <div className="space-y-4">
        {/* Time Period Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Compare visibility growth vs. last week/month
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setTimePeriod('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                timePeriod === 'week'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimePeriod('month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                timePeriod === 'month'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Growth Overview */}
        <div className="text-center pb-4 border-b border-gray-200">
          <div className="flex items-center justify-center gap-3 mb-2">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              getGrowthIcon(growthPercentage)
            )}
            <div className={`text-3xl font-bold ${getGrowthColor(growthPercentage)}`}>
              {loading ? '...' : `${growthPercentage > 0 ? '+' : ''}${growthPercentage.toFixed(1)}%`}
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-1">
            {timePeriod === 'week' ? 'Week-over-Week' : 'Month-over-Month'} Growth
          </div>
          <div className={`text-sm font-semibold ${getGrowthColor(growthPercentage)}`}>
            {loading ? 'Loading...' : getGrowthLabel(growthPercentage)}
          </div>
        </div>

        {/* Current Mentions Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Current Mentions by Platform
          </h4>
          
          {platforms.map((platform, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{platform.icon}</span>
                <span className="text-sm font-medium text-gray-700">{platform.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-gray-900">
                  {platform.mentions}
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${platform.color} transition-all duration-500`}
                    style={{ 
                      width: `${Math.min(100, Math.max(5, (platform.mentions / Math.max(currentMentions.total, 1)) * 100))}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Mentions */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total Mentions</span>
            <span className="text-lg font-bold text-gray-900">{currentMentions.total}</span>
          </div>
        </div>

        {/* Insights */}
        <div className="pt-3 border-t border-gray-200 space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <p className="text-gray-700">
              <span className="font-semibold">Measure progress and traction</span> across AI tools with mention tracking and growth analysis.
            </p>
          </div>
          {growthData?.debug && (
            <div className="text-xs text-gray-500">
              Data points: {growthData.debug.currentCount} current, {growthData.debug.previousCount} previous
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}



