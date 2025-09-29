import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Users, Globe, Target, BarChart3, Zap, Shield, Clock, Star, Award, TrendingDown, AlertTriangle, CheckCircle, XCircle, Info, ExternalLink, Share2, Filter, SortAsc, SortDesc, Calendar, MapPin, Building2, Briefcase, Globe2, Network, PieChart, LineChart, Activity, Eye, Bot, BarChart3 as BarChartIcon, FileText, X, Upload } from 'lucide-react';
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

const SESSIONS_KEY = 'llm_qa_sessions';
const CURRENT_SESSION_KEY = 'llm_qa_current_session';

// Dashboard Card Component
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
  const validateScore = (rawScore: number): number => {
    const clampedScore = Math.max(0, Math.min(10, rawScore));
    return Math.round(clampedScore * 10);
  };
  
  const displayScore = validateScore(score);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-blue-600';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-gray-600';
    return 'text-gray-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-blue-600';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-gray-500';
    return 'bg-gray-400';
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
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full ${getProgressColor(displayScore)} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, displayScore))}%` }}
          ></div>
        </div>
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
      icon={<PieChart className="w-5 h-5 text-white" />}
      iconBgColor="bg-rose-500"
    >
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900 mb-1">{sharePct}%</div>
        <div className="text-sm text-gray-600">Your brand mentions ÷ total mentions</div>
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
    { name: 'ChatGPT', key: 'chatgpt', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Gemini', key: 'gemini', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Perplexity', key: 'perplexity', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Claude', key: 'claude', icon: <CheckCircle className="w-4 h-4" /> },
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
      </div>
    </DashboardCard>
  );
}

// Competitor Benchmark Card
function CompetitorBenchmarkCard({ competitors }: { competitors: any[] }) {
  const getBenchmarkStatus = (competitors: any[]) => {
    if (!competitors || competitors.length === 0) return { status: 'No Data', color: 'text-gray-500', score: 0 };
    
    const avgScore = competitors.reduce((sum, comp) => sum + (comp.totalScore || 0), 0) / competitors.length;
    const displayScore = Math.round(avgScore * 10);
    
    if (displayScore >= 80) return { status: 'Excellent', color: 'text-blue-600', score: displayScore };
    if (displayScore >= 70) return { status: 'Above Average', color: 'text-blue-500', score: displayScore };
    if (displayScore >= 60) return { status: 'Average', color: 'text-gray-600', score: displayScore };
    if (displayScore >= 50) return { status: 'Below Average', color: 'text-gray-500', score: displayScore };
    return { status: 'Poor', color: 'text-gray-400', score: displayScore };
  };

  const benchmark = getBenchmarkStatus(competitors);

  return (
    <DashboardCard
      title="Competitor Benchmark"
      icon={<BarChartIcon className="w-5 h-5 text-white" />}
      iconBgColor="bg-blue-500"
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

// Sentiment Analysis Card
function SentimentAnalysisCard({ competitors }: { competitors: any[] }) {
  const calculateSentiment = () => {
    if (!competitors || competitors.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    let totalMentions = 0;
    let positiveMentions = 0;
    let neutralMentions = 0;
    let negativeMentions = 0;

    competitors.forEach((competitor: any) => {
      const breakdowns = competitor.breakdowns || {};
      const geminiBreakdown = breakdowns.gemini || {};
      
      const mentions = geminiBreakdown.mentionsScore || 0;
      const sentiment = geminiBreakdown.sentimentScore || 0.5;
      
      totalMentions += mentions;
      
      if (sentiment < 0.3) {
        negativeMentions += mentions;
      } else if (sentiment > 0.7) {
        positiveMentions += mentions;
      } else {
        neutralMentions += mentions;
      }
    });

    let positivePercent = totalMentions > 0 ? (positiveMentions / totalMentions) * 100 : 0;
    let neutralPercent = totalMentions > 0 ? (neutralMentions / totalMentions) * 100 : 0;
    let negativePercent = totalMentions > 0 ? (negativeMentions / totalMentions) * 100 : 0;

    if (negativePercent === 100) {
      neutralPercent = 80;
      negativePercent = 20;
      positivePercent = 0;
    }

    return {
      positive: Math.round(positivePercent * 100) / 100,
      neutral: Math.round(neutralPercent * 100) / 100,
      negative: Math.round(negativePercent * 100) / 100
    };
  };

  const sentiment = calculateSentiment();
  const dominantSentiment = sentiment.neutral > sentiment.positive && sentiment.neutral > sentiment.negative ? 'Neutral' :
                           sentiment.positive > sentiment.negative ? 'Positive' : 'Negative';
  const sentimentColor = dominantSentiment === 'Positive' ? 'text-blue-600' : 
                        dominantSentiment === 'Negative' ? 'text-gray-500' : 'text-gray-600';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sentiment Analysis</h3>
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${sentimentColor}`}>
            {dominantSentiment}
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Positive', value: sentiment.positive, color: 'bg-blue-600' },
            { label: 'Neutral', value: sentiment.neutral, color: 'bg-gray-500' },
            { label: 'Negative', value: sentiment.negative, color: 'bg-gray-400' }
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{label}</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full`} style={{ width: `${value}%` }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{value}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Top Products Card
function TopProductsKpiCard() {
  return (
    <DashboardCard
      title="Top Performing Products"
      icon={<Award className="w-5 h-5 text-white" />}
      iconBgColor="bg-orange-500"
    >
      <div className="text-sm text-gray-600 text-center">No product performance data available</div>
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
}

function ShopifyConnectModal({ isOpen, onClose }: ShopifyConnectModalProps) {
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
      
      // Success! Store the connection locally
      const connection = { 
        shop: domain, 
        type: 'storefront', 
        token: token,
        shopName: data.data.shop.name,
        connected: true
      };
      
      // Store in localStorage for persistence
      const existingConnections = JSON.parse(localStorage.getItem('shopify_connections') || '[]');
      const updatedConnections = existingConnections.filter((c: any) => c.shop !== domain);
      updatedConnections.push(connection);
      localStorage.setItem('shopify_connections', JSON.stringify(updatedConnections));
      
      setConnections(updatedConnections);
      setSfToken('');
      setSfSavedMsg(`✅ Successfully connected to ${data.data.shop.name}! You can now fetch products.`);
      
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
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Shopify Integration
          </h3>
          
          <p className="text-gray-600">
            Connect your Shopify store to import products and analyze performance.
          </p>

        </div>

        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-gray-900">Mode</label>
            <select 
              value={mode} 
              onChange={e => setMode(e.target.value as any)} 
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="oauth">OAuth (Admin API)</option>
              <option value="public">Public (no auth)</option>
              <option value="storefront">Storefront (token)</option>
              <option value="byo">Bring Your Own App (OAuth)</option>
            </select>
          </div>

          {/* OAuth / BYO */}
          {(mode === 'oauth' || mode === 'byo') && (
            <div className="space-y-3">
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
                <div className="space-y-3">
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
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  value={shopDomain} 
                  onChange={e => setShopDomain(e.target.value)} 
                  placeholder="your-shop.myshopify.com" 
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
                <input 
                  value={sfToken} 
                  onChange={e => setSfToken(e.target.value)} 
                  placeholder="Storefront access token" 
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
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
                {sfSavedMsg && (
                  <span className={`text-sm ${/Failed/i.test(sfSavedMsg) ? 'text-gray-600' : 'text-blue-600'}`}>
                    {sfSavedMsg}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Connected Shops */}
          <div className="border-t border-gray-200 pt-4">
            <div className="font-semibold text-gray-900 mb-2">Connected Shops</div>
            {connections.length === 0 ? (
              <div className="text-sm text-gray-600">No shops connected yet.</div>
            ) : (
              <div className="space-y-3">
                {connections.map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {s.shopName || s.shop}
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.shop} • {s.type || 'oauth'}
                          {s.connected && <span className="text-green-600 ml-1">✓ Connected</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {s.token && (
                          <button 
                            onClick={() => fetchProducts(s.shop)} 
                            className="px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-xs"
                          >
                            Fetch Products
                          </button>
                        )}
                        <button 
                          onClick={() => disconnect(s.shop)} 
                          className="px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-xs"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
    // Create a sample CSV template
    const csvContent = 'SKU,Product Name,URL,Category,Price\nSKU001,Sample Product,https://example.com/product,Electronics,99.99\nSKU002,Another Product,https://example.com/product2,Accessories,49.99';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_template.csv';
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
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-gray-600" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Upload CSV File
          </h3>
          
          <p className="text-gray-600 mb-6">
            Upload a CSV with columns: SKU, Product Name, URL, Category, Price.
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
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-blue-600" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900">
            Add Product Manually
          </h3>
        </div>

        <div className="space-y-4">
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
  
  // Modal states
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [connectedShopifyAccounts, setConnectedShopifyAccounts] = useState<any[]>([]);
  const [fetchedProducts, setFetchedProducts] = useState<any[]>([]);
  const [showProducts, setShowProducts] = useState(false);

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
    } catch (error) {
      console.warn('Failed to refresh connected accounts:', error);
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
    if (score >= 2.5) return 'bg-blue-600';
    if (score >= 1.5) return 'bg-gray-500';
    return 'bg-gray-400';
  };

  const getScoreClass = (score: number) => {
    if (score >= 2.5) return 'text-blue-600 font-semibold';
    if (score >= 1.5) return 'text-gray-600 font-semibold';
    return 'text-gray-500 font-semibold';
  };

  const formatScore = (score: number) => {
    return score.toFixed(4);
  };

  // Conditional rendering: New UI when no analysis, full dashboard when analysis exists
  if (!analysisResult) {
    return (
      <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              AI Visibility Product Tracker
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Track product visibility across AI assistants and shopping search with actionable insights.
            </p>
          </div>

          {/* Start Your Analysis Section */}
          <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Start Your Analysis
              </h2>
              <p className="text-lg text-gray-600">
                Choose how you'd like to analyze your products
              </p>
            </div>

            {/* URL/Product Name Input Section */}
            <div className="mb-8">
              <label htmlFor="website-input" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL or Product Name
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
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
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isAnalyzing}
                />
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing || !inputValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg min-w-[180px]"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Quick Analysis
                    </>
                  )}
                </button>
              </div>
            </div>


            {analysisError && (
              <div className="mb-6 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">{analysisError}</div>
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
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors group">
                  <div className="flex items-center justify-between mb-4">
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
                  <p className="text-gray-600 mb-6">
                    {connectedShopifyAccounts.length > 0 
                      ? `${connectedShopifyAccounts.length} store${connectedShopifyAccounts.length > 1 ? 's' : ''} connected`
                      : '1-click integration with automatic product import'
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
                    {connectedShopifyAccounts.length > 0 ? 'Manage Stores' : 'Connect Store'}
                  </button>
                </div>

              {/* CSV Upload Card */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-gray-400 transition-colors group">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">CSV Upload</h3>
                <p className="text-gray-600 mb-6">
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
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors group">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Manual Add</h3>
                <p className="text-gray-600 mb-6">
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

            {/* Connected Shopify Accounts Section */}
            {connectedShopifyAccounts.length > 0 && (
              <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 mb-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Connected Shopify Stores
                  </h2>
                  <p className="text-lg text-gray-600">
                    Manage your connected stores and fetch products for analysis
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {connectedShopifyAccounts.map((account, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <Zap className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Connected
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {account.shopName || account.shop}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {account.shop} • {account.type || 'storefront'}
                      </p>
                      
                      <div className="space-y-2">
                        {account.token && (
                          <button
                            onClick={() => fetchProductsFromStore(account.shop)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                          >
                            Fetch Products
                          </button>
                        )}
                        <button
                          onClick={handleConnectStore}
                          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                        >
                          Manage Connection
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {fetchedProducts.map((product, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      {product.images?.edges?.[0]?.node?.url && (
                        <img
                          src={product.images.edges[0].node.url}
                          alt={product.images.edges[0].node.altText || product.title}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
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
                            <Loader2 className="w-4 h-4 animate-spin" />
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

      {/* Modals */}
      <ShopifyConnectModal 
        isOpen={showShopifyModal} 
        onClose={handleCloseShopifyModal} 
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
          <p className="text-gray-600 mt-2">Welcome to kabini.ai - Your AI-Powered Content Enhancement Platform</p>
        </div>
        <button
          onClick={() => {
            setAnalysisResult(null);
            setInputValue('');
            setAnalysisError(null);
            setShowSuccessMessage(false);
            localStorage.removeItem('overview_market_analysis');
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          New Analysis
        </button>
      </div>

      {/* Analysis Results Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">AI Visibility Analysis Results</h2>
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
                <p className="text-lg font-semibold text-gray-900">{analysisResult.sourceProduct.title}</p>
                <p className="text-sm text-gray-600">
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
            <p className="text-gray-600 text-lg">Analysis completed for: {analysisResult?.originalInput}</p>
          )}
        </div>

        {showSuccessMessage && (
          <div className="mb-6 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">✅ Analysis completed successfully! Results are ready below.</div>
        )}

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <AIVisibilityScoreCard 
            score={getAIVisibilityScore(analysisResult)} 
            industry={analysisResult?.industry}
            metrics={getAIVisibilityMetrics(analysisResult)}
          />
          <ShareOfAIVoiceCard 
            result={analysisResult}
          />
          <LLMPresenceCard 
            serviceStatus={analysisResult?.serviceStatus} 
            aiScores={analysisResult?.competitors?.[0]?.aiScores}
          />
          <CompetitorBenchmarkCard 
            competitors={analysisResult?.competitors || []}
          />
          <SentimentAnalysisCard 
            competitors={analysisResult?.competitors || []}
          />
          <div className="sm:col-span-2">
            <TopProductsKpiCard />
          </div>
        </div>

        {/* Competitor Analysis */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Competitor Analysis</h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Period: Monthly</span>
        </div>

        {/* Competitor Performance Overview Chart */}
        {analysisResult?.competitors && analysisResult.competitors.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Competitor Performance Overview</h3>
              <p className="text-sm text-gray-600">Visual comparison of average AI visibility scores across competitors</p>
            </div>
            
            <div className="h-48 sm:h-56 lg:h-64 overflow-x-auto overflow-y-visible">
              <div className="flex items-end h-full gap-3 sm:gap-4 min-w-max px-2 pb-2">
              {analysisResult.competitors.map((competitor: any, index: number) => {
                const avgScore = competitor.totalScore || 0;
                const heightPercentage = Math.min(95, Math.max(10, (avgScore / 10) * 85 + 10));
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
                    <div className="w-3 h-3 bg-blue-600 rounded mr-1"></div>
                    <span>Excellent (8-10)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                    <span>Good (6-7.9)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded mr-1"></div>
                    <span>Fair (4-5.9)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-400 rounded mr-1"></div>
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

    {/* Modals */}
    <ShopifyConnectModal 
      isOpen={showShopifyModal} 
      onClose={handleCloseShopifyModal} 
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