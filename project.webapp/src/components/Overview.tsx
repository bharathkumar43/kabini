import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Users, Globe, Target, BarChart3, Zap, Shield, Clock, Star, Award, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, XCircle, Info, ExternalLink, Share2, Filter, SortAsc, SortDesc, Calendar, MapPin, Building2, Briefcase, Globe2, Network, PieChart, LineChart, Activity, Eye, Bot, BarChart3 as BarChartIcon, FileText, X, Upload, Heart, Frown, Meh, Package, DollarSign, BarChart, Lightbulb, Grid3X3, Radar, Brain, RefreshCw } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SessionData } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { historyService } from '../services/historyService';
import { sessionManager } from '../services/sessionManager';
import type { HistoryItem, QAHistoryItem } from '../types';

import { handleInputChange as handleEmojiFilteredInput, handlePaste, handleKeyDown } from '../utils/emojiFilter';
import { computeAiCitationScore, computeRelativeAiVisibility, median } from '../utils/formulas';
import HighlightedLink from './ui/HighlightedLink';
import { ChatGPTIcon, GeminiIcon, PerplexityIcon, ClaudeIcon } from './ui/AIPlatformIcons';

const SESSIONS_KEY = 'llm_qa_sessions';
const CURRENT_SESSION_KEY = 'llm_qa_current_session';

// Enhanced Dashboard Card Component with Zoho Analytics-inspired design
interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  subtitle?: string;
}

function DashboardCard({ title, icon, iconBgColor, children, className = "", headerAction, subtitle }: DashboardCardProps) {
  return (
    <div className={`group bg-white border border-gray-300 rounded-xl p-4 shadow-sm hover:shadow-xl hover:border-gray-400 transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col h-full${className}`}>
      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-lg ${iconBgColor || 'bg-gray-100'} flex items-center justify-center shadow-sm`}>
              {React.cloneElement(icon as React.ReactElement, { className: iconBgColor ? "w-4 h-4 text-white" : "w-4 h-4 text-black" })}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">{title}</h3>
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
      <div className="relative flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

// Enhanced AI Visibility Score Component with Zoho Analytics-inspired design
function AIVisibilityScoreCard({ score, industry, metrics }: { 
  score: number, 
  industry?: string, 
  metrics?: any 
}) {
  const validateScore = (rawScore: number): number => {
    const clampedScore = Math.max(0, Math.min(10, rawScore));
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
    return 'Needs Improvement';
  };

  const getIconBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <DashboardCard
      title="Overall AI Visibility Score"
      subtitle="Tracks how discoverable your brand is across ChatGPT, Gemini, Claude, and Perplexity with week-over-week trend analysis"
      icon={<Eye className="w-5 h-5 text-white" />}
      iconBgColor={getIconBgColor(displayScore)}
      headerAction={
        <button className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <Eye className="w-4 h-4 text-gray-600" />
        </button>
      }
    >
      <div className="space-y-6">
        {/* Main Score Display */}
        <div className="text-center">
          <div className={`text-5xl font-bold ${getScoreColor(displayScore)} mb-2`}>
            {displayScore}%
          </div>
          <div className="text-sm text-gray-500 mb-3">Composite Visibility Score</div>
          
          {/* Trend Indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-600">-100.0% vs last week</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{displayScore}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-2 rounded-full ${getProgressColor(displayScore)} transition-all duration-1000 ease-out`}
              style={{ width: `${Math.min(100, Math.max(0, displayScore))}%` }}
            ></div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">VISIBILITY BY AI PLATFORM</h4>
          <div className="space-y-2">
            {['ChatGPT', 'Gemini', 'Claude', 'Perplexity'].map((platform) => (
              <div key={platform} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{platform}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full bg-gray-400"
                      style={{ width: `${displayScore}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{displayScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            Tracks how discoverable your brand is across ChatGPT, Gemini, Claude, and Perplexity with week-over-week trend analysis.
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}

// Radar Chart Component for AI Platform Presence
function RadarChart({ data, size = 200 }: { data: Array<{ name: string; value: number; icon: React.ReactNode }>, size?: number }) {
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size * 0.35;
  
  const points = data.map((item, index) => {
    const angle = (index * 2 * Math.PI) / data.length - Math.PI / 2;
    const radius = (item.value / 100) * maxRadius;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y, ...item };
  });

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ') + ' Z';

  const gridLines = [20, 40, 60, 80, 100].map(level => {
    const radius = (level / 100) * maxRadius;
    return (
      <circle
        key={level}
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="1"
      />
    );
  });

  const axisLines = data.map((_, index) => {
    const angle = (index * 2 * Math.PI) / data.length - Math.PI / 2;
    const x = centerX + maxRadius * Math.cos(angle);
    const y = centerY + maxRadius * Math.sin(angle);
    return (
      <line
        key={index}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke="#e5e7eb"
        strokeWidth="1"
      />
    );
  });

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid lines */}
        {gridLines}
        {axisLines}
        
        {/* Data area */}
        <path
          d={pathData}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgb(59, 130, 246)"
          strokeWidth="2"
        />
        
        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="rgb(59, 130, 246)"
              stroke="white"
              strokeWidth="2"
            />
            {/* Platform labels */}
            <text
              x={point.x}
              y={point.y - 15}
              textAnchor="middle"
              className="text-xs font-medium fill-gray-700"
            >
              {point.name}
            </text>
            <text
              x={point.x}
              y={point.y + 25}
              textAnchor="middle"
              className="text-xs font-semibold fill-gray-900"
            >
              {point.value}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Enhanced AI Platform Presence Breakdown Card
function AIPlatformPresenceCard() {
  const [viewMode, setViewMode] = useState<'radar' | 'grid'>('radar');
  
  const platformData = [
    { name: 'ChatGPT', value: 10, icon: <ChatGPTIcon size={12} /> },
    { name: 'Perplexity', value: 10, icon: <PerplexityIcon size={12} /> },
    { name: 'Gemini', value: 10, icon: <GeminiIcon size={12} /> },
    { name: 'Claude', value: 10, icon: <ClaudeIcon size={12} /> }
  ];

  const strongestPlatform = platformData.reduce((max, platform) => 
    platform.value > max.value ? platform : max
  );

  return (
    <DashboardCard
      title="AI Platform Presence Breakdown"
      subtitle="Identify where you're strong or weak across AI platforms"
      icon={<Target className="w-5 h-5 text-white" />}
      iconBgColor="bg-purple-500"
      headerAction={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('radar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'radar' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Radar
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'grid' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Grid
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {viewMode === 'radar' ? (
          <RadarChart data={platformData} size={280} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {platformData.map((platform, index) => (
              <div key={platform.name} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-center mb-2">
                  {platform.icon}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">{platform.name}</div>
                <div className="text-lg font-bold text-gray-900">{platform.value}%</div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div 
                    className="h-1.5 rounded-full bg-purple-500"
                    style={{ width: `${platform.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-gray-700">
              <span className="font-medium">Strongest:</span> {strongestPlatform.name} ({strongestPlatform.value}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-gray-700">
              <span className="font-medium">Needs improvement:</span> {strongestPlatform.name} ({strongestPlatform.value}%)
            </span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

// Overall AI Visibility Score Component with Multi-Model Breakdown and Trends
function OverallAIVisibilityScoreCard({ result }: { result: any }) {
  const [weeklyTrend, setWeeklyTrend] = useState<number | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Get main company data
  const mainCompany = result?.competitors?.find((comp: any) => 
    comp.name?.toLowerCase() === result.company?.toLowerCase()
  ) || result?.competitors?.[0];

  // Calculate composite visibility score (0-100 scale)
  const calculateCompositeScore = () => {
    if (!mainCompany?.aiScores) return 0;
    
    const scores = mainCompany.aiScores;
    const chatgptScore = Number(scores.chatgpt || 0);
    const geminiScore = Number(scores.gemini || 0);
    const claudeScore = Number(scores.claude || 0);
    const perplexityScore = Number(scores.perplexity || 0);
    
    // Average of all models, converted to 0-100 scale
    const avgScore = (chatgptScore + geminiScore + claudeScore + perplexityScore) / 4;
    return Math.round(Math.min(100, Math.max(0, avgScore * 10)));
  };

  // Calculate percentage visibility for each model
  const calculateModelVisibility = () => {
    if (!mainCompany?.aiScores) return { chatgpt: 0, gemini: 0, claude: 0, perplexity: 0 };
    
    const scores = mainCompany.aiScores;
    return {
      chatgpt: Math.round(Math.min(100, Math.max(0, Number(scores.chatgpt || 0) * 10))),
      gemini: Math.round(Math.min(100, Math.max(0, Number(scores.gemini || 0) * 10))),
      claude: Math.round(Math.min(100, Math.max(0, Number(scores.claude || 0) * 10))),
      perplexity: Math.round(Math.min(100, Math.max(0, Number(scores.perplexity || 0) * 10)))
    };
  };

  const compositeScore = calculateCompositeScore();
  const modelVisibility = calculateModelVisibility();

  // Fetch week-over-week trend
  useEffect(() => {
    const fetchTrend = async () => {
      if (!mainCompany?.name) return;
      
      setLoadingTrend(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/geo-engagement-growth/${encodeURIComponent(mainCompany.name)}?period=week`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.growth?.geoTrend !== undefined) {
            setWeeklyTrend(data.growth.geoTrend);
          }
        }
      } catch (error) {
        console.error('[OverallAIVisibilityScore] Failed to fetch trend:', error);
      } finally {
        setLoadingTrend(false);
      }
    };

    fetchTrend();
  }, [mainCompany?.name]);


  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend < 0) return <TrendingDown className="w-3 h-3" />;
    return <Activity className="w-3 h-3" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

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

  return (
    <DashboardCard
      title="AI Visibility Score"
      icon={<Eye className="w-4 h-4 text-black" />}
      headerAction={
        <div 
          className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:border-gray-400 transition-colors flex items-center justify-center"
          title="How well your brand appears in AI assistant responses"
        >
          <span className="text-xs text-gray-600 font-medium">i</span>
        </div>
      }
    >
      <div className="text-center">
        <div className={`text-4xl font-bold ${getScoreColor(compositeScore)} mb-2`}>
          {compositeScore}
        </div>
        <div className="text-gray-600 mb-2">out of 100</div>
        <div className={`text-lg font-semibold ${getScoreColor(compositeScore)} mb-3`}>
          {getScoreLabel(compositeScore)}
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full ${getProgressColor(compositeScore)} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, compositeScore))}%` }}
          ></div>
      </div>
      </div>
    </DashboardCard>
  );
}

// SKUs Mentioned Card Component with Image-Inspired Design
// Product Performance Analysis Card - Comprehensive LLM + Shopify Analytics
function ProductPerformanceAnalysisCard({ result, setShowShopifyModal }: { result: any; setShowShopifyModal?: (show: boolean) => void }) {
  const [shopifyProducts, setShopifyProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // Get main company data
  const mainCompany = result?.competitors?.find((comp: any) => 
    comp.name?.toLowerCase() === result.company?.toLowerCase()
  ) || result?.competitors?.[0];

  // Check if Shopify store is connected
  const shopifyConnections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
  const hasShopifyConnection = shopifyConnections.length > 0;

  // Fetch real Shopify products for comprehensive analysis
  const fetchShopifyProducts = async () => {
    if (!hasShopifyConnection) return;

    setLoading(true);
    try {
      const connections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
      if (connections.length === 0) return;

      const allProducts: any[] = [];
      for (const connection of connections) {
        try {
          const query = `
            query {
              products(first: 250) {
                edges {
                  node {
                    id
                    title
                    handle
                    vendor
                    tags
                    productType
                    variants(first: 10) {
                      edges {
                        node {
                          id
                          sku
                          price
                          title
                        }
                      }
                    }
                    images(first: 1) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                  }
                }
              }
            }
          `;

          const response = await fetch(`https://${connection.shop}/api/2023-10/graphql.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Storefront-Access-Token': connection.token,
            },
            body: JSON.stringify({ query }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Shopify API Response for', connection.shop, ':', data);

            const products = data.data?.products?.edges?.map((edge: any) => ({
              ...edge.node,
              shop: connection.shop
            })) || [];

            console.log('Parsed products for', connection.shop, ':', products.length, products.slice(0, 3));
            allProducts.push(...products);
          } else {
            console.error('Failed to fetch from', connection.shop, ':', response.status, response.statusText);
          }
        } catch (error) {
          console.error(`Failed to fetch products from ${connection.shop}:`, error);
        }
      }

      setShopifyProducts(allProducts);
      console.log('Total products fetched:', allProducts.length);

      // Generate AI-powered product analysis
      await generateProductAnalysis(allProducts);

      // If no categories were found, create some sample categories for demo purposes
      if (allProducts.length > 0) {
        console.log('Products fetched successfully, proceeding with analysis...');
      }

    } catch (error) {
      console.error('Failed to fetch Shopify products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate comprehensive product analysis using LLM
  const generateProductAnalysis = async (products: any[]) => {
    try {
      const categories = groupProductsByCategory(products);
      console.log('Generated categories:', categories);

      const analysis = {
        totalProducts: products.length,
        totalSKUs: products.reduce((count, product) => count + (product.variants?.edges?.length || 0), 0),
        categories: categories,
        performanceTiers: calculatePerformanceTiers(products),
        insights: await generateLLMAnalysis(products),
        recommendations: await generateLLMRecommendations(products)
      };

      console.log('Analysis results:', analysis);
      setAnalysisResults(analysis);
    } catch (error) {
      console.error('Failed to generate product analysis:', error);
    }
  };

  // Group products by category for segmentation
  const groupProductsByCategory = (products: any[]) => {
    const categories: { [key: string]: { products: any[], count: number } } = {};

    products.forEach(product => {
      // Try multiple fields to determine category
      let category = null;

      // Check productType (this is the standard Shopify field)
      if (product.productType && product.productType.trim()) {
        category = product.productType.trim();
      }
      // Fallback to tags (some stores use tags for categorization)
      else if (product.tags && product.tags.length > 0) {
        // Use the first tag as category, or combine multiple tags
        category = product.tags.slice(0, 2).join(' / '); // Use first 2 tags
      }
      // Fallback to vendor (brand)
      else if (product.vendor && product.vendor.trim()) {
        category = product.vendor.trim();
      }
      // Final fallback
      else {
        category = 'Uncategorized';
      }

      console.log('Product:', product.title, 'Category:', category, 'productType:', product.productType, 'tags:', product.tags, 'vendor:', product.vendor);

      if (!categories[category]) {
        categories[category] = { products: [], count: 0 };
      }
      categories[category].products.push(product);
      categories[category].count++;
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      count: data.count,
      products: data.products
    }));
  };

  // Calculate performance tiers based on product metrics
  const calculatePerformanceTiers = (products: any[]) => {
    // This would integrate with your AI analysis data for more accurate scoring
    const tiers = {
      top: products.length * 0.1, // Top 10%
      mid: products.length * 0.4, // Middle 40%
      bottom: products.length * 0.5 // Bottom 50%
    };

    return tiers;
  };

  // Generate LLM-powered insights (mock for now, would integrate with real LLM API)
  const generateLLMAnalysis = async (products: any[]) => {
    // This would call your LLM API with structured prompts
    return {
      summary: "Based on the product dataset, your top-performing categories show strong conversion rates with electronics leading at 3.2%.",
      patterns: ["Price range $50-150 shows highest engagement", "Electronics category has 2x better conversion than average"],
      opportunities: ["Expand yoga/fitness category", "Optimize pricing for mid-range products"]
    };
  };

  // Generate LLM-powered recommendations
  const generateLLMRecommendations = async (products: any[]) => {
    return [
      { priority: "High", action: "Optimize product descriptions for electronics category", impact: "15-20% conversion increase" },
      { priority: "Medium", action: "Expand fitness/yoga product line", impact: "10-15% revenue growth" },
      { priority: "Low", action: "Review pricing strategy for mid-range items", impact: "5-10% margin improvement" }
    ];
  };

  useEffect(() => {
    if (hasShopifyConnection) {
      fetchShopifyProducts();
    }
  }, [hasShopifyConnection]);

  return (
    <DashboardCard
      title="Top Performing Categories"
      icon={<BarChart3 className="w-4 h-4 text-black" />}
    >
      {hasShopifyConnection ? (
        loading ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-8 h-8 mx-auto animate-pulse" />
          </div>
            <p className="text-sm text-gray-600">Analyzing product performance...</p>
          </div>
        ) : analysisResults ? (
          <div className="space-y-6">
            {/* Segmentation Section Only */}
              <div className="space-y-3">
                {analysisResults.categories.length > 0 ? (
                  analysisResults.categories.map((category: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900">{category.name}</span>
                      <span className="text-sm text-gray-600">{category.count} products</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <BarChart3 className="w-8 h-8 mx-auto" />
                    </div>
                    <p className="text-sm text-gray-600">No categories found in store data</p>
                    <p className="text-xs text-gray-500 mt-1">Categories will appear once products are properly categorized in Shopify</p>
                  </div>
                )}
              </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-600">Generating analysis...</p>
          </div>
        )
      ) : (
        <div className="text-center py-8">
          <div className="mb-4">
            <Package className="w-12 h-12 text-gray-400 mx-auto" />
          </div>
          <p className="text-sm text-gray-600 mb-4">Connect Shopify Store</p>
          <p className="text-xs text-gray-500 mb-4">
            Get comprehensive product performance analysis with AI-powered insights
          </p>
          <button
            onClick={() => setShowShopifyModal?.(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Store
          </button>
        </div>
      )}
    </DashboardCard>
  );
}

// LLM Presence Component (Updated to match image design)
function AIPlatformPresenceBreakdown({ result }: { result: any }) {
  
  // Get main company data
  const mainCompany = result?.competitors?.find((comp: any) => 
    comp.name?.toLowerCase() === result.company?.toLowerCase()
  ) || result?.competitors?.[0];

  // Calculate platform availability based on scores
  const getPlatformAvailability = () => {
    if (!mainCompany?.aiScores) {
      return {
        chatgpt: true,
        gemini: true,
        claude: true,
        perplexity: true
      };
    }

    const scores = mainCompany.aiScores;
    // Consider available if score > 0
    return {
      chatgpt: Number(scores.chatgpt || 0) > 0,
      gemini: Number(scores.gemini || 0) > 0,
      claude: Number(scores.claude || 0) > 0,
      perplexity: Number(scores.perplexity || 0) > 0
    };
  };

  const platformAvailability = getPlatformAvailability();
  
  const platforms = [
    { name: 'ChatGPT', available: platformAvailability.chatgpt, icon: <ChatGPTIcon size={16} /> },
    { name: 'Gemini', available: platformAvailability.gemini, icon: <GeminiIcon size={16} /> },
    { name: 'Perplexity', available: platformAvailability.perplexity, icon: <PerplexityIcon size={16} /> },
    { name: 'Claude', available: platformAvailability.claude, icon: <ClaudeIcon size={16} /> }
  ];

  return (
    <DashboardCard
      title="LLM Presence"
      icon={<Globe className="w-4 h-4 text-black" />}
      headerAction={
        <div 
          className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:border-gray-400 transition-colors flex items-center justify-center"
          title="Which AI platforms recognize your brand"
        >
          <span className="text-xs text-gray-600 font-medium">i</span>
        </div>
      }
    >
      <div className="space-y-3">
        {platforms.map((platform, index) => (
          <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
              {platform.icon}
              <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                    </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium">Available</span>
                    </div>
                  </div>
        ))}
        
      </div>
    </DashboardCard>
  );
}

// Share of AI Voice Card
function ShareOfAIVoiceCard({ result }: { result: any }) {
  
  const computeShare = (analysisResult: any): number => {
    try {
      if (!analysisResult || !Array.isArray(analysisResult.competitors) || analysisResult.competitors.length === 0) return 0;

      const mainCompany = analysisResult.competitors.find((c: any) => c.name?.toLowerCase() === analysisResult.company?.toLowerCase())
        || analysisResult.competitors[0];
      if (!mainCompany) return 0;

      const getMentions = (c: any): number => {
        const m = (
          c?.keyMetrics?.gemini?.brandMentions ??
          c?.keyMetrics?.gemini?.mentionsCount ??
          c?.breakdowns?.gemini?.mentionsScore ??
          0
        ) as number;
        const num = Number(m);
        return isNaN(num) ? 0 : Math.max(0, num);
      };

      const main = getMentions(mainCompany);
      const total = (analysisResult.competitors || []).reduce((sum: number, c: any) => sum + getMentions(c), 0);
      if (total <= 0) return 0;
      return Math.round(((main / total) * 100) * 10) / 10;
    } catch {
      return 0;
    }
  };

  const sharePct = computeShare(result);
  return (
    <DashboardCard
      title="Share of AI Voice"
      icon={<PieChart className="w-4 h-4 text-black" />}
      headerAction={
        <div 
          className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:border-gray-400 transition-colors flex items-center justify-center"
          title="Measure your brand's share of voice across AI platforms"
        >
          <span className="text-xs text-gray-600 font-medium">i</span>
        </div>
      }
    >
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 mb-2">{sharePct}%</div>
        </div>
      </div>
      
    </DashboardCard>
  );
}

// LLM Presence Card
function LLMPresenceCard({ serviceStatus, aiScores }: { 
  serviceStatus: any, 
  aiScores?: any
}) {
  const llmServices = [
    { name: 'ChatGPT', key: 'chatgpt', icon: <ChatGPTIcon size={12} /> },
    { name: 'Gemini', key: 'gemini', icon: <GeminiIcon size={12} /> },
    { name: 'Perplexity', key: 'perplexity', icon: <PerplexityIcon size={12} /> },
    { name: 'Claude', key: 'claude', icon: <ClaudeIcon size={12} /> },
  ];

  const getLLMAvailability = () => {
    const availability: Record<string, boolean> = {
      chatgpt: false,
      gemini: false,
      perplexity: false,
      claude: false
    };

    if (aiScores) {
      availability.chatgpt = aiScores.chatgpt !== undefined && aiScores.chatgpt > 0;
      availability.gemini = aiScores.gemini !== undefined && aiScores.gemini > 0;
      availability.perplexity = aiScores.perplexity !== undefined && aiScores.perplexity > 0;
      availability.claude = aiScores.claude !== undefined && aiScores.claude > 0;
    }

    return availability;
  };

  const currentStatus = getLLMAvailability();

  return (
    <DashboardCard
      title="LLM Presence"
      icon={<Bot className="w-4 h-4 text-white" />}
      iconBgColor="bg-blue-500"
    >
      <div className="space-y-2">
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
                    <XCircle className="w-3 h-3" />
                    <span className="ml-1 text-sm">Not Available</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

// Competitor Score Card
function CompetitorBenchmarkCard({ competitors }: { competitors: any[] }) {
  
  const getBenchmarkStatus = (competitors: any[]) => {
    if (!competitors || competitors.length === 0) return { status: 'No Data', color: 'text-gray-500', score: 0 };

    const avgScore = competitors.reduce((sum, comp) => sum + (comp.totalScore || 0), 0) / competitors.length;
    const normalizedScore = avgScore > 10 ? avgScore : avgScore * 10;

    if (normalizedScore >= 80) return { status: 'Excellent', color: 'text-green-600', score: Math.round(normalizedScore) };
    if (normalizedScore >= 60) return { status: 'Good', color: 'text-blue-600', score: Math.round(normalizedScore) };
    if (normalizedScore >= 40) return { status: 'Fair', color: 'text-yellow-600', score: Math.round(normalizedScore) };
    return { status: 'Poor', color: 'text-red-600', score: Math.round(normalizedScore) };
  };

  const benchmark = getBenchmarkStatus(competitors);

  return (
    <DashboardCard
      title="Competitor Score"
      icon={<BarChartIcon className="w-4 h-4 text-black" />}
      headerAction={
        <div 
          className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:border-gray-400 transition-colors flex items-center justify-center"
          title="Compare your performance against industry competitors"
        >
          <span className="text-xs text-gray-600 font-medium">i</span>
        </div>
      }
    >
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className={`text-2xl font-bold ${benchmark.color} mb-2`}>
            {benchmark.status}
          </div>
          <div className="text-base font-semibold text-gray-700">
            Score: {benchmark.score}/100
          </div>
        </div>
      </div>
      
    </DashboardCard>
  );
}

// Brand Sentiment Analysis Card with AI + Social + Reviews
function SentimentAnalysisCard({ competitors, result }: { competitors: any[]; result?: any }) {
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState<'week' | 'month'>('week');
  const [trendData, setTrendData] = useState<any>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Get main company data
  const mainCompany = result?.competitors?.find((comp: any) => 
    comp.name?.toLowerCase() === result.company?.toLowerCase()
  ) || result?.competitors?.[0];

  // Calculate multi-source sentiment (AI + Social + Reviews)
  const calculateMultiSourceSentiment = () => {
    if (!competitors || competitors.length === 0) {
      return { 
        positive: 0, 
        neutral: 0, 
        negative: 0,
        aiSentiment: { positive: 0, neutral: 0, negative: 0 },
        socialSentiment: { positive: 0, neutral: 0, negative: 0 },
        reviewSentiment: { positive: 0, neutral: 0, negative: 0 }
      };
    }

    let totalMentions = 0;
    let positiveMentions = 0;
    let neutralMentions = 0;
    let negativeMentions = 0;

    // AI Sentiment (from AI platforms)
    let aiPositive = 0, aiNeutral = 0, aiNegative = 0;
    // Social Sentiment (simulated from social media mentions)
    let socialPositive = 0, socialNeutral = 0, socialNegative = 0;
    // Review Sentiment (simulated from review platforms)
    let reviewPositive = 0, reviewNeutral = 0, reviewNegative = 0;

    competitors.forEach((competitor: any) => {
      const breakdowns = competitor.breakdowns || {};
      const keyMetrics = competitor.keyMetrics || {};
      
      // AI Platform Sentiment
      ['chatgpt', 'gemini', 'claude', 'perplexity'].forEach(platform => {
        const breakdown = breakdowns[platform] || {};
        const metrics = keyMetrics[platform] || {};
        
        const mentions = Number(breakdown.mentionsScore || metrics.brandMentions || 0);
        const sentiment = Number(breakdown.sentimentScore || metrics.sentimentScore || 0.5);
        
        totalMentions += mentions;
        
        if (sentiment < 0.3) {
          negativeMentions += mentions;
          aiNegative += mentions;
        } else if (sentiment > 0.7) {
          positiveMentions += mentions;
          aiPositive += mentions;
        } else {
          neutralMentions += mentions;
          aiNeutral += mentions;
        }
      });

      // Simulate Social Media Sentiment (based on AI sentiment with variation)
      const socialVariation = 0.1;
      const socialPositive = Math.max(0, aiPositive * (0.8 + Math.random() * 0.4));
      const socialNegative = Math.max(0, aiNegative * (0.8 + Math.random() * 0.4));
      const socialNeutral = Math.max(0, aiNeutral * (0.8 + Math.random() * 0.4));

      // Simulate Review Platform Sentiment (typically more critical)
      const reviewPositive = Math.max(0, aiPositive * (0.6 + Math.random() * 0.3));
      const reviewNegative = Math.max(0, aiNegative * (1.2 + Math.random() * 0.4));
      const reviewNeutral = Math.max(0, aiNeutral * (0.7 + Math.random() * 0.3));
    });

    // Calculate percentages
    const calculatePercentages = (pos: number, neu: number, neg: number, total: number) => {
      if (total === 0) return { positive: 0, neutral: 0, negative: 0 };
      return {
        positive: Math.round((pos / total) * 100 * 100) / 100,
        neutral: Math.round((neu / total) * 100 * 100) / 100,
        negative: Math.round((neg / total) * 100 * 100) / 100
      };
    };

    const aiTotal = aiPositive + aiNeutral + aiNegative;
    const socialTotal = socialPositive + socialNeutral + socialNegative;
    const reviewTotal = reviewPositive + reviewNeutral + reviewNegative;

    return {
      positive: totalMentions > 0 ? Math.round((positiveMentions / totalMentions) * 100 * 100) / 100 : 0,
      neutral: totalMentions > 0 ? Math.round((neutralMentions / totalMentions) * 100 * 100) / 100 : 0,
      negative: totalMentions > 0 ? Math.round((negativeMentions / totalMentions) * 100 * 100) / 100 : 0,
      aiSentiment: calculatePercentages(aiPositive, aiNeutral, aiNegative, aiTotal),
      socialSentiment: calculatePercentages(socialPositive, socialNeutral, socialNegative, socialTotal),
      reviewSentiment: calculatePercentages(reviewPositive, reviewNeutral, reviewNegative, reviewTotal)
    };
  };

  const sentiment = calculateMultiSourceSentiment();
  const dominantSentiment = sentiment.neutral > sentiment.positive && sentiment.neutral > sentiment.negative ? 'Neutral' :
                           sentiment.positive > sentiment.negative ? 'Positive' : 'Negative';

  // Fetch trend data
  useEffect(() => {
    const fetchTrendData = async () => {
      if (!mainCompany?.name) return;
      
      setLoadingTrend(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/geo-engagement-growth/${encodeURIComponent(mainCompany.name)}?period=${timePeriod}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTrendData(data);
          }
        }
      } catch (error) {
        console.error('[BrandSentiment] Failed to fetch trend data:', error);
      } finally {
        setLoadingTrend(false);
      }
    };

    fetchTrendData();
  }, [mainCompany?.name, timePeriod]);

  // Calculate sentiment trend
  const calculateSentimentTrend = () => {
    if (!trendData?.growth?.geoTrend) return 0;
    // Use a portion of the overall trend as sentiment trend
    return trendData.growth.geoTrend * 0.3;
  };

  const sentimentTrend = calculateSentimentTrend();

  const getSentimentIcon = (type: string) => {
    switch (type) {
      case 'positive': return <Heart className="w-3 h-3 text-green-500" />;
      case 'negative': return <Frown className="w-3 h-3 text-red-500" />;
      default: return <Meh className="w-3 h-3 text-gray-500" />;
    }
  };

  const getSentimentColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Activity className="w-3 h-3 text-gray-500" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <DashboardCard
      title="Customer Sentiment"
      icon={<Heart className="w-4 h-4 text-black" />}
      headerAction={
        <button
          onClick={() => navigate('/product-insights')}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors"
        >
          View Details
        </button>
      }
    >
      {/* Overall Sentiment */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-green-600 mb-2">72%</div>
        <div className="text-sm text-[#475569]">Positive sentiment</div>
      </div>

      {/* Sentiment Breakdown */}
      <div className="space-y-3">
        {[
          { label: 'Positive', value: 72, color: 'bg-green-500' },
          { label: 'Neutral', value: 21, color: 'bg-gray-400' },
          { label: 'Negative', value: 7, color: 'bg-red-500' }
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#0F172A]">{label}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-sm text-[#475569] w-8 text-right">{value}%</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

// Top Performing SKUs Card
function TopProductsKpiCard({ result, setShowShopifyModal }: { result?: any; setShowShopifyModal?: (show: boolean) => void }) {
  const [shopifyProducts, setShopifyProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get main company data
  const mainCompany = result?.competitors?.find((comp: any) => 
    comp.name?.toLowerCase() === result.company?.toLowerCase()
  ) || result?.competitors?.[0];

  // Fetch Shopify products from connected stores
  const fetchShopifyProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get connected Shopify accounts from localStorage
      const connections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
      console.log('Fetching products for connections:', connections);
      
      if (connections.length === 0) {
        setError('No Shopify stores connected. Please connect a store to see real product data.');
        setLoading(false);
        return;
      }

      const allProducts: any[] = [];
      
      // Add timeout to prevent hanging
      const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs = 10000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);
      };
      
      // Fetch products from each connected store
      for (const connection of connections) {
        if (!connection.token) continue;
        
        try {
          console.log(`Fetching from shop: ${connection.shop}`);
          const productsQuery = `
            query getProducts($first: Int!) {
              products(first: $first) {
                edges {
                  node {
                    id
                    title
                    handle
                    description
                    images(first: 1) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                    variants(first: 1) {
                      edges {
                        node {
                          id
                          title
                          sku
                          price {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          `;

          const response = await fetchWithTimeout(`https://${connection.shop}/api/2023-10/graphql.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Storefront-Access-Token': connection.token,
            },
            body: JSON.stringify({ 
              query: productsQuery,
              variables: { first: 50 }
            }),
          }) as Response;

          if (!response.ok) {
            console.warn(`Failed to fetch products from ${connection.shop}: ${response.status}`);
            continue;
          }

          const data = await response.json();

          if (data.errors) {
            console.warn(`GraphQL error for ${connection.shop}:`, data.errors[0]?.message);
            continue;
          }

          const products = data.data?.products?.edges?.map((edge: any) => ({
            ...edge.node,
            shop: connection.shop
          })) || [];
          
          allProducts.push(...products);
        } catch (error) {
          console.warn(`Error fetching products from ${connection.shop}:`, error);
        }
      }

      setShopifyProducts(allProducts);
    } catch (error) {
      console.error('Error fetching Shopify products:', error);
      setError('Failed to fetch products from connected stores.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate performance metrics for real products
  const calculateProductMetrics = (products: any[]) => {
    if (!mainCompany || products.length === 0) {
      return [];
    }

    const aiScores = mainCompany.aiScores || {};
    const baseVisibility = Math.round((Number(aiScores.chatgpt || 0) + Number(aiScores.gemini || 0) + Number(aiScores.claude || 0) + Number(aiScores.perplexity || 0)) / 4 * 10);
    
    return products.map((product, index) => {
      const variant = product.variants?.edges?.[0]?.node;
      const price = parseFloat(variant?.price?.amount || '0');
      const currency = variant?.price?.currencyCode || 'USD';
      
      // Calculate realistic metrics based on product data
      const baseRevenue = price * (50 + Math.random() * 200); // Simulate sales volume
      const baseConversion = 1.5 + (Math.random() * 4); // 1.5-5.5% conversion
      const visibility = baseVisibility + (Math.random() * 30); // Add some variation
      
      return {
        id: variant?.sku || product.id,
        name: product.title,
        handle: product.handle,
        price: price,
        currency: currency,
        image: product.images?.edges?.[0]?.node?.url,
        shop: product.shop,
        revenue: Math.round(baseRevenue),
        conversion: Math.round(baseConversion * 100) / 100,
        visibility: Math.round(visibility),
        trend: Math.random() > 0.5 ? 'up' : 'down',
        trendValue: Math.round(Math.random() * 20 + 5) // 5-25% change
      };
    }).sort((a, b) => b.revenue - a.revenue); // Sort by revenue
  };

  // Fetch products on component mount
  useEffect(() => {
    fetchShopifyProducts();
  }, []);

  const topSKUs = calculateProductMetrics(shopifyProducts);
  const totalRevenue = topSKUs.reduce((sum, sku) => sum + sku.revenue, 0);
  const avgConversion = topSKUs.reduce((sum, sku) => sum + sku.conversion, 0) / (topSKUs.length || 1);
  const avgVisibility = topSKUs.reduce((sum, sku) => sum + sku.visibility, 0) / (topSKUs.length || 1);

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />;
  };

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Generate sample products for the image design
  const sampleProducts = [
    { name: "Wireless Headphones Pro", sku: "SKU-WH-001", authority: "High Authority", performance: 94 },
    { name: "Smart Watch Series X", sku: "SKU-SW-003", authority: "Medium Authority", performance: 89 },
    { name: "Gaming Keyboard RGB", sku: "SKU-KB-007", authority: "Mixed Sentiment", performance: 82 }
  ];

  // Check if Shopify store is connected
  const shopifyConnections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
  const hasShopifyConnection = shopifyConnections.length > 0;

  // Fetch products when component mounts or Shopify connection changes
  useEffect(() => {
    if (hasShopifyConnection && !loading) {
      console.log('Automatically fetching Shopify products');
      fetchShopifyProducts();
    }
  }, [hasShopifyConnection]);

  return (
    <DashboardCard
      title="Top Performing Products"
      icon={<Award className="w-4 h-4 text-black" />}
    >
      {hasShopifyConnection ? (
      <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="w-8 h-8 mx-auto animate-pulse" />
              </div>
              <p className="text-sm text-gray-600">Loading product data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">
                <AlertTriangle className="w-8 h-8 mx-auto" />
              </div>
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchShopifyProducts}
                className="mt-3 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : topSKUs.length > 0 ? (
            topSKUs.slice(0, 3).map((product, index) => (
              <div key={index} className="bg-gray-50 border border-gray-300 rounded-lg p-4 group hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-[#0F172A] text-sm mb-1">
                  {product.name}
                </div>
                    {/* Default revenue display, hidden on hover */}
                    <div className="text-xs text-[#475569] group-hover:opacity-0 group-hover:h-0 group-hover:overflow-hidden transition-all duration-200">
                      ${formatCurrency(product.revenue)}
                    </div>
                    {/* GID and revenue display on hover */}
                    <div className="text-xs text-gray-400 mt-1 opacity-0 h-0 overflow-hidden group-hover:opacity-100 group-hover:h-auto group-hover:flex group-hover:items-baseline transition-all duration-200">
                      <span>{product.id}</span>
                      <span className="text-[#475569] ml-2">${formatCurrency(product.revenue)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">
                      {product.visibility}%
                </div>
              </div>
            </div>
          </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Package className="w-8 h-8 mx-auto" />
      </div>
              <p className="text-sm text-gray-600">No products found in your store</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="mb-4">
            <Package className="w-12 h-12 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Connect Shopify Store
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            Connect your Shopify store to see top performing products and detailed analytics.
          </p>
          <button 
            onClick={() => setShowShopifyModal?.(true)}
            className="px-4 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Store
          </button>
        </div>
      )}
    </DashboardCard>
  );
}

// Growth Opportunities Card
function GrowthOpportunitiesCard({ result }: { result?: any }) {
  // Sample growth opportunities data
  const growthOpportunities = [
    { 
      name: "Fitness Tracker Lite", 
      description: "Strong category relevance • High potential", 
      growthPotential: 23 
    },
    { 
      name: "Bluetooth Speaker Mini", 
      description: "High search volume • Trending", 
      growthPotential: 31 
    },
    { 
      name: "USB-C Hub Pro", 
      description: "Trending category • Optimize content", 
      growthPotential: 18 
    }
  ];

  return (
    <DashboardCard
      title="Growth Opportunities"
      icon={<TrendingUp className="w-4 h-4 text-white" />}
      iconBgColor="bg-blue-500"
    >
      <div className="space-y-3">
        {growthOpportunities.map((opportunity, index) => (
          <div key={index} className="flex items-center justify-between p-3 border-l-4 border-blue-500 bg-blue-50/30">
            <div className="flex-1">
              <div className="font-semibold text-[#0F172A] text-sm mb-1">
                {opportunity.name}
              </div>
              <div className="text-xs text-[#475569]">
                {opportunity.description}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-blue-600">
                {opportunity.growthPotential}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

// Product Visibility Index Card
function ProductVisibilityIndexCard({ result }: { result?: any }) {
  const [viewMode, setViewMode] = useState<'overview' | 'breakdown'>('overview');

  // Get main company data
  const mainCompany = result?.competitors?.find((comp: any) => 
    comp.name?.toLowerCase() === result.company?.toLowerCase()
  ) || result?.competitors?.[0];

  // Calculate product visibility metrics
  const calculateProductVisibility = () => {
    if (!mainCompany) {
      return {
        totalSkus: 0,
        visibleInAi: 0,
        visibleInSearch: 0,
        visibleInSite: 0,
        overallVisibility: 0,
        breakdown: {
          chatgpt: 0,
          gemini: 0,
          claude: 0,
          perplexity: 0,
          organicSearch: 0,
          siteSearch: 0
        }
      };
    }

    // Simulate SKU data based on AI visibility scores
    const aiScores = mainCompany.aiScores || {};
    const keyMetrics = mainCompany.keyMetrics || {};
    
    const totalSkus = 100; // Simulated total SKU count
    
    // AI Platform Visibility
    const chatgptVisible = Math.round((Number(aiScores.chatgpt || 0) * 10));
    const geminiVisible = Math.round((Number(aiScores.gemini || 0) * 10));
    const claudeVisible = Math.round((Number(aiScores.claude || 0) * 10));
    const perplexityVisible = Math.round((Number(aiScores.perplexity || 0) * 10));
    
    const visibleInAi = Math.min(totalSkus, Math.round((chatgptVisible + geminiVisible + claudeVisible + perplexityVisible) / 4));
    
    // Search Visibility (simulated)
    const organicSearchVisible = Math.round(visibleInAi * 1.2); // Typically higher in traditional search
    
    // Site Search Visibility (simulated)
    const siteSearchVisible = Math.min(totalSkus, Math.round(totalSkus * 0.85)); // Most SKUs visible in site search
    
    const visibleInSearch = Math.min(totalSkus, organicSearchVisible);
    const visibleInSite = siteSearchVisible;
    
    // Overall visibility percentage
    const overallVisibility = Math.round(
      ((visibleInAi / totalSkus) * 0.4 + 
       (visibleInSearch / totalSkus) * 0.3 + 
       (visibleInSite / totalSkus) * 0.3) * 100
    );

    return {
      totalSkus,
      visibleInAi,
      visibleInSearch,
      visibleInSite,
      overallVisibility,
      breakdown: {
        chatgpt: chatgptVisible,
        gemini: geminiVisible,
        claude: claudeVisible,
        perplexity: perplexityVisible,
        organicSearch: organicSearchVisible,
        siteSearch: siteSearchVisible
      }
    };
  };

  const visibility = calculateProductVisibility();

  const getVisibilityColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <DashboardCard
      title="Product Visibility Index"
      icon={<Package className="w-4 h-4 text-white" />}
      iconBgColor="bg-indigo-500"
    >
      <div className="space-y-3">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <p className="text-xs text-gray-600">
            Track how well products are surfaced across platforms
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'overview'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('breakdown')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'breakdown'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Breakdown
            </button>
          </div>
        </div>

        {viewMode === 'overview' ? (
          <div className="space-y-3">
            {/* Overall Visibility Score */}
            <div className="text-center pb-4 border-b border-gray-200">
              <div className={`text-5xl font-bold ${getVisibilityColor(visibility.overallVisibility)} mb-2`}>
                {visibility.overallVisibility}%
              </div>
              <div className="text-sm text-gray-600 mb-1">
                Overall Product Discoverability
              </div>
              <div className="text-xs text-gray-500">
                {visibility.totalSkus} SKUs tracked
              </div>
            </div>

            {/* Platform Categories */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Visibility by Platform Type
              </h4>
              
              {[
                { 
                  label: 'AI Platforms', 
                  value: visibility.visibleInAi, 
                  total: visibility.totalSkus, 
                  color: 'bg-purple-500'
                },
                { 
                  label: 'Search Engines', 
                  value: visibility.visibleInSearch, 
                  total: visibility.totalSkus, 
                  color: 'bg-blue-500'
                },
                { 
                  label: 'Site Search', 
                  value: visibility.visibleInSite, 
                  total: visibility.totalSkus, 
                  color: 'bg-green-500'
                }
              ].map(({ label, value, total, color }) => {
                const percentage = Math.round((value / total) * 100);
                return (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`}></div>
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {value}/{total} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Detailed Platform Breakdown
            </h4>
            
            {/* AI Platforms */}
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-purple-700">AI Platforms</h5>
              {[
                { name: 'ChatGPT', value: visibility.breakdown.chatgpt },
                { name: 'Gemini', value: visibility.breakdown.gemini },
                { name: 'Claude', value: visibility.breakdown.claude },
                { name: 'Perplexity', value: visibility.breakdown.perplexity }
              ].map(({ name, value }) => {
                const percentage = Math.round((value / visibility.totalSkus) * 100);
                return (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-700">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{value} SKUs</span>
                      <span className="text-xs text-gray-500">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Search Platforms */}
            <div className="space-y-2 pt-3 border-t border-gray-200">
              <h5 className="text-xs font-semibold text-blue-700">Search Platforms</h5>
              {[
                { name: 'Organic Search', value: visibility.breakdown.organicSearch },
                { name: 'Site Search', value: visibility.breakdown.siteSearch }
              ].map(({ name, value }) => {
                const percentage = Math.round((value / visibility.totalSkus) * 100);
                return (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{value} SKUs</span>
                      <span className="text-xs text-gray-500">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-indigo-500" />
            <p>
              <span className="font-semibold">Product-level discoverability score</span> tracks the percentage of SKUs visible across AI platforms, search engines, and internal site search.
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

// Low Visibility / High Potential SKUs Card
function LowVisibilityHighPotentialCard({ result }: { result?: any }) {
  const [viewMode, setViewMode] = useState<'gap' | 'recommendations'>('gap');

  // Get main company data
  const mainCompany = result?.competitors?.find((comp: any) => 
    comp.name?.toLowerCase() === result.company?.toLowerCase()
  ) || result?.competitors?.[0];

  // Generate low visibility / high potential SKUs data
  const generateLowVisibilitySKUs = () => {
    if (!mainCompany) {
      return [];
    }

    const aiScores = mainCompany.aiScores || {};
    const baseVisibility = Math.round((Number(aiScores.chatgpt || 0) + Number(aiScores.gemini || 0) + Number(aiScores.claude || 0) + Number(aiScores.perplexity || 0)) / 4 * 10);
    
    // Generate 6 low visibility / high potential SKUs
    const skuNames = [
      'Eco-Friendly Water Bottle',
      'Wireless Phone Charger',
      'Ergonomic Laptop Stand',
      'Bluetooth Car Adapter',
      'Portable Power Bank',
      'Smart Home Hub'
    ];

    return skuNames.map((name, index) => {
      // Simulate traffic vs conversion gap
      const traffic = 80 + (Math.random() * 20); // High traffic (80-100%)
      const conversion = 0.5 + (Math.random() * 1.5); // Low conversion (0.5-2%)
      const visibility = Math.max(10, baseVisibility - (Math.random() * 30)); // Low visibility
      const potential = Math.round((traffic - conversion * 10) * 2); // High potential score
      
      // Determine improvement recommendations
      const recommendations = [];
      if (conversion < 1) recommendations.push('Pricing');
      if (visibility < 30) recommendations.push('SEO');
      if (traffic > 90 && conversion < 1.5) recommendations.push('Content');
      
      return {
        id: `SKU-LV-${index + 1}`,
        name,
        traffic: Math.round(traffic),
        conversion: Math.round(conversion * 100) / 100,
        visibility: Math.round(visibility),
        potential: Math.round(potential),
        gap: Math.round(traffic - conversion * 10),
        recommendations,
        trend: Math.random() > 0.3 ? 'up' : 'down',
        trendValue: Math.round(Math.random() * 20 + 5)
      };
    }).sort((a, b) => b.potential - a.potential); // Sort by potential
  };

  const lowVisibilitySKUs = generateLowVisibilitySKUs();
  const avgGap = lowVisibilitySKUs.reduce((sum, sku) => sum + sku.gap, 0) / (lowVisibilitySKUs.length || 1);
  const totalPotential = lowVisibilitySKUs.reduce((sum, sku) => sum + sku.potential, 0);

  const getGapColor = (gap: number) => {
    if (gap >= 70) return 'text-red-600';
    if (gap >= 50) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getPotentialColor = (potential: number) => {
    if (potential >= 150) return 'text-green-600';
    if (potential >= 100) return 'text-blue-600';
    return 'text-purple-600';
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'SEO': return '';
      case 'Content': return '';
      case 'Pricing': return '';
      default: return '';
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />;
  };

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <DashboardCard
      title="Low Visibility / High Potential SKUs"
      icon={<Lightbulb className="w-4 h-4 text-white" />}
      iconBgColor="bg-yellow-500"
    >
      <div className="space-y-3">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <p className="text-xs text-gray-600">
            Products with strong interest but weak sales
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('gap')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'gap'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Gap Analysis
            </button>
            <button
              onClick={() => setViewMode('recommendations')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'recommendations'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Recommendations
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              <span className="text-lg font-bold text-gray-900">{avgGap.toFixed(0)}</span>
            </div>
            <div className="text-xs text-gray-500">Avg Gap</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-3 h-3 text-green-500" />
              <span className="text-lg font-bold text-gray-900">{totalPotential}</span>
            </div>
            <div className="text-xs text-gray-500">Total Potential</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Lightbulb className="w-3 h-3 text-yellow-500" />
              <span className="text-lg font-bold text-gray-900">{lowVisibilitySKUs.length}</span>
            </div>
            <div className="text-xs text-gray-500">SKUs</div>
          </div>
        </div>

        {viewMode === 'gap' ? (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Traffic vs. Conversion Gap
            </h4>
            
            {lowVisibilitySKUs.slice(0, 5).map((sku, index) => (
              <div key={sku.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-600">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {sku.name}
                    </div>
                    <div className="text-xs text-gray-500">{sku.id}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{sku.traffic}%</div>
                    <div className="text-xs text-gray-500">Traffic</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{sku.conversion}%</div>
                    <div className="text-xs text-gray-500">Conversion</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${getGapColor(sku.gap)}`}>
                      {sku.gap}
                    </div>
                    <div className="text-xs text-gray-500">Gap</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Improvement Recommendations
            </h4>
            
            {lowVisibilitySKUs.slice(0, 5).map((sku, index) => (
              <div key={sku.id} className="p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-yellow-600">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {sku.name}
                      </div>
                      <div className="text-xs text-gray-500">{sku.id}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-semibold ${getPotentialColor(sku.potential)}`}>
                      {sku.potential}
                    </div>
                    <div className="text-xs text-gray-500">Potential</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {sku.recommendations.map((rec, recIndex) => (
                    <span
                      key={recIndex}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white rounded-full text-gray-700 border border-yellow-200"
                    >
                      <span>{getRecommendationIcon(rec)}</span>
                      {rec}
                    </span>
                  ))}
                </div>
                
                <div className="mt-2 flex items-center gap-1 text-xs">
                  {getTrendIcon(sku.trend)}
                  <span className={getTrendColor(sku.trend)}>
                    {sku.trendValue}% potential growth
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-yellow-500" />
            <p>
              <span className="font-semibold">Focus on SEO, content, or pricing improvements</span> to convert high traffic into sales for these underperforming products.
            </p>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            Gap = Traffic % - (Conversion %  10). Higher gap indicates more optimization opportunity.
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}


// Modal Components
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Shopify Connect Modal
interface ShopifyConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

function ShopifyConnectModal({ isOpen, onClose, onSuccess }: ShopifyConnectModalProps) {
  const [mode, setMode] = useState<'oauth' | 'public' | 'storefront' | 'byo'>('storefront');
  const [shopDomain, setShopDomain] = useState('');
  const [connecting, setConnecting] = useState(false);
  // BYO creds
  const [creds, setCreds] = useState({ name: '', apiKey: '', apiSecret: '', redirectUri: '' });
  const [credsList, setCredsList] = useState<any[]>([]);
  const [credsId, setCredsId] = useState('');
  // Storefront
  const [sfToken, setSfToken] = useState('');
  const [sfSaving, setSfSaving] = useState(false);
  const [sfSavedMsg, setSfSavedMsg] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [authIssue, setAuthIssue] = useState<boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(false);

  const reload = async () => {
    let apiWorking = false;
    let hasAuthIssue = false;
    
    // Load connections from localStorage first (for client-side connections)
    try {
      const localConnections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
      setConnections(localConnections);
    } catch (error) {
      console.warn('[Shopify Modal] Failed to load local connections:', error);
    }
    
    // Try to load from backend API
    try {
      const c = await apiService.listShopifyConnections();
      setConnections(prev => [...prev, ...(c?.shops || [])]);
      apiWorking = true;
    } catch (error: any) {
      console.warn('[Shopify Modal] Failed to load connections from API:', error);
      
      // Check if it's an auth error
      if (error?.message?.includes('Session expired') || error?.message?.includes('Invalid token')) {
        console.log('[Shopify Modal] Authentication issue detected');
        hasAuthIssue = true;
      }
    }
    
    try {
      const cl = await apiService.listShopifyCreds();
      setCredsList(cl?.items || []);
      apiWorking = true;
    } catch (error: any) {
      console.warn('[Shopify Modal] Failed to load credentials:', error);
      setCredsList([]);
      
      // Check if it's an auth error
      if (error?.message?.includes('Session expired') || error?.message?.includes('Invalid token')) {
        console.log('[Shopify Modal] Authentication issue detected');
        hasAuthIssue = true;
      }
    }
    
    setAuthIssue(hasAuthIssue);
    setApiAvailable(apiWorking);
  };

  React.useEffect(() => { 
    if (isOpen) {
      reload(); 
    }
  }, [isOpen]);

  const toDomain = (raw: string) => {
    let s = (raw || '').trim().toLowerCase();
    // strip protocol and path
    s = s.replace(/^https?:\/\//, '').replace(/\/.*/, '');
    // fix accidental 'shopify.com.myshopify.com'
    s = s.replace('shopify.com.myshopify.com', 'myshopify.com');
    // convert 'sub.shopify.com' -> 'sub.myshopify.com'
    if (s.endsWith('.shopify.com') && !s.endsWith('.myshopify.com')) {
      s = s.replace(/\.shopify\.com$/, '.myshopify.com');
    }
    // append if only subdomain provided
    if (!s.endsWith('.myshopify.com')) {
      if (!s.includes('.')) s = `${s}.myshopify.com`;
    }
    return s;
  };

  const startConnectOAuth = () => {
    if (!shopDomain) return;
    setConnecting(true);
    
    // Development mode simulation
    if (devMode) {
      setTimeout(() => {
        const domain = toDomain(shopDomain.trim());
        const mockConnection = { shop: domain, type: 'oauth' };
        setConnections(prev => [...prev.filter(c => c.shop !== mockConnection.shop), mockConnection]);
        setConnecting(false);
        alert(`✅ Development Mode: OAuth connection to ${domain} simulated successfully!`);
      }, 2000);
      return;
    }

    // Real OAuth flow
    const domain = toDomain(shopDomain.trim());
    const base = credsId ? apiService.getShopifyAuthStartUrlWithCreds(domain, credsId) : apiService.getShopifyAuthStartUrl(domain);
    const accessToken = localStorage.getItem('accessToken') || '';
    if (!accessToken) { setConnecting(false); return; }
    const url = `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(accessToken)}`;
    // Open OAuth in a popup so the main app stays in place
    const w = 640, h = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open(url, 'shopify_oauth', `width=${w},height=${h},left=${left},top=${top}`);
    const handler = (ev: MessageEvent) => {
      if (!ev?.data || typeof ev.data !== 'object') return;
      if ((ev as any).data.type === 'SHOPIFY_CONNECTED') {
        // Reload connections list
        reload();
        window.removeEventListener('message', handler);
        try { popup?.close(); } catch {}
        setConnecting(false);
        // Auto-close modal after successful connection
        setTimeout(() => onClose(), 1000);
      } else if ((ev as any).data.type === 'SHOPIFY_CONNECT_ERROR') {
        window.removeEventListener('message', handler);
        try { popup?.close(); } catch {}
        setConnecting(false);
      }
    };
    window.addEventListener('message', handler);
  };

  const saveCreds = async () => {
    if (!creds.apiKey || !creds.apiSecret) return;
    
    // Development mode simulation
    if (devMode) {
      const mockCred = { 
        id: Date.now().toString(), 
        name: creds.name || 'Dev Credentials', 
        apiKey: creds.apiKey.substring(0, 6) + '***' 
      };
      setCredsList(prev => [...prev, mockCred]);
      setCreds({ name: '', apiKey: '', apiSecret: '', redirectUri: '' });
      alert('✅ Development Mode: Credentials saved successfully (simulated)!');
      return;
    }

    // Real API call
    try {
      await apiService.createShopifyCreds(creds);
      setCreds({ name: '', apiKey: '', apiSecret: '', redirectUri: '' });
      await reload();
      alert('Credentials saved successfully!');
    } catch (error) {
      console.error('[Shopify Modal] Failed to save credentials:', error);
      alert('Failed to save credentials. Please check if the Shopify API is available.');
    }
  };

  const connectStorefront = async () => {
    if (!shopDomain || !sfToken) return;
    setSfSaving(true); setSfSavedMsg(null);
    
    // Development mode simulation
    if (devMode) {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSfToken('');
        setSfSavedMsg('✅ Development Mode: Storefront token simulated successfully! (Backend API not required)');
        // Add to mock connections
        const mockConnection = { shop: toDomain(shopDomain.trim()), type: 'storefront' };
        setConnections(prev => [...prev.filter(c => c.shop !== mockConnection.shop), mockConnection]);
      } catch (e) {
        setSfSavedMsg('Development mode simulation failed.');
      } finally { setSfSaving(false); }
      return;
    }

    // Direct Shopify Storefront API connection (client-side)
    try {
      const domain = toDomain(shopDomain.trim());
      const token = sfToken.trim();
      
      // Test the connection by fetching shop info
      const testQuery = `
        query {
          shop {
            name
            description
            primaryDomain {
              host
            }
          }
        }
      `;
      
      const response = await fetch(`https://${domain}/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': token,
        },
        body: JSON.stringify({ query: testQuery }),
      });
      
      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`Shopify GraphQL error: ${data.errors[0]?.message || 'Unknown error'}`);
      }
      
      if (!data.data?.shop) {
        throw new Error('Invalid response from Shopify API');
      }
      
      // Success! Store the connection locally (only one store allowed)
      const connection = { 
        shop: domain, 
        type: 'storefront', 
        token: token,
        shopName: data.data.shop.name,
        connected: true
      };
      
      // Store only this connection (replace any existing connections)
      localStorage.setItem('shopify_connections', JSON.stringify([connection]));
      
      setConnections([connection]);
      setSfToken('');
      
      // Auto-close modal after successful connection
      setTimeout(() => {
        onClose();
        // Show success notification after modal closes
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(`✅ Successfully connected to ${data.data.shop.name}! Starting website analysis...`);
          }, 100);
        }
      }, 1000);
      
    } catch (e: any) {
      console.error('[Shopify Modal] Failed to connect storefront:', e);
      if (e?.message?.includes('401') || e?.message?.includes('Unauthorized')) {
        setSfSavedMsg('❌ Invalid storefront access token. Please check your token and try again.');
      } else if (e?.message?.includes('404') || e?.message?.includes('Not Found')) {
        setSfSavedMsg('❌ Shop not found. Please check your shop domain and try again.');
      } else if (e?.message?.includes('CORS')) {
        setSfSavedMsg('❌ CORS error. This may require backend proxy for production use.');
      } else {
        setSfSavedMsg(`❌ Connection failed: ${e?.message || 'Unknown error'}`);
      }
    } finally { setSfSaving(false); }
  };

  const disconnect = async (shop: string) => {
    // Development mode simulation
    if (devMode) {
      setConnections(prev => prev.filter(c => c.shop !== shop));
      alert(`✅ Development Mode: Successfully disconnected from ${shop} (simulated)`);
      return;
    }

    // Remove from localStorage (client-side connections)
    try {
      const existingConnections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
      const updatedConnections = existingConnections.filter((c: any) => c.shop !== shop);
      localStorage.setItem('shopify_connections', JSON.stringify(updatedConnections));
      setConnections(updatedConnections);
      alert(`Successfully disconnected from ${shop}`);
    } catch (localError) {
      console.warn('[Shopify Modal] Failed to remove local connection:', localError);
    }

    // Also try to remove from backend API if available
    try {
      await apiService.disconnectShopify(shop);
    } catch (error) {
      console.warn('[Shopify Modal] Failed to disconnect from API (this is expected if backend is not available):', error);
    }
  };

  const fetchProducts = async (shop: string) => {
    const connection = connections.find(c => c.shop === shop && c.token);
    if (!connection || !connection.token) {
      alert('❌ No storefront token found for this shop. Please reconnect with a valid token.');
      return;
    }

    try {
      const productsQuery = `
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                description
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch(`https://${shop}/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': connection.token,
        },
        body: JSON.stringify({ 
          query: productsQuery,
          variables: { first: 10 }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0]?.message || 'Unknown error'}`);
      }

      const products = data.data?.products?.edges?.map((edge: any) => edge.node) || [];
      
      // Display products in a simple format
      if (products.length === 0) {
        alert('✅ Connection successful! No products found in this store.');
      } else {
        const productList = products.map((p: any) => 
          `• ${p.title} - ${p.variants.edges[0]?.node?.price?.amount || 'N/A'} ${p.variants.edges[0]?.node?.price?.currencyCode || ''}`
        ).join('\n');
        
        alert(`✅ Successfully fetched ${products.length} products from ${connection.shopName || shop}:\n\n${productList}`);
      }

    } catch (error: any) {
      console.error('[Shopify Modal] Failed to fetch products:', error);
      alert(`❌ Failed to fetch products: ${error.message}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Shopify Integration
          </h3>
          
          <p className="text-gray-600">
            Connect your Shopify store to import products and analyze performance.
          </p>

        </div>

        <div className="space-y-6">

          {/* OAuth / BYO */}
          {(mode === 'oauth' || mode === 'byo') && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Shop Domain</label>
                <input 
                  value={shopDomain} 
                  onChange={e => setShopDomain(e.target.value)} 
                  placeholder="your-shop.myshopify.com" 
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              {mode === 'byo' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input 
                      value={creds.name} 
                      onChange={e => setCreds({ ...creds, name: e.target.value })} 
                      placeholder="Credentials name" 
                      className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                    <input 
                      value={creds.redirectUri} 
                      onChange={e => setCreds({ ...creds, redirectUri: e.target.value })} 
                      placeholder="Redirect URI (optional)" 
                      className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                    <input 
                      value={creds.apiKey} 
                      onChange={e => setCreds({ ...creds, apiKey: e.target.value })} 
                      placeholder="API Key" 
                      className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                    <input 
                      value={creds.apiSecret} 
                      onChange={e => setCreds({ ...creds, apiSecret: e.target.value })} 
                      placeholder="API Secret" 
                      className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={saveCreds} 
                      className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                    >
                      Save Credentials
                    </button>
                    <select 
                      value={credsId} 
                      onChange={e => setCredsId(e.target.value)} 
                      className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select saved credentials</option>
                      {credsList.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.id.slice(0,6)})</option>))}
                    </select>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button 
                  onClick={startConnectOAuth} 
                  disabled={!shopDomain || connecting} 
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {connecting ? 'Redirecting...' : 'Connect Shopify'}
                </button>
              </div>
              <p className="text-xs text-gray-600">You will be redirected to Shopify to approve read scopes.</p>
            </div>
          )}

          {/* Public */}
          {mode === 'public' && (
            <div className="space-y-2 text-sm text-gray-700">
              <p>Public mode doesn't require admin access. Use a product URL or shop+handle in analysis to fetch public JSON.</p>
              <p>Example: https://your-shop.myshopify.com/products/handle</p>
            </div>
          )}

          {/* Storefront */}
          {mode === 'storefront' && (
            <div className="space-y-2">
              <div className="space-y-2">
                <input 
                  value={shopDomain} 
                  onChange={e => setShopDomain(e.target.value)} 
                  placeholder="your-shop.myshopify.com" 
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
                <input 
                  value={sfToken} 
                  onChange={e => setSfToken(e.target.value)} 
                  placeholder="Storefront access token" 
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={connectStorefront} 
                  disabled={sfSaving || !shopDomain || !sfToken} 
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {sfSaving ? 'Saving…' : 'Save Storefront Token'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
}

// CSV Upload Modal
interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CSVUploadModal({ isOpen, onClose }: CSVUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setIsUploading(true);
    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`Successfully uploaded ${selectedFile.name}!`);
      onClose();
      setSelectedFile(null);
    } catch (error) {
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create comprehensive CSV template based on the provided format
    const csvContent = 'SKU,Product Name,URL,Category,Price,Brand,Description,Tags,Stock Status/Weight,Dimensions\n' +
      'ELEC-1001,Wireless Bluetooth Headphones,https://example.com/wireless-bluetooth-headphones,Electronics,79.99,SoundMax,"High-quality wireless headphones, bluetooth 5.0, noise cancelling, comfortable fit",headphones|wireless|bluetooth,In Stock|250g,20 x 18 x 5 cm\n' +
      'CLOT-2001,Men\'s Cotton T-Shirt,https://example.com/mens-cotton-tshirt,Clothing,19.99,ComfortWear,"100% cotton t-shirt, casual wear, soft fabric, regular fit",clothing|cotton|casual|men,In Stock|180g,30 x 25 x 2 cm\n' +
      'SPRT-3001,Yoga Mat with Carrying Strap,https://example.com/yoga-mat,Sports & Outdoors,29.99,FlexFit,"Eco-friendly, non-slip yoga mat, fitness, exercise, portable",yoga|fitness|exercise|eco,In Stock|1.2kg,180 x 60 x 0.6 cm\n' +
      'HOME-4001,Stainless Steel Cookware Set,https://example.com/cookware-set,Home & Garden,129.99,KitchenPro,"10-piece stainless steel cookware, stainless steel, durable, even heating",cookware|kitchen|stainless|durable,In Stock|7kg,60 x 40 x 30 cm\n' +
      'HOME-4002,Indoor Plant - Peace Lily,https://example.com/peace-lily,Home & Garden,24.99,GreenLife,"Low-maintenance indoor peace lily, indoor plants, air purifying, easy care",plants|indoor|peace lily|low maintenance,In Stock|1.5kg,40 x 20 x 20 cm';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_analysis_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-gray-600" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Upload CSV File
          </h3>
          
          <p className="text-gray-600 mb-6">
            Upload a CSV with columns: SKU, Product Name, URL, Category, Price, Brand, Description, Tags, Stock Status/Weight, Dimensions.
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
            isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-gray-600" />
          </div>
          
          <p className="text-gray-700 font-medium mb-2">
            {selectedFile ? selectedFile.name : 'Click to select or drag & drop'}
          </p>
          
          <p className="text-gray-500 text-sm">
            Max 10MB
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={isUploading || !selectedFile}
          className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mb-4"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload & Process'
          )}
        </button>

        <button
          onClick={downloadTemplate}
          className="w-full text-gray-600 hover:text-gray-700 font-medium py-2 transition-colors"
        >
          Download CSV template
        </button>
      </div>
    </Modal>
  );
}

// Manual Add Product Modal
interface ManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ManualAddModal({ isOpen, onClose }: ManualAddModalProps) {
  const [formData, setFormData] = useState({
    skuId: '',
    productName: '',
    productUrl: '',
    category: '',
    price: '',
    tags: ''
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddProduct = async () => {
    if (!formData.skuId.trim() || !formData.productName.trim() || !formData.productUrl.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsAdding(true);
    try {
      // Simulate adding product
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Successfully added product: ${formData.productName}!`);
      onClose();
      setFormData({
        skuId: '',
        productName: '',
        productUrl: '',
        category: '',
        price: '',
        tags: ''
      });
    } catch (error) {
      alert('Failed to add product');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddAnother = async () => {
    await handleAddProduct();
    if (!isAdding) {
      setFormData({
        skuId: '',
        productName: '',
        productUrl: '',
        category: '',
        price: '',
        tags: ''
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-blue-600" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900">
            Add Product Manually
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKU ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.skuId}
              onChange={(e) => handleInputChange('skuId', e.target.value)}
              placeholder="Enter SKU ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => handleInputChange('productName', e.target.value)}
              placeholder="Enter product name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.productUrl}
              onChange={(e) => handleInputChange('productUrl', e.target.value)}
              placeholder="https://example.com/product"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select category</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="home">Home & Garden</option>
              <option value="sports">Sports & Outdoors</option>
              <option value="books">Books</option>
              <option value="toys">Toys & Games</option>
              <option value="beauty">Beauty & Personal Care</option>
              <option value="automotive">Automotive</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags/Attributes
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="wireless, bluetooth, noise-canceling"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">Separate tags with commas</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleAddProduct}
            disabled={isAdding}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Product'
            )}
          </button>
          
          <button
            onClick={handleAddAnother}
            disabled={isAdding}
            className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            Add Another
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function Overview() {
  const { user } = useAuth();
  const stableUserId = user?.id || (user as any)?.email || (user as any)?.name || 'anonymous';
  const navigate = useNavigate();
  
  // Unified analysis state (restored from original)
  const [sessions] = useLocalStorage<SessionData[]>(SESSIONS_KEY, []);
  const [currentSession] = useLocalStorage<SessionData | null>(CURRENT_SESSION_KEY, null);
  
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
        return parsed.data || parsed;
      }
      return null;
    } catch { return null; }
  });
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Restore latest saved session via SessionManager (cross-page persistence)
  useEffect(() => {
    // Only restore if we don't already have MEANINGFUL analysis data
    const hasMeaningfulData = analysisResult && 
                               analysisResult.competitors && 
                               Array.isArray(analysisResult.competitors) && 
                               analysisResult.competitors.length > 0;
    
    if (hasMeaningfulData) {
      console.log('[Overview] Already have meaningful analysis data, skipping restoration');
      return;
    }
    
    try {
      const session = sessionManager.getLatestAnalysisSession('overview', stableUserId);
      if (session) {
        console.log('[Overview] Restoring cached analysis data:', session);
        console.log('[Overview] Session has competitors:', session.data?.competitors?.length || 0);
        if (session.inputValue) setInputValue(session.inputValue);
        if (session.inputType) setInputType((session.inputType as 'company' | 'url') || 'company');
        if (session.analysisType) setAnalysisType((session.analysisType as 'root-domain' | 'exact-url') || 'root-domain');
        if (session.data) {
          setAnalysisResult(session.data);
          console.log('[Overview] Analysis result set with', session.data?.competitors?.length || 0, 'competitors');
        }
        console.log('[Overview] Cached data restored successfully');
      } else {
        console.log('[Overview] No session found for user');
      }
    } catch (e) {
      console.error('[Overview] Failed to restore session:', e);
    }
  }, [stableUserId]);
  
  // Modal states
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [connectedShopifyAccounts, setConnectedShopifyAccounts] = useState<any[]>([]);
  const [fetchedProducts, setFetchedProducts] = useState<any[]>([]);
  const [showProducts, setShowProducts] = useState(false);
  const [showConnectionSuccess, setShowConnectionSuccess] = useState(false);
  const [connectionSuccessMessage, setConnectionSuccessMessage] = useState('');

  // Load connected Shopify accounts on component mount
  React.useEffect(() => {
    const loadConnectedAccounts = () => {
      try {
        const localConnections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
        setConnectedShopifyAccounts(localConnections);
      } catch (error) {
        console.warn('Failed to load connected Shopify accounts:', error);
      }
    };

    loadConnectedAccounts();
    
    // Listen for storage changes to update connected accounts
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'shopify_connections') {
        loadConnectedAccounts();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper functions (restored from original)
  const mapIndustryLabel = (raw?: string): string => {
    const s = String(raw || '').toLowerCase();
    if (/tech|software|it|saas|cloud/.test(s)) return 'Information Technology & Services';
    if (/bank|financ|fintech|invest|payment|insur/.test(s)) return 'Finance';
    if (/health|medic|pharma|bio|clinic|care/.test(s)) return 'Healthcare';
    if (/legal|law|attorney|compliance/.test(s)) return 'Legal';
    if (/e-?commerce|commerce|retail|shop|store|magento|shopify|woocommerce/.test(s)) return 'Ecommerce & Retail';
    if (/media|news|content|video|stream/.test(s)) return 'Media';
    if (/edu|school|college|university|learning|edtech/.test(s)) return 'Education';
    return 'Others';
  };

  const detectUrlType = (url: string): 'root-domain' | 'exact-url' => {
    try {
      let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      const urlParts = cleanUrl.split('/');
      
      if (urlParts.length === 1 || (urlParts.length > 1 && urlParts[1].trim() === '')) {
        return 'root-domain';
      } else {
        return 'exact-url';
      }
    } catch (error) {
      console.error('Error detecting URL type:', error);
      return 'root-domain';
    }
  };

  const extractCompanyFromUrl = (url: string): string => {
    try {
      let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      domain = domain.split('/')[0].split('?')[0].split('#')[0];
      
      const domainParts = domain.split('.');
      
      // Special handling for Shopify stores (e.g., kabinidevstore.myshopify.com)
      if (domainParts.length >= 3 && domainParts[domainParts.length - 2] === 'myshopify') {
        return domainParts[0]; // Return "kabinidevstore" for "kabinidevstore.myshopify.com"
      }
      
      // For other domains, use the standard logic
      if (domainParts.length >= 2) {
        return domainParts[domainParts.length - 2];
      }
      
      return domain;
    } catch (error) {
      console.error('Error extracting company from URL:', error);
      return url;
    }
  };

  const detectIndustry = (companyName: string, url?: string): string => {
    const name = companyName.toLowerCase();
    const urlLower = (url || '').toLowerCase();
    
    // Check for Shopify stores
    if (urlLower.includes('myshopify.com') || urlLower.includes('shopify')) {
      return 'E-commerce & Retail';
    }
    
    if (name.includes('cloud') && (name.includes('migration') || name.includes('migrate') || name.includes('transform'))) {
      return 'Cloud Migration & Transformation';
    }
    
    if (name.includes('cloud') || name.includes('aws') || name.includes('azure') || name.includes('gcp')) {
      return 'Cloud Computing & DevOps';
    }
    
    if (name.includes('ai') || name.includes('artificial intelligence') || name.includes('machine learning')) {
      return 'Artificial Intelligence & ML';
    }
    
    return 'Business Services';
  };

  // Full Analysis Function (restored from original)
  const startAnalysis = async () => {
    if (!inputValue.trim()) {
      setAnalysisError('Please enter a company name or URL to analyze.');
      return;
    }
    
    let finalCompanyName = inputValue.trim();
    let detectedInputType: 'company' | 'url' = 'company';
    
    if (inputValue.includes('http://') || inputValue.includes('https://') || inputValue.includes('www.')) {
      finalCompanyName = extractCompanyFromUrl(inputValue);
      detectedInputType = 'url';
    }
    
    const autoIndustry = detectIndustry(finalCompanyName, inputValue);
    const detectedIndustry = mapIndustryLabel(autoIndustry);
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setShowSuccessMessage(false);
    
    try {
      const abortController = new AbortController();
      setAbortController(abortController);
      
      const analysisResults = await apiService.getAIVisibilityAnalysis(
        finalCompanyName,
        detectedIndustry,
        { signal: abortController.signal }
      );
      
      if (analysisResults.success && analysisResults.data) {
        const enhancedResult = {
          ...analysisResults.data,
          industry: detectedIndustry,
          originalInput: inputValue,
          inputType: detectedInputType,
          analysisType: analysisType
        };
        
        setAnalysisResult(enhancedResult);
        setShowSuccessMessage(true);
        
        // Save to history and cache
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
              serviceStatus: analysisResults.data.serviceStatus || {},
              summary: {
                totalCompetitors: competitors.length,
                averageVisibilityScore: competitors.reduce((sum: number, comp: any) => sum + (comp.mentions || 0), 0) / Math.max(competitors.length, 1),
                topCompetitor: competitors.length > 0 ? competitors.reduce((top: any, comp: any) => 
                  (comp.mentions || 0) > (top.mentions || 0) ? comp : top
                ).name : 'None'
              }
            }
          };
          
          await historyService.addHistoryItem(historyItem);
          window.dispatchEvent(new CustomEvent('new-analysis-created', { 
            detail: { type: 'ai-visibility', timestamp: new Date().toISOString() } 
          }));
          
          localStorage.setItem('overview_market_analysis', JSON.stringify({
            company: finalCompanyName,
            originalInput: inputValue,
            inputType: detectedInputType,
            industry: detectedIndustry,
            analysisType: analysisType,
            data: enhancedResult,
            timestamp: Date.now()
          }));
          // Persist using SessionManager for cross-page restore
          try {
            sessionManager.saveAnalysisSession(
              'overview',
              enhancedResult,
              inputValue,
              analysisType,
              detectedInputType,
              detectedIndustry,
              stableUserId
            );
          } catch (err) {
            console.warn('[Overview] SessionManager save failed:', err);
          }
        } catch (e) {
          console.warn('Failed to save analysis:', e);
        }
      } else {
        setAnalysisError(analysisResults.error || 'Analysis failed. Please try again.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      setAnalysisError(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAbortController(null);
    }
  };

  // Method card handlers
  const handleConnectStore = () => {
    setShowShopifyModal(true);
  };

  const handleDisconnectStore = async (shop: string) => {
    try {
      // Remove from localStorage
      const existingConnections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
      const updatedConnections = existingConnections.filter((c: any) => c.shop !== shop);
      localStorage.setItem('shopify_connections', JSON.stringify(updatedConnections));
      
      // Update state
      setConnectedShopifyAccounts(updatedConnections);
      
      // Also try to remove from backend API if available
      try {
        await apiService.disconnectShopify(shop);
      } catch (error) {
        console.warn('Failed to disconnect from API (this is expected if backend is not available):', error);
      }
      
      alert(`Successfully disconnected from ${shop}`);
    } catch (error) {
      console.error('Failed to disconnect store:', error);
      alert('Failed to disconnect store. Please try again.');
    }
  };

  const handleBulkImport = () => {
    setShowCSVModal(true);
  };

  const handleAddProduct = () => {
    setShowManualModal(true);
  };

  // Modal close handlers
  const handleCloseShopifyModal = () => {
    setShowShopifyModal(false);
    // Refresh connected accounts when modal closes
    try {
      const localConnections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
      setConnectedShopifyAccounts(localConnections);
      
      // If a store was just connected, start automatic analysis
      if (localConnections.length > 0 && !inputValue) {
        console.log('[Modal Close] Store connected, starting automatic analysis');
        setTimeout(() => {
          startAutomaticAnalysis();
        }, 1000);
      }
    } catch (error) {
      console.warn('Failed to refresh connected accounts:', error);
    }
  };

  const showSuccessNotification = (message: string) => {
    setConnectionSuccessMessage(message);
    setShowConnectionSuccess(true);
    
    // Start automatic analysis after connection
    if (message.includes('Starting website analysis')) {
      setTimeout(() => {
        startAutomaticAnalysis();
      }, 1000);
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowConnectionSuccess(false);
    }, 5000);
  };

  const startAutomaticAnalysis = async () => {
    try {
      // Get the connected store information
      const localConnections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
      if (localConnections.length === 0) {
        console.log('[Auto Analysis] No connected stores found');
        return;
      }
      
      const connectedStore = localConnections[0];
      const storeUrl = `https://${connectedStore.shop}`;
      
      console.log('[Auto Analysis] Starting analysis for connected store:', {
        shop: connectedStore.shop,
        shopName: connectedStore.shopName,
        storeUrl: storeUrl,
        type: connectedStore.type
      });
      
      // Set the input value to the specific store URL
      setInputValue(storeUrl);
      
      // Wait a moment for the input to be set, then start analysis
      setTimeout(async () => {
        try {
          console.log('[Auto Analysis] Starting analysis with URL:', storeUrl);
          await startAnalysis();
        } catch (error) {
          console.error('[Auto Analysis] Failed to start analysis:', error);
        }
      }, 500);
      
    } catch (error) {
      console.error('Failed to start automatic analysis:', error);
    }
  };

  const handleCloseCSVModal = () => {
    setShowCSVModal(false);
  };

  const handleCloseManualModal = () => {
    setShowManualModal(false);
  };

  // Function to analyze a selected product
  const analyzeProduct = async (product: any) => {
    try {
      // Set the product title as the input value and update UI state
      setInputValue(product.title);
      setInputType('company'); // Treat product name as company/product name
      setAnalysisType('root-domain');
      
      // Hide the products section to show analysis
      setShowProducts(false);
      
      // Start analysis using the same logic as startAnalysis but with product data
      const finalCompanyName = product.title.trim();
      const detectedInputType: 'company' | 'url' = 'company';
      
      // Try to detect industry from product title and description
      const productInfo = `${product.title} ${product.description || ''}`;
      const autoIndustry = detectIndustry(finalCompanyName, productInfo);
      const detectedIndustry = mapIndustryLabel(autoIndustry);
      
      setIsAnalyzing(true);
      setAnalysisError(null);
      setShowSuccessMessage(false);
      
      const abortController = new AbortController();
      setAbortController(abortController);
      
      const analysisResults = await apiService.getAIVisibilityAnalysis(
        finalCompanyName,
        detectedIndustry,
        { signal: abortController.signal }
      );
      
      if (analysisResults.success && analysisResults.data) {
        const enhancedResult = {
          ...analysisResults.data,
          industry: detectedIndustry,
          originalInput: product.title,
          inputType: detectedInputType,
          analysisType: analysisType,
          sourceProduct: {
            title: product.title,
            shop: product.shop,
            shopName: product.shopName,
            price: product.variants?.edges?.[0]?.node?.price,
            image: product.images?.edges?.[0]?.node?.url,
            description: product.description
          }
        };
        
        setAnalysisResult(enhancedResult);
        setShowSuccessMessage(true);
        
        // Save to history and cache
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
              serviceStatus: analysisResults.data.serviceStatus || {},
              summary: {
                totalCompetitors: competitors.length,
                averageVisibilityScore: competitors.reduce((sum: number, comp: any) => sum + (comp.mentions || 0), 0) / Math.max(competitors.length, 1),
                topCompetitor: competitors.length > 0 ? competitors.reduce((top: any, comp: any) => 
                  (comp.mentions || 0) > (top.mentions || 0) ? comp : top
                ).name : 'None'
              }
            }
          };
          
          await historyService.addHistoryItem(historyItem);
          window.dispatchEvent(new CustomEvent('new-analysis-created', { 
            detail: { type: 'ai-visibility', timestamp: new Date().toISOString() } 
          }));
          
          localStorage.setItem('overview_market_analysis', JSON.stringify({
            company: finalCompanyName,
            originalInput: product.title,
            inputType: detectedInputType,
            industry: detectedIndustry,
            analysisType: analysisType,
            data: enhancedResult,
            timestamp: Date.now()
          }));
          // Persist using SessionManager for cross-page restore
          try {
            sessionManager.saveAnalysisSession(
              'overview',
              enhancedResult,
              product.title,
              analysisType,
              detectedInputType,
              detectedIndustry,
              stableUserId
            );
          } catch (err) {
            console.warn('[Overview] SessionManager save failed:', err);
          }
        } catch (e) {
          console.warn('Failed to save analysis:', e);
        }
      } else {
        setAnalysisError(analysisResults.error || 'Analysis failed. Please try again.');
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Failed to start product analysis:', error);
      setAnalysisError(error.message || 'Failed to start analysis for this product. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAbortController(null);
    }
  };

  // Function to fetch products from connected Shopify store
  const fetchProductsFromStore = async (shop: string) => {
    const connection = connectedShopifyAccounts.find(c => c.shop === shop && c.token);
    if (!connection || !connection.token) {
      alert('❌ No storefront token found for this shop. Please reconnect with a valid token.');
      return;
    }

    try {
      const productsQuery = `
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                description
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch(`https://${shop}/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': connection.token,
        },
        body: JSON.stringify({ 
          query: productsQuery,
          variables: { first: 50 }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0]?.message || 'Unknown error'}`);
      }

      const products = data.data?.products?.edges?.map((edge: any) => ({
        ...edge.node,
        shopName: connection.shopName || shop,
        shop: shop
      })) || [];
      
      setFetchedProducts(products);
      setShowProducts(true);

      if (products.length === 0) {
        alert('✅ Connection successful! No products found in this store.');
      } else {
        alert(`✅ Successfully fetched ${products.length} products from ${connection.shopName || shop}!`);
      }

    } catch (error: any) {
      console.error('[Dashboard] Failed to fetch products:', error);
      alert(`❌ Failed to fetch products: ${error.message}`);
    }
  };

  // Helper functions for analysis results
  const getAIVisibilityScore = (result: any) => {
    if (result?.aiVisibilityScore !== undefined && result?.aiVisibilityScore !== null) {
      return result.aiVisibilityScore;
    }
    if (result?.totalScore !== undefined && result?.totalScore !== null) {
      return result.totalScore;
    }
    if (result?.visibilityScore !== undefined && result?.visibilityScore !== null) {
      return result.visibilityScore;
    }
    
    if (result?.competitors && result.competitors.length > 0) {
      const mainCompany = result.competitors.find((comp: any) => 
        comp.name?.toLowerCase() === result.company?.toLowerCase()
      );
      
      if (mainCompany?.totalScore !== undefined && mainCompany?.totalScore !== null) {
        return mainCompany.totalScore;
      }
      
      const validScores = result.competitors
        .filter((comp: any) => comp.totalScore !== undefined && comp.totalScore !== null)
        .map((comp: any) => comp.totalScore);
      
      if (validScores.length > 0) {
        const avgScore = validScores.reduce((sum: number, score: number) => sum + score, 0) / validScores.length;
        return avgScore;
      }
    }
    
    return 0;
  };

  const getAIVisibilityMetrics = (result: any) => {
    if (!result?.competitors || result.competitors.length === 0) {
      return null;
    }

    const mainCompany = result.competitors.find((comp: any) => 
      comp.name?.toLowerCase() === result.company?.toLowerCase()
    );
    
    if (!mainCompany) {
      return null;
    }

    const totalScore = mainCompany.totalScore || 0;
    const aiScores = mainCompany.aiScores || {};
    const breakdowns = mainCompany.breakdowns || {};

    const mainMentions = Number(
      (
        mainCompany?.keyMetrics?.gemini?.brandMentions ??
        mainCompany?.keyMetrics?.gemini?.mentionsCount ??
        breakdowns?.gemini?.mentionsScore ??
        0
      ) as number
    ) || 0;

    const competitorMentions: number[] = (result.competitors || [])
      .filter((c: any) => c.name?.toLowerCase() !== result.company?.toLowerCase())
      .map((c: any) => {
        const m =
          c?.keyMetrics?.gemini?.brandMentions ??
          c?.keyMetrics?.gemini?.mentionsCount ??
          c?.breakdowns?.gemini?.mentionsScore ??
          0;
        return Number(m) || 0;
      });
    const medianCompetitor = median(competitorMentions);

    const aiCitationScore = computeAiCitationScore(mainMentions, medianCompetitor);
    const relativeAiVisibility = computeRelativeAiVisibility(mainMentions, medianCompetitor);

    const geminiBreakdown = breakdowns.gemini || {};

    return {
      aiVisibilityScore: Math.min(10, Math.max(0, totalScore)),
      brandMentions: Number(mainMentions.toFixed(5)),
      medianCompetitorMentions: Number(medianCompetitor.toFixed(5)),
      aiCitationScore: Number(aiCitationScore.toFixed(5)),
      relativeAiVisibility: Number(relativeAiVisibility.toFixed(5)),
      averagePosition: Number((geminiBreakdown.positionScore || 0).toFixed(5)),
      searchVolume: 'N/A',
      sentiment: geminiBreakdown.sentimentScore > 0.5 ? 'Positive' : 
                 geminiBreakdown.sentimentScore < 0.3 ? 'Negative' : 'Neutral',
      platformBreakdown: aiScores,
      totalMentions: Number(mainMentions.toFixed(5))
    };
  };

  const getScoreColor = (score: number) => {
    // Handle both 0-10 and 0-100 ranges
    const normalizedScore = score > 10 ? score : score * 10;
    if (normalizedScore >= 80) return 'bg-green-500';
    if (normalizedScore >= 60) return 'bg-blue-500';
    if (normalizedScore >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreClass = (score: number) => {
    // Handle both 0-10 and 0-100 ranges
    const normalizedScore = score > 10 ? score : score * 10;
    if (normalizedScore >= 80) return 'text-green-600 font-semibold';
    if (normalizedScore >= 60) return 'text-blue-600 font-semibold';
    if (normalizedScore >= 40) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const formatScore = (score: number) => {
    return score.toFixed(4);
  };

  // Conditional rendering: New UI when no analysis, full dashboard when analysis exists
  if (!analysisResult) {
    return (
      <>
      <div className="min-h-screen bg-gray-50" style={{ 
        marginLeft: '-2rem',
        marginRight: '-2rem',
        marginTop: '-2rem',
        marginBottom: 0,
        width: 'calc(100% + 4rem)',
        maxWidth: 'none'
      }}>
        <div className="w-full px-0 py-8">
          {/* Start Your Analysis Section */}
          <div className="bg-white rounded-none shadow-lg p-6 sm:p-8 lg:p-12 xl:p-16 mb-0">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-3">AI Visibility Product Tracker</h2>
              <p className="text-gray-600 text-lg">Track product visibility across AI assistants and shopping search with actionable insights.</p>
            </div>
            {/* URL/Product Name Input Section */}
            <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 sm:p-6 mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                <div className="flex flex-col gap-1 lg:col-span-10">
                  <label htmlFor="website-input" className="text-xs font-semibold text-gray-700">
                Website URL or Product Name
              </label>
                <input
                  id="website-input"
                  type="text"
                  value={inputValue}
                    onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                      setInputValue(value);
                      if (value.includes('http://') || value.includes('https://') || value.includes('www.')) {
                        const detectedType = detectUrlType(value);
                        setAnalysisType(detectedType);
                      }
                    })}
                  onPaste={(e) => handlePaste(e, (value) => {
                    setInputValue(value);
                    if (value.includes('http://') || value.includes('https://') || value.includes('www.')) {
                      const detectedType = detectUrlType(value);
                      setAnalysisType(detectedType);
                    }
                  })}
                  onKeyDown={handleKeyDown}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isAnalyzing && inputValue.trim()) {
                      startAnalysis();
                    }
                  }}
                  placeholder="Enter website URL or product name..."
                    className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm w-full"
                  disabled={isAnalyzing}
                />
                </div>
                <div className="flex flex-col gap-1 lg:col-span-2">
                  <label className="text-xs font-semibold text-gray-700 opacity-0">Action</label>
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing || !inputValue.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white h-11 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {isAnalyzing ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Quick Analysis
                    </>
                  )}
                </button>
                </div>
              </div>
            </div>


            {analysisError && (
              <div className="mb-6 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3">{analysisError}</div>
            )}

            {/* OR Divider */}
            <div className="flex items-center my-8">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-gray-500 font-medium">or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Method Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Shopify Sync Card */}
                <div className="bg-white border-2 border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors group flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    {connectedShopifyAccounts.length > 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Recommended
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Shopify Sync</h3>
                  <p className="text-gray-600 mb-6 flex-grow">
                    {connectedShopifyAccounts.length > 0 
                      ? 'Connected - Website analysis in progress'
                      : 'Connect your store for automatic website analysis'
                    }
                  </p>
                  <button
                    onClick={handleConnectStore}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      connectedShopifyAccounts.length > 0
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {connectedShopifyAccounts.length > 0 ? 'Reconnect Store' : 'Connect Store'}
                  </button>
                </div>

              {/* CSV Upload Card */}
              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 hover:border-gray-400 transition-colors group flex flex-col">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">CSV Upload</h3>
                <p className="text-gray-600 mb-6 flex-grow">
                  Bulk upload from spreadsheet or CSV file
                </p>
                <button
                  onClick={handleBulkImport}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
                >
                  Bulk Import
                </button>
              </div>

              {/* Manual Add Card */}
              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors group flex flex-col">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Manual Add</h3>
                <p className="text-gray-600 mb-6 flex-grow">
                  Add products individually with custom details
                </p>
                <button
                  onClick={handleAddProduct}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
                >
                  Add Product
                </button>
              </div>
            </div>


            {/* Fetched Products Section */}
            {showProducts && fetchedProducts.length > 0 && (
              <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 mb-12">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                      Shopify Products
                    </h2>
                    <p className="text-lg text-gray-600">
                      {fetchedProducts.length} products fetched from {fetchedProducts[0]?.shopName || fetchedProducts[0]?.shop}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowProducts(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {fetchedProducts.map((product, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-300 hover:shadow-md transition-shadow">
                      {product.images?.edges?.[0]?.node?.url && (
                        <img
                          src={product.images.edges[0].node.url}
                          alt={product.images.edges[0].node.altText || product.title}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      
                      <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                        {product.title}
                      </h3>
                      
                      {product.variants?.edges?.[0]?.node?.price && (
                        <p className="text-xl font-bold text-blue-600 mb-2">
                          {product.variants.edges[0].node.price.amount} {product.variants.edges[0].node.price.currencyCode}
                        </p>
                      )}
                      
                      {product.description && (
                        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                          {product.description.replace(/<[^>]*>/g, '')}
                        </p>
                      )}
                      
                      <button
                        onClick={() => analyzeProduct(product)}
                        disabled={isAnalyzing}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                          isAnalyzing 
                            ? 'bg-gray-400 cursor-not-allowed text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          'Analyze Product'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {showConnectionSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <span className="text-sm font-medium">{connectionSuccessMessage}</span>
          <button
            onClick={() => setShowConnectionSuccess(false)}
            className="text-green-500 hover:text-green-700 ml-2"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Modals */}
      <ShopifyConnectModal 
        isOpen={showShopifyModal} 
        onClose={handleCloseShopifyModal}
        onSuccess={showSuccessNotification}
      />
      <CSVUploadModal 
        isOpen={showCSVModal} 
        onClose={handleCloseCSVModal} 
      />
      <ManualAddModal 
        isOpen={showManualModal} 
        onClose={handleCloseManualModal} 
      />
      </>
    );
  }

  // Original dashboard layout when analysis exists
  return (
    <>
    <div className="w-full max-w-full mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Welcome {user?.displayName?.split(' ')[0] || user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-600 mt-2">Welcome to Kabini.ai - Your AI-Powered Content Enhancement Platform</p>
        </div>
        <button
          onClick={() => {
            // Clear analysis results
            setAnalysisResult(null);
            setInputValue('');
            setAnalysisError(null);
            setShowSuccessMessage(false);
            localStorage.removeItem('overview_market_analysis');
            
            // Disconnect any connected Shopify store
            try {
              localStorage.removeItem('shopify_connections');
              setConnectedShopifyAccounts([]);
              console.log('[New Analysis] Disconnected Shopify store');
            } catch (error) {
              console.warn('[New Analysis] Failed to disconnect store:', error);
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          New Analysis
        </button>
      </div>

      {/* Analysis Results Section */}
      <div className="bg-white border border-gray-300 rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Visibility Analysis Results</h2>
          {analysisResult?.sourceProduct ? (
            <div className="flex items-center justify-center gap-4 mb-4">
              {analysisResult.sourceProduct.image && (
                <img
                  src={analysisResult.sourceProduct.image}
                  alt={analysisResult.sourceProduct.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div className="text-left">
                <p className="text-base font-semibold text-gray-900">{analysisResult.sourceProduct.title}</p>
                <p className="text-xs text-gray-600">
                  From {analysisResult.sourceProduct.shopName || analysisResult.sourceProduct.shop}
                  {analysisResult.sourceProduct.price && (
                    <span className="ml-2 font-medium text-blue-600">
                      {analysisResult.sourceProduct.price.amount} {analysisResult.sourceProduct.price.currencyCode}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-lg">
              Analysis completed for: <HighlightedLink value={analysisResult?.originalInput || ''} />
            </p>
          )}
        </div>

        {showSuccessMessage && (
          <div className="mb-6 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">✅ Analysis completed successfully! Results are ready below.</div>
        )}

        {/* Dashboard Cards */}
        <div className="space-y-8 lg:space-y-12 mb-8 lg:mb-12">
          {/* AI Brand Visibility Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">AI Brand Visibility</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-3 lg:gap-4 items-stretch">
              <OverallAIVisibilityScoreCard result={analysisResult} />
              <AIPlatformPresenceBreakdown result={analysisResult} />
              <ShareOfAIVoiceCard result={analysisResult} />
              <CompetitorBenchmarkCard competitors={analysisResult?.competitors || []} />
            </div>
          </div>
          
          {/* Product Performance Analysis Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Product Performance Analysis</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <TopProductsKpiCard result={analysisResult} setShowShopifyModal={setShowShopifyModal} />
              <ProductPerformanceAnalysisCard result={analysisResult} setShowShopifyModal={setShowShopifyModal} />
              <SentimentAnalysisCard competitors={analysisResult?.competitors || []} result={analysisResult} />
            </div>
          </div>
        </div>
          {/* <div className="sm:col-span-2">
            <LowVisibilityHighPotentialCard result={analysisResult} />
          </div>
          <div className="sm:col-span-2">
            <ProductVisibilityIndexCard result={analysisResult} />
          </div> */}

        {/* Competitor Analysis */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Competitor Analysis</h2>
          <button
            onClick={() => navigate('/ai-visibility-analysis')}
            className="inline-flex items-center px-4 py-3 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
          >
            View Details
          </button>
        </div>

        {/* Competitor Performance Overview Chart */}
        {analysisResult?.competitors && analysisResult.competitors.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-900">Competitor Performance Overview</h3>
              <p className="text-xs text-gray-600">Visual comparison of average AI visibility scores across competitors</p>
            </div>
            
            <div className="h-48 sm:h-56 lg:h-64 overflow-x-auto overflow-y-visible">
              <div className="flex items-end h-full gap-3 sm:gap-4 min-w-max px-2 pb-2">
              {analysisResult.competitors.map((competitor: any, index: number) => {
                const avgScore = competitor.totalScore || 0;
                // Normalize score for height calculation (handle both 0-10 and 0-100 ranges)
                const normalizedScore = avgScore > 10 ? avgScore : avgScore * 10;
                const heightPercentage = Math.min(95, Math.max(10, (normalizedScore / 100) * 85 + 10));
                const barColor = getScoreColor(avgScore);
                
                return (
                  <div key={index} className="flex-none w-12 sm:w-16 h-full flex flex-col justify-end items-center relative">
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
            <h2 className="text-base font-semibold text-gray-900">Competitors Comparison</h2>
            <p className="text-xs text-gray-600">Detailed scoring breakdown for each company across multiple models</p>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysisResult?.competitors?.map((competitor: any, index: number) => (
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
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores?.gemini || 0)}`}>
                        {formatScore(competitor.aiScores?.gemini || 0)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores?.perplexity || 0)}`}>
                        {formatScore(competitor.aiScores?.perplexity || 0)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores?.claude || 0)}`}>
                        {formatScore(competitor.aiScores?.claude || 0)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(competitor.aiScores?.chatgpt || 0)}`}>
                        {formatScore(competitor.aiScores?.chatgpt || 0)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${getScoreClass(competitor.totalScore || 0)}`}>
                        {formatScore(competitor.totalScore || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    {/* Success Notification */}
    {showConnectionSuccess && (
      <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <span className="text-sm font-medium">{connectionSuccessMessage}</span>
        <button
          onClick={() => setShowConnectionSuccess(false)}
          className="text-green-500 hover:text-green-700 ml-2"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    )}

    {/* Modals */}
    <ShopifyConnectModal 
      isOpen={showShopifyModal} 
      onClose={handleCloseShopifyModal}
      onSuccess={showSuccessNotification}
    />
    <CSVUploadModal 
      isOpen={showCSVModal} 
      onClose={handleCloseCSVModal} 
    />
    <ManualAddModal 
      isOpen={showManualModal} 
      onClose={handleCloseManualModal} 
    />
    </>
  );
} 





