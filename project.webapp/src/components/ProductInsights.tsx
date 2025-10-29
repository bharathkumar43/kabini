import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 as BarChartIcon, Search, Loader2, FileText, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sessionManager } from '../services/sessionManager';
import { backgroundOrchestrator } from '../services/backgroundAnalysisOrchestrator';
import { unifiedCache } from '../services/unifiedCache';
import { handleInputChange as handleEmojiFilteredInput, handlePaste, handleKeyDown } from '../utils/emojiFilter';
import { userStateManager } from '../utils/userStateManager';
import HighlightedLink from './ui/HighlightedLink';

// CTA Button component for navigation
const CtaButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button 
    onClick={onClick} 
    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
  >
    {children}
  </button>
);

function DashboardCard({ title, icon, iconBgColor, children, tooltip, action }: { title: string; icon: React.ReactNode; iconBgColor?: string; children: React.ReactNode; tooltip?: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-300 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBgColor || 'bg-gray-100'} flex items-center justify-center shadow-sm`}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>
              {tooltip && (
                <button
                  className="w-6 h-6 rounded-full border border-gray-300 bg-white hover:border-gray-400 text-gray-600 text-xs font-medium flex items-center justify-center"
                  title={tooltip}
                >
                  i
                </button>
              )}
            </div>
            {/* Optional subtitle slot via tooltip fallback: we keep tooltip on the button; here we render a generic description only when title matches known cards */}
            {title === 'AI Visibility Score' && (
              <div className="text-xs text-gray-600">Estimated visibility based on share of mentions across AI tools.</div>
            )}
            {title === 'AI Readiness Score' && (
              <div className="text-xs text-gray-600">How well your content is optimized for AI understanding and recommendations.</div>
            )}
            {title === 'Product Analysis by Platforms' && (
              <div className="text-xs text-gray-600">Which product attributes each platform associates with every brand to reveal positioning.</div>
            )}
            {title === 'Sentiment Analysis' && (
              <div className="text-xs text-gray-600">How competitors are perceived in AI responses and what drives that perception.</div>
            )}
            {title === 'Authority Signals' && (
              <div className="text-xs text-gray-600">Trust factors AI uses to recommend brands: reviews, backlinks, PR, certifications.</div>
            )}
            {title === 'FAQ / Conversational Mentions' && (
              <div className="text-xs text-gray-600">Competitors referenced in Q&A‑style answers and common themes behind those mentions.</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
        </div>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function AIVisibilityScoreCard({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score * 10)));
  const getRating = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Very Poor';
  };
  const getRatingColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  };
  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  return (
    <DashboardCard title="AI Visibility Score" icon={<Eye className="w-4 h-4 text-blue-600" />} tooltip="Shows estimated visibility percentage based on share of mentions across AI tools. Higher scores indicate stronger brand presence and recognition in AI responses. This metric helps understand how visible your brand is compared to competitors in AI-generated content.">
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900 mb-1">{pct}</div>
        <div className="text-sm text-gray-600 mb-2">out of 100</div>
        <div className={`text-lg font-bold ${getRatingColor(pct)} mb-4`}>{getRating(pct)}</div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${getProgressColor(pct)}`}
            style={{ width: `${pct}%` }}
          ></div>
        </div>
      </div>
    </DashboardCard>
  );
}

function AIReadinessScoreCard({ score }: { score: number }) {
  const getRating = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Very Poor';
  };
  const getRatingColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  };
  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  return (
    <DashboardCard title="AI Readiness Score" icon={<BarChartIcon className="w-4 h-4 text-blue-600" />} tooltip="Measures how well your content is optimized for AI understanding and recommendations. Based on schema markup, content quality, trust signals, and technical SEO. Higher scores indicate better AI readiness and higher chances of being recommended by AI tools.">
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900 mb-1">{score}</div>
        <div className="text-sm text-gray-600 mb-2">out of 100</div>
        <div className={`text-lg font-bold ${getRatingColor(score)} mb-4`}>{getRating(score)}</div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${getProgressColor(score)}`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>
    </DashboardCard>
  );
}

type AttributeMatrix = { attributes: string[]; competitors: string[]; counts: Record<string, Record<string, number>> };
const ATTRIBUTE_SYNONYMS: Record<string, string[]> = {
  Luxury: ['luxury','premium','high-end','curated'],
  Affordable: ['affordable','budget','low-cost','cheap','value','deal','discount'],
  'Fast Shipping': ['fast shipping','same-day','next-day','prime delivery','quick delivery'],
  Organic: ['organic','clean beauty','natural'],
  Sustainable: ['sustainable','eco-friendly','green','recyclable'],
  Variety: ['variety','wide selection','assortment','many options']
};

function computeAttributeMatrix(result: any): AttributeMatrix {
  const attributes: string[] = Object.keys(ATTRIBUTE_SYNONYMS);
  
  // Use real competitors from the API response
  const competitors: string[] = (Array.isArray(result?.competitors) ? result.competitors : []).map((c: any) => c?.name || 'Unknown');
  const counts: Record<string, Record<string, number>> = {};
  
  // Initialize counts for all attributes and competitors
  attributes.forEach(attr => {
    counts[attr] = {};
    competitors.forEach(c => {
      counts[attr][c] = 0;
    });
  });
  
  // Extract attribute mentions from competitor data
  (Array.isArray(result?.competitors) ? result.competitors : []).forEach((c: any) => {
    const name = c?.name || 'Unknown';
    
    // Use backend productAttributes if available
    if (c?.productAttributes && typeof c.productAttributes === 'object') {
      // Map backend attributes to frontend attributes
      const attributeMap: Record<string, string> = {
        'Luxury': 'Luxury',
        'Affordable': 'Affordable',
        'Fast Shipping': 'Fast Shipping',
        'Organic': 'Organic',
        'Sustainable': 'Sustainable',
        'Variety': 'Variety',
        'Cheap Deals': 'Affordable', // Map to Affordable
        'Minimalist': 'Luxury' // Map to Luxury
      };
      
      Object.entries(c.productAttributes).forEach(([backendAttr, count]) => {
        const frontendAttr = attributeMap[backendAttr] || backendAttr;
        if (attributes.includes(frontendAttr)) {
          counts[frontendAttr][name] = (counts[frontendAttr][name] || 0) + Number(count || 0);
        }
      });
    } else {
      // Fallback: Get all text content to analyze
      const texts = [
        c?.analysis,
        c?.breakdowns?.gemini?.analysis,
        c?.breakdowns?.chatgpt?.analysis,
        c?.breakdowns?.perplexity?.analysis,
        c?.breakdowns?.claude?.analysis
      ]
        .filter((v) => v !== undefined && v !== null)
        .map((t: any) => String(t || '').toLowerCase());
      
      // Count attribute mentions in the text
      attributes.forEach(attr => {
        const keywords = ATTRIBUTE_SYNONYMS[attr] || [];
        texts.forEach(text => {
          keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
              counts[attr][name] = (counts[attr][name] || 0) + 1;
            }
          });
        });
      });
    }
  });
  
  return { attributes, competitors, counts };
}

function ProductGeoBubbleChart({ result }: { result: any }) {
  const navigate = useNavigate();
  const matrix = computeAttributeMatrix(result);
  const maxVal = Math.max(1, ...matrix.attributes.flatMap(a => Object.values(matrix.counts[a] || {})));
  return (
    <DashboardCard 
      title="Product Analysis by Platforms" 
      icon={<BarChartIcon className="w-4 h-4 text-blue-600" />} 
      tooltip="Shows which product attributes (luxury, affordable, organic, sustainable) AI associates with each competitor across platforms. Bubble size indicates frequency of association. Helps understand how competitors are positioned in the market and identify attribute gaps."
      // action removed per request
    >
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-xs text-blue-600 font-semibold">Attribute</th>
              {matrix.competitors.map(c => (
                <th key={c} className="text-center p-2 text-xs font-semibold whitespace-nowrap" style={{ color: '#0f172a' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.attributes.map(attr => (
              <tr key={attr} className="border-t">
                <td className="p-2 font-semibold text-blue-600">{attr}</td>
                {matrix.competitors.map(c => {
                  const v = (matrix.counts[attr] && matrix.counts[attr][c]) || 0;
                  const size = 16 + Math.round((v / maxVal) * 28);
                  return (
                    <td key={c} className="p-2 text-center">
                      {v > 0 ? (
                        <div className="mx-auto rounded-full bg-sky-400/70" style={{ width: size, height: size }} title={`AI Mentions – ${v}`} />
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}

// Lightweight local sections mirroring Competitor Insight (no cross-file imports)
type ToneKey = 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
const POS_WORDS = ['great','best','top','trust','popular','recommended','winner'];
const NEG_WORDS = ['avoid','bad','scam','fake','complaint','poor'];
const toneColor = (tone: ToneKey): string => {
  if (tone === 'Positive') return 'bg-green-100 text-green-800';
  if (tone === 'Negative') return 'bg-red-100 text-red-800';
  if (tone === 'Mixed') return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-800';
};

// Robustly extract readable text from heterogeneous API fields
function toPlainText(value: any): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(v => toPlainText(v)).join(' ').trim();
  if (typeof value === 'object') {
    const preferred = ['mention','quote','text','content','answer','message','value','title'];
    for (const key of preferred) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        return toPlainText((value as any)[key]);
      }
    }
    try {
      return Object.values(value).map(v => toPlainText(v)).join(' ').trim();
    } catch {
      return '';
    }
  }
  try { return String(value); } catch { return ''; }
}

// Extract a sentence from text that mentions the brand if possible
function normalizeBrandToken(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/^www\./, '')
    .replace(/\.(com|co|io|ai|net|org|in)$/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function extractBrandSentence(text: string, brandName: string, domain?: string): string {
  const raw = toPlainText(text);
  if (!raw) return '';
  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
  const targets: string[] = [];
  if (brandName) targets.push(brandName);
  if (domain) {
    try {
      const label = domain.includes('.') ? domain.split('.')[0] : domain;
      targets.push(label);
    } catch {}
  }
  const normalizedTargets = targets.map(normalizeBrandToken).filter(Boolean);
  for (const s of sentences) {
    const ns = normalizeBrandToken(s);
    if (normalizedTargets.some(t => ns.includes(t))) return s.trim();
  }
  // Fallback: first non-empty sentence
  return sentences[0]?.trim() || raw.trim();
}

function SentimentFromCompetitor({ result }: { result: any }) {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  
  // Use real competitors from the API response
  const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
  // Dynamic suggestion generator based on tone, attribute and source
  const buildSuggestion = (tone: ToneKey, attr: string, source: string, name: string, quote: string): string => {
    const a = String(attr || 'visibility').toLowerCase();
    const s = String(source || '').toLowerCase();
    const isCommunity = /reddit|quora|forum|community/.test(s);
    const isEditorial = /forbes|allure|press|news|editorial|magazine|wirecutter|nyt|review site/.test(s);
    const isMarketplace = /amazon|walmart|etsy|ebay|marketplace/.test(s);
    const where = isCommunity ? 'community platforms' : isEditorial ? 'editorial sites' : isMarketplace ? 'marketplaces' : 'top sources';
    if (tone === 'Positive') return `Double down on strengths around ${a}. Replicate this on ${where} with structured data and fresh reviews.`;
    if (tone === 'Negative') return `Fix issues related to ${a}. Publish clear guidance on your pages and earn trusted reviews on ${where}.`;
    if (tone === 'Mixed') return `Clarify messaging about ${a}. Add FAQs and comparison content; secure authoritative citations on ${where}.`;
    return `Increase visibility for ${a}. Ship schema, PR, and third‑party reviews on ${where}.`;
  };

  const rows = comps.map(c => {
    const name = c?.name || 'Unknown';
    
    // Use backend sentiment data if available
    if (c?.sentiment && Array.isArray(c.sentiment) && c.sentiment.length > 0) {
      const s = c.sentiment[0];
      const tone = (s.tone || 'Neutral') as ToneKey;
      const attr = toPlainText(s.attr) || 'General';
      const source = toPlainText(s.source) || 'AI Analysis';
      const quoteText = toPlainText(s.quote) || toPlainText((s as any).mention) || toPlainText((s as any).text) || 'No quote available';
      return {
        name: s.name || name,
        tone,
        quote: quoteText,
        source,
        attr,
        takeaway: toPlainText(s.takeaway) || 'Analysis not available',
        suggestion: buildSuggestion(tone, attr, source, name, quoteText)
      };
    }
    
    // Otherwise, derive sentiment from AI analysis text
    const texts = [c?.analysis, c?.breakdowns?.gemini?.analysis, c?.breakdowns?.chatgpt?.analysis]
      .filter((t: any) => t !== undefined && t !== null)
      .map((t: any) => {
        if (typeof t === 'string') return t.toLowerCase();
        if (Array.isArray(t)) return t.join(' ').toLowerCase();
        try { return String(t || '').toLowerCase(); } catch { return ''; }
      });
    const allText = texts.join(' ');
    
    const posCount = POS_WORDS.filter(w => allText.includes(w)).length;
    const negCount = NEG_WORDS.filter(w => allText.includes(w)).length;
    
    let tone: ToneKey = 'Neutral';
    if (posCount > negCount && posCount > 1) tone = 'Positive';
    else if (negCount > posCount && negCount > 1) tone = 'Negative';
    else if (posCount > 0 && negCount > 0) tone = 'Mixed';
    
    const analysisTextRaw = (c?.analysis ?? c?.breakdowns?.gemini?.analysis ?? c?.breakdowns?.chatgpt?.analysis ?? '');
    const analysisText = typeof analysisTextRaw === 'string'
      ? analysisTextRaw
      : Array.isArray(analysisTextRaw)
        ? analysisTextRaw.join(' ')
        : String(analysisTextRaw || '');
    const quote = (analysisText || '').substring(0, 150) || 'No analysis available';
    
    const row = {
      name,
      tone,
      quote,
      source: 'AI Analysis',
      attr: 'General Perception',
      takeaway: tone === 'Positive' ? 'Strong brand perception' : tone === 'Negative' ? 'Challenges in brand perception' : 'Neutral brand positioning'
    } as any;
    row.suggestion = buildSuggestion(tone, row.attr, row.source, name, quote);
    return row;
  });
  return (
    <DashboardCard 
      title="Sentiment Analysis" 
      icon={<BarChartIcon className="w-4 h-4 text-blue-600" />} 
      tooltip="Shows how competitors are perceived in AI responses: Positive (praise), Neutral (factual), Negative (criticism), Mixed (both). Includes example quotes, sources, and context. Helps understand brand perception and reputation in AI-generated content."
      // action removed per request
    >
      {showInfo && <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-3">Heuristic tone derived from AI analyses when backend sentiment rows are missing.</div>}
      <div className="w-full overflow-x-auto">
        <table className="min-w-[1200px] w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[180px]">Competitor</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[110px]">Tone</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[420px]">Mention</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[120px]">Source</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[160px]">Attribute/Context</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[300px]">Key Takeaway</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[680px]">Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={`sent-${r.name}`} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium whitespace-nowrap w-[180px]" style={{ color: '#0f172a' }}>{r.name}</td>
                <td className="px-3 py-2 w-[110px]"><span className={`px-2 py-1 rounded ${toneColor(r.tone)}`}>{r.tone}</span></td>
                <td
                  className="px-3 py-2 text-gray-700 whitespace-normal break-words w-[420px] max-w-[420px]"
                  title={toPlainText(r.quote)}
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {toPlainText(r.quote)}
                </td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap w-[120px]">{r.source}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap w-[160px]">{r.attr}</td>
                <td className="px-3 py-2 text-gray-700 w-[300px]">{r.takeaway}</td>
                <td className="px-3 py-2 whitespace-normal break-words w-[680px] max-w-[680px]" style={{ color: '#000' }}>{r.suggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}

type SignalKey = 'Reviews' | 'Backlinks' | 'PR Coverage' | 'Certifications/Awards';
const SIGNAL_KEYS: SignalKey[] = ['Reviews','Backlinks','PR Coverage','Certifications/Awards'];
const SIGNAL_KEYWORDS: Record<SignalKey, string[]> = {
  Reviews: ['trustpilot','google reviews','sitejabber','review','ratings','reddit','forum'],
  Backlinks: ['backlink','high da','wirecutter','forbes.com','nytimes','domain authority','link profile'],
  'PR Coverage': ['forbes','techcrunch','press','pr','news','editorial','coverage','featured in'],
  'Certifications/Awards': ['certified','certification','ssl','badge','award','best of beauty','editor’s choice','editors choice']
};

function AuthorityFromCompetitor({ result }: { result: any }) {
  const navigate = useNavigate();
  const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
  
  // Use real competitors from the API response
  const rows = comps.map(c => {
    const name = c?.name || 'Unknown';
    const counts: Record<SignalKey, number> = { Reviews: 0, Backlinks: 0, 'PR Coverage': 0, 'Certifications/Awards': 0 };
    
    // Use backend authority data if available
    if (c?.authority && Array.isArray(c.authority) && c.authority.length > 0) {
      c.authority.forEach((a: any) => {
        const signal = (a.signal || '').toLowerCase();
        if (signal.includes('review') || signal.includes('trustpilot') || signal.includes('rating')) {
          counts.Reviews += 1;
        } else if (signal.includes('backlink') || signal.includes('domain authority')) {
          counts.Backlinks += 1;
        } else if (signal.includes('pr') || signal.includes('press') || signal.includes('coverage')) {
          counts['PR Coverage'] += 1;
        } else if (signal.includes('certification') || signal.includes('award') || signal.includes('badge')) {
          counts['Certifications/Awards'] += 1;
        } else {
          // Default to Reviews if signal type is unclear
          counts.Reviews += 1;
        }
      });
    } else {
      // Otherwise, extract from text analysis
      const texts = [
        c?.analysis,
        c?.breakdowns?.gemini?.analysis,
        c?.breakdowns?.chatgpt?.analysis,
        c?.breakdowns?.perplexity?.analysis,
        c?.breakdowns?.claude?.analysis
      ]
        .filter((v) => v !== undefined && v !== null)
        .map((t: any) => String(t || '').toLowerCase());
      
      texts.forEach(text => {
        SIGNAL_KEYS.forEach(key => {
          const keywords = SIGNAL_KEYWORDS[key] || [];
          keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
              counts[key] = (counts[key] || 0) + 1;
            }
          });
        });
      });
    }
    
    return { name, counts };
  });
  return (
    <DashboardCard 
      title="Authority Signals" 
      icon={<BarChartIcon className="w-4 h-4 text-blue-600" />} 
      tooltip="Shows trust signals that make AI recommend competitors: Reviews (Trustpilot, Google), Backlinks (high DA sites), PR Coverage (Forbes, TechCrunch), Certifications/Awards. Stacked bars show per-competitor breakdown. Helps understand what builds AI trust."
      // action removed per request
    >
      <div className="flex items-end gap-3 overflow-x-auto">
        {rows.map(r => {
          const total = SIGNAL_KEYS.reduce((s,k)=>s+(r.counts[k]||0),0) || 1;
          return (
            <div key={r.name} className="flex flex-col items-center flex-shrink-0">
              <div className="w-20 h-40 bg-gray-100 rounded-md overflow-hidden flex flex-col justify-end">
                <div className="bg-rose-400" style={{ height: `${(r.counts['Certifications/Awards']/total)*100}%` }} />
                <div className="bg-amber-400" style={{ height: `${(r.counts['PR Coverage']/total)*100}%` }} />
                <div className="bg-emerald-400" style={{ height: `${(r.counts['Backlinks']/total)*100}%` }} />
                <div className="bg-sky-400" style={{ height: `${(r.counts['Reviews']/total)*100}%` }} />
              </div>
              <div className="mt-2 text-xs font-medium text-gray-800">{r.name}</div>
              <div className="text-[11px] text-gray-600">{total}</div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

const FAQ_SOURCE_CATS = ['Reddit','Quora','Trustpilot','Forums'] as const;
type FAQSourceCat = typeof FAQ_SOURCE_CATS[number];
const FAQ_THEMES = ['Safe checkout','Fast shipping','Return policy','Trusted reviews','Authenticity'] as const;
type FAQTheme = typeof FAQ_THEMES[number];
const FAQ_SRC_KWS: Record<FAQSourceCat, string[]> = { Reddit: ['reddit'], Quora: ['quora'], Trustpilot: ['trustpilot'], Forums: ['forum'] };
const FAQ_THEME_KWS: Record<FAQTheme, string[]> = {
  'Safe checkout': ['safe','secure','trusted','checkout'],
  'Fast shipping': ['fast shipping','next-day','prime','quick delivery'],
  'Return policy': ['return','refund','policy'],
  'Trusted reviews': ['review','rating','trustpilot','reddit','quora'],
  'Authenticity': ['authentic','genuine','fake','scam']
};

function FAQFromCompetitor({ result }: { result: any }) {
  const navigate = useNavigate();
  const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
  // Build per-competitor FAQ-style row (table output)
  type FAQRow = { name: string; tone: 'Neutral' | 'Advisory'; mention: string; source: string; signals: string; suggestion: string };
  const buildFaqSuggestion = (tone: 'Neutral' | 'Advisory', signals: string, source: string): string => {
    const sig = signals && signals !== '—' ? signals.toLowerCase() : 'safe checkout, fast shipping, easy returns, verified reviews';
    const src = source || 'top sources';
    if (tone === 'Advisory') {
      return `Strengthen presence on ${src}. Highlight ${sig}; add FAQs and structured data to win advisory answers.`;
    }
    return `Increase visibility on ${src}. Add trust signals (${sig}) and collect third‑party reviews to convert neutral answers.`;
  };
  const getTone = (text: string): 'Neutral' | 'Advisory' => (/recommend|good option|best place|you should|try |safe|trusted|we suggest|if you want/.test(text) ? 'Advisory' : 'Neutral');
  const detectSignals = (text: string): string[] => {
    const found: string[] = [];
          (FAQ_THEMES as readonly FAQTheme[]).forEach((theme: FAQTheme) => {
      if (FAQ_THEME_KWS[theme].some((k: string) => text.includes(k))) found.push(theme);
    });
    // Additional phrasing for returns/reviews that users asked for
    if (/reliable\s+returns|easy\s+returns|hassle[-\s]?free\s+returns|refunds?/.test(text)) {
      found.push('Return policy' as FAQTheme);
    }
    if (/verified\s+reviews|trusted\s+reviews/.test(text)) {
      found.push('Trusted reviews' as FAQTheme);
    }
    return Array.from(new Set(found));
  };

  const detectSource = (text: string, fallback: string): string => {
    for (const cat of FAQ_SOURCE_CATS as readonly FAQSourceCat[]) {
      if (FAQ_SRC_KWS[cat].some(k => text.includes(k))) return cat;
    }
    if (/sitejabber/.test(text)) return 'SiteJabber';
    return fallback || 'AI Analysis';
  };

  const buildRows: FAQRow[] = comps.map((c: any) => {
    const name = c?.name || 'Unknown';
    // Prefer backend FAQ entry
    if (Array.isArray(c?.faq) && c.faq.length > 0) {
      const f = c.faq[0];
      const question = toPlainText(f.question || '');
      const answer = toPlainText(f.answer || '');
      const sourceRaw = toPlainText(f.source || '');
      const combined = `${sourceRaw} ${question} ${answer}`.toLowerCase();
      const tone = getTone(combined);
      const src = detectSource(combined, sourceRaw);
      const sigs = detectSignals(combined);
      // Prefer a sentence from the ANSWER that shows this company being mentioned
      const mentionSource = answer || toPlainText((f as any).mention) || question || '';
      const mention = extractBrandSentence(mentionSource, name, c?.domain) || '—';
      const signals = (sigs.join(', ') || '—');
      return { name, tone, mention, source: src, signals, suggestion: buildFaqSuggestion(tone, signals, src) };
    }
    // Otherwise, derive from analysis text
    const texts = [
      c?.analysis,
      c?.breakdowns?.gemini?.analysis,
      c?.breakdowns?.chatgpt?.analysis,
      c?.breakdowns?.perplexity?.analysis,
      c?.breakdowns?.claude?.analysis
    ]
      .filter((t: any) => t !== undefined && t !== null)
      .map((t: any) => toPlainText(t));
    const blob = texts.join(' ').toLowerCase();
    const tone = getTone(blob);
    const src = detectSource(blob, '');
    const sigs = detectSignals(blob);
    // Choose a sentence that mentions the brand if possible
    const sentence = extractBrandSentence(texts.join(' '), name, c?.domain);
    const mention = String(sentence || '').trim() || '—';
    const signals = (sigs.join(', ') || '—');
    return { name, tone, mention, source: src, signals, suggestion: buildFaqSuggestion(tone, signals, src) };
  });
  const rows = buildRows;
  return (
    <DashboardCard 
      title="FAQ / Conversational Mentions" 
      icon={<BarChartIcon className="w-4 h-4 text-blue-600" />} 
      tooltip="Shows competitors mentioned in Q&A-style AI responses: where to buy, safety, trust. Table lists tone, example mention, source, highlighted trust signals, and why this matters."
      // action removed per request
    >
          <div className="w-full overflow-x-auto">
        <table className="min-w-[1200px] w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[180px]">Competitor</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[110px]">Tone</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[300px]">Mentions</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[180px]">Trust Signals</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[120px]">Source</th>
              <th className="px-3 py-2 text-left border-b border-gray-200 w-[560px]">Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={`faq-${r.name}`} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium whitespace-nowrap w-[180px]" style={{ color: '#0f172a' }}>{r.name}</td>
                <td className="px-3 py-2 w-[110px]"><span className={`px-2 py-1 rounded ${r.tone === 'Advisory' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{r.tone}</span></td>
                <td
                  className="px-3 py-2 text-gray-700 whitespace-normal break-words w-[300px] max-w-[300px]"
                  title={r.mention}
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {r.mention}
                </td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap w-[180px]">{r.signals}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap w-[120px]">{r.source}</td>
                <td className="px-3 py-2 whitespace-normal break-words w-[560px] max-w-[560px]" style={{ color: '#000' }}>{r.suggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}

export function ProductInsights() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stableUserId = user?.id || user?.email || user?.name || 'anonymous';
  const CLEARED_KEY = `kabini_cleared_product_insights_${stableUserId}`;
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [country, setCountry] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('auto');
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasClearedData, setHasClearedData] = useState<boolean>(false);

  // Restore saved analysis results on component mount
  useEffect(() => {
    const wasCleared = localStorage.getItem(CLEARED_KEY) === '1';
    if (wasCleared) {
      localStorage.removeItem(CLEARED_KEY);
      setAnalysisResult(null);
      return;
    }

    // Skip if we already have meaningful data
    const hasMeaningfulData = analysisResult && Array.isArray(analysisResult?.competitors) && analysisResult.competitors.length > 0;
    if (hasMeaningfulData) return;

    try {
      // PRIORITY 1: unified cache using last target from userStateManager
      const savedState = userStateManager.restoreState('product-insights');
      const lastTarget = savedState?.websiteUrl || '';
      if (lastTarget) {
        const cached = unifiedCache.getPage(lastTarget, 'productInsight');
        if (cached) {
          setWebsiteUrl(lastTarget);
          if (savedState.selectedIndustry) setSelectedIndustry(savedState.selectedIndustry);
          setAnalysisResult({ ...cached, targetUrl: lastTarget, originalInput: lastTarget });
          return;
        }
      }

      // PRIORITY 2: userStateManager
      if (savedState && savedState.websiteUrl) {
        setWebsiteUrl(savedState.websiteUrl);
        if (savedState.selectedIndustry) setSelectedIndustry(savedState.selectedIndustry);
        if (savedState.analysisResult) {
          setAnalysisResult(savedState.analysisResult);
          return;
        }
      }

      // PRIORITY 3: sessionManager fallback
      const session = sessionManager.getLatestAnalysisSession('product-insights', stableUserId);
      if (session && session.data) {
        if (session.inputValue) setWebsiteUrl(session.inputValue);
        setAnalysisResult(session.data);
      }
    } catch (e) {
      console.warn('[ProductInsights] Restore failed:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CLEARED_KEY, stableUserId]);

  // Save state when navigating away
  useEffect(() => {
    return () => {
      if (analysisResult && websiteUrl) {
        const stateToSave = { websiteUrl, selectedIndustry, analysisResult };
        userStateManager.saveState('product-insights', stateToSave);
      }
    };
  }, [analysisResult, websiteUrl, selectedIndustry]);
  
  const startAnalysis = async (forceRefresh = false) => {
    if (!websiteUrl.trim()) {
      setError('Website URL is required.');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const industry = selectedIndustry === 'auto' ? 'Ecommerce & Retail' : selectedIndustry;
      const target = websiteUrl.trim();
      
      // If force refresh, clear cache first
      if (forceRefresh) {
        console.log('[ProductInsights] Force refresh - clearing cache for:', target);
        unifiedCache.delete(target);
      }
      
      // NEW UNIFIED APPROACH: Check cache first, run current page + background others
      const cachedProductInsight = unifiedCache.getPage(target, 'productInsight');
      if (cachedProductInsight && !forceRefresh) {
        console.log('[ProductInsights] Using cached product insight data');
        console.log('[ProductInsights] Cached competitors count:', cachedProductInsight?.competitors?.length || 0);
        console.log('[ProductInsights] Cached competitors:', cachedProductInsight?.competitors?.map((c: any) => c?.name || c).join(', ') || 'None');
          const result = {
          ...cachedProductInsight,
            targetUrl: target,
            originalInput: target,
        };
          setAnalysisResult(result);
        setIsAnalyzing(false);

        // Save state for restoration
        userStateManager.saveState('product-insights', {
          websiteUrl: target,
          selectedIndustry: industry,
          analysisResult: result
        });
        
        // Still trigger background refresh for other pages if needed
        backgroundOrchestrator.runFullAnalysis({
          target,
          originalInput: target,
          industry,
          currentPage: 'productInsight',
          userId: stableUserId
        }).catch(e => console.warn('[ProductInsights] Background analysis failed:', e));
        
        return;
      }

      // Run fresh product insight analysis + trigger background for other pages
      console.log('[ProductInsights] Running fresh product insight analysis');
      
      const result = await backgroundOrchestrator.getCurrentPageAnalysis(
        'productInsight',
        target,
        target,
        industry
      );
      
      if (!result) {
        console.warn('[ProductInsights] Analysis returned null');
        setError('Analysis failed. Please try again or check Competitor Insight page first.');
        setIsAnalyzing(false);
        return;
      }
      
      console.log('[ProductInsights] Fresh analysis complete');
      console.log('[ProductInsights] Fresh competitors count:', result?.competitors?.length || 0);
      console.log('[ProductInsights] Fresh competitors:', result?.competitors?.map((c: any) => c?.name || c).join(', ') || 'None');
      
      // Show info message if only 1 competitor, but still display the data
      if (result?.competitors?.length < 2) {
        console.warn('[ProductInsights] Only 1 competitor detected - limited data available');
        console.log('[ProductInsights] TIP: Go to Dashboard or Competitor Insight first for better results');
      }
      
      const enhancedResult = {
        ...result,
        targetUrl: target,
        originalInput: target,
      };
      
      setAnalysisResult(enhancedResult);
      // Save state for restoration
      userStateManager.saveState('product-insights', {
        websiteUrl: target,
        selectedIndustry: industry,
        analysisResult: enhancedResult
      });
        
      // Fire background analysis for other pages (fire-and-forget)
      backgroundOrchestrator.runFullAnalysis({
        target,
        originalInput: target,
        industry,
        currentPage: 'productInsight',
        userId: stableUserId
      }).catch(e => console.warn('[ProductInsights] Background analysis failed:', e));
        
      // Legacy: Save to session storage
        try {
          sessionManager.saveAnalysisSession(
            'product-insights',
          enhancedResult,
          target,
            industry,
            'url',
            industry,
            stableUserId
          );
          console.log('[ProductInsights] Analysis results saved to session storage');
        } catch (saveError) {
          console.error('[ProductInsights] Error saving analysis results:', saveError);
      }
    } catch (e: any) {
      console.error('[ProductInsights] Analysis error:', e);
      setError(e?.message || 'Failed to analyze');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Removed fallback useEffect - scores are now fetched directly in startAnalysis

  const computeVisibilityScore = (result: any): number => {
    console.log('[computeVisibilityScore] Called with result:', result);
    console.log('[computeVisibilityScore] targetScores:', result?.targetScores);
    
    // Use direct target score if available (from ecommerce content analysis)
    if (result?.targetScores?.aiVisibilityScore !== undefined) {
      const score = Number(result.targetScores.aiVisibilityScore);
      console.log('[computeVisibilityScore] Using direct target score:', score);
      return score / 10; // Convert 0-100 to 0-10 for card display
    }

    // Fallback: calculate from competitor data
    const competitors: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    if (competitors.length === 0) {
      console.log('[computeVisibilityScore] No competitors, returning 0');
      return 0;
    }

    // Calculate share of voice from mentions
    const rawInput = String(result?.originalInput || websiteUrl || '').trim();
    const norm = (s: string) => s.toLowerCase().replace(/^www\./, '');
    const getLabelFromUrl = (input: string) => {
      try {
        const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
        return norm(u.hostname).split('.')[0];
      } catch { return norm(input).split(/[\/\s]/)[0]; }
    };
    const targetLabel = getLabelFromUrl(rawInput);

    const match = competitors.find(c => {
      const d = norm(String(c?.domain || ''));
      const n = norm(String(c?.name || ''));
      return d.includes(targetLabel) || n.includes(targetLabel);
    });

    if (match) {
      const mentions = Number(match?.aiTraffic?.totalMentions || match?.mentions || 0);
      const sumAll = competitors.reduce((acc, c) => acc + Number(c?.aiTraffic?.totalMentions || c?.mentions || 0), 0) || 1;
      const sharePercent = (mentions / sumAll) * 100;
      console.log('[computeVisibilityScore] Calculated from mentions:', sharePercent);
      return sharePercent / 10;
    }

    console.log('[computeVisibilityScore] No match found, returning 0');
    return 0;
  };

  const computeReadinessScore = (result: any): number => {
    console.log('[computeReadinessScore] Called with result:', result);
    console.log('[computeReadinessScore] targetScores:', result?.targetScores);
    console.log('[computeReadinessScore] aiReadinessScore:', result?.targetScores?.aiReadinessScore);
    
    // Use direct target score if available (from ecommerce content analysis)
    if (result?.targetScores?.aiReadinessScore !== undefined) {
      const score = Number(result.targetScores.aiReadinessScore);
      console.log('[computeReadinessScore] Using direct target score:', score);
      return Math.round(score);
    }

    // Fallback: use competitor data
    if (!result || !Array.isArray(result?.competitors) || result.competitors.length === 0) {
      console.log('[computeReadinessScore] No data available, returning 0');
      return 0;
    }

    const competitors: any[] = result.competitors;
    const rawInput = String(result?.originalInput || websiteUrl || '').trim();
    const norm = (s: string) => s.toLowerCase().replace(/^www\./, '');
    const getLabelFromUrl = (input: string) => {
      try {
        const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
        return norm(u.hostname).split('.')[0];
      } catch { return norm(input).split(/[\/\s]/)[0]; }
    };
    const targetLabel = getLabelFromUrl(rawInput);

    const match = competitors.find(c => {
      const d = norm(String(c?.domain || ''));
      const n = norm(String(c?.name || ''));
      return d.includes(targetLabel) || n.includes(targetLabel);
    });

    if (match) {
      if (typeof match.contentOptimizationScore === 'number') {
        console.log('[computeReadinessScore] Using match contentOptimizationScore:', match.contentOptimizationScore);
        return Math.round(match.contentOptimizationScore);
      }
      const schemaScore = Math.min(30, (Number(match?.schemaMarkup) || 0) * 3);
      const contentScore = Math.min(40, (Number(match?.contentQuality) || 0) * 4);
      const trustScore = Math.min(30, (Number(match?.trustSignals) || 0) * 3);
      const total = Math.round(schemaScore + contentScore + trustScore);
      console.log('[computeReadinessScore] Calculated from components:', total);
      return total;
    }

    console.log('[computeReadinessScore] No match found, returning 0');
    return 0;
  };

  const clearAnalysisData = () => {
    try {
      sessionManager.clearSessionsByType('product-insights');
      setAnalysisResult(null);
      setWebsiteUrl('');
      setProductName('');
      setProductCategory('');
      setCompetitorName('');
      setCountry('');
      setSelectedIndustry('auto');
      setError(null);
      try { localStorage.setItem(CLEARED_KEY, '1'); } catch {}
      console.log('[ProductInsights] Analysis data cleared');
    } catch (error) {
      console.error('[ProductInsights] Error clearing analysis data:', error);
    }
  };

  // Decide what data to render in the results section
  // - When there is a real analysisResult, show it
  // - After clicking New Analysis (hasClearedData === true), hide results entirely
  const resultData = analysisResult;

  // Conditional rendering: Show input form when no analysis, show results when analysis exists
  if (!analysisResult) {
  return (
    <div className="w-full max-w-full mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-1 transition-colors shadow-sm mb-2 text-sm" onClick={() => navigate('/ai-visibility-analysis')}>← Back to Competitor Insight</button>
        </div>
      </div>

      {/* Product Analysis Dashboard Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Product Analysis Dashboard</h2>
          <p className="text-gray-600 text-lg">Enter your product details to get comprehensive product insights and competitive analysis.</p>
        </div>
        {/* Analysis Configuration - Structured Inputs */}
        <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 sm:p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:[grid-template-columns:repeat(24,minmax(0,1fr))] gap-3 items-end">
              <div className="flex flex-col gap-1 lg:col-span-7">
                <label htmlFor="websiteUrl" className="text-xs font-semibold text-gray-700">Website URL <span className="text-red-500">*</span></label>
                <input
                  id="websiteUrl"
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => handleEmojiFilteredInput(e, setWebsiteUrl)}
                  onPaste={(e) => handlePaste(e, setWebsiteUrl)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://example.com"
                  required
                  className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm w-full"
                />
              </div>
              <div className="flex flex-col gap-1 lg:col-span-3">
                <label htmlFor="productName" className="text-xs font-semibold text-gray-700">Product Name</label>
                <input
                  id="productName"
                  type="text"
                  value={productName}
                  onChange={(e) => handleEmojiFilteredInput(e, setProductName)}
                  onPaste={(e) => handlePaste(e, setProductName)}
                  onKeyDown={handleKeyDown}
                  placeholder="Product Name"
                  className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm w-full"
                />
              </div>
              <div className="flex flex-col gap-1 lg:col-span-3">
                <label htmlFor="productCategory" className="text-xs font-semibold text-gray-700">Product Category</label>
                <select
                  id="productCategory"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm w-full"
                >
                  <option value="">Select Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Home and Garden">Home and Garden</option>
                  <option value="Sports">Sports</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Books">Books</option>
                  <option value="Health">Health</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 lg:col-span-3">
                <label htmlFor="competitorName" className="text-xs font-semibold text-gray-700">Known Competitor</label>
                <input
                  id="competitorName"
                  type="text"
                  value={competitorName}
                  onChange={(e) => handleEmojiFilteredInput(e, setCompetitorName)}
                  onPaste={(e) => handlePaste(e, setCompetitorName)}
                  onKeyDown={handleKeyDown}
                  placeholder="Known Competitor"
                  className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm w-full"
                />
              </div>
              <div className="flex flex-col gap-1 lg:col-span-3">
                <label htmlFor="country" className="text-xs font-semibold text-gray-700">Country</label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm w-full"
                >
                  <option value="">Country</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="India">India</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Singapore">Singapore</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 lg:col-span-3">
                <label htmlFor="industry" className="text-xs font-semibold text-gray-700">Industry</label>
                <select
                  id="industry"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="h-11 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm w-full"
                  disabled={isAnalyzing}
                  title="Select industry"
                >
                  <option value="auto">Industry</option>
                  <option value="Information Technology & Services">Information Technology & Services</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Legal">Legal</option>
                  <option value="Ecommerce & Retail">Ecommerce & Retail</option>
                  <option value="Media">Media</option>
                  <option value="Education">Education</option>
                  <option value="Marketing & Advertising">Marketing & Advertising</option>
                  <option value="Computer Software / Internet">Computer Software / Internet</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); startAnalysis(false); }}
                disabled={isAnalyzing || !websiteUrl.trim()}
                className="h-11 px-4 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow w-full text-sm lg:col-span-2 self-end"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analyse
                  </>
                )}
              </button>
            </div>
          </div>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    );
  }

  // Show results when analysis exists
  return (
    <div className="w-full max-w-full mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
      {/* Analysis Results Section */}
      <div className="mb-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4">
          <div className="justify-self-start">
            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-1 transition-colors shadow-sm text-sm" onClick={() => navigate('/ai-visibility-analysis')}>← Back to Competitor Insight</button>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Analysis Results</h2>
            <p className="text-gray-600 text-lg">
              Analysis completed for: <HighlightedLink value={(resultData?.originalInput || websiteUrl) as string} />
            </p>
          </div>
          <div className="justify-self-end flex gap-2">
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
              onClick={(e) => { e.preventDefault(); startAnalysis(true); }}
              disabled={isAnalyzing}
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
              onClick={clearAnalysisData}
            >
              <FileText className="w-4 h-4" />
              New Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {resultData && (
        <div className="space-y-6">

          {/* AI Scores Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIVisibilityScoreCard score={computeVisibilityScore(resultData)} />
            <AIReadinessScoreCard score={computeReadinessScore(resultData)} />
          </div>

            {/* Product Analysis by GEO */}
          <ProductGeoBubbleChart result={resultData} />

            {/* Sentiment Analysis (reuse from Competitor Insight) */}
            {/* Implementation mirrors SentimentTableSection from AIVisibilityAnalysis */}
          <SentimentFromCompetitor result={resultData} />

            {/* Authority Signals (reuse) */}
          <AuthorityFromCompetitor result={resultData} />

            {/* FAQ / Conversational Mentions (reuse) */}
          <FAQFromCompetitor result={resultData} />
        </div>
        )}
    </div>
  );
}

export default ProductInsights;


