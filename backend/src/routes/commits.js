/**
 * Commit Analysis Routes
 * 
 * POST /api/analyze-commit
 * Accepts commit data and returns impacted modules,
 * dependency graph, and risk areas.
 */

const express = require('express');
const router = express.Router();
const { simulateCommitAnalysis } = require('../services/aiSimulator');

router.post('/analyze-commit', async (req, res) => {
  try {
    const { commits } = req.body;

    if (!commits || !Array.isArray(commits) || commits.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Please provide an array of commits',
      });
    }

    // Process each commit through the Code Analysis Agent
    const results = commits.map(commit => simulateCommitAnalysis(commit));

    // Aggregate all impacted modules
    const allModules = new Map();
    results.forEach(r => {
      r.impactedModules.forEach(m => {
        if (!allModules.has(m.name) || m.impact === 'high') {
          allModules.set(m.name, m);
        }
      });
    });

    res.json({
      success: true,
      agent: 'Code Analysis Agent',
      commitsAnalyzed: results.length,
      summary: {
        totalImpactedModules: allModules.size,
        totalFilesChanged: results.reduce((sum, r) => sum + r.codeChurn.filesChanged, 0),
        totalAdditions: results.reduce((sum, r) => sum + r.codeChurn.additions, 0),
        totalDeletions: results.reduce((sum, r) => sum + r.codeChurn.deletions, 0),
        highRiskModules: [...allModules.values()].filter(m => m.impact === 'high').length,
      },
      impactedModules: [...allModules.values()],
      results,
    });
  } catch (error) {
    console.error('Commit analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
});

module.exports = router;
