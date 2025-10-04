import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Loader2, Link as LinkIcon, Globe, FileText, Upload, BarChart3, CheckCircle2, XCircle, HelpCircle, Image as ImageIcon, ListChecks, Network, ShieldCheck, AlertTriangle, ExternalLink, Check, X } from 'lucide-react';
import { apiService } from '../services/apiService';

type ExtractedContent = {
  url?: string;
  html: string;
  title?: string;
  metaDescription?: string;
  h1: string[];
  h2: string[];
  h3: string[];
  bodyText: string;
  brandName?: string;
  productSchemaFound: boolean;
  faqSchemaFound: boolean;
  breadcrumbSchemaFound: boolean;
  reviewsSchemaFound: boolean;
  imageAltCoverage: { withAlt: number; total: number };
  internalLinks: Array<{ text: string; href: string }>;
  reviewsOrTestimonialsMentioned: boolean;
};

type PillarScore = {
  name: string;
  score: number; // 0-100
  checks: Array<{ id: string; label: string; passed: boolean; weight: number; details?: string }>;
};

function parseHtml(html: string, baseUrl?: string): ExtractedContent {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = (doc.querySelector('title')?.textContent || '').trim() || (doc.querySelector('meta[property="og:title"]') as HTMLMetaElement | null)?.content || undefined;
  const metaDescription = (doc.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content || (doc.querySelector('meta[property="og:description"]') as HTMLMetaElement | null)?.content || undefined;

  let h1 = Array.from(doc.querySelectorAll('h1')).map(h => h.textContent?.trim() || '').filter(Boolean);
  let h2 = Array.from(doc.querySelectorAll('h2')).map(h => h.textContent?.trim() || '').filter(Boolean);
  let h3 = Array.from(doc.querySelectorAll('h3')).map(h => h.textContent?.trim() || '').filter(Boolean);

  const bodyText = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();

  const internalLinks: Array<{ text: string; href: string }> = [];
  const baseHost = (() => {
    try { return baseUrl ? new URL(baseUrl).host : ''; } catch { return ''; }
  })();
  Array.from(doc.querySelectorAll('a[href]')).forEach(a => {
    const href = (a.getAttribute('href') || '').trim();
    if (!href) return;
    try {
      const abs = baseUrl ? new URL(href, baseUrl) : new URL(href, window.location.origin);
      const isInternal = baseHost ? abs.host === baseHost : href.startsWith('/') || href.startsWith('#');
      if (isInternal) internalLinks.push({ text: (a.textContent || '').trim(), href: abs.href });
    } catch {}
  });

  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  let productSchemaFound = false;
  let faqSchemaFound = false;
  let breadcrumbSchemaFound = false;
  let reviewsSchemaFound = false;
  let jsonLdTitleCandidates: string[] = [];
  let brandName = '';
  scripts.forEach(s => {
    try {
      const json = JSON.parse(s.textContent || 'null');
      const items: any[] = Array.isArray(json) ? json : [json];
      items.forEach(item => {
        const walk = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          const type = obj['@type'];
          const types = Array.isArray(type) ? type : [type];
          if (types.includes('Product')) productSchemaFound = true;
          if (types.includes('FAQPage')) faqSchemaFound = true;
          if (types.includes('BreadcrumbList')) breadcrumbSchemaFound = true;
          if (types.includes('Review') || obj['aggregateRating']) reviewsSchemaFound = true;
          const candidate = (obj.name || obj.headline || obj.alternativeHeadline || obj.title);
          if (typeof candidate === 'string' && candidate.trim()) jsonLdTitleCandidates.push(candidate.trim());
          if (!brandName && obj.brand && typeof obj.brand === 'object') {
            const b = (obj.brand.name || obj.brand['@name'] || obj.brand.title);
            if (typeof b === 'string' && b.trim()) brandName = b.trim();
          }
          Object.values(obj).forEach(walk);
        };
        walk(item);
      });
    } catch {}
  });

  // Headline fallbacks when real <h1> is missing
  if (h1.length === 0) {
    const ariaH1 = Array.from(doc.querySelectorAll('[role="heading"][aria-level="1"], [aria-level="1"][role="heading"]'))
      .map(e => (e.textContent || '').trim())
      .filter(Boolean);
    if (ariaH1.length) h1 = ariaH1;
  }
  if (h1.length === 0) {
    const nameLike = Array.from(doc.querySelectorAll('[itemprop="name"], .product-title, .title, [data-test="product-title"], h1[title]'))
      .map(e => (e.textContent || (e as HTMLElement).title || '').trim())
      .filter(Boolean);
    if (nameLike.length) h1 = nameLike;
  }
  if (h1.length === 0 && (doc.querySelector('meta[property="og:title"]') as HTMLMetaElement | null)?.content) {
    const og = (doc.querySelector('meta[property="og:title"]') as HTMLMetaElement).content.trim();
    if (og) h1 = [og];
  }
  if (h1.length === 0 && jsonLdTitleCandidates.length > 0) {
    h1 = [jsonLdTitleCandidates[0]];
  }
  // De‑duplicate and clip overly long entries
  const dedupe = (arr: string[]) => Array.from(new Set(arr.map(t => t.replace(/\s+/g, ' ').trim()))).map(t => t.length > 300 ? t.slice(0, 300) : t);
  h1 = dedupe(h1);
  h2 = dedupe(h2);
  h3 = dedupe(h3);

  const images = Array.from(doc.querySelectorAll('img'));
  const withAlt = images.filter(img => (img.getAttribute('alt') || '').trim().length > 0).length;
  const imageAltCoverage = { withAlt, total: images.length };

  const reviewsMentionRegex = /(reviews?|ratings?|testimonials?|\b"?stars?"?\b)/i;
  const reviewsOrTestimonialsMentioned = reviewsMentionRegex.test(bodyText);

  return {
    url: baseUrl,
    html,
    title,
    metaDescription,
    h1, h2, h3,
    bodyText,
    brandName: brandName || undefined,
    productSchemaFound,
    faqSchemaFound,
    breadcrumbSchemaFound,
    reviewsSchemaFound,
    imageAltCoverage,
    internalLinks,
    reviewsOrTestimonialsMentioned
  };
}

function computeScores(
  data: ExtractedContent,
  external?: { counts?: any; totals?: any }
): { overall: number; pillars: PillarScore[]; suggestions: string[] } {
  const suggestions: string[] = [];

  const wordCount = data.bodyText.split(/\s+/).filter(Boolean).length;
  const hasFaqsByText = /\bfaq(s)?\b|frequently asked questions/i.test(data.bodyText) || data.faqSchemaFound;

  // A. Product Page Quality
  const specsRegex = /(size|dimensions?|material|care|price|stock|sku|model)/i;
  const hasSpecs = specsRegex.test(data.bodyText);
  const hasRichDesc = /(benefit|use case|why|features?|specifications?|ideal for|best for)/i.test(data.bodyText);
  const hasReviews = data.reviewsSchemaFound || data.reviewsOrTestimonialsMentioned;
  const altCoverageOk = data.imageAltCoverage.total === 0 ? true : (data.imageAltCoverage.withAlt / data.imageAltCoverage.total) >= 0.7;
  const pillarA: PillarScore = {
    name: 'Product Page Quality',
    score: 0,
    checks: [
      { id: 'specs', label: 'Product specs present', passed: hasSpecs, weight: 3 },
      { id: 'rich', label: 'Rich description (benefits/use cases)', passed: hasRichDesc, weight: 3 },
      { id: 'faqs', label: 'FAQs included', passed: hasFaqsByText, weight: 2 },
      { id: 'reviews', label: 'Customer reviews present', passed: hasReviews, weight: 3 },
      { id: 'alt', label: 'Image alt tags coverage', passed: altCoverageOk, weight: 2 },
    ]
  };

  // B. Category & Informational Content
  const hasBuyingGuide = /(buying guide|how to choose|what to look for)/i.test(data.bodyText);
  const hasComparison = /(compare|vs\.?|comparison)/i.test(data.bodyText) || Array.from(data.html.matchAll(/<table[\s\S]*?<\/table>/gi)).length > 0;
  const hasSeasonal = /(summer|winter|spring|fall|seasonal|202[3-9]|202\d)/i.test(data.bodyText);
  const internalLinkCount = data.internalLinks.length;
  const pillarB: PillarScore = {
    name: 'Category & Guides',
    score: 0,
    checks: [
      { id: 'guide', label: 'Buying guides present', passed: hasBuyingGuide, weight: 2 },
      { id: 'comparison', label: 'Comparison charts/tables', passed: hasComparison, weight: 2 },
      { id: 'seasonal', label: 'Trend/seasonal keywords', passed: hasSeasonal, weight: 1 },
      { id: 'links', label: 'Adequate internal links (>=10)', passed: internalLinkCount >= 10, weight: 2 },
    ]
  };

  // C. Content Authority & Depth
  const depthOk = wordCount >= 500;
  const topicalCoverage = /(features?|benefits?|pros|cons|alternatives?|questions?|best|top|guide|review)/i.test(data.bodyText);
  const pillarC: PillarScore = {
    name: 'Content Depth & Authority',
    score: 0,
    checks: [
      { id: 'length', label: 'Sufficient word count (>=500)', passed: depthOk, weight: 3 },
      { id: 'topics', label: 'Topical coverage breadth', passed: topicalCoverage, weight: 3 },
      { id: 'questions', label: 'Questions answered present', passed: hasFaqsByText, weight: 2 },
    ]
  };

  // D. Technical & Schema
  const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(data.html);
  const isHttps = (data.url || '').startsWith('https://');
  const pillarD: PillarScore = {
    name: 'Technical & Schema',
    score: 0,
    checks: [
      { id: 'productSchema', label: 'Product schema implemented', passed: data.productSchemaFound, weight: 3 },
      { id: 'faqSchema', label: 'FAQ schema implemented', passed: data.faqSchemaFound, weight: 2 },
      { id: 'breadcrumb', label: 'Breadcrumb schema', passed: data.breadcrumbSchemaFound, weight: 1 },
      { id: 'mobile', label: 'Mobile-friendly (viewport tag)', passed: hasViewport, weight: 2 },
      { id: 'https', label: 'HTTPS secure', passed: isHttps || !data.url, weight: 1 },
    ]
  };

  // E. Off-Site & Trust Signals
  let pillarE: PillarScore;
  if (external && external.counts) {
    const counts = external.counts || {};
    const sourcesPresent = (
      (counts.trustpilot ? 1 : 0) +
      (counts.google ? 1 : 0) +
      (counts.reddit ? 1 : 0) +
      (counts.quora ? 1 : 0) +
      (counts.youtube ? 1 : 0)
    );
    const percent = Math.min(100, sourcesPresent * 20);
    const anyExternal = sourcesPresent > 0 || (external.totals?.totalMentions || 0) > 0;
    pillarE = {
      name: 'Off-Site & Trust Signals',
      score: percent,
      checks: [
        { id: 'externalReviews', label: 'External reviews/mentions referenced', passed: !!anyExternal, weight: 2 },
      ]
    };
  } else {
    const hasTrustSignals = /(trustpilot|google reviews?|as seen on|featured in|award|certified|warranty)/i.test(data.bodyText);
    pillarE = {
      name: 'Off-Site & Trust Signals',
      score: 0,
      checks: [
        { id: 'externalReviews', label: 'External reviews/mentions referenced', passed: hasTrustSignals, weight: 2 },
      ]
    };
  }

  const pillars = [pillarA, pillarB, pillarC, pillarD, pillarE];

  pillars.forEach(p => {
    const max = p.checks.reduce((s, c) => s + c.weight, 0);
    const gain = p.checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
    p.score = Math.round((gain / Math.max(1, max)) * 100);
    p.checks.forEach(c => {
      if (!c.passed) {
        // Suggestions based on failed checks
        const map: Record<string, string> = {
          specs: 'Add structured product specs like size, material, care, price, and stock.',
          rich: 'Expand product description with benefits, use cases, and differentiators.',
          faqs: 'Add an FAQ section or implement FAQ schema to answer common questions.',
          reviews: 'Show customer reviews or ratings; implement Review/AggregateRating schema.',
          alt: 'Ensure at least 70% of product images have descriptive alt text.',
          guide: 'Publish a buying guide explaining how to choose the right product.',
          comparison: 'Add a comparison table between models or alternatives.',
          seasonal: 'Incorporate seasonal/trend keywords where relevant.',
          links: 'Add internal links to related categories, guides, and products.',
          length: 'Increase page content to at least 500 words with useful details.',
          topics: 'Cover more topics: features, benefits, pros/cons, alternatives, FAQs.',
          productSchema: 'Add Product JSON-LD schema with offers, brand, and ratings.',
          faqSchema: 'Add FAQPage JSON-LD schema for your FAQ section.',
          breadcrumb: 'Implement BreadcrumbList schema for better navigation.',
          mobile: 'Add meta viewport and ensure mobile-friendly layout.',
          https: 'Serve the page over HTTPS with a valid certificate.',
          externalReviews: 'Build trust with external reviews (Trustpilot/Google) and cite them.'
        };
        suggestions.push(map[c.id] || c.label);
      }
    });
  });

  // Weighted overall score (A:30, B:20, C:25, D:20, E:5)
  const weights = [30, 20, 25, 20, 5];
  const overall = Math.round(
    pillars.reduce((s, p, i) => s + p.score * (weights[i] / 100), 0)
  );

  return { overall, pillars, suggestions: Array.from(new Set(suggestions)) };
}

export function EcommerceContentAnalysis() {
  const [inputMode, setInputMode] = useState<'url' | 'content'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedContent | null>(null);
  const [offsite, setOffsite] = useState<{ totals: any; counts: any; topResults: Array<{ name: string; link: string; snippet: string; sourceQuery: string }> } | null>(null);
  const [competitors, setCompetitors] = useState<Array<{ name: string; link: string; snippet: string }>>([]);
  const [competitorCoverage, setCompetitorCoverage] = useState<Array<{ url: string; success: boolean; wordCount?: number; h1?: string[]; h2?: string[]; h3?: string[]; hasTable?: boolean; error?: string }>>([]);
  const [brandCompetitors, setBrandCompetitors] = useState<string[]>([]);
  const [priceOffers, setPriceOffers] = useState<Array<{ site: string; url: string; price: number; originalPrice?: number; discount?: number; currency?: string; title?: string; availability?: string; delivery?: string; rating?: number; reviews?: number }>>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load saved analysis results on component mount
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('contentAnalysisResults');
    if (savedAnalysis) {
      try {
        const parsed = JSON.parse(savedAnalysis);
        if (parsed.extracted) setExtracted(parsed.extracted);
        if (parsed.offsite) setOffsite(parsed.offsite);
        if (parsed.competitors) setCompetitors(parsed.competitors);
        if (parsed.brandCompetitors) setBrandCompetitors(parsed.brandCompetitors);
        if (parsed.priceOffers) setPriceOffers(parsed.priceOffers);
        if (parsed.urlInput) setUrlInput(parsed.urlInput);
        if (parsed.contentInput) setContentInput(parsed.contentInput);
        if (parsed.inputMode) setInputMode(parsed.inputMode);
      } catch (e) {
        console.warn('Failed to load saved content analysis results:', e);
      }
    }
  }, []);

  // Save analysis results whenever they change
  useEffect(() => {
    if (extracted || offsite || competitors.length > 0 || brandCompetitors.length > 0 || priceOffers.length > 0) {
      const analysisData = {
        extracted,
        offsite,
        competitors,
        brandCompetitors,
        priceOffers,
        urlInput,
        contentInput,
        inputMode,
        timestamp: Date.now()
      };
      localStorage.setItem('contentAnalysisResults', JSON.stringify(analysisData));
    }
  }, [extracted, offsite, competitors, brandCompetitors, priceOffers, urlInput, contentInput, inputMode]);

  // Shopify product picker state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'oauth' | 'storefront'>('oauth');
  const [adminShops, setAdminShops] = useState<Array<{ shop: string }>>([]);
  const [sfShops, setSfShops] = useState<Array<{ shop: string }>>([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [shopProducts, setShopProducts] = useState<Array<{ id: string; title: string; handle: string }>>([]);
  const [shopCursor, setShopCursor] = useState<string | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const loadConnections = async () => {
    try {
      const res: any = await apiService.listShopifyConnections();
      setAdminShops(res?.shops || []);
    } catch {}
  };

  const toDomain = (s: string) => (s.endsWith('.myshopify.com') ? s : `${s}.myshopify.com`);

  const loadProducts = async (shop: string, after?: string) => {
    setPickerLoading(true);
    try {
      const s = shop.trim();
      const res: any = await apiService.listShopifyProducts(after, s);
      const nodes: any[] = res?.data?.nodes || res?.data?.edges?.map((e: any) => e.node) || [];
      const mapped = nodes.map(n => ({ id: n.id, title: n.title, handle: n.handle }));
      setShopProducts(prev => after ? [...prev, ...mapped] : mapped);
      const endCursor = res?.data?.pageInfo?.endCursor || null;
      const hasNext = res?.data?.pageInfo?.hasNextPage;
      setShopCursor(hasNext ? endCursor : null);
    } catch {
      setShopProducts([]);
      setShopCursor(null);
    } finally { setPickerLoading(false); }
  };

  const loadStorefrontProducts = async (shop: string, after?: string) => {
    setPickerLoading(true);
    try {
      const s = toDomain(shop.trim());
      const res: any = await apiService.listStorefrontProducts(s, after);
      const nodes: any[] = res?.data?.nodes || res?.data?.edges?.map((e: any) => e.node) || [];
      const mapped = nodes.map(n => ({ id: n.id, title: n.title, handle: n.handle }));
      setShopProducts(prev => after ? [...prev, ...mapped] : mapped);
      const endCursor = res?.data?.pageInfo?.endCursor || null;
      const hasNext = res?.data?.pageInfo?.hasNextPage;
      setShopCursor(hasNext ? endCursor : null);
    } catch {
      setShopProducts([]);
      setShopCursor(null);
    } finally { setPickerLoading(false); }
  };

  const openPicker = async () => {
    setIsPickerOpen(true);
    setPickerMode('oauth');
    setSelectedShop('');
    setShopProducts([]);
    setShopCursor(null);
    await loadConnections();
    // Also load storefront-connected shops for convenience
    try {
      const sf:any = await apiService.listStorefrontConnections();
      setSfShops(sf?.shops || []);
    } catch {}
  };

  const onChooseProduct = (shop: string, handle: string) => {
    const domain = toDomain(shop);
    setUrlInput(`https://${domain}/products/${handle}`);
    setIsPickerOpen(false);
    setInputMode('url');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setContentInput(text);
    setInputMode('content');
  };

  const clearAnalysis = () => {
    setExtracted(null);
    setOffsite(null);
    setCompetitors([]);
    setBrandCompetitors([]);
    setCompetitorCoverage([]);
    setPriceOffers([]);
    setError(null);
    localStorage.removeItem('contentAnalysisResults');
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    setExtracted(null);
    setOffsite(null);
    setCompetitors([]);
    setBrandCompetitors([]);
    setCompetitorCoverage([]);
    setPriceOffers([]);
    try {
      let html = '';
      let finalUrl: string | undefined = undefined;
      if (inputMode === 'url') {
        const url = urlInput.trim();
        if (!url) throw new Error('Please enter a URL');
        finalUrl = url;
        // Prefer smart extractor (multi-UA + JS-render + reader), then full page, then content extractor
        try {
          const smart = await apiService.extractSmartHtml(url);
          if (smart?.success && smart.html) html = smart.html;
        } catch {}
        if (!html) {
          try {
            const full = await apiService.extractFullPageHtml(url);
            if (full?.success && full.html) html = full.html;
          } catch {}
        }
        if (!html) {
          const res = await apiService.extractContentFromUrl(url);
          html = res?.content || '';
        }
        if (!html) throw new Error('Failed to extract content from the URL');
      } else {
        html = contentInput;
        if (!/</.test(html)) {
          // Wrap plain text as simple HTML for parsing
          html = `<html><head><title>Document</title></head><body><article>${contentInput.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</article></body></html>`;
        }
      }

      const extractedData = parseHtml(html, finalUrl);
      setExtracted(extractedData);

      // Kick off Google CSE powered signals in parallel
      const deriveQueryName = (data: ExtractedContent, url?: string) => {
        const candidates: string[] = [];
        if (data.title) candidates.push(data.title);
        if (data.h1 && data.h1.length > 0) candidates.push(data.h1[0]);
        // Fallback: from og:title if present inside HTML text (parseHtml already sets title from og:title)
        let best = candidates.find(t => t && t.length > 3) || '';
        // Clean common ecommerce suffixes
        best = best
          .replace(/\s*\|\s*Flipkart.*$/i, '')
          .replace(/\s*\|\s*Amazon.*$/i, '')
          .replace(/\s*- Buy.*Online.*$/i, '')
          .replace(/\s*\(.*?\)\s*$/,'')
          .replace(/\s{2,}/g,' ') // collapse spaces
          .trim();
        // If still missing or we suspect JS-blocked page, try URL path heuristics
        if ((!best || best.length < 4) && url) {
          try {
            const u = new URL(url);
            const segs = u.pathname.split('/').filter(Boolean);
            // Myntra pattern: /category/brand/product-slug/id/buy
            const slug = segs.findLast(s => /[a-z\-_%]/i.test(s) && !/^buy$/i.test(s) && !/^p$/i.test(s) && !/^\d+$/i.test(s));
            if (slug) {
              const decoded = decodeURIComponent(slug).replace(/[-_]+/g, ' ').replace(/\s{2,}/g,' ').trim();
              if (decoded.length > 4) best = decoded;
            }
          } catch {}
        }
        if (!best && url) {
          try { best = new URL(url).hostname.replace(/^www\./,'').split('.')[0]; } catch {}
        }
        // Guard length
        if (best.length > 80) best = best.slice(0, 80);
        return best;
      };
      const brandOrProduct = deriveQueryName(extractedData, finalUrl);
      if (brandOrProduct) {
        try {
          const productQuery = [extractedData.h1?.[0] || '', extractedData.title || '']
            .map(t => (t || '').trim())
            .filter(Boolean)[0] || brandOrProduct;

          setSignalsLoading(true);
          setCompetitorsLoading(true);
          setPricesLoading(true);

          console.log('[EcommerceContentAnalysis] Starting parallel API calls...');
          console.log('[EcommerceContentAnalysis] Product query for price comparison:', productQuery);
          console.log('[EcommerceContentAnalysis] Current URL for price comparison:', finalUrl);
          const [off, compsDomain, compsProduct, prices] = await Promise.all([
            apiService.getOffsiteSignals({ brandOrProduct, domain: finalUrl ? new URL(finalUrl).hostname : undefined }).catch((e) => { console.log('[EcommerceContentAnalysis] Offsite signals failed:', e); return null; }),
            apiService.getCompetitors({ brandOrProduct, currentUrl: finalUrl }).catch((e) => { console.log('[EcommerceContentAnalysis] Domain competitors failed:', e); return { competitors: [] }; }),
            apiService.getProductCompetitors(productQuery, finalUrl).catch((e) => { console.log('[EcommerceContentAnalysis] Product competitors failed:', e); return { competitors: [] }; }),
            apiService.priceCompare(productQuery, finalUrl).catch((e) => { console.log('[EcommerceContentAnalysis] Price compare failed:', e); return { offers: [] }; })
          ]);
          console.log('[EcommerceContentAnalysis] Parallel API calls completed');
          if (off && (off.success === undefined || off.success)) setOffsite({ totals: off.totals, counts: off.counts, topResults: off.topResults || [] });
          setSignalsLoading(false);
          const mergedCompetitors = [
            ...(compsDomain?.competitors || []),
            ...(compsProduct?.competitors || [])
          ];
          if (mergedCompetitors.length > 0) {
            // Deduplicate by host
            const seen = new Set<string>();
            const uniq = mergedCompetitors.filter((c:any) => {
              try { const host = new URL(c.link || c.domain || c.name).hostname || c.name; if (seen.has(host)) return false; seen.add(host); return true; } catch { if (seen.has(c.name)) return false; seen.add(c.name); return true; }
            }).slice(0, 10);
            setCompetitors(uniq);
            // Derive competing brands
            const currentBrand = extractedData.brandName || '';
            const brandFromHost = (host: string) => host.replace(/^www\./,'').split('.')[0].replace(/[-_]+/g,' ').replace(/\b\w/g, s => s.toUpperCase());
            const brands = uniq.map((c:any) => {
              const host = (()=>{ try { return new URL(c.link).hostname; } catch { return c.name || ''; } })();
              let b = '';
              const text = `${c.name || ''} ${c.snippet || ''}`;
              const m = text.match(/\bby\s+([A-Z][\w.&' -]{2,})/) || text.match(/\bfrom\s+([A-Z][\w.&' -]{2,})/);
              if (m) b = m[1].trim();
              if (!b && host) b = brandFromHost(host);
              return b;
            }).filter(Boolean)
              .map(b => b.replace(/\b(in|the|for|with|and)\b/gi,'').replace(/\s{2,}/g,' ').trim())
              .filter(b => b && (!currentBrand || b.toLowerCase() !== currentBrand.toLowerCase()));
            const uniqueBrands = Array.from(new Set(brands)).slice(0, 12);
            setBrandCompetitors(uniqueBrands);
            const urls = uniq.slice(0,5).map((c:any)=> c.link);
            if (urls.length > 0) {
              const batch = await apiService.fetchBatchHtml(urls).catch(() => null);
              if (batch && batch.success !== false) setCompetitorCoverage(batch.results || []);
            }
          }
          setCompetitorsLoading(false);

          // Price offers (if any)
          console.log('[EcommerceContentAnalysis] Price response:', prices);
          console.log('[EcommerceContentAnalysis] Price response type:', typeof prices);
          console.log('[EcommerceContentAnalysis] Price response keys:', prices ? Object.keys(prices) : 'null');
          console.log('[EcommerceContentAnalysis] Price offers:', prices?.offers);
          console.log('[EcommerceContentAnalysis] Price offers type:', typeof prices?.offers);
          console.log('[EcommerceContentAnalysis] Price offers length:', prices?.offers?.length);
          
          if (prices && prices.success !== false) {
            if (Array.isArray(prices.offers) && prices.offers.length > 0) {
              console.log('[EcommerceContentAnalysis] Setting price offers:', prices.offers);
            setPriceOffers(prices.offers);
            } else {
              console.log('[EcommerceContentAnalysis] Empty offers array:', prices.offers);
              setPriceOffers([]);
            }
          } else {
            console.log('[EcommerceContentAnalysis] Price API failed or no data:', prices);
            setPriceOffers([]);
          }
          setPricesLoading(false);
        } catch (error) {
          console.error('[EcommerceContentAnalysis] Error in parallel API calls:', error);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const results = useMemo(() => {
    if (!extracted) return null;
    return computeScores(extracted, offsite || undefined);
  }, [extracted, offsite]);

  const isResultsReady = useMemo(() => {
    // Show the full block once analysis completes to display real data together
    return !!(extracted && !isAnalyzing);
  }, [extracted, isAnalyzing]);

  return (
    <div className="w-full max-w-full mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
        </div>
        {extracted && (
          <button
            onClick={clearAnalysis}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            New Analysis
          </button>
        )}
      </div>

      {/* Content Analysis Dashboard Section */}
    <div className="bg-white border border-gray-300 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Content Analysis Dashboard</h2>
          <p className="text-gray-600 text-lg">Enter your website URL or paste HTML content to analyze your e-commerce content structure and optimization.</p>
          {extracted && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Analysis Results Loaded
              </div>
              <button
                onClick={clearAnalysis}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
              >
                Clear Results
              </button>
            </div>
          )}
        </div>

        {/* Analysis Configuration - Structured Inputs */}
        <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${inputMode === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setInputMode('url')}
            >
              <LinkIcon className="w-4 h-4 inline mr-1" /> URL
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${inputMode === 'content' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setInputMode('content')}
            >
              <FileText className="w-4 h-4 inline mr-1" /> HTML/Text
            </button>
          </div>

        {inputMode === 'url' ? (
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/product"
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button onClick={openPicker} type="button" className="px-3 py-2 rounded-lg bg-white border text-gray-800 hover:bg-gray-50">Pick from Shopify</button>
            <button onClick={runAnalysis} disabled={isAnalyzing} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input type="file" accept=".html,.htm,.txt,.md" ref={fileRef} onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="px-3 py-2 bg-white border rounded-lg text-gray-700 hover:bg-gray-50">
                <Upload className="w-4 h-4 inline mr-1" /> Upload
              </button>
            </div>
            <textarea
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              rows={8}
              placeholder="Paste HTML or raw text here..."
              className="w-full border rounded-lg px-3 py-2"
            />
            <div className="mt-2">
              <button onClick={runAnalysis} disabled={isAnalyzing} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* Product Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-200 w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-black">Select a product</div>
              <button onClick={() => setIsPickerOpen(false)} className="text-gray-600">✕</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm text-gray-700">Source</label>
              <select value={pickerMode} onChange={e => { setPickerMode(e.target.value as any); setShopProducts([]); setShopCursor(null); }} className="bg-white border border-black/20 rounded-lg px-3 py-2 text-black">
                <option value="oauth">Admin OAuth (connected shops)</option>
                <option value="storefront">Storefront (token saved)</option>
              </select>
            </div>

            {pickerMode === 'oauth' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select value={selectedShop} onChange={e => { setSelectedShop(e.target.value); setShopProducts([]); setShopCursor(null); }} className="bg-white border border-black/20 rounded-lg px-3 py-2 text-black">
                    <option value="">Select a connected shop (Admin OAuth)</option>
                    {adminShops.map((s, i) => (<option key={i} value={s.shop}>{s.shop}</option>))}
                  </select>
                  <button onClick={() => selectedShop && loadProducts(selectedShop)} disabled={!selectedShop || pickerLoading} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">{pickerLoading ? 'Loading…' : 'Load products'}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select value={selectedShop} onChange={e => { setSelectedShop(e.target.value); setShopProducts([]); setShopCursor(null); }} className="bg-white border border-black/20 rounded-lg px-3 py-2 text-black">
                    <option value="">Select a storefront shop</option>
                    {sfShops.map((s, i) => (<option key={i} value={s.shop}>{s.shop}</option>))}
                  </select>
                  <button onClick={() => selectedShop && loadStorefrontProducts(selectedShop)} disabled={!selectedShop || pickerLoading} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">{pickerLoading ? 'Loading…' : 'Load products'}</button>
                </div>
                <div className="text-xs text-gray-600">Requires a saved Storefront token for this shop in Settings → Integrations.</div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>Or use public sitemap (no auth):</span>
                  <button onClick={async () => { if (!selectedShop) return; setPickerLoading(true); try { const res:any = await apiService.listPublicShopifyProducts((selectedShop||'').trim()); const items = (res?.items||[]).map((i:any)=>({ id:i.url, title:i.title, handle:i.handle })); setShopProducts(items); setShopCursor(null);} finally { setPickerLoading(false);} }} className="px-2 py-1 border rounded">Load public products</button>
                </div>
              </div>
            )}

            <div className="mt-3">
              <input
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Search by title or handle..."
                className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-black mb-2"
              />
            </div>

            <div className="max-h-80 overflow-auto border rounded bg-white">
              {shopProducts.length === 0 ? (
                <div className="text-sm text-gray-600 p-3">No products loaded.</div>
              ) : (
                <div className="divide-y">
                  {(pickerSearch
                    ? shopProducts.filter(p => {
                        const q = pickerSearch.toLowerCase();
                        return (p.title || '').toLowerCase().includes(q) || (p.handle || '').toLowerCase().includes(q);
                      })
                    : shopProducts
                  ).map((p) => (
                    <button key={p.id} onClick={() => onChooseProduct(selectedShop, p.handle)} className="w-full text-left p-3 bg-white hover:bg-gray-50 focus:bg-white focus:outline-none">
                      <div className="font-medium text-black">{p.title}</div>
                      <div className="text-xs text-gray-600">/{p.handle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {shopCursor && (
              <div className="mt-2">
                <button onClick={() => (pickerMode === 'oauth' ? loadProducts(selectedShop, shopCursor || undefined) : loadStorefrontProducts(selectedShop, shopCursor || undefined))} className="px-3 py-2 rounded-lg bg-white border text-gray-800">Load more</button>
              </div>
            )}
          </div>
        </div>
        )}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {isResultsReady && (
        <div className="space-y-6">
          {/* Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
              <div className="text-base text-green-800 mb-1">AI Readiness Score</div>
              <div className="text-4xl font-extrabold text-green-900">{results.overall}%</div>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
              <div className="text-base text-gray-700">Title</div>
              <div className="font-medium text-black truncate" title={extracted.title || ''}>{extracted.title || '—'}</div>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
              <div className="text-base text-gray-700">Description</div>
              <div className="text-black line-clamp-2" title={extracted.metaDescription || ''}>{extracted.metaDescription || '—'}</div>
            </div>
          </div>

          {/* Pillars breakdown - simple present/absent ticks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.pillars.map(p => (
              <div key={p.name} className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-black">{p.name}</div>
                  <span className="px-2 py-0.5 text-sm rounded-full bg-gray-100 text-gray-700 font-semibold">{p.score}%</span>
                </div>
                <div className="divide-y">
                  {p.checks.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 text-base">
                      <span className="text-black">{c.label}</span>
                      {c.passed ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Price Comparison - Google Shopping style */}
          {console.log('[EcommerceContentAnalysis] Rendering, priceOffers:', priceOffers)}
          {priceOffers && priceOffers.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-black">Price Comparison</div>
                <span className="text-sm text-gray-600">Typically {(() => {
                  const prices = priceOffers.map(o => o.price).filter(Boolean);
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);
                  const currency = priceOffers[0]?.currency || 'INR';
                  try {
                    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency });
                    return `${formatter.format(min)}–${formatter.format(max)}`;
                  } catch {
                    return `${currency} ${min.toLocaleString()}–${max.toLocaleString()}`;
                  }
                })()}</span>
              </div>
              
              <div className="space-y-3">
                    {priceOffers.map((o, i) => (
                  <div key={i} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">{o.site.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="font-medium text-black capitalize">{o.site.replace(/^www\./, '')}</div>
                            {o.rating && o.reviews && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <span className="text-yellow-400">★</span>
                                <span>{o.rating}/5</span>
                                <span>·</span>
                                <span>{o.reviews.toLocaleString()} reviews</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold text-black">
                          {(() => {
                            const currency = (o.currency || 'USD').toUpperCase();
                            try {
                              return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(o.price));
                            } catch {
                              return `${currency} ${Number(o.price).toLocaleString?.() || '-'}`;
                            }
                          })()}
                          </div>
                          {o.discount && (
                            <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                              {o.discount}% off
                            </span>
                          )}
                        </div>
                        {o.originalPrice && (
                          <div className="text-sm text-gray-500 line-through">
                            {(() => {
                              const currency = (o.currency || 'USD').toUpperCase();
                              try {
                                return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(o.originalPrice));
                              } catch {
                                return `${currency} ${Number(o.originalPrice).toLocaleString?.() || '-'}`;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        {o.availability && (
                          <span className="text-green-600 font-medium">
                            {o.availability.includes('InStock') ? 'In stock online' : o.availability}
                          </span>
                        )}
                        {o.delivery && (
                          <span>{o.delivery}</span>
                        )}
                      </div>
                      <a 
                        href={o.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-blue-600 hover:underline font-medium"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
              <div className="font-semibold text-black mb-2">Structure</div>
              <div className="text-base text-black"><strong>H1</strong>: {extracted.h1.join(' | ') || '—'}</div>
              <div className="text-base text-black mt-1"><strong>H2</strong>: {extracted.h2.slice(0,6).join(' | ') || '—'}</div>
              <div className="text-base text-black mt-1"><strong>H3</strong>: {extracted.h3.slice(0,6).join(' | ') || '—'}</div>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
              <div className="font-semibold text-black mb-2">Schema & Media</div>
              <div className="text-base text-black">Product schema: {extracted.productSchemaFound ? 'Yes' : 'No'}</div>
              <div className="text-base text-black">FAQ schema: {extracted.faqSchemaFound ? 'Yes' : 'No'}</div>
              <div className="text-base text-black">Breadcrumb: {extracted.breadcrumbSchemaFound ? 'Yes' : 'No'}</div>
              <div className="text-base text-black">Reviews schema: {extracted.reviewsSchemaFound ? 'Yes' : 'No'}</div>
              <div className="text-base text-black">Image alt coverage: {extracted.imageAltCoverage.withAlt}/{extracted.imageAltCoverage.total}</div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
            <div className="font-semibold text-black mb-2">Actionable Suggestions</div>
            {results.suggestions.length === 0 ? (
              <div className="text-base text-green-700">No critical issues found. Great job!</div>
            ) : (
              <ul className="list-disc pl-5 text-base text-black space-y-1">
                {results.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Off-site signals (Google CSE) - render only when real data ready */}
          {offsite && (
            <div className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-black">Off‑Site & Trust Signals</div>
                <span className="px-2 py-0.5 text-sm rounded-full bg-gray-100 text-gray-700 font-semibold">
                  {(() => { const p = results.pillars.find(pp => pp.name === 'Off-Site & Trust Signals'); return p ? p.score : 0; })()}%
                </span>
              </div>
              <div className="divide-y text-base">
                {[
                  { id:'reviews', label:'Third‑party reviews', pass:(offsite.counts?.trustpilot||0) + (offsite.counts?.google||0) > 0 },
                  { id:'blogs', label:'Blog mentions', pass:(offsite.counts?.google||0) > 0 },
                  { id:'social', label:'Social discussions', pass:(offsite.counts?.reddit||0) > 0 },
                  { id:'authority', label:'Brand authority', pass:(offsite.totals?.totalMentions||0) >= 5 || (offsite.counts?.youtube||0) > 0 },
                ].map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2">
                    <span className="text-black">{r.label}</span>
                    {r.pass ? <Check className="w-4 h-4 text-green-600"/> : <X className="w-4 h-4 text-red-600"/>}
                  </div>
                ))}
              </div>
              {Array.isArray(offsite.topResults) && offsite.topResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {offsite.topResults.slice(0,8).map((r, i) => {
                    let title = (r.name || '').trim();
                    try {
                      if (!title || /^untitled$/i.test(title)) {
                        const host = new URL(r.link).hostname.replace(/^www\./,'');
                        title = host || 'Link';
                      }
                    } catch { if (!title) title = 'Link'; }
                    return (
                      <a key={i} href={r.link} target="_blank" rel="noreferrer" className="block text-base text-blue-700 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5 inline mr-1" /> {title}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Competitors (Google CSE) - render only when data ready */}
          {(brandCompetitors.length > 0 || (competitors && competitors.length > 0)) && (
            <div className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150">
              <div className="font-semibold text-black mb-2">Product Competitors</div>
              {brandCompetitors.length > 0 && (
                <div className="mb-3 text-base text-black">
                  <div className="font-medium mb-1">Similar brands</div>
                  <div className="flex flex-wrap gap-2">
                    {brandCompetitors.map((b, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 rounded border border-gray-200">{b}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {competitors.map((c, i) => (
                  <a key={i} href={c.link} target="_blank" rel="noreferrer" className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="font-medium text-black flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5" /> {c.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">{c.snippet}</div>
                  </a>
                ))}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShoppingCartBadge() {
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 flex items-center justify-center">
      <ShoppingCartIcon />
    </div>
  );
}

function ShoppingCartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3h2l.4 2M7 13h10l3-8H6.4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="20" r="1" fill="white"/>
      <circle cx="18" cy="20" r="1" fill="white"/>
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
      <div className="text-xl font-extrabold text-black">{value}</div>
      <div className="text-xs text-gray-600 mt-0.5">{label}</div>
    </div>
  );
}

export default EcommerceContentAnalysis;


