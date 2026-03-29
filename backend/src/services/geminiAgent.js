/**
 * Gemini AI Agent Service
 * 
 * Uses Google Gemini free tier for intelligent analysis.
 * Falls back to rule-based analysis if API is unavailable.
 */

let genAI = null;
let model = null;

function initGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_free_gemini_key') {
    console.log('[Gemini] No API key found — using rule-based fallback');
    return false;
  }
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(key);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('[Gemini] Initialized with gemini-2.0-flash');
    return true;
  } catch (err) {
    console.error('[Gemini] Init failed:', err.message);
    return false;
  }
}

// Init on load
const geminiAvailable = initGemini();

/**
 * Ask Gemini a question with fallback
 */
async function askGemini(prompt, fallbackFn) {
  if (!geminiAvailable || !model) {
    return fallbackFn();
  }
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text;
  } catch (err) {
    console.error('[Gemini] API error:', err.message);
    return fallbackFn();
  }
}

/**
 * AI Risk Analysis — analyzes test results and site data
 */
async function analyzeRisk(siteAnalysis, testResults, summary) {
  const prompt = `You are a senior QA engineer analyzing a website for release readiness.

Website: ${siteAnalysis.url}
Site Type: ${siteAnalysis.siteType}
Title: "${siteAnalysis.title || 'None'}"

Test Results Summary:
- Total Tests: ${summary.total}
- Passed: ${summary.passed} (${summary.passRate}%)
- Failed: ${summary.failed}
- Critical Failures: ${summary.criticalFails}
- High Priority Failures: ${summary.highFails}

Failed Tests:
${testResults.filter(t => !t.passed).map(t => `- ${t.title}: ${t.explanation}`).join('\n')}

Security Headers Found: ${Object.values(siteAnalysis.securityHeaders).filter(v => !!v).length}/6
Forms: ${siteAnalysis.forms.length}
Images without alt: ${siteAnalysis.images.withoutAlt}/${siteAnalysis.images.total}
Internal Links: ${siteAnalysis.links.internal}
External Links: ${siteAnalysis.links.external}

Provide a concise risk assessment in this exact JSON format (no markdown, just raw JSON):
{
  "riskScore": <number 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "deployment": "<approved|blocked>",
  "summary": "<2-3 sentence risk summary>",
  "topIssues": ["<issue 1>", "<issue 2>", "<issue 3>"],
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
}`;

  const fallback = () => calculateRiskRuleBased(siteAnalysis, testResults, summary);

  const response = await askGemini(prompt, fallback);

  // If Gemini returned text, parse it
  if (typeof response === 'string') {
    try {
      // Extract JSON from response (Gemini sometimes wraps in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...JSON.parse(jsonMatch[0]), source: 'gemini' };
      }
    } catch (e) {
      console.error('[Gemini] JSON parse error:', e.message);
    }
    return { ...calculateRiskRuleBased(siteAnalysis, testResults, summary), source: 'fallback' };
  }

  return { ...response, source: response.source || 'fallback' };
}

/**
 * Rule-based risk calculation (fallback when no Gemini)
 */
function calculateRiskRuleBased(siteAnalysis, testResults, summary) {
  let riskScore = 0;

  // Failed tests contribute to risk
  riskScore += summary.criticalFails * 20;
  riskScore += summary.highFails * 10;
  riskScore += (summary.failed - summary.criticalFails - summary.highFails) * 5;

  // Low pass rate increases risk
  if (summary.passRate < 50) riskScore += 20;
  else if (summary.passRate < 70) riskScore += 10;
  else if (summary.passRate < 85) riskScore += 5;

  // Security concerns
  const secCount = Object.values(siteAnalysis.securityHeaders).filter(v => !!v).length;
  if (secCount < 2) riskScore += 15;
  else if (secCount < 4) riskScore += 5;

  // Accessibility
  if (siteAnalysis.images.total > 0 && siteAnalysis.images.withoutAlt > siteAnalysis.images.total * 0.3) {
    riskScore += 10;
  }

  riskScore = Math.min(100, Math.max(0, riskScore));
  const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
  const deployment = riskScore >= 60 ? 'blocked' : 'approved';

  // Generate issues
  const topIssues = [];
  const failedTests = testResults.filter(t => !t.passed);
  failedTests.slice(0, 3).forEach(t => topIssues.push(t.explanation.substring(0, 120)));

  // Generate recommendations
  const recommendations = [];
  if (failedTests.some(t => t.title.includes('Meta Description')))
    recommendations.push('Add a descriptive <meta name="description"> tag for SEO');
  if (failedTests.some(t => t.title.includes('Security Headers')))
    recommendations.push('Configure security headers (CSP, X-Frame-Options, HSTS)');
  if (failedTests.some(t => t.title.includes('Alt Tags')))
    recommendations.push('Add alt attributes to all images for WCAG 2.1 compliance');
  if (failedTests.some(t => t.title.includes('HTTPS')))
    recommendations.push('Enable HTTPS with a valid SSL certificate');
  if (failedTests.some(t => t.title.includes('Open Graph')))
    recommendations.push('Add Open Graph tags for better social media sharing');
  if (recommendations.length === 0)
    recommendations.push('Continue monitoring for regressions');

  return {
    riskScore,
    riskLevel,
    deployment,
    summary: `This release has a risk score of ${riskScore}/100. ${summary.passed} of ${summary.total} tests passed (${summary.passRate}%). ${summary.criticalFails > 0 ? `${summary.criticalFails} critical issue(s) found.` : 'No critical issues detected.'}`,
    topIssues,
    recommendations,
    source: 'rule-based',
  };
}

/**
 * AI Site Purpose Analysis
 */
async function analyzeSitePurpose(siteAnalysis) {
  if (!geminiAvailable) {
    return { purpose: siteAnalysis.siteType, confidence: 0.7, source: 'rule-based' };
  }

  const prompt = `Analyze this website and identify its purpose in 1-2 sentences.
URL: ${siteAnalysis.url}
Title: "${siteAnalysis.title}"
Headings: ${siteAnalysis.headings.h1.join(', ')}
Type detected: ${siteAnalysis.siteType}
Forms: ${siteAnalysis.forms.length}
Links: ${siteAnalysis.links.total}

Reply with just the purpose description, nothing else.`;

  const result = await askGemini(prompt, () => `${siteAnalysis.siteType} website`);
  return { purpose: typeof result === 'string' ? result.trim() : result, source: geminiAvailable ? 'gemini' : 'rule-based' };
}

module.exports = { analyzeRisk, analyzeSitePurpose, geminiAvailable };
