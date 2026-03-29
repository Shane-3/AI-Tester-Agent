/**
 * Test Runner Service
 * 
 * Actually executes tests against a website using the crawled data.
 * Each test performs real HTTP checks and returns genuine pass/fail results.
 */

const { checkLinks } = require('./websiteCrawler');

/**
 * Generate and run all tests based on crawled site data
 * @param {string} url - Target URL
 * @param {object} site - Crawled SiteAnalysis from websiteCrawler
 * @returns {Promise<TestResult[]>}
 */
async function runTests(url, site) {
  const results = [];
  let testId = 1;

  function id() { return `TC-${String(testId++).padStart(3, '0')}`; }

  // ═══════════════════════════════════════════════════════════════════════
  // 1. HTTP STATUS
  // ═══════════════════════════════════════════════════════════════════════
  results.push({
    id: id(), type: 'functional', priority: 'critical',
    title: `HTTP Status Check — ${url}`,
    passed: site.success && site.statusCode === 200,
    expected: 'HTTP 200 OK',
    actual: site.success ? `HTTP ${site.statusCode}` : `Failed: ${site.error}`,
    explanation: site.statusCode === 200
      ? `Site returned HTTP 200 OK successfully.`
      : site.success
        ? `Site returned HTTP ${site.statusCode} instead of 200. This may indicate a redirect, error, or access issue.`
        : `Could not reach the site: ${site.error}`,
    duration: site.responseTime || 0,
  });

  // If crawl failed entirely, return early
  if (!site.success) {
    results.push({
      id: id(), type: 'functional', priority: 'critical',
      title: `Site Reachability — ${url}`,
      passed: false,
      expected: 'Site accessible',
      actual: site.error,
      explanation: `The website could not be reached. Error: ${site.error}. All subsequent tests were skipped.`,
      duration: site.responseTime || 0,
    });
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. RESPONSE TIME (TTFB)
  // ═══════════════════════════════════════════════════════════════════════
  const ttfbOk = site.responseTime < 3000;
  results.push({
    id: id(), type: 'functional', priority: 'high',
    title: `Response Time (TTFB) — ${url}`,
    passed: ttfbOk,
    expected: '< 3000ms',
    actual: `${site.responseTime}ms`,
    explanation: ttfbOk
      ? `Page loaded in ${site.responseTime}ms, within the 3-second threshold.`
      : `Page took ${site.responseTime}ms to load, exceeding the 3-second threshold. Google recommends TTFB under 800ms for good user experience.`,
    duration: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. TITLE TAG
  // ═══════════════════════════════════════════════════════════════════════
  const hasTitle = !!site.title && site.title.length > 0;
  const titleLen = site.title?.length || 0;
  const titleGoodLength = titleLen >= 10 && titleLen <= 70;
  results.push({
    id: id(), type: 'functional', priority: 'high',
    title: `Page Title Tag`,
    passed: hasTitle && titleGoodLength,
    expected: 'Present, 10-70 characters',
    actual: hasTitle ? `"${site.title.substring(0, 70)}" (${titleLen} chars)` : 'Missing',
    explanation: !hasTitle
      ? `No <title> tag found. Search engines and browsers need a title to display your page correctly.`
      : !titleGoodLength
        ? `Title is ${titleLen} characters. Ideal length is 10-70 characters for SEO. ${titleLen < 10 ? 'Too short to be descriptive.' : 'Too long — search engines will truncate it.'}`
        : `Title tag is present and within ideal SEO length (${titleLen} chars).`,
    duration: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. META DESCRIPTION
  // ═══════════════════════════════════════════════════════════════════════
  const hasDesc = !!site.meta.description;
  const descLen = site.meta.description?.length || 0;
  const descGoodLen = descLen >= 50 && descLen <= 160;
  results.push({
    id: id(), type: 'functional', priority: 'high',
    title: `Meta Description`,
    passed: hasDesc && descGoodLen,
    expected: 'Present, 50-160 characters',
    actual: hasDesc ? `${descLen} characters` : 'Missing',
    explanation: !hasDesc
      ? `No <meta name="description"> found. Search engines will auto-generate a snippet, which may not represent your page well.`
      : !descGoodLen
        ? `Meta description is ${descLen} chars. Best practice is 50-160 chars. ${descLen < 50 ? 'Too short to be helpful.' : 'Too long — search engines will truncate it.'}`
        : `Meta description is present and within ideal length.`,
    duration: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. VIEWPORT META (Mobile)
  // ═══════════════════════════════════════════════════════════════════════
  const hasViewport = !!site.meta.viewport;
  results.push({
    id: id(), type: 'functional', priority: 'high',
    title: `Mobile Viewport Meta Tag`,
    passed: hasViewport,
    expected: '<meta name="viewport"> present',
    actual: hasViewport ? `"${site.meta.viewport}"` : 'Missing',
    explanation: hasViewport
      ? `Viewport meta tag is set, enabling responsive layout on mobile devices.`
      : `No viewport meta tag found. The page will not render correctly on mobile devices — it will appear zoomed out on phones and tablets.`,
    duration: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. HEADING STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════
  const h1Count = site.headings.h1.length;
  const hasOneH1 = h1Count === 1;
  results.push({
    id: id(), type: 'functional', priority: 'medium',
    title: `Heading Structure (H1 Tag)`,
    passed: hasOneH1,
    expected: 'Exactly 1 H1 tag',
    actual: `${h1Count} H1 tag(s)${h1Count > 0 ? ': "' + site.headings.h1[0]?.substring(0, 60) + '"' : ''}`,
    explanation: h1Count === 0
      ? `No H1 heading found. Every page should have exactly one H1 for SEO and accessibility.`
      : h1Count === 1
        ? `Page has exactly one H1 heading: "${site.headings.h1[0]?.substring(0, 60)}". This is correct for SEO.`
        : `Page has ${h1Count} H1 headings. Best practice is exactly one H1 per page for clear document structure.`,
    duration: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 7. HTTPS CHECK
  // ═══════════════════════════════════════════════════════════════════════
  const isHttps = url.startsWith('https://') || site.url?.startsWith('https://');
  results.push({
    id: id(), type: 'api', priority: 'critical',
    title: `HTTPS / SSL Check`,
    passed: isHttps,
    expected: 'HTTPS enabled',
    actual: isHttps ? 'HTTPS' : 'HTTP (insecure)',
    explanation: isHttps
      ? `Site uses HTTPS with SSL/TLS encryption. User data is transmitted securely.`
      : `Site uses plain HTTP without encryption. All data including passwords and personal information is transmitted in plaintext. This is a critical security vulnerability.`,
    duration: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 8. SECURITY HEADERS
  // ═══════════════════════════════════════════════════════════════════════
  const secHeaders = site.securityHeaders;
  const secCount = Object.values(secHeaders).filter(v => !!v).length;
  const secTotal = Object.keys(secHeaders).length;
  results.push({
    id: id(), type: 'api', priority: 'high',
    title: `Security Headers`,
    passed: secCount >= 3,
    expected: 'At least 3 of 6 security headers present',
    actual: `${secCount}/${secTotal} headers present`,
    explanation: (() => {
      const missing = [];
      if (!secHeaders.xFrameOptions) missing.push('X-Frame-Options (prevents clickjacking)');
      if (!secHeaders.contentSecurityPolicy) missing.push('Content-Security-Policy (prevents XSS)');
      if (!secHeaders.strictTransportSecurity) missing.push('Strict-Transport-Security (forces HTTPS)');
      if (!secHeaders.xContentTypeOptions) missing.push('X-Content-Type-Options (prevents MIME sniffing)');
      if (secCount >= 3) return `${secCount} security headers present. ${missing.length > 0 ? 'Missing: ' + missing.join(', ') + '.' : 'All critical headers are set.'}`;
      return `Only ${secCount} security headers found. Missing: ${missing.join(', ')}. These headers protect against common web attacks.`;
    })(),
    duration: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 9. IMAGE ALT TAGS (Accessibility)
  // ═══════════════════════════════════════════════════════════════════════
  if (site.images.total > 0) {
    const missingAlt = site.images.withoutAlt;
    const allHaveAlt = missingAlt === 0;
    results.push({
      id: id(), type: 'ui', priority: 'medium',
      title: `Image Alt Tags (Accessibility)`,
      passed: allHaveAlt,
      expected: 'All images have alt attributes',
      actual: allHaveAlt ? `All ${site.images.total} images have alt text` : `${missingAlt} of ${site.images.total} images missing alt`,
      explanation: allHaveAlt
        ? `All ${site.images.total} images have alt attributes. Screen readers can describe these images to visually impaired users.`
        : `${missingAlt} image(s) are missing alt attributes. This fails WCAG 2.1 Level A (Success Criterion 1.1.1). Screen readers cannot describe these images to users with visual impairments.`,
      duration: 0,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 10. OPEN GRAPH TAGS (Social Sharing)
  // ═══════════════════════════════════════════════════════════════════════
  const hasOG = !!site.openGraph.title || !!site.openGraph.description || !!site.openGraph.image;
  const ogComplete = !!site.openGraph.title && !!site.openGraph.description && !!site.openGraph.image;
  results.push({
    id: id(), type: 'functional', priority: 'low',
    title: `Open Graph Tags (Social Sharing)`,
    passed: ogComplete,
    expected: 'og:title, og:description, og:image all present',
    actual: (() => {
      const present = [];
      if (site.openGraph.title) present.push('og:title');
      if (site.openGraph.description) present.push('og:description');
      if (site.openGraph.image) present.push('og:image');
      return present.length > 0 ? present.join(', ') + ' present' : 'None found';
    })(),
    explanation: ogComplete
      ? `All Open Graph tags are set. Links shared on Facebook, LinkedIn, Twitter, and Slack will display a rich preview with title, description, and image.`
      : !hasOG
        ? `No Open Graph tags found. When this URL is shared on social media, it will show a plain text link with no preview image or description.`
        : `Incomplete Open Graph tags. ${!site.openGraph.title ? 'Missing og:title. ' : ''}${!site.openGraph.description ? 'Missing og:description. ' : ''}${!site.openGraph.image ? 'Missing og:image — no preview image when shared.' : ''}`,
    duration: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 11. BROKEN LINKS CHECK (limited to first 10 internal links)
  // ═══════════════════════════════════════════════════════════════════════
  const internalLinks = site.links.items.filter(l => !l.isExternal).slice(0, 10);
  if (internalLinks.length > 0) {
    const startLink = Date.now();
    const linkResults = await checkLinks(internalLinks, 5);
    const brokenLinks = linkResults.filter(r => !r.ok);
    const linkDuration = Date.now() - startLink;

    results.push({
      id: id(), type: 'functional', priority: 'high',
      title: `Broken Links Check (${internalLinks.length} internal links)`,
      passed: brokenLinks.length === 0,
      expected: '0 broken links',
      actual: brokenLinks.length === 0 ? `All ${linkResults.length} links OK` : `${brokenLinks.length} broken link(s)`,
      explanation: brokenLinks.length === 0
        ? `Checked ${linkResults.length} internal links — all returned successful status codes.`
        : `Found ${brokenLinks.length} broken link(s): ${brokenLinks.slice(0, 3).map(l => `${l.url} (${l.status || l.error})`).join(', ')}${brokenLinks.length > 3 ? ` and ${brokenLinks.length - 3} more.` : '.'}`,
      duration: linkDuration,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 12. FAVICON CHECK
  // ═══════════════════════════════════════════════════════════════════════
  try {
    const faviconStart = Date.now();
    const origin = new URL(url).origin;
    const favRes = await fetch(`${origin}/favicon.ico`, {
      method: 'HEAD',
      headers: { 'User-Agent': 'AI-Tester-Agent/1.0' },
      redirect: 'follow',
    });
    const favDuration = Date.now() - faviconStart;
    const favOk = favRes.status < 400;
    results.push({
      id: id(), type: 'ui', priority: 'low',
      title: `Favicon Check`,
      passed: favOk,
      expected: '/favicon.ico returns 200',
      actual: `HTTP ${favRes.status}`,
      explanation: favOk
        ? `Favicon found at ${origin}/favicon.ico. Browsers will display the icon in tabs and bookmarks.`
        : `No favicon found at ${origin}/favicon.ico (HTTP ${favRes.status}). Browser tabs will show a generic icon.`,
      duration: favDuration,
    });
  } catch (err) {
    results.push({
      id: id(), type: 'ui', priority: 'low',
      title: `Favicon Check`,
      passed: false, expected: '/favicon.ico accessible', actual: `Error: ${err.message}`,
      explanation: `Could not check favicon: ${err.message}`,
      duration: 0,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 13. ROBOTS.TXT CHECK
  // ═══════════════════════════════════════════════════════════════════════
  try {
    const robotsStart = Date.now();
    const origin = new URL(url).origin;
    const robotsRes = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': 'AI-Tester-Agent/1.0' },
      redirect: 'follow',
    });
    const robotsDuration = Date.now() - robotsStart;
    const robotsOk = robotsRes.status === 200;
    const robotsText = robotsOk ? await robotsRes.text() : '';
    results.push({
      id: id(), type: 'api', priority: 'low',
      title: `Robots.txt Check`,
      passed: robotsOk,
      expected: '/robots.txt returns 200',
      actual: robotsOk ? `Found (${robotsText.length} bytes)` : `HTTP ${robotsRes.status}`,
      explanation: robotsOk
        ? `robots.txt found and accessible. Search engine crawlers can read your crawl directives.`
        : `No robots.txt found (HTTP ${robotsRes.status}). While not required, it helps search engines understand which pages to crawl.`,
      duration: robotsDuration,
    });
  } catch (err) {
    // skip
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 14. HTML SIZE CHECK
  // ═══════════════════════════════════════════════════════════════════════
  const htmlSizeKB = Math.round(site.htmlSize / 1024);
  const htmlTooBig = htmlSizeKB > 500;
  results.push({
    id: id(), type: 'functional', priority: 'medium',
    title: `HTML Document Size`,
    passed: !htmlTooBig,
    expected: '< 500KB',
    actual: `${htmlSizeKB}KB`,
    explanation: htmlTooBig
      ? `HTML document is ${htmlSizeKB}KB, which exceeds 500KB. Large HTML slows down parsing and first contentful paint. Consider lazy-loading content.`
      : `HTML document is ${htmlSizeKB}KB, within acceptable limits for fast parsing.`,
    duration: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 15. FORM SECURITY CHECK
  // ═══════════════════════════════════════════════════════════════════════
  if (site.forms.length > 0) {
    const insecureForms = site.forms.filter(f => {
      if (!f.action) return false;
      try { return new URL(f.action, url).protocol === 'http:'; } catch { return false; }
    });
    results.push({
      id: id(), type: 'api', priority: 'high',
      title: `Form Security Check (${site.forms.length} form(s))`,
      passed: insecureForms.length === 0,
      expected: 'All forms submit over HTTPS',
      actual: insecureForms.length === 0 ? `All ${site.forms.length} form(s) secure` : `${insecureForms.length} insecure form(s)`,
      explanation: insecureForms.length === 0
        ? `All ${site.forms.length} form(s) submit data securely over HTTPS.`
        : `${insecureForms.length} form(s) submit data over plain HTTP. User input including passwords may be intercepted by attackers.`,
      duration: 0,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 16. CHARSET DECLARATION
  // ═══════════════════════════════════════════════════════════════════════
  const hasCharset = !!site.meta.charset;
  results.push({
    id: id(), type: 'functional', priority: 'medium',
    title: `Character Encoding Declaration`,
    passed: hasCharset,
    expected: 'charset declared (utf-8)',
    actual: hasCharset ? site.meta.charset : 'Not declared',
    explanation: hasCharset
      ? `Character encoding is declared as "${site.meta.charset}". Special characters will display correctly.`
      : `No character encoding declared. Special characters may display incorrectly in some browsers. Add <meta charset="utf-8"> to the <head>.`,
    duration: 0,
  });

  return results;
}

/**
 * Calculate summary stats from test results
 */
function summarizeResults(results) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const byType = {
    functional: results.filter(r => r.type === 'functional').length,
    api: results.filter(r => r.type === 'api').length,
    ui: results.filter(r => r.type === 'ui').length,
    edge: results.filter(r => r.type === 'edge').length,
  };
  const byPriority = {
    critical: results.filter(r => r.priority === 'critical').length,
    high: results.filter(r => r.priority === 'high').length,
    medium: results.filter(r => r.priority === 'medium').length,
    low: results.filter(r => r.priority === 'low').length,
  };
  const criticalFails = results.filter(r => !r.passed && r.priority === 'critical').length;
  const highFails = results.filter(r => !r.passed && r.priority === 'high').length;
  const totalDuration = results.reduce((s, r) => s + (r.duration || 0), 0);

  return { total, passed, failed, passRate: Math.round((passed / total) * 100), byType, byPriority, criticalFails, highFails, totalDuration };
}

module.exports = { runTests, summarizeResults };
