const axios = require('axios');
const cheerio = require('cheerio');
let puppeteer; // Lazy-load to reduce cold start

function escapeHtml(input) {
  return String(input).replace(/[&<>]/g, (ch) => (
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;'
  ));
}

function buildJinaReaderUrl(targetUrl) {
  try {
    const u = new URL(targetUrl);
    const httpUrl = `http://${u.host}${u.pathname}${u.search || ''}`;
    return `https://r.jina.ai/${encodeURI(httpUrl)}`;
  } catch {
    return `https://r.jina.ai/http://${targetUrl.replace(/^https?:\/\//i, '')}`;
  }
}

/**
 * Extracts the full HTML of a page using HTTP requests.
 * @param {string} url
 * @returns {Promise<string>} The full HTML as a string
 */
async function extractFullPageHtml(url) {
  try {
    // 1) Try headless browser render for JS-heavy/anti-bot pages
    try {
      if (!puppeteer) puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1366,768'
        ]
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
      // Basic stealth tweaks (without extra deps)
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        const originalPlugins = [
          { name: 'Chrome PDF Viewer' },
          { name: 'Chromium PDF Viewer' },
          { name: 'Microsoft Edge PDF Viewer' },
        ];
        Object.defineProperty(navigator, 'plugins', { get: () => originalPlugins });
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
          if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
          return getParameter.apply(this, [parameter]);
        };
      });
      try { await page.emulateTimezone('Asia/Kolkata'); } catch {}
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Upgrade-Insecure-Requests': '1'
      });
      // Avoid downloading heavy assets
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
          req.abort();
        } else {
          req.continue();
        }
      });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // Wait for likely content selectors
      const isFlipkart = /(^|\.)flipkart\.com$/i.test(new URL(url).hostname);
      try {
        if (isFlipkart) {
          await page.waitForSelector('script[type="application/ld+json"]', { timeout: 15000 });
        } else {
          await page.waitForSelector('h1, meta[property="og:title"], script[type="application/ld+json"]', { timeout: 10000 });
        }
      } catch {}
      // Small scroll to trigger lazy loads
      await page.evaluate(async () => {
        await new Promise((r) => {
          let y = 0; const step = () => { y += 400; window.scrollTo(0, y); if (y < document.body.scrollHeight) requestAnimationFrame(step); else setTimeout(r, 500); }; step();
        });
      });
      const renderedHtml = await page.content();
      await browser.close();
      if (renderedHtml && renderedHtml.length > 2000) {
        return renderedHtml;
      }
    } catch (puppeteerErr) {
      // Continue to next strategies
    }

    // 2) Plain HTTP GET with realistic headers
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Remove script tags for cleaner output
    $('script').remove();
    
    // Get the full HTML
    return $.html();
  } catch (err) {
    // 3) Fallback: use Jina Reader proxy to bypass bot protection (returns readable text)
    try {
      const jinaUrl = buildJinaReaderUrl(url);
      const resp = await axios.get(jinaUrl, { timeout: 30000, headers: { 'User-Agent': 'curl/8.0' } });
      const text = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
      // Wrap the text as simple HTML so downstream parsers can still work
      const wrappedHtml = `<html><head><meta charset="utf-8"></head><body><pre style="white-space:pre-wrap">${escapeHtml(text)}</pre></body></html>`;
      return wrappedHtml;
    } catch (fallbackErr) {
      throw new Error(`Failed to extract HTML from ${url}: ${err.message}; fallback failed: ${fallbackErr.message}`);
    }
  }
}

module.exports = { extractFullPageHtml }; 