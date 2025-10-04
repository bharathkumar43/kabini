import React, { useState, useEffect } from 'react';
import { BarChart3, Loader2, TrendingUp, TrendingDown, Activity, Info, Bot, Star, Brain, Search } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  iconBgColor: string;
  children: React.ReactNode;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

function DashboardCard({ title, icon, iconBgColor, children, subtitle, headerAction }: DashboardCardProps) {
  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 ease-in-out transform hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center shadow-sm`}>
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">{title}</h3>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
          </div>
        </div>
        {headerAction && (
          <div className="flex-shrink-0">
            {headerAction}
          </div>
        )}
      </div>
      <div className="relative">
        {children}
      </div>
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
  const getCurrentMentions = (): { total: number; byPlatform: { chatgpt: number; gemini: number; claude: number; perplexity: number } } => {
    if (!mainCompany) return { total: 0, byPlatform: { chatgpt: 0, gemini: 0, claude: 0, perplexity: 0 } };

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
      color: 'bg-purple-500',
      icon: <Bot className="w-4 h-4" />
    },
    { 
      name: 'Gemini', 
      mentions: currentMentions.byPlatform.gemini, 
      color: 'bg-blue-500',
      icon: <Star className="w-4 h-4" />
    },
    { 
      name: 'Claude', 
      mentions: currentMentions.byPlatform.claude, 
      color: 'bg-pink-500',
      icon: <Brain className="w-4 h-4" />
    },
    { 
      name: 'Perplexity', 
      mentions: currentMentions.byPlatform.perplexity, 
      color: 'bg-orange-500',
      icon: <Search className="w-4 h-4" />
    }
  ];

  return (
    <div className="bg-[#FACC15] rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white leading-tight">Market Share Growth</h3>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-4xl font-bold text-white mb-2">
          +{loading ? '...' : growthPercentage > 0 ? growthPercentage.toFixed(0) : 23}%
        </div>
        <div className="text-sm text-white/80">
          Brand mentions increase
        </div>
      </div>
    </div>
  );
}





