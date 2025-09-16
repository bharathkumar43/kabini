import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  BarChart3, 
  Target,
  Zap,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Clock,
  Filter,
  Download,
  Settings
} from 'lucide-react';
import { apiService } from '../services/apiService';

interface ShopperBehaviorData {
  cartAbandonment: {
    rate: number;
    totalAbandoned: number;
    totalCarts: number;
    commonReasons: string[];
    recoverySuggestions: string[];
    timeToAbandonment: number; // in minutes
  };
  queryIntent: {
    transactional: { count: number; percentage: number; queries: string[] };
    informational: { count: number; percentage: number; queries: string[] };
    navigational: { count: number; percentage: number; queries: string[] };
  };
  engagementFunnel: {
    landing: { visitors: number; conversionRate: number };
    productView: { visitors: number; conversionRate: number };
    addToCart: { visitors: number; conversionRate: number };
    checkout: { visitors: number; conversionRate: number };
    purchase: { visitors: number; conversionRate: number };
  };
  realTimeMetrics: {
    activeUsers: number;
    currentCarts: number;
    liveConversions: number;
    averageSessionTime: number;
  };
  aiInsights: {
    topRecommendations: string[];
    urgentActions: string[];
    opportunities: string[];
    riskFactors: string[];
  };
}

interface EcommerceAIVisibilityProps {
  storeId?: string;
}

export function EcommerceAIVisibility({ storeId }: EcommerceAIVisibilityProps) {
  const [behaviorData, setBehaviorData] = useState<ShopperBehaviorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch real-time shopper behavior data
  const fetchBehaviorData = async () => {
    if (!storeId) {
      setError('No store connected. Please connect a store in Settings.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getShopperBehaviorData(storeId, selectedTimeRange);
      setBehaviorData(response.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shopper behavior data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchBehaviorData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, storeId, selectedTimeRange]);

  // Initial data fetch
  useEffect(() => {
    fetchBehaviorData();
  }, [storeId, selectedTimeRange]);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  const getAbandonmentColor = (rate: number) => {
    if (rate > 70) return 'text-red-600 bg-red-50';
    if (rate > 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getConversionColor = (rate: number) => {
    if (rate > 3) return 'text-green-600 bg-green-50';
    if (rate > 1) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Connection Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/configuration'}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">E-commerce AI Visibility</h1>
            <p className="text-gray-600">Real-time shopper behavior insights and conversion optimization</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <RefreshCw 
                className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`} 
              />
              <span className="text-sm text-gray-600">
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </span>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={fetchBehaviorData}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
          <div className="flex gap-2">
            {[
              { value: '1h', label: '1 Hour' },
              { value: '24h', label: '24 Hours' },
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' }
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedTimeRange(range.value as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedTimeRange === range.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {loading && !behaviorData ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading shopper behavior data...</p>
          </div>
        </div>
      ) : behaviorData ? (
        <div className="space-y-8">
          {/* Real-time Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Active Users</h3>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-black mb-2">
                {formatNumber(behaviorData.realTimeMetrics.activeUsers)}
              </div>
              <p className="text-sm text-green-600">Live now</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Current Carts</h3>
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-black mb-2">
                {formatNumber(behaviorData.realTimeMetrics.currentCarts)}
              </div>
              <p className="text-sm text-orange-600">In progress</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Live Conversions</h3>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-black mb-2">
                {formatNumber(behaviorData.realTimeMetrics.liveConversions)}
              </div>
              <p className="text-sm text-green-600">This hour</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Avg. Session</h3>
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-black mb-2">
                {Math.round(behaviorData.realTimeMetrics.averageSessionTime)}m
              </div>
              <p className="text-sm text-purple-600">Time on site</p>
            </div>
          </div>

          {/* Cart Abandonment Analysis */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">Cart Abandonment Analysis</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getAbandonmentColor(behaviorData.cartAbandonment.rate)}`}>
                {formatPercentage(behaviorData.cartAbandonment.rate)} Abandonment Rate
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">Abandonment Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Carts Created</span>
                    <span className="font-semibold">{formatNumber(behaviorData.cartAbandonment.totalCarts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Abandoned Carts</span>
                    <span className="font-semibold text-red-600">{formatNumber(behaviorData.cartAbandonment.totalAbandoned)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Time to Abandon</span>
                    <span className="font-semibold">{Math.round(behaviorData.cartAbandonment.timeToAbandonment)}m</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-4">Common Reasons</h3>
                <div className="space-y-2">
                  {behaviorData.cartAbandonment.commonReasons.map((reason, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-4">AI Recommendations</h3>
                <div className="space-y-2">
                  {behaviorData.cartAbandonment.recoverySuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Query Intent Analysis */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-black mb-6">Search Query Intent Analysis</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.entries(behaviorData.queryIntent).map(([intent, data]) => (
                <div key={intent} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-black capitalize">{intent} Intent</h3>
                    <div className="text-2xl font-bold text-blue-600">{formatPercentage(data.percentage)}</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">{formatNumber(data.count)} queries</div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-700 mb-2">Top Queries:</div>
                    {data.queries.slice(0, 3).map((query, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        "{query}"
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Funnel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-black mb-6">Engagement Funnel</h2>
            
            <div className="space-y-4">
              {Object.entries(behaviorData.engagementFunnel).map(([stage, data], index) => (
                <div key={stage} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-black capitalize">{stage.replace(/([A-Z])/g, ' $1').trim()}</h3>
                      <div className={`px-2 py-1 rounded text-sm font-medium ${getConversionColor(data.conversionRate)}`}>
                        {formatPercentage(data.conversionRate)} conversion
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{formatNumber(data.visitors)} visitors</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((data.visitors / behaviorData.engagementFunnel.landing.visitors) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-black mb-4">AI Recommendations</h2>
              <div className="space-y-3">
                {behaviorData.aiInsights.topRecommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-black mb-4">Urgent Actions</h2>
              <div className="space-y-3">
                {behaviorData.aiInsights.urgentActions.map((action, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Opportunities & Risk Factors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-black mb-4">Growth Opportunities</h2>
              <div className="space-y-3">
                {behaviorData.aiInsights.opportunities.map((opportunity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{opportunity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-black mb-4">Risk Factors</h2>
              <div className="space-y-3">
                {behaviorData.aiInsights.riskFactors.map((risk, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
