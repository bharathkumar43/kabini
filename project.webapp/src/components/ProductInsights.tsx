import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 as BarChartIcon, Zap, Search, Loader2, FileText, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { sessionManager } from '../services/sessionManager';
import { handleInputChange as handleEmojiFilteredInput, handlePaste, handleKeyDown } from '../utils/emojiFilter';

function DashboardCard({ title, icon, iconBgColor, children, tooltip }: { title: string; icon: React.ReactNode; iconBgColor: string; children: React.ReactNode; tooltip?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-300 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${iconBgColor}`}>{icon}</div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {tooltip && (
          <button
            className="text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            title={tooltip}
          >
            i
          </button>
        )}
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
    <DashboardCard title="AI Visibility Score" icon={<Eye className="w-5 h-5 text-blue-600" />} iconBgColor="bg-gray-200" tooltip="Shows estimated visibility percentage based on share of mentions across AI tools. Higher scores indicate stronger brand presence and recognition in AI responses. This metric helps understand how visible your brand is compared to competitors in AI-generated content.">
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
    <DashboardCard title="AI Readiness Score" icon={<BarChartIcon className="w-5 h-5 text-blue-600" />} iconBgColor="bg-gray-200" tooltip="Measures how well your content is optimized for AI understanding and recommendations. Based on schema markup, content quality, trust signals, and technical SEO. Higher scores indicate better AI readiness and higher chances of being recommended by AI tools.">
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
  
  // Always use demo data for Product Insights
  const demoCompetitors = ['Sephora', 'Ulta', 'Amazon', 'Target', 'Walmart'];
  const demoData: Record<string, Record<string, number>> = {
    'Quality': { 'Sephora': 8, 'Ulta': 7, 'Amazon': 6, 'Target': 5, 'Walmart': 4 },
    'Price': { 'Sephora': 4, 'Ulta': 6, 'Amazon': 8, 'Target': 7, 'Walmart': 9 },
    'Brand': { 'Sephora': 9, 'Ulta': 7, 'Amazon': 5, 'Target': 6, 'Walmart': 4 },
    'Organic': { 'Sephora': 6, 'Ulta': 5, 'Amazon': 4, 'Target': 7, 'Walmart': 3 },
    'Sustainable': { 'Sephora': 7, 'Ulta': 6, 'Amazon': 5, 'Target': 8, 'Walmart': 4 },
    'Variety': { 'Sephora': 9, 'Ulta': 8, 'Amazon': 9, 'Target': 7, 'Walmart': 6 }
  };
  
  return { attributes, competitors: demoCompetitors, counts: demoData };
}

function ProductGeoBubbleChart({ result }: { result: any }) {
  const matrix = computeAttributeMatrix(result);
  const maxVal = Math.max(1, ...matrix.attributes.flatMap(a => Object.values(matrix.counts[a] || {})));
  return (
    <DashboardCard title="Product Analysis by GEO" icon={<BarChartIcon className="w-5 h-5 text-blue-600" />} iconBgColor="bg-gray-200" tooltip="Shows which product attributes (luxury, affordable, organic, sustainable) AI associates with each competitor in location-aware queries. Bubble size indicates frequency of association. Helps understand how competitors are positioned in the market and identify attribute gaps.">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-xs text-black font-semibold">Attribute</th>
              {matrix.competitors.map(c => (
                <th key={c} className="text-center p-2 text-xs text-black font-semibold">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.attributes.map(attr => (
              <tr key={attr} className="border-t">
                <td className="p-2 font-semibold text-black">{attr}</td>
                {matrix.competitors.map(c => {
                  const v = (matrix.counts[attr] && matrix.counts[attr][c]) || 0;
                  const size = 16 + Math.round((v / maxVal) * 28);
                  return (
                    <td key={c} className="p-2 text-center">
                      {v > 0 ? (
                        <div className="mx-auto rounded-full bg-sky-400/70" style={{ width: size, height: size }} title={`${attr} – ${c}: ${v}`} />
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

function SentimentFromCompetitor({ result }: { result: any }) {
  const [showInfo, setShowInfo] = useState(false);
  
  // Always use demo data for Product Insights
  const rows = [
    { name: 'Sephora', tone: 'Positive' as ToneKey, quote: 'Sephora is the leading beauty retailer with an extensive product range and excellent customer service.', source: 'Beauty Industry Report', attr: 'Brand Authority', takeaway: 'Strong positive sentiment reinforces market leadership position.' },
    { name: 'Ulta', tone: 'Positive' as ToneKey, quote: 'Ulta provides great value with both high-end and drugstore beauty brands.', source: 'Beauty Blog', attr: 'Value Proposition', takeaway: 'Positive framing emphasizes value and accessibility.' },
    { name: 'Amazon', tone: 'Neutral' as ToneKey, quote: 'Amazon offers convenience and fast shipping for beauty products.', source: 'E-commerce Review', attr: 'Convenience', takeaway: 'Neutral sentiment suggests opportunity for brand differentiation.' },
    { name: 'Target', tone: 'Positive' as ToneKey, quote: 'Target offers affordable beauty products with good quality and trendy selections.', source: 'Retail Review', attr: 'Affordability', takeaway: 'Positive sentiment around value and trendiness.' },
    { name: 'Walmart', tone: 'Neutral' as ToneKey, quote: 'Walmart provides basic beauty products at low prices for budget-conscious consumers.', source: 'Consumer Report', attr: 'Price', takeaway: 'Neutral sentiment focused on price point.' }
  ];
  return (
    <DashboardCard title="Sentiment Analysis" icon={<BarChartIcon className="w-5 h-5 text-blue-600" />} iconBgColor="bg-gray-200" tooltip="Shows how competitors are perceived in AI responses: Positive (praise), Neutral (factual), Negative (criticism), Mixed (both). Includes example quotes, sources, and context. Helps understand brand perception and reputation in AI-generated content.">
      <div className="mb-3">
        <div className="text-xs text-gray-600">Tone, example mention, source, attribute/context, and takeaway per competitor.</div>
      </div>
      {showInfo && <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 mb-3">Heuristic tone derived from AI analyses when backend sentiment rows are missing.</div>}
      <div className="w-full overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left border-b border-gray-200">Competitor</th>
              <th className="px-3 py-2 text-left border-b border-gray-200">Tone</th>
              <th className="px-3 py-2 text-left border-b border-gray-200">Example Mention</th>
              <th className="px-3 py-2 text-left border-b border-gray-200">Source</th>
              <th className="px-3 py-2 text-left border-b border-gray-200">Attribute/Context</th>
              <th className="px-3 py-2 text-left border-b border-gray-200">Key Takeaway</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={`sent-${r.name}`} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.name}</td>
                <td className="px-3 py-2"><span className={`px-2 py-1 rounded ${toneColor(r.tone)}`}>{r.tone}</span></td>
                <td className="px-3 py-2 text-gray-800">{r.quote}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.source}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.attr}</td>
                <td className="px-3 py-2 text-gray-800">{r.takeaway}</td>
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
  const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
  
  // Always use demo data for Product Insights
  const rows = [
    { name: 'Sephora', counts: { Reviews: 8, Backlinks: 6, 'PR Coverage': 7, 'Certifications/Awards': 9 } },
    { name: 'Ulta', counts: { Reviews: 7, Backlinks: 5, 'PR Coverage': 6, 'Certifications/Awards': 7 } },
    { name: 'Amazon', counts: { Reviews: 9, Backlinks: 9, 'PR Coverage': 8, 'Certifications/Awards': 6 } },
    { name: 'Target', counts: { Reviews: 6, Backlinks: 4, 'PR Coverage': 5, 'Certifications/Awards': 5 } },
    { name: 'Walmart', counts: { Reviews: 5, Backlinks: 3, 'PR Coverage': 4, 'Certifications/Awards': 3 } }
  ];
  const totals: Record<SignalKey, number> = { Reviews: 0, Backlinks: 0, 'PR Coverage': 0, 'Certifications/Awards': 0 };
  rows.forEach(r => SIGNAL_KEYS.forEach(k => { totals[k] += r.counts[k]; }));
  const max = Math.max(1, ...Object.values(totals));
  const color: Record<SignalKey, string> = { Reviews: 'bg-sky-400', Backlinks: 'bg-emerald-400', 'PR Coverage': 'bg-amber-400', 'Certifications/Awards': 'bg-rose-400' };
  return (
    <DashboardCard title="Authority Signals" icon={<BarChartIcon className="w-5 h-5 text-blue-600" />} iconBgColor="bg-gray-200" tooltip="Shows trust signals that make AI recommend competitors: Reviews (Trustpilot, Google), Backlinks (high DA sites), PR Coverage (Forbes, TechCrunch), Certifications/Awards. Stacked bars show per-competitor breakdown, donut shows overall distribution. Helps understand what builds AI trust.">
      <div className="flex items-center gap-4 text-sm mb-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-gray-800"><span className="inline-block w-3 h-3 rounded bg-sky-400" /> Reviews</span>
          <span className="inline-flex items-center gap-1 text-gray-800"><span className="inline-block w-3 h-3 rounded bg-emerald-400" /> Backlinks</span>
          <span className="inline-flex items-center gap-1 text-gray-800"><span className="inline-block w-3 h-3 rounded bg-amber-400" /> PR Coverage</span>
          <span className="inline-flex items-center gap-1 text-gray-800"><span className="inline-block w-3 h-3 rounded bg-rose-400" /> Certifications/Awards</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-end gap-6">
          {rows.slice(0, 2).map(r => {
            const total = SIGNAL_KEYS.reduce((s,k)=>s+(r.counts[k]||0),0) || 1;
            return (
              <div key={r.name} className="flex flex-col items-center">
                <div className="w-28 h-40 bg-gray-100 rounded-md overflow-hidden flex flex-col justify-end">
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
        <div className="flex items-center gap-8">
          <div className="relative" style={{ width: 220, height: 220 }}>
            <div className="absolute inset-0 rounded-full border-[18px] border-sky-400" />
            <div className="absolute inset-6 rounded-full border-[18px] border-emerald-400" />
            <div className="absolute inset-12 rounded-full border-[18px] border-amber-400" />
            <div className="absolute inset-[72px] rounded-full border-[18px] border-rose-400 flex items-center justify-center text-sm font-semibold">{SIGNAL_KEYS.reduce((s,k)=>s+(totals[k]||0),0)}</div>
          </div>
          <div className="text-sm">
            {SIGNAL_KEYS.map(k => (
              <div key={k} className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded ${color[k]}`} />
                <span className="w-40 text-gray-800">{k}</span>
                <span className="text-gray-700">{totals[k]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

const FAQ_SOURCE_CATS = ['Reddit','Quora','Trustpilot','Forums'] as const;
const FAQ_THEMES = ['Safe checkout','Fast shipping','Return policy','Trusted reviews','Authenticity'] as const;
const FAQ_SRC_KWS: Record<typeof FAQ_SOURCE_CATS[number], string[]> = { Reddit: ['reddit'], Quora: ['quora'], Trustpilot: ['trustpilot'], Forums: ['forum'] };
const FAQ_THEME_KWS: Record<typeof FAQ_THEMES[number], string[]> = {
  'Safe checkout': ['safe','secure','trusted','checkout'],
  'Fast shipping': ['fast shipping','next-day','prime','quick delivery'],
  'Return policy': ['return','refund','policy'],
  'Trusted reviews': ['review','rating','trustpilot','reddit','quora'],
  'Authenticity': ['authentic','genuine','fake','scam']
};

function FAQFromCompetitor({ result }: { result: any }) {
  const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
  const competitorCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = { Reddit: 0, Quora: 0, Trustpilot: 0, Forums: 0 };
  const themeCounts: Record<string, number> = { 'Safe checkout': 0, 'Fast shipping': 0, 'Return policy': 0, 'Trusted reviews': 0, 'Authenticity': 0 };
  
  // Always use demo data for Product Insights
  const demoCompetitorCounts = { 'Sephora': 12, 'Ulta': 8, 'Amazon': 15, 'Target': 6, 'Walmart': 4 };
  const demoSourceCounts = { Reddit: 8, Quora: 6, Trustpilot: 12, Forums: 4 };
  const demoThemeCounts = { 'Safe checkout': 10, 'Fast shipping': 8, 'Return policy': 6, 'Trusted reviews': 12, 'Authenticity': 5 };
  
  Object.assign(competitorCounts, demoCompetitorCounts);
  Object.assign(sourceCounts, demoSourceCounts);
  Object.assign(themeCounts, demoThemeCounts);
  
  // Keep the else block for future real data processing
  if (false) {
  comps.forEach(c => {
    const name = c?.name || 'Unknown';
    const texts = [
      c?.analysis,
      c?.breakdowns?.gemini?.analysis,
      c?.breakdowns?.chatgpt?.analysis,
      c?.breakdowns?.perplexity?.analysis,
      c?.breakdowns?.claude?.analysis
    ]
      .filter((v) => v !== undefined && v !== null)
      .map((t: any) => String(t || '').toLowerCase());
    let count = 0;
    texts.forEach(t => {
      if (t.includes('where can i') || t.includes('where to buy') || t.includes('faq')) count += 1;
      (FAQ_SOURCE_CATS as readonly string[]).forEach(cat => { if (FAQ_SRC_KWS[cat as any].some(k => t.includes(k))) sourceCounts[cat as any] += 1; });
      (FAQ_THEMES as readonly string[]).forEach(theme => { if (FAQ_THEME_KWS[theme as any].some(k => t.includes(k))) themeCounts[theme as any] += 1; });
    });
    competitorCounts[name] = count;
  });
  }
  
  const rows = Object.entries(competitorCounts).sort((a,b) => b[1]-a[1]);
  const maxC = Math.max(1, ...rows.map(r => r[1] as number));
  const maxS = Math.max(1, ...Object.values(sourceCounts));
  const maxT = Math.max(1, ...Object.values(themeCounts));
  return (
    <DashboardCard title="FAQ / Conversational Mentions" icon={<BarChartIcon className="w-5 h-5 text-blue-600" />} iconBgColor="bg-gray-200" tooltip="Shows competitors mentioned in Q&A-style AI responses (like 'Where can I buy X safely?'). Includes source breakdown (Reddit, Quora, Trustpilot, Forums) and common themes (safe checkout, fast shipping, return policy). Captures conversational search intent and trust-building mentions.">
      <div className="text-xs text-gray-600 mb-3">Counts of FAQ-style mentions, sources referenced, and common themes.</div>
      <div className="space-y-6">
        {/* Competitor bars on top - no horizontal scroll */}
        <div>
          <div className="text-sm font-semibold mb-2 text-gray-800">Competitor FAQ Mentions</div>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[640px] flex items-end gap-4 px-1 py-2">
              {/* Y axis - consistent spacing like other graphs */}
              <div className="flex flex-col h-56 pr-2 text-[10px] text-gray-500 select-none justify-between">
                <span>100</span>
                <span>80</span>
                <span>60</span>
                <span>40</span>
                <span>20</span>
                <span>0</span>
              </div>
              {rows.map(([name, cnt]) => (
                <div key={name} className="flex flex-col items-center w-24">
                  <div className="h-56 w-full bg-gray-100 rounded-md overflow-hidden flex items-end justify-center shadow-sm">
                    <div className="w-14 bg-amber-400" style={{ height: `${(Number(cnt)/maxC)*100}%` }} title={`${name}: ${cnt}`} />
                  </div>
                  <div className="mt-2 text-xs text-black font-semibold text-center truncate w-full" title={name}>{name}</div>
                  <div className="text-[11px] text-gray-600">{cnt}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sources and Themes below in two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold mb-2 text-gray-800">Sources</div>
          <div className="space-y-2">
            {(FAQ_SOURCE_CATS as readonly string[]).map(cat => (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-24 text-xs text-gray-700">{cat}</div>
                  <div className="basis-[80%] h-3 bg-gray-100 rounded"><div className="h-3 rounded bg-sky-400" style={{ width: `${(sourceCounts[cat]/maxS)*100}%` }} /></div>
                <div className="w-8 text-right text-xs text-gray-600">{sourceCounts[cat]}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-2 text-gray-800">Themes</div>
          <div className="space-y-2">
            {(FAQ_THEMES as readonly string[]).map(theme => (
              <div key={theme} className="flex items-center gap-2">
                <div className="w-32 text-xs text-gray-700">{theme}</div>
                  <div className="basis-[80%] h-3 bg-gray-100 rounded"><div className="h-3 rounded bg-rose-400" style={{ width: `${(themeCounts[theme]/maxT)*100}%` }} /></div>
                <div className="w-8 text-right text-xs text-gray-600">{themeCounts[theme]}</div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

// Demo data function for Product Insights
function getDemoData() {
  return {
    competitors: [
      {
        name: 'Sephora',
        aiScores: { gemini: 8.2, chatgpt: 7.8, perplexity: 7.5, claude: 8.1 },
        totalScore: 7.9,
        schemaMarkup: 8,
        contentQuality: 9,
        trustSignals: 8,
        sentiment: [
          {
            name: 'Sephora',
            tone: 'Positive',
            quote: 'Sephora is the leading beauty retailer with an extensive product range and excellent customer service.',
            source: 'Beauty Industry Report',
            attr: 'Brand Authority',
            takeaway: 'Strong positive sentiment reinforces market leadership position.'
          }
        ],
        authority: [
          {
            name: 'Sephora',
            signal: 'High',
            source: 'Forbes',
            context: 'Featured in top beauty retailers list',
            takeaway: 'Strong authority signals boost credibility and trust.'
          }
        ],
        faq: [
          {
            name: 'Sephora',
            question: 'What makes Sephora different from other beauty retailers?',
            answer: 'Sephora offers exclusive brands, expert beauty advice, and a comprehensive loyalty program.',
            source: 'Customer Support',
            takeaway: 'Clear differentiation in customer communications.'
          }
        ],
        geoData: [
          { country: 'United States', score: 8.5, mentions: 45 },
          { country: 'Canada', score: 7.8, mentions: 32 },
          { country: 'United Kingdom', score: 7.2, mentions: 28 },
          { country: 'France', score: 8.1, mentions: 38 },
          { country: 'Germany', score: 6.9, mentions: 22 }
        ]
      },
      {
        name: 'Ulta',
        aiScores: { gemini: 7.1, chatgpt: 6.8, perplexity: 7.3, claude: 6.9 },
        totalScore: 7.0,
        schemaMarkup: 7,
        contentQuality: 8,
        trustSignals: 7,
        sentiment: [
          {
            name: 'Ulta',
            tone: 'Positive',
            quote: 'Ulta provides great value with both high-end and drugstore beauty brands.',
            source: 'Beauty Blog',
            attr: 'Value Proposition',
            takeaway: 'Positive framing emphasizes value and accessibility.'
          }
        ],
        authority: [
          {
            name: 'Ulta',
            signal: 'Medium',
            source: 'Beauty Magazine',
            context: 'Mentioned in beauty trends article',
            takeaway: 'Moderate authority signals suggest room for improvement.'
          }
        ],
        faq: [
          {
            name: 'Ulta',
            question: 'Does Ulta offer professional beauty services?',
            answer: 'Yes, Ulta provides salon services, brow services, and makeup application.',
            source: 'FAQ Page',
            takeaway: 'Clear service information helps customer understanding.'
          }
        ],
        geoData: [
          { country: 'United States', score: 7.8, mentions: 38 },
          { country: 'Canada', score: 6.5, mentions: 18 },
          { country: 'United Kingdom', score: 5.2, mentions: 12 },
          { country: 'France', score: 4.8, mentions: 8 },
          { country: 'Germany', score: 4.1, mentions: 6 }
        ]
      },
      {
        name: 'Amazon',
        aiScores: { gemini: 6.5, chatgpt: 6.8, perplexity: 6.2, claude: 6.7 },
        totalScore: 6.6,
        schemaMarkup: 9,
        contentQuality: 7,
        trustSignals: 9,
        sentiment: [
          {
            name: 'Amazon',
            tone: 'Neutral',
            quote: 'Amazon offers convenience and fast shipping for beauty products.',
            source: 'E-commerce Review',
            attr: 'Convenience',
            takeaway: 'Neutral sentiment suggests opportunity for brand differentiation.'
          }
        ],
        authority: [
          {
            name: 'Amazon',
            signal: 'High',
            source: 'Tech News',
            context: 'E-commerce platform authority',
            takeaway: 'High platform authority but may lack beauty-specific credibility.'
          }
        ],
        faq: [
          {
            name: 'Amazon',
            question: 'Are beauty products on Amazon authentic?',
            answer: 'Amazon has measures to ensure authenticity, but customers should buy from authorized sellers.',
            source: 'Help Center',
            takeaway: 'Addresses common authenticity concerns proactively.'
          }
        ],
        geoData: [
          { country: 'United States', score: 7.2, mentions: 52 },
          { country: 'Canada', score: 6.8, mentions: 28 },
          { country: 'United Kingdom', score: 6.5, mentions: 35 },
          { country: 'France', score: 6.1, mentions: 22 },
          { country: 'Germany', score: 6.3, mentions: 25 }
        ]
      }
    ]
  };
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
  const [hasClearedData, setHasClearedData] = useState<boolean>(() => {
    try { return localStorage.getItem(CLEARED_KEY) === '1'; } catch { return false; }
  });

  // Restore saved analysis results on component mount
  useEffect(() => {
    if (hasClearedData) {
      setAnalysisResult(null);
      return; // Don't restore if user has explicitly cleared data
    }
    
    try {
      const session = sessionManager.getLatestAnalysisSession('product-insights', stableUserId);
      if (session) {
        console.log('[ProductInsights] Restoring cached analysis data:', session);
        
        // Restore all cached values
        if (session.inputValue) setWebsiteUrl(session.inputValue);
        if (session.analysisType) setSelectedIndustry(session.analysisType);
        if (session.data) {
          setAnalysisResult(session.data);
        }
        
        console.log('[ProductInsights] Cached data restored successfully');
      } else {
        // No session for this user → clear any stale state
        setAnalysisResult(null);
        setWebsiteUrl('');
        setProductName('');
        setProductCategory('');
        setCompetitorName('');
        setCountry('');
        setSelectedIndustry('auto');
        setError(null);
      }
    } catch (error) {
      console.error('[ProductInsights] Error restoring cached data:', error);
      setError('Failed to restore previous analysis');
    }
  }, [stableUserId, hasClearedData]);

  const startAnalysis = async () => {
    if (!websiteUrl.trim()) {
      setError('Website URL is required.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const industry = selectedIndustry === 'auto' ? 'Ecommerce & Retail' : selectedIndustry;
      const res = await apiService.getAIVisibilityAnalysis(
        websiteUrl.trim(),
        industry,
        {},
        {
          productName: productName.trim() || undefined,
          productCategory: productCategory.trim() || undefined,
          competitorName: competitorName.trim() || undefined,
          country: country.trim() || undefined,
        }
      );
      if (res?.success && res?.data) {
        setAnalysisResult(res.data);
        
        // Save the analysis results to session storage
        try {
          sessionManager.saveAnalysisSession(
            'product-insights',
            res.data,
            websiteUrl.trim(),
            industry,
            'url',
            industry,
            stableUserId
          );
          console.log('[ProductInsights] Analysis results saved to session storage');
        } catch (saveError) {
          console.error('[ProductInsights] Error saving analysis results:', saveError);
          // Don't fail the analysis if saving fails
        }
      } else {
        setError(res?.error || 'Failed to analyze');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const computeVisibilityScore = (result: any): number => {
    const comps: any[] = Array.isArray(result?.competitors) ? result.competitors : [];
    if (comps.length === 0) return 0;
    const totals = comps.map(c => Number(c?.aiTraffic?.totalMentions || c?.mentions || 0));
    const sum = totals.reduce((a, b) => a + b, 0) || 1;
    const top = Math.max(...totals);
    const ratio = top / sum; // share of mentions
    return ratio * 10; // normalize to 0..10
  };

  const computeReadinessScore = (result: any): number => {
    // If no real data, return demo score
    if (!result || !Array.isArray(result?.competitors) || result.competitors.length === 0) {
      return 78; // Demo score
    }

    const comps: any[] = result.competitors;
    let totalScore = 0;
    let totalWeight = 0;

    comps.forEach(c => {
      // Schema markup score (0-30 points)
      const schemaScore = Math.min(30, (c?.schemaMarkup || 0) * 3);
      
      // Content quality score (0-40 points)
      const contentScore = Math.min(40, (c?.contentQuality || 0) * 4);
      
      // Trust signals score (0-30 points)
      const trustScore = Math.min(30, (c?.trustSignals || 0) * 3);
      
      const competitorScore = schemaScore + contentScore + trustScore;
      const weight = Number(c?.aiTraffic?.totalMentions || 1);
      
      totalScore += competitorScore * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
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
      setHasClearedData(true); // Set flag to prevent restoration
      try { localStorage.setItem(CLEARED_KEY, '1'); } catch {}
      console.log('[ProductInsights] Analysis data cleared');
    } catch (error) {
      console.error('[ProductInsights] Error clearing analysis data:', error);
    }
  };

  // Decide what data to render in the results section
  // - When there is a real analysisResult, show it
  // - When there is no real result and user has NOT clicked New Analysis yet, show demo data
  // - After clicking New Analysis (hasClearedData === true), hide results entirely
  const resultData = analysisResult || (!hasClearedData ? getDemoData() : null);

  return (
    <div className="w-full max-w-full mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <button className="text-sm text-gray-900 hover:underline mb-2" onClick={() => navigate('/ai-visibility-analysis')}>← Back to Competitor Insight</button>
        </div>
        {resultData && (
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            onClick={clearAnalysisData}
          >
            <FileText className="w-4 h-4" />
            New Analysis
          </button>
        )}
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
                onClick={startAnalysis}
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


