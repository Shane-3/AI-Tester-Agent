/**
 * Dashboard Data Routes — REAL EXECUTION
 * 
 * GET /api/dashboard-data
 * Runs the real agent pipeline:
 * 1. Crawl website
 * 2. Run tests against it
 * 3. Analyze risk (Gemini or rule-based)
 * 4. Return real results
 */

const express = require('express');
const router = express.Router();
const { crawlWebsite } = require('../services/websiteCrawler');
const { runTests, summarizeResults } = require('../services/testRunner');
const { analyzeRisk, analyzeSitePurpose } = require('../services/geminiAgent');
const { getProjectContext, getCachedGitHubData } = require('../services/aiSimulator');

function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = Math.floor(ms / 1000);
  const remainMs = Math.round(ms % 1000);
  if (seconds < 60) return `${seconds}.${String(remainMs).padStart(3, '0').slice(0, 1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  return `${minutes}m ${remainSec}s`;
}

router.get('/dashboard-data', async (req, res) => {
  try {
    const ctx = getProjectContext();
    const github = getCachedGitHubData();
    const pipelineStart = Date.now();

    const websiteUrl = ctx.websiteUrl || 'https://example.com';

    // ─── Agent 1: Website Crawler ─────────────────────────────────────
    const agent1Start = Date.now();
    const siteAnalysis = await crawlWebsite(websiteUrl);
    const agent1Ms = Date.now() - agent1Start;

    // ─── Agent 2: Site Purpose Analysis ───────────────────────────────
    const agent2Start = Date.now();
    const sitePurpose = await analyzeSitePurpose(siteAnalysis);
    const agent2Ms = Date.now() - agent2Start;

    // ─── Agent 3: Test Execution ──────────────────────────────────────
    const agent3Start = Date.now();
    const testResults = await runTests(websiteUrl, siteAnalysis);
    const summary = summarizeResults(testResults);
    const agent3Ms = Date.now() - agent3Start;

    // ─── Agent 4: Risk Analysis ───────────────────────────────────────
    const agent4Start = Date.now();
    const riskAnalysis = await analyzeRisk(siteAnalysis, testResults, summary);
    const agent4Ms = Date.now() - agent4Start;

    // ─── Agent 5: Gatekeeper Decision ─────────────────────────────────
    const agent5Start = Date.now();
    const deployment = riskAnalysis.deployment || (riskAnalysis.riskScore >= 60 ? 'blocked' : 'approved');
    const agent5Ms = Date.now() - agent5Start;

    const totalPipelineMs = Date.now() - pipelineStart;

    // Build agent timeline with real durations
    const agentTimeline = [
      {
        id: 'agent-1', agent: 'Website Crawler Agent', status: 'completed',
        startedAt: new Date(agent1Start).toISOString(),
        completedAt: new Date(agent1Start + agent1Ms).toISOString(),
        duration: formatDuration(agent1Ms), durationMs: agent1Ms,
        summary: siteAnalysis.success
          ? `Crawled ${websiteUrl} — ${siteAnalysis.links.total} links, ${siteAnalysis.images.total} images, ${siteAnalysis.forms.length} forms found`
          : `Failed to crawl ${websiteUrl}: ${siteAnalysis.error}`,
      },
      {
        id: 'agent-2', agent: 'Site Intelligence Agent', status: 'completed',
        startedAt: new Date(agent2Start).toISOString(),
        completedAt: new Date(agent2Start + agent2Ms).toISOString(),
        duration: formatDuration(agent2Ms), durationMs: agent2Ms,
        summary: `Detected site type: ${siteAnalysis.siteType} — ${typeof sitePurpose.purpose === 'string' ? sitePurpose.purpose.substring(0, 100) : siteAnalysis.siteType}`,
      },
      {
        id: 'agent-3', agent: 'Test Execution Agent', status: 'completed',
        startedAt: new Date(agent3Start).toISOString(),
        completedAt: new Date(agent3Start + agent3Ms).toISOString(),
        duration: formatDuration(agent3Ms), durationMs: agent3Ms,
        summary: `Executed ${summary.total} tests — ${summary.passed} passed, ${summary.failed} failed (${summary.passRate}% pass rate)`,
      },
      {
        id: 'agent-4', agent: 'Risk Analysis Agent', status: 'completed',
        startedAt: new Date(agent4Start).toISOString(),
        completedAt: new Date(agent4Start + agent4Ms).toISOString(),
        duration: formatDuration(agent4Ms), durationMs: agent4Ms,
        summary: `Risk Score: ${riskAnalysis.riskScore}/100 (${riskAnalysis.riskLevel?.toUpperCase()}) — ${riskAnalysis.source === 'gemini' ? 'AI-powered' : 'Rule-based'} analysis`,
      },
      {
        id: 'agent-5', agent: 'CI/CD Gatekeeper Agent', status: 'completed',
        startedAt: new Date(agent5Start).toISOString(),
        completedAt: new Date(agent5Start + agent5Ms).toISOString(),
        duration: formatDuration(agent5Ms), durationMs: agent5Ms,
        summary: `Decision: ${deployment.toUpperCase()} — ${deployment === 'approved' ? 'Release can proceed' : 'Release blocked due to risk'}`,
      },
    ];

    // Derive impacted modules from crawl data
    const impactedModules = [];
    if (siteAnalysis.success) {
      const secCount = Object.values(siteAnalysis.securityHeaders).filter(v => !!v).length;
      impactedModules.push({
        name: 'frontend-ui', description: `${siteAnalysis.siteType} — ${siteAnalysis.title?.substring(0, 50) || 'Untitled'}`,
        impact: summary.passRate >= 80 ? 'low' : summary.passRate >= 60 ? 'medium' : 'high',
        filesChanged: siteAnalysis.links.internal, linesChanged: siteAnalysis.htmlSize,
      });
      impactedModules.push({
        name: 'security', description: `${secCount}/6 security headers present`,
        impact: secCount >= 4 ? 'low' : secCount >= 2 ? 'medium' : 'high',
        filesChanged: secCount, linesChanged: 6,
      });
      if (siteAnalysis.images.total > 0) {
        impactedModules.push({
          name: 'accessibility', description: `${siteAnalysis.images.withoutAlt} images missing alt text`,
          impact: siteAnalysis.images.withoutAlt === 0 ? 'low' : siteAnalysis.images.withoutAlt > 5 ? 'high' : 'medium',
          filesChanged: siteAnalysis.images.total, linesChanged: siteAnalysis.images.withoutAlt,
        });
      }
      if (siteAnalysis.forms.length > 0) {
        impactedModules.push({
          name: 'forms', description: `${siteAnalysis.forms.length} form(s) detected`,
          impact: 'medium',
          filesChanged: siteAnalysis.forms.length, linesChanged: siteAnalysis.forms.reduce((s, f) => s + f.inputs.length, 0),
        });
      }
    }

    res.json({
      success: true,
      project: { id: 'live-project', name: ctx.name, websiteUrl, repoUrl: ctx.repoUrl },
      riskOverview: {
        score: riskAnalysis.riskScore,
        level: riskAnalysis.riskLevel,
        deployment,
        explanation: riskAnalysis.summary,
        recommendations: riskAnalysis.recommendations,
        factors: riskAnalysis.topIssues?.map((issue, i) => ({
          name: `Issue ${i + 1}`,
          description: issue,
          score: Math.round(riskAnalysis.riskScore / (riskAnalysis.topIssues.length || 1)),
          weight: 0.33,
        })) || [],
      },
      testMetrics: {
        totalGenerated: summary.total,
        coverage: summary.byType,
        byStatus: { generated: 0, passed: summary.passed, failed: summary.failed, skipped: 0 },
        optimization: { totalAvailable: summary.total, selected: summary.total, reductionPercent: 0, estimatedTimeSaved: '0 minutes' },
      },
      impactedModules,
      recentTests: testResults.slice(0, 5),
      agentTimeline,
      pipelineDuration: formatDuration(totalPipelineMs),
      pipelineDurationMs: totalPipelineMs,
      siteAnalysis: {
        title: siteAnalysis.title,
        siteType: siteAnalysis.siteType,
        statusCode: siteAnalysis.statusCode,
        responseTime: siteAnalysis.responseTime,
        linksCount: siteAnalysis.links?.total || 0,
        imagesCount: siteAnalysis.images?.total || 0,
        formsCount: siteAnalysis.forms?.length || 0,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data', message: error.message });
  }
});

module.exports = router;
