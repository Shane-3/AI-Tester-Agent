/**
 * Website Crawler Service
 * 
 * Actually fetches the configured URL, parses HTML with Cheerio,
 * and extracts real page structure: links, forms, meta tags, images, etc.
 */

const cheerio = require('cheerio');

const CRAWL_TIMEOUT = 15000; // 15s
const USER_AGENT = 'AI-Tester-Agent/1.0 (Autonomous Release Intelligence)';

/**
 * Crawl a website and return structured analysis
 * @param {string} url - The URL to crawl
 * @returns {Promise<SiteAnalysis>}
 */
async function crawlWebsite(url) {
  const startTime = Date.now();

  // Normalize URL
  if (!url.startsWith('http')) url = 'https://' + url;

  let response, html, statusCode, responseTime, headers;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CRAWL_TIMEOUT);

    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);
    responseTime = Date.now() - startTime;
    statusCode = response.status;
    headers = Object.fromEntries(response.headers.entries());
    html = await response.text();
  } catch (err) {
    return {
      url,
      success: false,
      error: err.name === 'AbortError' ? 'Request timed out after 15s' : err.message,
      statusCode: 0,
      responseTime: Date.now() - startTime,
      crawledAt: new Date().toISOString(),
    };
  }

  const $ = cheerio.load(html);

  // ── Extract Title ──────────────────────────────────────────────────────
  const title = $('title').text().trim();

  // ── Extract Meta Tags ──────────────────────────────────────────────────
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const metaViewport = $('meta[name="viewport"]').attr('content') || '';
  const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content') || '';

  // ── Extract Headings ───────────────────────────────────────────────────
  const headings = { h1: [], h2: [], h3: [] };
  $('h1').each((_, el) => { const t = $(el).text().trim(); if (t) headings.h1.push(t); });
  $('h2').each((_, el) => { const t = $(el).text().trim(); if (t) headings.h2.push(t.substring(0, 100)); });
  $('h3').each((_, el) => { const t = $(el).text().trim(); if (t) headings.h3.push(t.substring(0, 80)); });

  // ── Extract Links ──────────────────────────────────────────────────────
  const links = [];
  const linkSet = new Set();
  $('a[href]').each((_, el) => {
    let href = $(el).attr('href') || '';
    const text = $(el).text().trim().substring(0, 80);
    if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    // Resolve relative URLs
    try {
      href = new URL(href, url).href;
    } catch { return; }

    if (!linkSet.has(href)) {
      linkSet.add(href);
      const isExternal = !href.startsWith(new URL(url).origin);
      links.push({ href, text, isExternal });
    }
  });

  // ── Extract Images ─────────────────────────────────────────────────────
  const images = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    const hasAlt = !!$(el).attr('alt');
    if (src) images.push({ src: src.substring(0, 200), alt: alt.substring(0, 100), hasAlt });
  });

  // ── Extract Forms ──────────────────────────────────────────────────────
  const forms = [];
  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    const method = ($(el).attr('method') || 'GET').toUpperCase();
    const inputs = [];
    $(el).find('input, textarea, select').each((_, inp) => {
      inputs.push({
        type: $(inp).attr('type') || $(inp).prop('tagName').toLowerCase(),
        name: $(inp).attr('name') || '',
        required: $(inp).attr('required') !== undefined,
      });
    });
    forms.push({ action, method, inputs });
  });

  // ── Extract Scripts & Styles ───────────────────────────────────────────
  const scripts = [];
  $('script[src]').each((_, el) => scripts.push($(el).attr('src')));
  const stylesheets = [];
  $('link[rel="stylesheet"]').each((_, el) => stylesheets.push($(el).attr('href')));

  // ── Security Headers ───────────────────────────────────────────────────
  const securityHeaders = {
    xFrameOptions: headers['x-frame-options'] || null,
    contentSecurityPolicy: headers['content-security-policy'] || null,
    strictTransportSecurity: headers['strict-transport-security'] || null,
    xContentTypeOptions: headers['x-content-type-options'] || null,
    xXssProtection: headers['x-xss-protection'] || null,
    referrerPolicy: headers['referrer-policy'] || null,
  };

  // ── Detect Site Type ───────────────────────────────────────────────────
  const htmlLower = html.toLowerCase();
  let siteType = 'website';
  if (htmlLower.includes('add to cart') || htmlLower.includes('price') || htmlLower.includes('checkout') || htmlLower.includes('product')) {
    siteType = 'e-commerce';
  } else if (htmlLower.includes('sign up') || htmlLower.includes('pricing') || htmlLower.includes('features') || htmlLower.includes('get started')) {
    siteType = 'saas';
  } else if (htmlLower.includes('blog') || htmlLower.includes('article') || htmlLower.includes('published')) {
    siteType = 'blog';
  } else if (htmlLower.includes('portfolio') || htmlLower.includes('projects') || htmlLower.includes('about me')) {
    siteType = 'portfolio';
  } else if (htmlLower.includes('documentation') || htmlLower.includes('api reference') || htmlLower.includes('getting started')) {
    siteType = 'documentation';
  }

  return {
    url,
    success: true,
    statusCode,
    responseTime,
    headers,
    title,
    meta: { description: metaDescription, viewport: metaViewport, keywords: metaKeywords, charset },
    openGraph: { title: ogTitle, description: ogDescription, image: ogImage },
    twitterCard,
    canonical,
    headings,
    links: { total: links.length, internal: links.filter(l => !l.isExternal).length, external: links.filter(l => l.isExternal).length, items: links.slice(0, 50) },
    images: { total: images.length, withoutAlt: images.filter(i => !i.hasAlt).length, items: images.slice(0, 30) },
    forms,
    scripts: scripts.length,
    stylesheets: stylesheets.length,
    securityHeaders,
    siteType,
    htmlSize: html.length,
    crawledAt: new Date().toISOString(),
  };
}

/**
 * Check a single link for broken status
 * @param {string} linkUrl
 * @returns {Promise<{url: string, status: number, ok: boolean}>}
 */
async function checkLink(linkUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(linkUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return { url: linkUrl, status: res.status, ok: res.status < 400 };
  } catch (err) {
    return { url: linkUrl, status: 0, ok: false, error: err.message };
  }
}

/**
 * Check multiple links in parallel (with concurrency limit)
 */
async function checkLinks(links, concurrency = 5) {
  const results = [];
  for (let i = 0; i < links.length; i += concurrency) {
    const batch = links.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(l => checkLink(l.href)));
    results.push(...batchResults);
  }
  return results;
}

module.exports = { crawlWebsite, checkLink, checkLinks };
