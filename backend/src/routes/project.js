/**
 * Project Configuration + GitHub Integration Routes
 * 
 * POST /api/configure-project — Set website URL and GitHub repo
 * GET  /api/project-info — Get current project configuration
 * GET  /api/github-repo — Fetch real data from a GitHub repo
 */

const express = require('express');
const router = express.Router();
const { setProjectContext, getProjectContext, setCachedGitHubData } = require('../services/aiSimulator');
const { invalidateDashboardCache } = require('./dashboard');
const { invalidateTestCache } = require('../services/testRunner');


router.post('/configure-project', (req, res) => {
  try {
    const { name, websiteUrl, repoUrl, description } = req.body;

    if (!name && !websiteUrl && !repoUrl) {
      return res.status(400).json({
        error: 'Please provide at least one field: name, websiteUrl, or repoUrl',
      });
    }

    setProjectContext({ name, websiteUrl, repoUrl, description });
    invalidateDashboardCache(); // Clear cached dashboard so next load re-runs pipeline
    invalidateTestCache(); // Clear cached test results so Test Studio re-runs with new project

    res.json({
      success: true,
      message: 'Project configured successfully',
      project: getProjectContext(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Configuration failed', message: error.message });
  }
});


router.get('/project-info', (req, res) => {
  res.json({
    success: true,
    project: getProjectContext(),
  });
});

// Fetches real data from a public GitHub repo (no auth needed for public repos)

router.get('/github-repo', async (req, res) => {
  try {
    const { url } = req.query;
    const context = getProjectContext();
    const repoUrl = url || context.repoUrl;

    if (!repoUrl) {
      return res.status(400).json({
        error: 'No repository URL configured. Set it via POST /api/configure-project',
      });
    }

    // Parse GitHub URL → owner/repo
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo' });
    }

    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, '');
    const apiBase = `https://api.github.com/repos/${owner}/${repoName}`;

    // Fetch repo info, recent commits, and languages in parallel
    const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'AI-Tester-Agent' };

    const [repoInfo, commitsData, languagesData] = await Promise.all([
      fetch(apiBase, { headers }).then(r => r.json()),
      fetch(`${apiBase}/commits?per_page=10`, { headers }).then(r => r.json()),
      fetch(`${apiBase}/languages`, { headers }).then(r => r.json()),
    ]);

    // Handle GitHub API errors
    if (repoInfo.message === 'Not Found') {
      return res.status(404).json({ error: 'Repository not found. Make sure it is public.' });
    }
    if (repoInfo.message?.includes('rate limit')) {
      return res.status(429).json({ error: 'GitHub API rate limit exceeded. Try again in a few minutes.' });
    }

    // Parse commits into our format
    const recentCommits = Array.isArray(commitsData) ? commitsData.map(c => ({
      sha: c.sha?.substring(0, 7),
      message: c.commit?.message?.split('\n')[0] || '',
      author: c.commit?.author?.name || 'Unknown',
      date: c.commit?.author?.date,
      url: c.html_url,
    })) : [];

    // Parse languages
    const totalBytes = Object.values(languagesData || {}).reduce((sum, val) => sum + (val || 0), 0);
    const languages = Object.entries(languagesData || {}).map(([name, bytes]) => ({
      name,
      percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
    }));

    const responseData = {
      success: true,
      repository: {
        name: repoInfo.full_name || `${owner}/${repoName}`,
        description: repoInfo.description || '',
        url: repoInfo.html_url || repoUrl,
        stars: repoInfo.stargazers_count || 0,
        forks: repoInfo.forks_count || 0,
        openIssues: repoInfo.open_issues_count || 0,
        defaultBranch: repoInfo.default_branch || 'main',
        language: repoInfo.language || 'Unknown',
        updatedAt: repoInfo.updated_at,
        visibility: repoInfo.private ? 'private' : 'public',
      },
      recentCommits,
      languages,
    };

    // Cache GitHub data so all agents use it for dynamic analysis
    setCachedGitHubData(responseData);

    res.json(responseData);
  } catch (error) {
    console.error('GitHub fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch repository data', message: error.message });
  }
});

module.exports = router;
