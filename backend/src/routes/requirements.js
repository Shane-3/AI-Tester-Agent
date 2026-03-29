/**
 * Requirements Analysis Routes
 * 
 * POST /api/analyze-requirements
 * Accepts user stories and returns AI-extracted features,
 * acceptance criteria, edge cases, and business criticality.
 */

const express = require('express');
const router = express.Router();
const { simulateRequirementAnalysis } = require('../services/aiSimulator');

router.post('/analyze-requirements', async (req, res) => {
  try {
    const { stories } = req.body;

    if (!stories || !Array.isArray(stories) || stories.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Please provide an array of user stories',
      });
    }

    // Process each story through the Requirement Intelligence Agent
    const results = stories.map(story => simulateRequirementAnalysis(story));

    // Aggregate summary
    const totalEdgeCases = results.reduce((sum, r) => sum + r.edgeCases.length, 0);
    const avgCriticality = Math.round(
      results.reduce((sum, r) => sum + r.businessCriticality, 0) / results.length
    );

    res.json({
      success: true,
      agent: 'Requirement Intelligence Agent',
      analyzed: results.length,
      summary: {
        totalFeatures: results.reduce((sum, r) => sum + r.features.length, 0),
        totalAcceptanceCriteria: results.reduce((sum, r) => sum + r.acceptanceCriteria.length, 0),
        totalEdgeCases,
        avgBusinessCriticality: avgCriticality,
        suggestedTests: results.reduce((sum, r) => sum + r.suggestedTestCount, 0),
      },
      results,
    });
  } catch (error) {
    console.error('Requirement analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
});

module.exports = router;
