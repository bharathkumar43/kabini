// Lightweight, read-only ecommerce adapters for Shopify, WooCommerce, Magento
// Only exposes testConnection to verify credentials without writing data

/**
 * Normalize a base URL by removing trailing slashes.
 */
function normalizeBaseUrl(url) {
  try {
    return url.replace(/\/$/, '');
  } catch {
    return url;
  }
}

async function testShopify(creds) {
  const { shop, accessToken } = creds || {};
  if (!shop || !accessToken) {
    return { ok: false, error: 'Missing shop or accessToken' };
  }
  const base = shop.includes('://') ? shop : `https://${shop}`;
  const url = `${normalizeBaseUrl(base)}/admin/api/2023-10/products.json?limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, status: res.status, error: text?.slice(0, 300) };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, sample: Array.isArray(data?.products) ? data.products.length : 0 };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function testWoo(creds) {
  const { baseUrl, consumerKey, consumerSecret } = creds || {};
  if (!baseUrl || !consumerKey || !consumerSecret) {
    return { ok: false, error: 'Missing baseUrl, consumerKey or consumerSecret' };
  }
  const url = `${normalizeBaseUrl(baseUrl)}/wp-json/wc/v3/products?per_page=1&consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, status: res.status, error: text?.slice(0, 300) };
    }
    const data = await res.json().catch(() => ([]));
    return { ok: true, sample: Array.isArray(data) ? data.length : 0 };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function testMagento(creds) {
  const { baseUrl, token } = creds || {};
  if (!baseUrl || !token) {
    return { ok: false, error: 'Missing baseUrl or token' };
  }
  const url = `${normalizeBaseUrl(baseUrl)}/rest/V1/products?searchCriteria[pageSize]=1`;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, status: res.status, error: text?.slice(0, 300) };
    }
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data?.items) ? data.items.length : (Array.isArray(data) ? data.length : 0);
    return { ok: true, sample: items };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function testConnection(platform, credentials) {
  switch ((platform || '').toLowerCase()) {
    case 'shopify':
      return testShopify(credentials);
    case 'woocommerce':
      return testWoo(credentials);
    case 'magento':
      return testMagento(credentials);
    default:
      return { ok: false, error: 'Unsupported platform' };
  }
}

module.exports = { testConnection };

// ===================== Read-only product listing and HTML fetch =====================

function mapShopifyProducts(arr = []) {
  return (arr || []).map(p => ({
    id: String(p.id),
    title: p.title,
    handle: p.handle,
    status: p.status,
    price: p?.variants?.[0]?.price,
    sku: p?.variants?.[0]?.sku,
    raw: p
  }));
}

async function listProducts(platform, credentials, { page = 1, limit = 10 } = {}) {
  switch ((platform || '').toLowerCase()) {
    case 'shopify': {
      const { shop, accessToken } = credentials || {};
      const base = shop.includes('://') ? shop : `https://${shop}`;
      const url = `${normalizeBaseUrl(base)}/admin/api/2023-10/products.json?limit=${limit}&page=${page}`;
      const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': accessToken, 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Shopify error ${res.status}`);
      const data = await res.json();
      return mapShopifyProducts(data?.products || []);
    }
    case 'woocommerce': {
      const { baseUrl, consumerKey, consumerSecret } = credentials || {};
      const url = `${normalizeBaseUrl(baseUrl)}/wp-json/wc/v3/products?per_page=${limit}&page=${page}&consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Woo error ${res.status}`);
      const arr = await res.json();
      return (arr || []).map(p => ({ id: String(p.id), title: p.name, url: p.permalink, price: p?.price, sku: p?.sku, status: p?.status, raw: p }));
    }
    case 'magento': {
      const { baseUrl, token } = credentials || {};
      const url = `${normalizeBaseUrl(baseUrl)}/rest/V1/products?searchCriteria[currentPage]=${page}&searchCriteria[pageSize]=${limit}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Magento error ${res.status}`);
      const data = await res.json();
      const items = data?.items || [];
      return items.map(p => {
        const urlKey = (p.custom_attributes || p.customAttributes || []).find(a => a.attribute_code === 'url_key')?.value;
        return { id: String(p.id || p.sku), title: p.name, urlKey, sku: p.sku, status: p.status, raw: p };
      });
    }
    default:
      throw new Error('Unsupported platform');
  }
}

async function fetchProductHtml(platform, credentials, idOrHandleOrUrl) {
  switch ((platform || '').toLowerCase()) {
    case 'shopify': {
      const { shop } = credentials || {};
      const base = shop.includes('://') ? shop : `https://${shop}`;
      // If a full URL is passed, use it; otherwise assume handle
      const url = /^https?:\/\//i.test(idOrHandleOrUrl) ? idOrHandleOrUrl : `${normalizeBaseUrl(base)}/products/${idOrHandleOrUrl}`;
      const res = await fetch(url, { headers: { 'Accept': 'text/html' } });
      const html = await res.text();
      if (!res.ok) throw new Error(`Shopify HTML fetch error ${res.status}`);
      return { url, html };
    }
    case 'woocommerce': {
      const url = idOrHandleOrUrl; // Woo REST gives permalink; frontend can pass url directly
      const res = await fetch(url, { headers: { 'Accept': 'text/html' } });
      const html = await res.text();
      if (!res.ok) throw new Error(`Woo HTML fetch error ${res.status}`);
      return { url, html };
    }
    case 'magento': {
      const { baseUrl } = credentials || {};
      let url = idOrHandleOrUrl;
      if (!/^https?:\/\//i.test(url)) {
        // Treat as url_key
        url = `${normalizeBaseUrl(baseUrl)}/${idOrHandleOrUrl}.html`;
      }
      const res = await fetch(url, { headers: { 'Accept': 'text/html' } });
      const html = await res.text();
      if (!res.ok) throw new Error(`Magento HTML fetch error ${res.status}`);
      return { url, html };
    }
    default:
      throw new Error('Unsupported platform');
  }
}

module.exports.listProducts = listProducts;
module.exports.fetchProductHtml = fetchProductHtml;


