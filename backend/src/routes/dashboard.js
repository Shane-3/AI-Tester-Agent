/**
 * Dashboard Data Routes — LangGraph Orchestrated Pipeline
 * 
 * GET /api/dashboard-data
 * Runs the LangGraph agent pipeline:
 * 1. Crawler Agent → crawl website
 * 2. Test Execution Agent → base + Selenium + Newman tests
 * 3. Security Scanner Agent → OWASP ZAP (if available)
 * 4. Risk Analysis Agent → Gemini/rule-based risk scoring
 * 5. Gatekeeper Agent → APPROVE/BLOCK decision
 * 6. Metrics Agent → sprint velocity + risk accuracy
 */

const express = require('express');
const router = express.Router();
const { runAgentPipeline } = require('../services/agentGraph');
const { getProjectContext, getCachedGitHubData } = require('../services/aiSimulator');
const { summarizeResults } = require('../services/testRunner');

function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = Math.floor(ms / 1000);
  const remainMs = Math.round(ms % 1000);
  if (seconds < 60) return `${seconds}.${String(remainMs).padStart(3, '0').slice(0, 1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  return `${minutes}m ${remainSec}s`;
}

let dashboardCache = null;
let previousDashboardCache = null;
let dashboardCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function invalidateDashboardCache() {
  dashboardCache = null;
  previousDashboardCache = null;
  dashboardCacheTime = 0;
}

router.get('/dashboard-data', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const now = Date.now();

    // Return cached response if still fresh and no force refresh
    if (!forceRefresh && dashboardCache && (now - dashboardCacheTime) < CACHE_TTL_MS) {
      console.log('[Dashboard] Returning cached response (age: ' + Math.round((now - dashboardCacheTime) / 1000) + 's)');
      return res.json(dashboardCache);
    }

    if (forceRefresh && dashboardCache) {
      console.log('[Dashboard] Force refresh requested. Storing previous run for delta comparison.');
      previousDashboardCache = dashboardCache;
    }

    const ctx = getProjectContext();
    const github = getCachedGitHubData();

    // If no project is configured yet, return empty dashboard state
    if (!ctx.websiteUrl && !ctx.name) {
      const emptyResponse = {
        success: true,
        unconfigured: true,
        project: { id: '', name: '', websiteUrl: '', repoUrl: '' },
        riskOverview: {
          score: 0, level: 'low', deployment: 'pending', explanation: '',
          recommendations: [], factors: [],
        },
        testMetrics: {
          totalGenerated: 0,
          coverage: { functional: 0, edge: 0, api: 0, ui: 0 },
          byStatus: { generated: 0, passed: 0, failed: 0, skipped: 0 },
          optimization: { totalAvailable: 0, selected: 0, reductionPercent: 0, estimatedTimeSaved: '0 minutes' },
        },
        impactedModules: [],
        recentTests: [],
        agentTimeline: [],
        pipelineDuration: '0s',
        pipelineDurationMs: 0,
        siteAnalysis: {
          title: '', siteType: '', statusCode: 0, responseTime: 0,
          linksCount: 0, imagesCount: 0, formsCount: 0,
        },
        sprintVelocity: null,
        delta: { hasDelta: false },
        lastUpdated: new Date().toISOString(),
      };
      return res.json(emptyResponse);
    }

    const websiteUrl = ctx.websiteUrl || 'https://example.com';

    // ═══ Run LangGraph Agent Pipeline ═══
    const pipelineStart = Date.now();
    const finalState = await runAgentPipeline(websiteUrl);
    const totalPipelineMs = Date.now() - pipelineStart;

    const siteAnalysis = finalState.siteAnalysis || {};
    const riskAnalysis = finalState.riskAnalysis || {};
    const summary = finalState.testSummary || { total: 0, passed: 0, failed: 0, passRate: 0, byType: {} };
    const allTests = finalState.allTestResults || [];
    const deployment = finalState.gatekeeperDecision?.decision?.toLowerCase() || 'pending';

    // Derive impacted modules from crawl data
    const impactedModules = [];
    if (siteAnalysis.success) {
      const secCount = Object.values(siteAnalysis.securityHeaders || {}).filter(v => !!v).length;
      impactedModules.push({
        name: 'frontend-ui', description: `${siteAnalysis.siteType} — ${siteAnalysis.title?.substring(0, 50) || 'Untitled'}`,
        impact: summary.passRate >= 80 ? 'low' : summary.passRate >= 60 ? 'medium' : 'high',
        filesChanged: siteAnalysis.links?.internal || 0, linesChanged: siteAnalysis.htmlSize || 0,
      });
      impactedModules.push({
        name: 'security', description: `${secCount}/6 security headers present`,
        impact: secCount >= 4 ? 'low' : secCount >= 2 ? 'medium' : 'high',
        filesChanged: secCount, linesChanged: 6,
      });
      if (siteAnalysis.images?.total > 0) {
        impactedModules.push({
          name: 'accessibility', description: `${siteAnalysis.images?.withoutAlt || 0} images missing alt text`,
          impact: (siteAnalysis.images?.withoutAlt || 0) === 0 ? 'low' : (siteAnalysis.images?.withoutAlt || 0) > 5 ? 'high' : 'medium',
          filesChanged: siteAnalysis.images?.total || 0, linesChanged: siteAnalysis.images?.withoutAlt || 0,
        });
      }
      if (siteAnalysis.forms?.length > 0) {
        impactedModules.push({
          name: 'forms', description: `${siteAnalysis.forms.length} form(s) detected`,
          impact: 'medium',
          filesChanged: siteAnalysis.forms.length, linesChanged: siteAnalysis.forms.reduce((s, f) => s + (f.inputs?.length || 0), 0),
        });
      }
    }

    // Build execution tools summary
    const executionTools = {
      selenium: { enabled: finalState.seleniumResults?.length > 0, tests: finalState.seleniumResults?.length || 0 },
      newman: { enabled: finalState.newmanResults?.length > 0, tests: finalState.newmanResults?.length || 0 },
      zap: { enabled: finalState.zapResults?.length > 0, tests: finalState.zapResults?.length || 0 },
    };

    const responseData = {
      success: true,
      project: { id: 'live-project', name: ctx.name, websiteUrl, repoUrl: ctx.repoUrl },
      riskOverview: {
        score: riskAnalysis.riskScore || 0,
        level: riskAnalysis.riskLevel || 'low',
        deployment,
        explanation: riskAnalysis.summary || '',
        recommendations: riskAnalysis.recommendations || [],
        factors: riskAnalysis.topIssues?.map((issue, i) => ({
          name: `Issue ${i + 1}`,
          description: issue,
          score: Math.round((riskAnalysis.riskScore || 0) / (riskAnalysis.topIssues.length || 1)),
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
      recentTests: allTests.slice(0, 5),
      agentTimeline: finalState.agentTimeline || [],
      orchestration: 'LangGraph',
      executionTools,
      sprintVelocity: finalState.sprintVelocity || null,
      predictionId: finalState.predictionId || null,
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
    };

    // Calculate delta if we have a previous run
    if (previousDashboardCache) {
      const prevScore = previousDashboardCache.riskOverview?.score || 0;
      const currScore = responseData.riskOverview.score;
      const prevPassed = previousDashboardCache.testMetrics?.byStatus?.passed || 0;
      const currPassed = responseData.testMetrics.byStatus.passed;
      const prevFailed = previousDashboardCache.testMetrics?.byStatus?.failed || 0;
      const currFailed = responseData.testMetrics.byStatus.failed;

      const prevFails = previousDashboardCache.recentTests?.filter(t => !t.passed) || [];
      const currPasses = responseData.recentTests.filter(t => t.passed);
      const improvedTests = currPasses.filter(cp => prevFails.some(pf => pf.title === cp.title)).map(t => t.title);

      const prevPasses = previousDashboardCache.recentTests?.filter(t => t.passed) || [];
      const currFails = responseData.recentTests.filter(t => !t.passed);
      const regressionTests = currFails.filter(cf => prevPasses.some(pp => pp.title === cf.title)).map(t => t.title);

      responseData.delta = {
        hasDelta: true,
        riskScoreChange: currScore - prevScore,
        passedChange: currPassed - prevPassed,
        failedChange: currFailed - prevFailed,
        previousScore: prevScore,
        currentScore: currScore,
        improvedTests,
        regressionTests,
      };
    } else {
      responseData.delta = { hasDelta: false };
    }

    // Cache the response
    dashboardCache = responseData;
    dashboardCacheTime = Date.now();
    console.log('[Dashboard] LangGraph pipeline complete — response cached for ' + (CACHE_TTL_MS / 1000) + 's');

    res.json(responseData);
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data', message: error.message });
  }
});

module.exports = router;
module.exports.invalidateDashboardCache = invalidateDashboardCache;
