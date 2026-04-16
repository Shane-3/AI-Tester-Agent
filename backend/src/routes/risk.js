/**
 * Risk Prediction Routes — REAL EXECUTION (Dynamic)
 * 
 * POST /api/predict-risk
 * Uses real test results and crawl data for risk analysis.
 * Produces dynamic, detailed risk factors with varying scores,
 * weights, trend data, and contextualized recommendations.
 */

const express = require('express');
const router = express.Router();
const { crawlWebsite } = require('../services/websiteCrawler');
const { runTests, summarizeResults } = require('../services/testRunner');
const { analyzeRisk } = require('../services/geminiAgent');
const { getProjectContext } = require('../services/aiSimulator');

const fs = require('fs');
const pathModule = require('path');
const HISTORY_FILE = pathModule.join(__dirname, '..', '..', 'risk-history.json');

function loadRiskHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn('[Risk] Could not load history:', err.message);
  }
  return [];
}

function saveRiskHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    console.warn('[Risk] Could not save history:', err.message);
  }
}

let riskHistory = loadRiskHistory();

/**
 * Build risk trend data from REAL history only — no fake padding.
 */
function buildRiskTrend(currentScore, currentLevel) {
  const now = new Date();

  // Add current run to history
  riskHistory.push({
    timestamp: now.toISOString(),
    score: currentScore,
    level: currentLevel,
  });

  // Keep last 20 runs max
  if (riskHistory.length > 20) riskHistory = riskHistory.slice(-20);

  // Persist to disk
  saveRiskHistory(riskHistory);

  // Build trend entries from real data only
  const entries = riskHistory.map((entry, index) => {
    const date = new Date(entry.timestamp);
    const isLast = index === riskHistory.length - 1;
    return {
      label: isLast
        ? 'Current'
        : `Run ${index + 1} (${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})`,
      score: entry.score,
      level: entry.level,
      timestamp: entry.timestamp,
    };
  });

  // Compute trend direction from actual data
  const scores = entries.map(t => t.score);
  let direction = 'stable';

  if (scores.length >= 2) {
    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (avgSecond - avgFirst > 5) direction = 'worsening';
    else if (avgFirst - avgSecond > 5) direction = 'improving';
  }

  return {
    entries,
    direction,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    totalRuns: riskHistory.length,
  };
}
function buildDetailedFactors(testResults, siteAnalysis, summary) {
  const failedTests = testResults.filter(t => !t.passed);
  const passedTests = testResults.filter(t => t.passed);

  // Categorise failed tests
  const securityFails = failedTests.filter(t =>
    /security|header|https|ssl|csp|hsts|xss|csrf|cookie|x-powered|permission/i.test(t.title)
  );
  const seoFails = failedTests.filter(t =>
    /seo|meta|title|description|open.?graph|twitter|sitemap|canonical|robots|structured|json-ld|favicon/i.test(t.title)
  );
  const accessibilityFails = failedTests.filter(t =>
    /accessibility|alt.?tag|aria|wcag|landmark|skip|label|heading|h1|tab.?index|lang/i.test(t.title)
  );
  const performanceFails = failedTests.filter(t =>
    /performance|speed|size|compress|resource|ttfb|response.?time|inline|third.?party|noscript/i.test(t.title)
  );

  // Anything not categorized goes to "Code Quality"
  const categorizedIds = new Set([
    ...securityFails, ...seoFails, ...accessibilityFails, ...performanceFails,
  ].map(t => t.title));
  const codeQualityFails = failedTests.filter(t => !categorizedIds.has(t.title));

  // Compute individual scores (0-100) per category
  function categoryScore(fails, totalInCategory) {
    if (totalInCategory === 0) return 0;
    return Math.min(100, Math.round((fails.length / Math.max(totalInCategory, 1)) * 100));
  }

  // Estimate total tests per category (passed + failed)
  const securityTotal = securityFails.length + passedTests.filter(t =>
    /security|header|https|ssl|csp|hsts|xss|csrf|cookie|x-powered|permission/i.test(t.title)
  ).length || 1;
  const seoTotal = seoFails.length + passedTests.filter(t =>
    /seo|meta|title|description|open.?graph|twitter|sitemap|canonical|robots|structured|json-ld|favicon/i.test(t.title)
  ).length || 1;
  const a11yTotal = accessibilityFails.length + passedTests.filter(t =>
    /accessibility|alt.?tag|aria|wcag|landmark|skip|label|heading|h1|tab.?index|lang/i.test(t.title)
  ).length || 1;
  const perfTotal = performanceFails.length + passedTests.filter(t =>
    /performance|speed|size|compress|resource|ttfb|response.?time|inline|third.?party|noscript/i.test(t.title)
  ).length || 1;
  const codeTotal = codeQualityFails.length + passedTests.filter(t => {
    const title = t.title || '';
    return !/security|header|https|ssl|csp|hsts|xss|csrf|cookie|x-powered|permission|seo|meta|title|description|open.?graph|twitter|sitemap|canonical|robots|structured|json-ld|favicon|accessibility|alt.?tag|aria|wcag|landmark|skip|label|heading|h1|tab.?index|lang|performance|speed|size|compress|resource|ttfb|response.?time|inline|third.?party|noscript/i.test(title);
  }).length || 1;

  const secScore = categoryScore(securityFails, securityTotal);
  const seoScore = categoryScore(seoFails, seoTotal);
  const a11yScore = categoryScore(accessibilityFails, a11yTotal);
  const perfScore = categoryScore(performanceFails, perfTotal);
  const codeScore = categoryScore(codeQualityFails, codeTotal);

  // Security headers score from site analysis
  const secHeaderCount = Object.values(siteAnalysis.securityHeaders || {}).filter(v => !!v).length;
  const secHeaderScore = Math.round(((6 - secHeaderCount) / 6) * 100);
  const adjustedSecScore = Math.round((secScore * 0.5) + (secHeaderScore * 0.5));

  // Build factors array — only include categories that have tests
  const factors = [];

  if (securityTotal > 0) {
    const descriptions = [];
    if (securityFails.length > 0) {
      descriptions.push(`${securityFails.length} of ${securityTotal} security tests failed`);
    }
    descriptions.push(`${secHeaderCount}/6 security headers present`);
    if (securityFails.length > 0) {
      descriptions.push(`Issues: ${securityFails.slice(0, 2).map(t => t.title.replace(/^.*?:\s*/, '')).join('; ')}`);
    }
    factors.push({
      name: 'Security Posture',
      score: adjustedSecScore,
      weight: 0, // will be computed below
      description: descriptions.join('. '),
      failCount: securityFails.length,
      totalTests: securityTotal,
      severity: adjustedSecScore >= 70 ? 'critical' : adjustedSecScore >= 40 ? 'high' : 'moderate',
      issues: securityFails.map(t => t.title),
    });
  }

  if (seoTotal > 0) {
    factors.push({
      name: 'SEO Compliance',
      score: seoScore,
      weight: 0,
      description: `${seoFails.length} of ${seoTotal} SEO checks failed. ${seoFails.length > 0 ? `Missing: ${seoFails.slice(0, 3).map(t => t.title.replace(/^.*?:\s*/, '')).join(', ')}` : 'All SEO requirements met'}`,
      failCount: seoFails.length,
      totalTests: seoTotal,
      severity: seoScore >= 70 ? 'high' : seoScore >= 40 ? 'medium' : 'low',
      issues: seoFails.map(t => t.title),
    });
  }

  if (a11yTotal > 0) {
    const imgInfo = siteAnalysis.images || {};
    const altInfo = imgInfo.total > 0 ? ` (${imgInfo.withoutAlt}/${imgInfo.total} images missing alt text)` : '';
    factors.push({
      name: 'Accessibility (WCAG)',
      score: a11yScore,
      weight: 0,
      description: `${accessibilityFails.length} of ${a11yTotal} accessibility checks failed${altInfo}. ${accessibilityFails.length > 0 ? `Violations: ${accessibilityFails.slice(0, 2).map(t => t.title.replace(/^.*?:\s*/, '')).join('; ')}` : 'Meets basic WCAG requirements'}`,
      failCount: accessibilityFails.length,
      totalTests: a11yTotal,
      severity: a11yScore >= 60 ? 'high' : a11yScore >= 30 ? 'medium' : 'low',
      issues: accessibilityFails.map(t => t.title),
    });
  }

  if (perfTotal > 0) {
    factors.push({
      name: 'Performance & Optimization',
      score: perfScore,
      weight: 0,
      description: `${performanceFails.length} of ${perfTotal} performance checks failed. ${performanceFails.length > 0 ? `Concerns: ${performanceFails.slice(0, 2).map(t => t.title.replace(/^.*?:\s*/, '')).join('; ')}` : 'Performance within acceptable limits'}`,
      failCount: performanceFails.length,
      totalTests: perfTotal,
      severity: perfScore >= 60 ? 'high' : perfScore >= 30 ? 'medium' : 'low',
      issues: performanceFails.map(t => t.title),
    });
  }

  if (codeTotal > 0 && codeQualityFails.length > 0) {
    factors.push({
      name: 'Code Quality & Standards',
      score: codeScore,
      weight: 0,
      description: `${codeQualityFails.length} of ${codeTotal} code quality checks failed. ${codeQualityFails.slice(0, 2).map(t => t.title.replace(/^.*?:\s*/, '')).join('; ')}`,
      failCount: codeQualityFails.length,
      totalTests: codeTotal,
      severity: codeScore >= 60 ? 'high' : codeScore >= 30 ? 'medium' : 'low',
      issues: codeQualityFails.map(t => t.title),
    });
  }

  // Overall pass rate factor
  factors.push({
    name: 'Overall Test Pass Rate',
    score: Math.round(100 - summary.passRate),
    weight: 0,
    description: `${summary.passed} of ${summary.total} tests passed (${summary.passRate}%). ${summary.criticalFails > 0 ? `${summary.criticalFails} critical failures detected.` : ''} ${summary.highFails > 0 ? `${summary.highFails} high-priority failures.` : ''} ${summary.passRate >= 90 ? 'Excellent coverage.' : summary.passRate >= 70 ? 'Acceptable but improvement recommended.' : 'Below acceptable threshold — needs attention.'}`,
    failCount: summary.failed,
    totalTests: summary.total,
    severity: summary.passRate < 50 ? 'critical' : summary.passRate < 70 ? 'high' : summary.passRate < 85 ? 'medium' : 'low',
    issues: [],
  });

  // Compute dynamic weights based on failure severity distribution
  const totalFailWeight = factors.reduce((sum, f) => sum + f.failCount, 0) || 1;
  let remainingWeight = 1.0;

  factors.forEach((f, i) => {
    if (i === factors.length - 1) {
      // Last factor gets remaining weight to ensure sum = 1.0
      f.weight = Math.round(remainingWeight * 100) / 100;
    } else {
      // Weight proportional to failure count but with a minimum
      const rawWeight = Math.max(0.08, f.failCount / totalFailWeight);
      f.weight = Math.round(rawWeight * 100) / 100;
      remainingWeight -= f.weight;
    }
  });

  // Normalize weights to sum to 1.0
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight > 0) {
    factors.forEach(f => {
      f.weight = Math.round((f.weight / totalWeight) * 100) / 100;
    });
  }

  return factors;
}

/**
 * Generate contextual recommendations based on actual failures.
 * Returns varying counts (3-8) depending on actual issues found.
 */
function buildRecommendations(factors, siteAnalysis, summary) {
  const recommendations = [];
  const priorityOrder = ['critical', 'high', 'medium', 'low'];

  // Sort factors by severity
  const sorted = [...factors].sort((a, b) =>
    priorityOrder.indexOf(a.severity) - priorityOrder.indexOf(b.severity)
  );

  sorted.forEach(factor => {
    if (factor.failCount === 0) return;

    switch (factor.name) {
      case 'Security Posture': {
        const secHeaderCount = Object.values(siteAnalysis.securityHeaders || {}).filter(v => !!v).length;
        if (secHeaderCount < 4) {
          recommendations.push({
            text: `Add missing security headers (${6 - secHeaderCount} of 6 missing) — implement CSP, HSTS, X-Frame-Options, and others`,
            priority: 'critical',
            category: 'Security',
            effort: 'low',
          });
        }
        if (factor.issues.some(i => /https|ssl/i.test(i))) {
          recommendations.push({ text: 'Enable HTTPS with a valid TLS certificate and redirect all HTTP traffic', priority: 'critical', category: 'Security', effort: 'medium' });
        }
        if (factor.issues.some(i => /cookie/i.test(i))) {
          recommendations.push({ text: 'Set HttpOnly, Secure, and SameSite flags on all cookies', priority: 'high', category: 'Security', effort: 'low' });
        }
        break;
      }
      case 'SEO Compliance': {
        if (factor.issues.some(i => /meta.?desc/i.test(i))) {
          recommendations.push({ text: 'Add a descriptive <meta name="description"> tag (under 160 characters)', priority: 'high', category: 'SEO', effort: 'low' });
        }
        if (factor.issues.some(i => /open.?graph/i.test(i))) {
          recommendations.push({ text: 'Add Open Graph meta tags (og:title, og:description, og:image) for social sharing', priority: 'medium', category: 'SEO', effort: 'low' });
        }
        if (factor.issues.some(i => /sitemap|robots/i.test(i))) {
          recommendations.push({ text: 'Generate and serve sitemap.xml and robots.txt for search engine crawling', priority: 'medium', category: 'SEO', effort: 'low' });
        }
        if (factor.issues.some(i => /structured|json-ld/i.test(i))) {
          recommendations.push({ text: 'Add structured data (JSON-LD) for rich search result snippets', priority: 'low', category: 'SEO', effort: 'medium' });
        }
        break;
      }
      case 'Accessibility (WCAG)': {
        if (factor.issues.some(i => /alt/i.test(i))) {
          recommendations.push({ text: `Add alt text to all ${siteAnalysis.images?.withoutAlt || 'multiple'} images missing descriptions`, priority: 'high', category: 'Accessibility', effort: 'medium' });
        }
        if (factor.issues.some(i => /landmark|aria|semantic/i.test(i))) {
          recommendations.push({ text: 'Add semantic HTML landmarks (<main>, <nav>, <header>) for screen reader navigation', priority: 'medium', category: 'Accessibility', effort: 'medium' });
        }
        if (factor.issues.some(i => /label|form/i.test(i))) {
          recommendations.push({ text: 'Associate labels with all form inputs for assistive technology users', priority: 'high', category: 'Accessibility', effort: 'low' });
        }
        break;
      }
      case 'Performance & Optimization': {
        if (factor.issues.some(i => /compress|gzip/i.test(i))) {
          recommendations.push({ text: 'Enable gzip/brotli response compression to reduce payload size by 60-80%', priority: 'high', category: 'Performance', effort: 'low' });
        }
        if (factor.issues.some(i => /resource|inline/i.test(i))) {
          recommendations.push({ text: 'Bundle and minify CSS/JS assets; move inline scripts to external files for caching', priority: 'medium', category: 'Performance', effort: 'high' });
        }
        if (factor.issues.some(i => /third.?party/i.test(i))) {
          recommendations.push({ text: 'Audit and reduce third-party script dependencies; self-host critical libraries', priority: 'medium', category: 'Performance', effort: 'high' });
        }
        break;
      }
      default: {
        if (factor.failCount > 0) {
          recommendations.push({ text: `Address ${factor.failCount} failing ${factor.name.toLowerCase()} checks to improve release confidence`, priority: factor.severity === 'critical' ? 'high' : 'medium', category: 'General', effort: 'medium' });
        }
        break;
      }
    }
  });

  // Always add monitoring recommendation
  recommendations.push({
    text: `Set up post-deployment monitoring — watch error rates for 24h after release (current pass rate: ${summary.passRate}%)`,
    priority: 'medium',
    category: 'Operations',
    effort: 'low',
  });

  // Dedupe by text
  const seen = new Set();
  return recommendations.filter(r => {
    if (seen.has(r.text)) return false;
    seen.add(r.text);
    return true;
  });
}

/**
 * Generate gatekeeper conditions based on actual failure categories.
 * Returns a varying number of conditions (2-6) depending on real issues.
 */
function buildGatekeeperConditions(blocked, factors, summary, siteAnalysis) {
  const conditions = [];

  if (blocked) {
    // Build conditions from actual critical/high severity factors
    const criticalFactors = factors.filter(f => f.severity === 'critical' || f.severity === 'high');
    criticalFactors.forEach(f => {
      if (f.name === 'Security Posture') {
        conditions.push(`Fix ${f.failCount} security vulnerabilities before deployment — ${f.severity} severity`);
      } else if (f.name === 'Overall Test Pass Rate') {
        conditions.push(`Improve test pass rate from ${summary.passRate}% to minimum 80% (${summary.failed} tests currently failing)`);
      } else {
        conditions.push(`Resolve ${f.failCount} ${f.name.toLowerCase()} issues (current failure rate: ${f.score}%)`);
      }
    });

    if (summary.criticalFails > 0) {
      conditions.push(`Fix all ${summary.criticalFails} critical-priority test failures immediately`);
    }
    conditions.push('Complete peer review of all changes addressing the above issues');
    conditions.push('Re-run full test suite and achieve passing status before re-requesting deployment');
  } else {
    // Approved but with post-deployment conditions
    conditions.push(`Monitor error rates for 24 hours post-deployment (current baseline: ${summary.passRate}% pass rate)`);
    if (summary.failed > 0) {
      conditions.push(`Schedule fixes for ${summary.failed} non-blocking test failures in next sprint`);
    }
    const lowFactors = factors.filter(f => f.severity === 'medium' || f.severity === 'low').filter(f => f.failCount > 0);
    if (lowFactors.length > 0) {
      conditions.push(`Track ${lowFactors.length} low-severity improvement areas: ${lowFactors.map(f => f.name).join(', ')}`);
    }
    conditions.push('Keep rollback plan active for 48 hours');
  }

  return conditions;
}



router.post('/predict-risk', async (req, res) => {
  try {
    const ctx = getProjectContext();
    const websiteUrl = ctx.websiteUrl || 'https://example.com';

    // Crawl and test
    const siteAnalysis = await crawlWebsite(websiteUrl);
    const testResults = await runTests(websiteUrl, siteAnalysis);
    const summary = summarizeResults(testResults);

    // AI or rule-based risk analysis
    const riskAnalysis = await analyzeRisk(siteAnalysis, testResults, summary);
    const riskScore = riskAnalysis.riskScore;
    const riskLevel = riskAnalysis.riskLevel;
    const deployment = riskAnalysis.deployment || (riskScore >= 60 ? 'blocked' : 'approved');
    const blocked = deployment.toUpperCase() === 'BLOCKED';

    // Build detailed, dynamic factors from actual test results
    const factors = buildDetailedFactors(testResults, siteAnalysis, summary);

    // Build contextual recommendations (variable count)
    const recommendations = buildRecommendations(factors, siteAnalysis, summary);

    // Build gatekeeper conditions (variable count)
    const conditions = buildGatekeeperConditions(blocked, factors, summary, siteAnalysis);

    // Build risk trend
    const trend = buildRiskTrend(riskScore, riskLevel);

    // Category breakdown for the frontend
    const categoryBreakdown = factors
      .filter(f => f.name !== 'Overall Test Pass Rate')
      .map(f => ({
        name: f.name,
        passed: f.totalTests - f.failCount,
        failed: f.failCount,
        total: f.totalTests,
        passRate: f.totalTests > 0 ? Math.round(((f.totalTests - f.failCount) / f.totalTests) * 100) : 100,
      }));

    res.json({
      success: true,
      agents: ['Website Crawler Agent', 'Test Execution Agent', 'Risk Analysis Agent', 'CI/CD Gatekeeper Agent'],
      risk: {
        riskScore,
        riskLevel,
        factors,
        explanation: riskAnalysis.summary,
        recommendations: recommendations.map(r => r.text),
        detailedRecommendations: recommendations,
        deployment,
        source: riskAnalysis.source,
        categoryBreakdown,
      },
      gatekeeper: {
        decision: deployment.toUpperCase(),
        riskScore,
        riskLevel,
        reasoning: riskAnalysis.summary,
        conditions,
      },
      trend,
      testSummary: summary,
    });
  } catch (error) {
    console.error('Risk prediction error:', error);
    res.status(500).json({ error: 'Prediction failed', message: error.message });
  }
});

module.exports = router;
