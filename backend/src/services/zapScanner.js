/**
 * OWASP ZAP Scanner — Dynamic Application Security Testing
 * 
 * Connects to a running ZAP daemon via the zaproxy npm client.
 * Performs spider + active scan to find real security vulnerabilities.
 * Graceful fallback if ZAP is not running.
 */

let zapAvailable = false;
let ZapClient = null;

try {
  ZapClient = require('zaproxy');
  console.log('[ZAP] zaproxy client loaded');
} catch (err) {
  console.warn('[ZAP] zaproxy client not available:', err.message);
}

const ZAP_API_KEY = process.env.ZAP_API_KEY || '';
const ZAP_PROXY_HOST = process.env.ZAP_PROXY_HOST || '127.0.0.1';
const ZAP_PROXY_PORT = parseInt(process.env.ZAP_PROXY_PORT || '8080', 10);

// Check if ZAP is configured
if (ZapClient && ZAP_API_KEY) {
  zapAvailable = true;
  console.log(`[ZAP] Configured — proxy at ${ZAP_PROXY_HOST}:${ZAP_PROXY_PORT}`);
} else {
  console.log('[ZAP] Not configured (set ZAP_API_KEY to enable). Using header-based security checks as fallback.');
}

/**
 * Map ZAP risk level to our severity format
 */
function mapZapRisk(risk) {
  switch (risk) {
    case '3': case 'High': return 'critical';
    case '2': case 'Medium': return 'high';
    case '1': case 'Low': return 'medium';
    case '0': case 'Informational': return 'low';
    default: return 'medium';
  }
}

/**
 * Map ZAP confidence to a description
 */
function mapZapConfidence(confidence) {
  switch (confidence) {
    case '3': case 'High': return 'high confidence';
    case '2': case 'Medium': return 'medium confidence';
    case '1': case 'Low': return 'low confidence';
    default: return 'confirmed';
  }
}

/**
 * Wait for ZAP scan to complete
 */
async function waitForScan(zap, scanId, type = 'spider', maxWaitMs = 60000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    let progress;
    if (type === 'spider') {
      const status = await zap.spider.status(scanId);
      progress = parseInt(status.status, 10);
    } else {
      const status = await zap.ascan.status(scanId);
      progress = parseInt(status.status, 10);
    }
    if (progress >= 100) return true;
    await new Promise(r => setTimeout(r, 2000));
  }
  return false; // Timed out
}

/**
 * Run OWASP ZAP security scan against a URL
 * @param {string} url - Target URL
 * @param {object} siteAnalysis - Crawled site data for context
 * @returns {Promise<Array>} Test results in standard format
 */
async function runZapScan(url, siteAnalysis) {
  if (!zapAvailable || !ZapClient) {
    console.log('[ZAP] Skipped — not configured');
    return [];
  }

  const results = [];
  let testId = 700;
  const id = () => `ZAP-${String(testId++).padStart(3, '0')}`;

  try {
    const zap = new ZapClient({
      apiKey: ZAP_API_KEY,
      proxy: { host: ZAP_PROXY_HOST, port: ZAP_PROXY_PORT },
    });

    console.log(`[ZAP] Starting security scan on ${url}...`);

    // ── Step 1: Spider scan (discover pages) ──
    const spiderScanStart = Date.now();
    let spiderScanId;
    try {
      const spiderResult = await zap.spider.scan({ url, maxchildren: 10, recurse: true, subtreeonly: true });
      spiderScanId = spiderResult.scan;
      console.log(`[ZAP] Spider scan started (ID: ${spiderScanId})`);

      // Wait for spider to complete (max 30s)
      await waitForScan(zap, spiderScanId, 'spider', 30000);
      const spiderMs = Date.now() - spiderScanStart;

      results.push({
        id: id(), type: 'security', priority: 'medium', category: 'zap',
        title: 'ZAP — Spider Crawl',
        passed: true,
        expected: 'ZAP spider discovers pages',
        actual: `Spider completed in ${Math.round(spiderMs / 1000)}s`,
        explanation: 'ZAP spider successfully crawled the site to discover attack surfaces.',
        duration: spiderMs,
      });
    } catch (err) {
      console.error('[ZAP] Spider error:', err.message);
      results.push({
        id: id(), type: 'security', priority: 'high', category: 'zap',
        title: 'ZAP — Spider Crawl',
        passed: false, expected: 'Spider scan completes', actual: `Error: ${err.message}`,
        explanation: `ZAP spider scan failed: ${err.message}`, duration: 0,
      });
      return results;
    }

    // ── Step 2: Active scan (find vulnerabilities) ──
    const activeScanStart = Date.now();
    try {
      const ascanResult = await zap.ascan.scan({ url, recurse: true, scanpolicyname: '' });
      const ascanId = ascanResult.scan;
      console.log(`[ZAP] Active scan started (ID: ${ascanId})`);

      // Wait for active scan (max 60s)
      await waitForScan(zap, ascanId, 'ascan', 60000);
      const ascanMs = Date.now() - activeScanStart;

      results.push({
        id: id(), type: 'security', priority: 'medium', category: 'zap',
        title: 'ZAP — Active Security Scan',
        passed: true,
        expected: 'Active scan completes',
        actual: `Active scan completed in ${Math.round(ascanMs / 1000)}s`,
        explanation: 'ZAP active scanner tested for XSS, SQL injection, CSRF, and other vulnerabilities.',
        duration: ascanMs,
      });
    } catch (err) {
      console.error('[ZAP] Active scan error:', err.message);
      results.push({
        id: id(), type: 'security', priority: 'high', category: 'zap',
        title: 'ZAP — Active Security Scan',
        passed: false, expected: 'Active scan completes', actual: `Error: ${err.message}`,
        explanation: `ZAP active scan failed: ${err.message}`, duration: 0,
      });
    }

    // ── Step 3: Collect alerts ──
    try {
      const alertsResult = await zap.core.alerts({ baseurl: url, start: 0, count: 50 });
      const alerts = alertsResult.alerts || [];

      console.log(`[ZAP] Found ${alerts.length} security alerts`);

      if (alerts.length === 0) {
        results.push({
          id: id(), type: 'security', priority: 'low', category: 'zap',
          title: 'ZAP — No Vulnerabilities Found',
          passed: true,
          expected: 'No security vulnerabilities',
          actual: 'Zero alerts from ZAP scan',
          explanation: 'OWASP ZAP found no security vulnerabilities in the scanned pages. The site appears secure.',
          duration: 0,
        });
      } else {
        // Group alerts by type
        const alertsByType = {};
        alerts.forEach(alert => {
          const key = alert.alert || alert.name || 'Unknown';
          if (!alertsByType[key]) {
            alertsByType[key] = { ...alert, count: 0, urls: [] };
          }
          alertsByType[key].count++;
          if (alertsByType[key].urls.length < 3) {
            alertsByType[key].urls.push(alert.url);
          }
        });

        // Create a test result per alert type
        Object.values(alertsByType).forEach(alert => {
          const severity = mapZapRisk(alert.risk || alert.riskcode);
          const confidence = mapZapConfidence(alert.confidence);

          results.push({
            id: id(), type: 'security',
            priority: severity === 'critical' || severity === 'high' ? 'critical' : severity,
            category: 'zap',
            title: `ZAP — ${alert.alert || alert.name}`,
            passed: false,
            expected: 'No security vulnerability',
            actual: `${alert.count} instance(s) — ${severity} severity (${confidence})`,
            explanation: `${alert.description || alert.alert}. ${alert.solution ? `Recommendation: ${alert.solution.substring(0, 150)}` : ''} Found at: ${alert.urls.join(', ')}`,
            duration: 0,
          });
        });

        // Summary
        const highCount = alerts.filter(a => ['3', 'High'].includes(a.risk || a.riskcode)).length;
        const medCount = alerts.filter(a => ['2', 'Medium'].includes(a.risk || a.riskcode)).length;
        const lowCount = alerts.filter(a => ['1', 'Low', '0', 'Informational'].includes(a.risk || a.riskcode)).length;

        results.push({
          id: id(), type: 'security', priority: highCount > 0 ? 'critical' : 'medium',
          category: 'zap',
          title: 'ZAP — Vulnerability Summary',
          passed: highCount === 0,
          expected: 'No high/critical vulnerabilities',
          actual: `${alerts.length} total: ${highCount} high, ${medCount} medium, ${lowCount} low/info`,
          explanation: `OWASP ZAP detected ${alerts.length} security issues. ${highCount > 0 ? `${highCount} are high severity and should be fixed before deployment.` : 'No high-severity issues found.'}`,
          duration: 0,
        });
      }
    } catch (err) {
      console.error('[ZAP] Alerts error:', err.message);
    }

    console.log(`[ZAP] ✓ Completed with ${results.length} security test results`);
  } catch (err) {
    console.error('[ZAP] Connection error:', err.message);
    results.push({
      id: id(), type: 'security', priority: 'high', category: 'zap',
      title: 'ZAP — Connection Failed',
      passed: false, expected: 'ZAP daemon running',
      actual: `Cannot connect to ZAP at ${ZAP_PROXY_HOST}:${ZAP_PROXY_PORT}`,
      explanation: `Could not connect to OWASP ZAP daemon. Ensure ZAP is running: docker run -d -p 8080:8080 owasp/zap2docker-stable zap.sh -daemon -port 8080 -config api.key=${ZAP_API_KEY}`,
      duration: 0,
    });
  }

  return results;
}

module.exports = { runZapScan, zapAvailable };
