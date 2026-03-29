/**
 * Risk Prediction Routes — REAL EXECUTION
 * 
 * POST /api/predict-risk
 * Uses real test results and crawl data for risk analysis.
 */

const express = require('express');
const router = express.Router();
const { crawlWebsite } = require('../services/websiteCrawler');
const { runTests, summarizeResults } = require('../services/testRunner');
const { analyzeRisk } = require('../services/geminiAgent');
const { getProjectContext } = require('../services/aiSimulator');

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
    const deployment = riskAnalysis.deployment || (riskAnalysis.riskScore >= 60 ? 'blocked' : 'approved');

    res.json({
      success: true,
      agents: ['Website Crawler Agent', 'Test Execution Agent', 'Risk Analysis Agent', 'CI/CD Gatekeeper Agent'],
      risk: {
        riskScore: riskAnalysis.riskScore,
        riskLevel: riskAnalysis.riskLevel,
        factors: riskAnalysis.topIssues?.map((issue, i) => ({
          name: `Finding ${i + 1}`,
          description: issue,
          score: Math.round(riskAnalysis.riskScore / (riskAnalysis.topIssues?.length || 1)),
          weight: 0.33,
        })) || [],
        explanation: riskAnalysis.summary,
        recommendations: riskAnalysis.recommendations,
        deployment,
        source: riskAnalysis.source,
      },
      gatekeeper: {
        decision: deployment.toUpperCase(),
        riskScore: riskAnalysis.riskScore,
        riskLevel: riskAnalysis.riskLevel,
        reasoning: riskAnalysis.summary,
        conditions: riskAnalysis.recommendations,
      },
      testSummary: summary,
    });
  } catch (error) {
    console.error('Risk prediction error:', error);
    res.status(500).json({ error: 'Prediction failed', message: error.message });
  }
});

module.exports = router;
