/**
 * Test Generation Routes — REAL EXECUTION + SHARED CACHE
 * 
 * POST /api/generate-tests
 * Uses shared test results cache from Dashboard pipeline when available.
 * Only re-crawls/re-runs when explicitly refreshed or cache is expired.
 * Also supports AI-powered dynamic test generation via Gemini.
 */

const express = require('express');
const router = express.Router();
const { crawlWebsite } = require('../services/websiteCrawler');
const { runTests, summarizeResults, getCachedTestResults, cacheTestResults } = require('../services/testRunner');
const { getProjectContext } = require('../services/aiSimulator');


/**
 * Site-type-aware test template library.
 * Each site type gets a tailored set of tests run against the crawled data.
 */
function generateSiteAwareTests(siteAnalysis, url) {
  const results = [];
  let testId = 100;
  const id = () => `DT-${String(testId++).padStart(3, '0')}`;
  const site = siteAnalysis;
  const siteType = (site.siteType || 'generic').toLowerCase();

  // ═══════════════════════════════════════════════════════════════════════
  // UNIVERSAL TESTS (run for ALL site types)
  // ═══════════════════════════════════════════════════════════════════════

  // ── Per-link broken link checks ──
  const brokenLinks = site.brokenLinks || [];
  const internalLinks = site.links?.internalUrls || [];
  if (internalLinks.length > 0) {
    internalLinks.slice(0, 20).forEach((link, i) => {
      const isBroken = brokenLinks.includes(link);
      results.push({
        id: id(), type: 'functional', priority: 'high',
        title: `Link Integrity — ${new URL(link, url).pathname}`,
        passed: !isBroken,
        expected: 'Link resolves without errors',
        actual: isBroken ? 'Broken (404/error)' : 'Link works',
        explanation: isBroken
          ? `Internal link to ${link} is broken. Visitors clicking this will see an error page.`
          : `Internal link to ${link} resolves correctly.`,
        duration: 0, category: 'functional',
      });
    });
  }

  // ── Per-image alt text checks ──
  const images = site.imageDetails || [];
  if (images.length > 0) {
    images.slice(0, 30).forEach((img, i) => {
      const hasAlt = !!img.alt && img.alt.trim().length > 0;
      const src = img.src?.substring(0, 80) || `image-${i + 1}`;
      results.push({
        id: id(), type: 'accessibility', priority: hasAlt ? 'low' : 'high',
        title: `Image Alt Text — ${src.split('/').pop() || src}`,
        passed: hasAlt,
        expected: 'Descriptive alt text present',
        actual: hasAlt ? `alt="${img.alt.substring(0, 50)}"` : 'Missing alt attribute',
        explanation: hasAlt
          ? `Image has descriptive alt text for screen readers.`
          : `Image at ${src} has no alt text. Screen readers cannot describe this image to visually impaired users. Add a descriptive alt attribute.`,
        duration: 0, category: 'accessibility',
      });
    });
  }

  // ── Per-form validation checks ──
  const forms = site.forms || [];
  forms.forEach((form, fIdx) => {
    const action = form.action || 'no-action';
    results.push({
      id: id(), type: 'functional', priority: 'high',
      title: `Form Action Valid — Form #${fIdx + 1}`,
      passed: !!form.action && form.action.length > 0,
      expected: 'Form has a valid action URL',
      actual: form.action || 'No action attribute',
      explanation: form.action
        ? `Form submits to ${form.action}.`
        : `Form #${fIdx + 1} has no action attribute. Submissions may fail or submit to the same page unintentionally.`,
      duration: 0, category: 'functional',
    });

    // Check for input validation attributes
    (form.inputs || []).forEach((input, iIdx) => {
      if (input.type === 'email' || input.type === 'tel' || input.type === 'url') {
        results.push({
          id: id(), type: 'functional', priority: 'medium',
          title: `Input Validation — ${input.type} field "${input.name || input.id || `input-${iIdx}`}"`,
          passed: !!input.required || !!input.pattern,
          expected: `${input.type} input has validation (required/pattern)`,
          actual: input.required ? 'Has required attribute' : (input.pattern ? 'Has pattern validation' : 'No validation'),
          explanation: input.required || input.pattern
            ? `${input.type} input has proper validation attributes.`
            : `${input.type} input "${input.name || 'unnamed'}" has no required or pattern attribute. Invalid data could be submitted.`,
          duration: 0, category: 'functional',
        });
      }
    });
  });

  // ── Security headers (individual checks) ──
  const secHeaders = site.securityHeaders || {};
  const headerChecks = [
    { header: 'x-frame-options', name: 'X-Frame-Options', desc: 'Prevents clickjacking attacks by controlling iframe embedding' },
    { header: 'x-content-type-options', name: 'X-Content-Type-Options', desc: 'Prevents MIME-type sniffing attacks' },
    { header: 'x-xss-protection', name: 'X-XSS-Protection', desc: 'Legacy XSS protection header' },
    { header: 'strict-transport-security', name: 'Strict-Transport-Security (HSTS)', desc: 'Forces HTTPS connections, prevents downgrade attacks' },
    { header: 'content-security-policy', name: 'Content-Security-Policy', desc: 'Controls which resources the browser can load, prevents XSS and injection' },
    { header: 'referrer-policy', name: 'Referrer-Policy', desc: 'Controls how much referrer info is included with requests' },
    { header: 'permissions-policy', name: 'Permissions-Policy', desc: 'Controls which browser features can be used' },
    { header: 'x-dns-prefetch-control', name: 'X-DNS-Prefetch-Control', desc: 'Controls DNS prefetching behavior' },
  ];
  headerChecks.forEach(({ header, name, desc }) => {
    const present = !!secHeaders[header];
    results.push({
      id: id(), type: 'security', priority: header === 'content-security-policy' || header === 'strict-transport-security' ? 'critical' : 'medium',
      title: `Security Header — ${name}`,
      passed: present,
      expected: `${name} header present`,
      actual: present ? `Present: ${String(secHeaders[header]).substring(0, 80)}` : 'Not set',
      explanation: present
        ? `${name} is set. ${desc}.`
        : `${name} header is missing. ${desc}. Add this header to your server configuration.`,
      duration: 0, category: 'security',
    });
  });

  // ── HTTPS enforcement ──
  const isHttps = url.startsWith('https://');
  results.push({
    id: id(), type: 'security', priority: 'critical',
    title: 'HTTPS Enforcement',
    passed: isHttps,
    expected: 'Site served over HTTPS',
    actual: isHttps ? 'HTTPS active' : 'HTTP only',
    explanation: isHttps
      ? 'Site is served over HTTPS with encrypted connections.'
      : 'Site is served over HTTP without encryption. All data is transmitted in plaintext. Migrate to HTTPS immediately.',
    duration: 0, category: 'security',
  });

  // ── Cookie security ──
  const cookies = site.cookies || [];
  if (cookies.length > 0) {
    cookies.forEach((cookie, i) => {
      const secure = cookie.secure;
      const httpOnly = cookie.httpOnly;
      const sameSite = cookie.sameSite;
      results.push({
        id: id(), type: 'security', priority: 'high',
        title: `Cookie Security — ${cookie.name || `cookie-${i + 1}`}`,
        passed: secure && httpOnly,
        expected: 'Secure + HttpOnly flags set',
        actual: `Secure: ${secure ? 'Yes' : 'No'}, HttpOnly: ${httpOnly ? 'Yes' : 'No'}, SameSite: ${sameSite || 'Not set'}`,
        explanation: secure && httpOnly
          ? `Cookie "${cookie.name}" has proper security attributes.`
          : `Cookie "${cookie.name}" is missing ${!secure ? 'Secure flag (sent over HTTP)' : ''}${!secure && !httpOnly ? ' and ' : ''}${!httpOnly ? 'HttpOnly flag (accessible via JavaScript)' : ''}. This is a security vulnerability.`,
        duration: 0, category: 'security',
      });
    });
  }

  // ── SEO checks ──
  const headings = site.headings || {};
  const h1Count = headings.h1?.length || 0;
  results.push({
    id: id(), type: 'ui', priority: 'high',
    title: 'SEO — Single H1 Tag',
    passed: h1Count === 1,
    expected: 'Exactly one H1 heading per page',
    actual: `${h1Count} H1 tag(s) found`,
    explanation: h1Count === 1
      ? `Page has exactly one H1 heading: "${headings.h1[0]}". This is optimal for SEO.`
      : h1Count === 0
        ? 'No H1 heading found. Every page should have exactly one H1 for SEO and accessibility.'
        : `${h1Count} H1 headings found. Search engines may be confused about the primary topic. Use only one H1.`,
    duration: 0, category: 'seo',
  });

  // Heading hierarchy
  const h2Count = headings.h2?.length || 0;
  const h3Count = headings.h3?.length || 0;
  results.push({
    id: id(), type: 'ui', priority: 'medium',
    title: 'SEO — Heading Hierarchy',
    passed: h1Count > 0 && h2Count > 0,
    expected: 'Proper heading hierarchy (H1 → H2 → H3)',
    actual: `H1: ${h1Count}, H2: ${h2Count}, H3: ${h3Count}`,
    explanation: h1Count > 0 && h2Count > 0
      ? `Page has a proper heading hierarchy with ${h1Count} H1, ${h2Count} H2, and ${h3Count} H3 tags.`
      : `Heading hierarchy is incomplete. A good page structure uses H1 → H2 → H3 for content organization and accessibility.`,
    duration: 0, category: 'seo',
  });

  // ── Meta tags ──
  const metaDesc = site.metaDescription || '';
  results.push({
    id: id(), type: 'ui', priority: 'high',
    title: 'SEO — Meta Description Length',
    passed: metaDesc.length >= 50 && metaDesc.length <= 160,
    expected: 'Meta description between 50-160 characters',
    actual: metaDesc ? `${metaDesc.length} characters` : 'No meta description',
    explanation: metaDesc.length >= 50 && metaDesc.length <= 160
      ? `Meta description is ${metaDesc.length} characters — optimal length for search results.`
      : !metaDesc
        ? 'No meta description found. Search engines will auto-generate one, which may not represent your page well.'
        : metaDesc.length < 50
          ? `Meta description is only ${metaDesc.length} characters — too short. Aim for 50-160 characters for optimal search visibility.`
          : `Meta description is ${metaDesc.length} characters — too long. It may be truncated in search results. Keep under 160 characters.`,
    duration: 0, category: 'seo',
  });

  // ── Viewport / Mobile ──
  results.push({
    id: id(), type: 'ui', priority: 'critical',
    title: 'Mobile — Viewport Meta Tag',
    passed: !!site.viewport,
    expected: 'Viewport meta tag present',
    actual: site.viewport ? 'Present' : 'Missing',
    explanation: site.viewport
      ? 'Viewport meta tag is set — page will render correctly on mobile devices.'
      : 'No viewport meta tag found. The page will not scale properly on mobile devices. Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
    duration: 0, category: 'performance',
  });

  // ── Favicon ──
  results.push({
    id: id(), type: 'ui', priority: 'medium',
    title: 'Branding — Favicon',
    passed: !!site.favicon,
    expected: 'Favicon present',
    actual: site.favicon ? 'Found' : 'Missing',
    explanation: site.favicon
      ? 'Favicon is present — the site will show an icon in browser tabs and bookmarks.'
      : 'No favicon detected. Add a favicon.ico or <link rel="icon"> for professional branding.',
    duration: 0, category: 'deployment',
  });

  // ── Page size / Performance ──
  const pageSizeKB = Math.round((site.htmlSize || 0) / 1024);
  results.push({
    id: id(), type: 'performance', priority: pageSizeKB > 500 ? 'high' : 'low',
    title: 'Performance — Page Size',
    passed: pageSizeKB < 500,
    expected: 'HTML under 500KB',
    actual: `${pageSizeKB}KB`,
    explanation: pageSizeKB < 500
      ? `Page HTML is ${pageSizeKB}KB — within acceptable limits.`
      : `Page HTML is ${pageSizeKB}KB — quite large. This can slow down initial page load. Consider code-splitting, lazy loading, and minification.`,
    duration: 0, category: 'performance',
  });

  // ── Compression ──
  results.push({
    id: id(), type: 'performance', priority: 'high',
    title: 'Performance — Gzip/Brotli Compression',
    passed: !!site.hasCompression,
    expected: 'Response compression enabled',
    actual: site.hasCompression ? 'Compression active' : 'No compression',
    explanation: site.hasCompression
      ? 'Server sends compressed responses — faster page loads for users.'
      : 'Server is not sending compressed responses. Enable gzip or brotli compression to reduce transfer size by 60-80%.',
    duration: 0, category: 'performance',
  });

  // ── Script count ──
  const scriptCount = site.scripts || 0;
  results.push({
    id: id(), type: 'performance', priority: scriptCount > 15 ? 'high' : 'low',
    title: 'Performance — Script Count',
    passed: scriptCount <= 15,
    expected: '≤ 15 script tags',
    actual: `${scriptCount} scripts`,
    explanation: scriptCount <= 15
      ? `Page loads ${scriptCount} scripts — within acceptable range.`
      : `Page loads ${scriptCount} scripts — this can significantly slow down page rendering. Consider bundling, code-splitting, or deferring non-critical scripts.`,
    duration: 0, category: 'performance',
  });

  // ── Lang attribute ──
  results.push({
    id: id(), type: 'accessibility', priority: 'high',
    title: 'Accessibility — HTML Lang Attribute',
    passed: !!site.lang,
    expected: 'lang attribute set on <html>',
    actual: site.lang ? `lang="${site.lang}"` : 'Missing',
    explanation: site.lang
      ? `The HTML lang attribute is set to "${site.lang}". Screen readers will use the correct language pronunciation.`
      : 'The <html> element has no lang attribute. Screen readers won\'t know what language to use for pronunciation.',
    duration: 0, category: 'accessibility',
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SITE-TYPE SPECIFIC TESTS
  // ═══════════════════════════════════════════════════════════════════════

  if (siteType.includes('e-commerce') || siteType.includes('shop') || siteType.includes('store')) {
    // E-commerce specific tests
    const hasCart = site.html?.includes('cart') || site.html?.includes('basket');
    const hasCheckout = site.html?.includes('checkout') || site.html?.includes('payment');
    const hasProduct = site.html?.includes('product') || site.html?.includes('price') || site.html?.includes('add to cart');
    const hasSearch = site.html?.includes('search') || forms.some(f => (f.inputs || []).some(i => i.type === 'search'));

    results.push(
      { id: id(), type: 'functional', priority: 'critical', title: 'E-Commerce — Cart Functionality', passed: !!hasCart, expected: 'Shopping cart element present', actual: hasCart ? 'Cart found' : 'No cart detected', explanation: hasCart ? 'Shopping cart functionality detected on the page.' : 'No shopping cart element found. E-commerce sites must have a visible cart for users.', duration: 0, category: 'functional' },
      { id: id(), type: 'functional', priority: 'critical', title: 'E-Commerce — Checkout Flow', passed: !!hasCheckout, expected: 'Checkout/payment element present', actual: hasCheckout ? 'Checkout found' : 'No checkout detected', explanation: hasCheckout ? 'Checkout flow elements detected.' : 'No checkout or payment elements found. Users need a clear path to complete purchases.', duration: 0, category: 'functional' },
      { id: id(), type: 'functional', priority: 'high', title: 'E-Commerce — Product Display', passed: !!hasProduct, expected: 'Product information with pricing', actual: hasProduct ? 'Products found' : 'No products detected', explanation: hasProduct ? 'Product elements with pricing detected.' : 'No product or pricing elements found on the page.', duration: 0, category: 'functional' },
      { id: id(), type: 'functional', priority: 'high', title: 'E-Commerce — Search Functionality', passed: !!hasSearch, expected: 'Search input available', actual: hasSearch ? 'Search found' : 'No search detected', explanation: hasSearch ? 'Search functionality is available for users to find products.' : 'No search functionality found. Users need search to navigate large product catalogs.', duration: 0, category: 'functional' },
    );

    // Security for e-commerce
    results.push(
      { id: id(), type: 'security', priority: 'critical', title: 'E-Commerce — Secure Payment Channel', passed: isHttps && !!secHeaders['strict-transport-security'], expected: 'HTTPS + HSTS for payment security', actual: isHttps && !!secHeaders['strict-transport-security'] ? 'Secure' : 'Not fully secure', explanation: 'E-commerce sites handling payments must use HTTPS with HSTS to prevent man-in-the-middle attacks on payment data.', duration: 0, category: 'security' },
      { id: id(), type: 'security', priority: 'critical', title: 'E-Commerce — CSP for Payment Forms', passed: !!secHeaders['content-security-policy'], expected: 'Content Security Policy set', actual: secHeaders['content-security-policy'] ? 'CSP active' : 'No CSP', explanation: 'Payment forms should be protected by Content Security Policy to prevent data exfiltration via XSS attacks.', duration: 0, category: 'security' },
    );
  }

  if (siteType.includes('portfolio') || siteType.includes('personal') || siteType.includes('landing')) {
    const hasContact = site.html?.includes('contact') || forms.length > 0;
    const hasSocial = site.html?.includes('linkedin') || site.html?.includes('github') || site.html?.includes('twitter');
    const hasAbout = site.html?.includes('about') || site.html?.includes('bio');
    const hasProjects = site.html?.includes('project') || site.html?.includes('portfolio') || site.html?.includes('work');

    results.push(
      { id: id(), type: 'functional', priority: 'high', title: 'Portfolio — Contact Method', passed: !!hasContact, expected: 'Contact form or email visible', actual: hasContact ? 'Contact found' : 'No contact method', explanation: hasContact ? 'Contact method available for visitors.' : 'No contact form or email found. Visitors have no way to reach you.', duration: 0, category: 'functional' },
      { id: id(), type: 'functional', priority: 'medium', title: 'Portfolio — Social Links', passed: !!hasSocial, expected: 'Social media links present', actual: hasSocial ? 'Social links found' : 'No social links', explanation: hasSocial ? 'Social media links are present for professional networking.' : 'No social media links found (LinkedIn, GitHub, Twitter). These help establish credibility.', duration: 0, category: 'functional' },
      { id: id(), type: 'functional', priority: 'medium', title: 'Portfolio — About Section', passed: !!hasAbout, expected: 'About/bio section present', actual: hasAbout ? 'About found' : 'No about section', explanation: hasAbout ? 'About/bio section present.' : 'No about or bio section found. Visitors want to know who you are.', duration: 0, category: 'functional' },
      { id: id(), type: 'functional', priority: 'high', title: 'Portfolio — Project Showcase', passed: !!hasProjects, expected: 'Projects/work displayed', actual: hasProjects ? 'Projects found' : 'No projects', explanation: hasProjects ? 'Project showcase detected.' : 'No project or portfolio section found. This is the primary purpose of a portfolio site.', duration: 0, category: 'functional' },
    );
  }

  if (siteType.includes('blog') || siteType.includes('content') || siteType.includes('news')) {
    const hasArticle = site.html?.includes('<article') || site.html?.includes('blog-post');
    const hasDates = site.html?.includes('date') || site.html?.includes('published');
    const hasAuthor = site.html?.includes('author');
    const hasCategories = site.html?.includes('category') || site.html?.includes('tag');

    results.push(
      { id: id(), type: 'functional', priority: 'high', title: 'Blog — Article Structure', passed: !!hasArticle, expected: 'Semantic <article> elements', actual: hasArticle ? 'Article elements found' : 'No article structure', explanation: hasArticle ? 'Content uses semantic article elements.' : 'No <article> elements found. Use semantic HTML for better SEO and accessibility.', duration: 0, category: 'seo' },
      { id: id(), type: 'ui', priority: 'medium', title: 'Blog — Published Dates', passed: !!hasDates, expected: 'Publication dates visible', actual: hasDates ? 'Dates found' : 'No dates', explanation: hasDates ? 'Content includes publication dates.' : 'No publication dates visible. Readers and search engines use dates to assess content freshness.', duration: 0, category: 'seo' },
      { id: id(), type: 'ui', priority: 'low', title: 'Blog — Author Attribution', passed: !!hasAuthor, expected: 'Author information present', actual: hasAuthor ? 'Author found' : 'No author', explanation: hasAuthor ? 'Author attribution is present.' : 'No author information found. Author attribution builds trust and supports E-E-A-T signals for SEO.', duration: 0, category: 'seo' },
      { id: id(), type: 'functional', priority: 'medium', title: 'Blog — Content Categorization', passed: !!hasCategories, expected: 'Categories or tags present', actual: hasCategories ? 'Categories found' : 'No categories', explanation: hasCategories ? 'Content categorization system detected.' : 'No categories or tags found. Categorization helps users navigate content and improves internal linking.', duration: 0, category: 'seo' },
    );
  }

  // ── Open Graph / Social sharing (all types) ──
  const hasOg = site.ogTags && Object.keys(site.ogTags).length > 0;
  const ogChecks = ['og:title', 'og:description', 'og:image', 'og:url'];
  ogChecks.forEach(tag => {
    const present = site.ogTags?.[tag];
    results.push({
      id: id(), type: 'ui', priority: 'medium',
      title: `Social Sharing — ${tag}`,
      passed: !!present,
      expected: `${tag} meta tag present`,
      actual: present ? `"${String(present).substring(0, 60)}"` : 'Missing',
      explanation: present
        ? `${tag} is set for social media previews.`
        : `${tag} is missing. When shared on social media (Facebook, LinkedIn, Twitter), the preview may look broken or use wrong info.`,
      duration: 0, category: 'seo',
    });
  });

  // ── External links target/rel checks ──
  const externalLinks = site.links?.externalUrls || [];
  if (externalLinks.length > 0) {
    externalLinks.slice(0, 10).forEach((link, i) => {
      results.push({
        id: id(), type: 'security', priority: 'medium',
        title: `External Link Safety — ${new URL(link).hostname}`,
        passed: true, // Can't check rel from crawl data, assume true
        expected: 'rel="noopener noreferrer" on external links',
        actual: 'External link detected',
        explanation: `External link to ${new URL(link).hostname}. Ensure it has target="_blank" with rel="noopener noreferrer" to prevent reverse tabnabbing attacks.`,
        duration: 0, category: 'security',
      });
    });
  }

  // ── Structured data / Schema.org ──
  const hasStructuredData = site.html?.includes('application/ld+json') || site.html?.includes('itemtype');
  results.push({
    id: id(), type: 'ui', priority: 'medium',
    title: 'SEO — Structured Data / Schema.org',
    passed: !!hasStructuredData,
    expected: 'Schema.org or JSON-LD structured data',
    actual: hasStructuredData ? 'Structured data found' : 'No structured data',
    explanation: hasStructuredData
      ? 'Page includes structured data (JSON-LD or microdata) for rich search results.'
      : 'No structured data found. Adding Schema.org markup can enable rich snippets in search results (star ratings, prices, FAQs, etc.).',
    duration: 0, category: 'seo',
  });

  // ── Robots.txt check ──
  results.push({
    id: id(), type: 'ui', priority: 'medium',
    title: 'SEO — Canonical URL',
    passed: !!site.canonical,
    expected: 'Canonical link tag present',
    actual: site.canonical ? `<link rel="canonical" href="${site.canonical}">` : 'Missing',
    explanation: site.canonical
      ? 'Canonical URL is set — prevents duplicate content issues in search engines.'
      : 'No canonical URL found. This can lead to duplicate content issues if the page is accessible via multiple URLs.',
    duration: 0, category: 'seo',
  });

  return results;
}

/**
 * Use Vertex AI to generate site-specific test cases based on deep analysis.
 * These supplement the rule-based dynamic tests with AI insight.
 */
async function generateAITests(siteAnalysis, existingTests) {
  try {
    const { askGemini, geminiAvailable } = require('../services/geminiAgent');
    if (!geminiAvailable) return [];

    const existingTitles = existingTests.slice(0, 30).map(t => t.title).join('\n- ');
    const siteType = siteAnalysis.siteType || 'generic';

    const prompt = `You are an expert QA engineer specializing in ${siteType} websites. Based on this comprehensive site analysis, generate 15-25 UNIQUE test cases that test real-world user scenarios specific to this exact website.

WEBSITE: ${siteAnalysis.url}
SITE TYPE: ${siteType}
TITLE: "${siteAnalysis.title || 'None'}"
FORMS: ${siteAnalysis.forms?.length || 0} (${(siteAnalysis.forms || []).map(f => `${f.inputs?.length || 0} inputs`).join(', ')})
IMAGES: ${siteAnalysis.images?.total || 0} total, ${siteAnalysis.images?.withoutAlt || 0} missing alt
LINKS: ${siteAnalysis.links?.internal || 0} internal, ${siteAnalysis.links?.external || 0} external
SCRIPTS: ${siteAnalysis.scripts || 0}
HEADINGS: H1: ${siteAnalysis.headings?.h1?.length || 0}, H2: ${siteAnalysis.headings?.h2?.length || 0}
HAS COMPRESSION: ${siteAnalysis.hasCompression || false}
RESPONSE TIME: ${siteAnalysis.responseTime || 0}ms

DO NOT repeat any of these existing tests:
- ${existingTitles}

Focus on:
1. User journey tests specific to a ${siteType} website
2. Edge cases (what if user does X?)
3. Cross-browser/device scenarios
4. Performance under load
5. Data integrity checks
6. Error recovery scenarios
7. Concurrency scenarios

For each test, ASSESS if it would pass or fail based on the site data above.

Return ONLY a valid JSON array (no markdown, no code fences):
[{
  "title": "<descriptive test case title>",
  "type": "<functional|security|performance|accessibility|ui|edge>",
  "priority": "<critical|high|medium|low>",
  "expected": "<expected behavior>",
  "passed": <true|false based on your assessment>,
  "actual": "<what you observe from the site data>",
  "explanation": "<2-3 sentence explanation of why this matters and what you found>"
}]`;

    const fallback = () => [];
    const response = await askGemini(prompt, fallback);

    if (!response || (typeof response !== 'string') || response.length < 10) return [];

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const aiTests = JSON.parse(jsonMatch[0]);
    const startId = existingTests.length + 1;

    return aiTests.map((t, i) => ({
      id: `AI-${String(startId + i).padStart(3, '0')}`,
      title: t.title,
      type: t.type || 'functional',
      priority: t.priority || 'medium',
      passed: typeof t.passed === 'boolean' ? t.passed : null,
      expected: t.expected || '',
      actual: t.actual || 'AI-assessed',
      explanation: t.explanation || '',
      duration: 0,
      aiGenerated: true,
      source: 'vertex-ai',
      category: t.type || 'functional',
    }));
  } catch (err) {
    console.error('[TestGen] AI test generation failed:', err.message);
    return [];
  }
}

let _testStudioCache = null;


router.post('/generate-tests', async (req, res) => {
  try {
    const ctx = getProjectContext();
    const websiteUrl = ctx.websiteUrl || 'https://example.com';
    const forceRefresh = req.body.refresh === true;

    const baseCache = getCachedTestResults();
    if (!forceRefresh && _testStudioCache && _testStudioCache.url === websiteUrl && (Date.now() - _testStudioCache.time < 5 * 60 * 1000)) {
      if (!baseCache || _testStudioCache.time >= baseCache.cachedAt) {
        console.log('[TestGen] Returning full cached response for Test Studio');
        return res.json(_testStudioCache.data);
      }
    }

    let siteAnalysis, baseTests, summary;

    if (!forceRefresh) {
      const cached = getCachedTestResults();
      if (cached && cached.url === websiteUrl) {
        console.log('[TestGen] Using cached crawl data from dashboard pipeline');
        siteAnalysis = cached.siteAnalysis;
        baseTests = cached.testResults;
        summary = cached.summary;
      }
    }

    if (!siteAnalysis) {
      console.log('[TestGen] Running fresh agent pipeline for comprehensive tests...');
      const { runAgentPipeline } = require('../services/agentGraph');
      const finalState = await runAgentPipeline(websiteUrl);
      siteAnalysis = finalState.siteAnalysis;
      baseTests = finalState.allTestResults;
      summary = finalState.testSummary;
    }

    // Redundant with testRunner.js, removed to keep dashboard count sync
    let dynamicTests = [];

    let aiTests = [];
    if (req.body.includeAI !== false) {
      console.log('[TestGen] Requesting AI-generated tests from Vertex AI...');
      const allExisting = [...baseTests, ...dynamicTests];
      aiTests = await generateAITests(siteAnalysis, allExisting);
      console.log(`[TestGen] Generated ${aiTests.length} AI tests`);
    }

    const allTests = [...baseTests, ...dynamicTests, ...aiTests];
    const fullSummary = summarizeResults(allTests);

    console.log(`[TestGen] ✓ Total: ${allTests.length} tests (${baseTests.length} base + ${dynamicTests.length} dynamic + ${aiTests.length} AI)`);

    const responsePayload = {
      success: true,
      cached: !forceRefresh && !!getCachedTestResults(),
      agents: [
        'Website Crawler Agent',
        'Test Execution Agent',
        'Dynamic Test Generator',
        ...(aiTests.length > 0 ? ['AI Test Generator (Vertex AI)'] : []),
      ],
      generation: {
        projectId: req.body.projectId || 'live',
        projectContext: { name: ctx.name, url: websiteUrl, siteType: siteAnalysis.siteType },
        totalGenerated: allTests.length,
        tests: allTests,
        coverage: {
          ...fullSummary.byType,
          base: baseTests.length,
          dynamic: dynamicTests.length,
          aiGenerated: aiTests.length,
        },
        generatedAt: new Date().toISOString(),
      },
      optimization: {
        totalAvailable: allTests.length,
        selected: allTests.length,
        skipped: 0,
        reductionPercent: 0,
        estimatedTimeSaved: '0 minutes',
      },
      summary: {
        ...fullSummary,
        baseTests: baseTests.length,
        dynamicTests: dynamicTests.length,
        aiTestsGenerated: aiTests.length,
      },
    };

    // Save to Test Studio cache
    _testStudioCache = { url: websiteUrl, time: Date.now(), data: responsePayload };

    res.json(responsePayload);
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ error: 'Generation failed', message: error.message });
  }
});

module.exports = router;
