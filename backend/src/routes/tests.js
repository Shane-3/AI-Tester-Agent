/**
 * Test Generation Routes — REAL EXECUTION
 * 
 * POST /api/generate-tests
 * Crawls the configured website, generates tests from real findings,
 * and executes them against the live site.
 */

const express = require('express');
const router = express.Router();
const { crawlWebsite } = require('../services/websiteCrawler');
const { runTests, summarizeResults } = require('../services/testRunner');
const { getProjectContext } = require('../services/aiSimulator');

router.post('/generate-tests', async (req, res) => {
  try {
    const ctx = getProjectContext();
    const websiteUrl = ctx.websiteUrl || 'https://example.com';

    // Step 1: Crawl the website
    const siteAnalysis = await crawlWebsite(websiteUrl);

    // Step 2: Run real tests
    const testResults = await runTests(websiteUrl, siteAnalysis);
    const summary = summarizeResults(testResults);

    res.json({
      success: true,
      agents: ['Website Crawler Agent', 'Test Execution Agent'],
      generation: {
        projectId: req.body.projectId || 'live',
        projectContext: { name: ctx.name, url: websiteUrl, siteType: siteAnalysis.siteType },
        totalGenerated: summary.total,
        tests: testResults,
        coverage: summary.byType,
        generatedAt: new Date().toISOString(),
      },
      optimization: {
        totalAvailable: summary.total,
        selected: summary.total,
        skipped: 0,
        reductionPercent: 0,
        estimatedTimeSaved: '0 minutes',
      },
      summary,
    });
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ error: 'Generation failed', message: error.message });
  }
});

module.exports = router;
