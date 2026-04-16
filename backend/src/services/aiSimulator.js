/**
 * AI Simulator Service — Dynamic Context-Aware Data
 * 
 * Generates analysis data that is CONTEXTUAL to the configured project.
 * Uses real GitHub repo data (commits, languages, structure) when available
 * to produce relevant risk scores, test cases, and module impacts.
 * 
 * Every project gets unique, realistic data — not the same hardcoded result.
 */


let projectContext = {
  name: '',
  repoUrl: '',
  websiteUrl: '',
  description: '',
};

let cachedGitHubData = null;

function setProjectContext(ctx) {
  if (ctx.name) projectContext.name = ctx.name;
  if (ctx.repoUrl) projectContext.repoUrl = ctx.repoUrl;
  if (ctx.websiteUrl) projectContext.websiteUrl = ctx.websiteUrl;
  if (ctx.description) projectContext.description = ctx.description;
  // Clear cached GitHub data when project changes
  cachedGitHubData = null;
}

function getProjectContext() {
  return { ...projectContext };
}

function setCachedGitHubData(data) {
  cachedGitHubData = data;
}

function getCachedGitHubData() {
  return cachedGitHubData;
}


// Deterministic hash from string → consistent per-project results
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

// Seeded random (0-1) based on project name for consistent results per project
function seededRandom(seed, index = 0) {
  const x = Math.sin(hashString(seed) + index) * 10000;
  return x - Math.floor(x);
}

// Pick from array based on seed
function seededPick(arr, seed, index = 0) {
  return arr[Math.floor(seededRandom(seed, index) * arr.length)];
}

// Generate a risk score based on repo characteristics
function calculateRiskScore(ctx, github) {
  const seed = ctx.name + ctx.repoUrl;
  let baseScore = Math.floor(seededRandom(seed, 1) * 60) + 20; // 20-80

  if (github) {
    // Adjust based on real repo data
    if (github.repository?.openIssues > 50) baseScore += 8;
    if (github.repository?.openIssues > 200) baseScore += 7;
    if (github.recentCommits?.length >= 10) baseScore += 5; // Active development = more risk
    const languages = github.languages || [];
    if (languages.length > 5) baseScore += 3; // More languages = more complexity
  }

  return Math.min(95, Math.max(15, baseScore));
}

// Derive modules from repo languages and structure
function deriveModules(ctx, github) {
  const seed = ctx.name + ctx.repoUrl;
  const websiteUrl = ctx.websiteUrl || '';

  // If we have GitHub data, create modules from languages and commits
  if (github?.languages?.length > 0) {
    const languages = github.languages.filter(l => l.percentage > 0);
    const commits = github.recentCommits || [];

    // Extract unique paths/areas from commit messages
    const areas = new Set();
    commits.forEach(c => {
      const msg = c.message || '';
      // Extract component names from commit messages
      const patterns = msg.match(/(?:fix|feat|refactor|update|add|remove|improve)\s*[:(]\s*([a-zA-Z-]+)/i);
      if (patterns) areas.add(patterns[1].toLowerCase());
    });

    const impactLevels = ['high', 'medium', 'low'];
    const moduleList = [];

    // Create modules from languages/areas
    const primaryLang = languages[0]?.name || 'JavaScript';
    const isFullStack = languages.some(l => ['JavaScript', 'TypeScript'].includes(l.name)) &&
                        (languages.some(l => ['Python', 'Go', 'Java', 'Ruby', 'PHP'].includes(l.name)) ||
                        languages.some(l => ['HTML', 'CSS'].includes(l.name)));

    if (isFullStack || websiteUrl) {
      moduleList.push(
        { name: 'frontend-ui', impact: seededPick(impactLevels, seed, 10), filesChanged: Math.floor(seededRandom(seed, 11) * 8) + 2, linesChanged: Math.floor(seededRandom(seed, 12) * 400) + 50, description: `Frontend components and UI layer (${primaryLang})` },
        { name: 'api-routes', impact: seededPick(impactLevels, seed, 13), filesChanged: Math.floor(seededRandom(seed, 14) * 5) + 1, linesChanged: Math.floor(seededRandom(seed, 15) * 300) + 30, description: 'API endpoints and request handlers' },
      );
    }

    if (areas.has('auth') || areas.has('login') || areas.has('user')) {
      moduleList.push({ name: 'auth-service', impact: 'high', filesChanged: Math.floor(seededRandom(seed, 16) * 4) + 2, linesChanged: Math.floor(seededRandom(seed, 17) * 200) + 100, description: 'Authentication and user management' });
    }

    // Add language-specific modules
    if (languages.some(l => l.name === 'CSS' && l.percentage > 5)) {
      moduleList.push({ name: 'styling-layer', impact: 'low', filesChanged: Math.floor(seededRandom(seed, 18) * 6) + 1, linesChanged: Math.floor(seededRandom(seed, 19) * 150) + 20, description: 'CSS stylesheets and design system' });
    }

    // Add from extracted areas
    const areaArr = [...areas].filter(a => !['auth', 'login', 'user'].includes(a)).slice(0, 3);
    areaArr.forEach((area, i) => {
      moduleList.push({
        name: area,
        impact: seededPick(impactLevels, seed, 20 + i),
        filesChanged: Math.floor(seededRandom(seed, 23 + i) * 5) + 1,
        linesChanged: Math.floor(seededRandom(seed, 26 + i) * 250) + 30,
        description: `${area} module (detected from recent commits)`,
      });
    });

    // Ensure at least 3 modules
    if (moduleList.length < 3) {
      moduleList.push({ name: 'core-logic', impact: seededPick(impactLevels, seed, 30), filesChanged: Math.floor(seededRandom(seed, 31) * 6) + 2, linesChanged: Math.floor(seededRandom(seed, 32) * 300) + 60, description: `Core business logic (${primaryLang})` });
    }
    if (moduleList.length < 3) {
      moduleList.push({ name: 'config-build', impact: 'low', filesChanged: Math.floor(seededRandom(seed, 33) * 3) + 1, linesChanged: Math.floor(seededRandom(seed, 34) * 80) + 10, description: 'Build configuration and tooling' });
    }

    return moduleList.slice(0, 5);
  }

  // Default modules if no GitHub data
  const projectNameLower = ctx.name.toLowerCase();
  const modules = [];

  if (projectNameLower.includes('portfolio') || projectNameLower.includes('website') || websiteUrl) {
    modules.push(
      { name: 'frontend-ui', impact: 'medium', filesChanged: 4, linesChanged: 220, description: 'HTML/CSS layout and interactive components' },
      { name: 'responsive-design', impact: 'low', filesChanged: 2, linesChanged: 85, description: 'Mobile and tablet responsive styles' },
      { name: 'content-assets', impact: 'low', filesChanged: 3, linesChanged: 45, description: 'Images, fonts, and static content' },
    );
  } else {
    modules.push(
      { name: 'core-module', impact: 'high', filesChanged: 5, linesChanged: 340, description: 'Primary application logic' },
      { name: 'data-layer', impact: 'medium', filesChanged: 3, linesChanged: 180, description: 'Database queries and data models' },
      { name: 'api-service', impact: 'medium', filesChanged: 2, linesChanged: 120, description: 'External API integrations' },
    );
  }

  return modules;
}


function simulateRequirementAnalysis(story) {
  const ctx = getProjectContext();
  const github = getCachedGitHubData();
  const seed = ctx.name + (story.title || '');
  const websiteUrl = ctx.websiteUrl || 'https://example.com';
  const repoName = github?.repository?.name || ctx.name;
  const primaryLang = github?.repository?.language || 'JavaScript';

  // Generate features relevant to the project
  const featurePool = [
    `User interface rendering and responsive layout for ${repoName}`,
    `Navigation flow and page routing`,
    `Form validation and user input handling`,
    `Data persistence and state management`,
    `Performance optimization for page load times`,
    `Cross-browser compatibility (Chrome, Firefox, Safari, Edge)`,
    `Accessibility compliance (WCAG 2.1 AA)`,
    `SEO meta tags and structured data`,
    `Error handling and user-friendly error states`,
    `Authentication and session management`,
  ];

  const edgeCasePool = [
    `Empty state: no data available on first load`,
    `Network timeout during data fetch (> 10s)`,
    `Concurrent users modifying same resource`,
    `Browser back/forward navigation state preservation`,
    `Large dataset rendering (1000+ items)`,
    `Special characters in user input fields`,
    `Session expiry during active form editing`,
    `Mobile touch events vs desktop click events`,
    `Slow 3G connection handling`,
    `JavaScript disabled fallback behavior`,
  ];

  const featureCount = Math.floor(seededRandom(seed, 1) * 3) + 4;
  const edgeCount = Math.floor(seededRandom(seed, 2) * 4) + 5;
  const features = [];
  const edgeCases = [];
  for (let i = 0; i < featureCount; i++) features.push(featurePool[Math.floor(seededRandom(seed, 10 + i) * featurePool.length)]);
  for (let i = 0; i < edgeCount; i++) edgeCases.push(edgeCasePool[Math.floor(seededRandom(seed, 20 + i) * edgeCasePool.length)]);

  return {
    storyId: story.id || `US-${hashString(seed) % 10000}`,
    title: story.title || `${ctx.name} — Feature Analysis`,
    features: [...new Set(features)],
    acceptanceCriteria: [
      `${websiteUrl} loads successfully within 3 seconds`,
      `All interactive elements respond to user actions`,
      `No console errors in production build`,
      `All pages return correct HTTP status codes`,
      `Content displays correctly on viewports 320px to 1920px`,
    ],
    edgeCases: [...new Set(edgeCases)],
    businessCriticality: Math.floor(seededRandom(seed, 3) * 4) + 6,
    priority: seededRandom(seed, 4) > 0.5 ? 'high' : 'critical',
    estimatedComplexity: seededPick(['medium', 'high'], seed, 5),
    suggestedTestCount: Math.floor(seededRandom(seed, 6) * 10) + 10,
    analysisConfidence: Math.round((seededRandom(seed, 7) * 0.15 + 0.82) * 100) / 100,
    projectContext: { name: ctx.name, url: ctx.websiteUrl, language: primaryLang },
    timestamp: new Date().toISOString(),
  };
}


function simulateCommitAnalysis(commit) {
  const ctx = getProjectContext();
  const github = getCachedGitHubData();
  const modules = deriveModules(ctx, github);
  const commits = github?.recentCommits || [];
  const seed = ctx.name + ctx.repoUrl;

  // Use real commits if available
  const riskAreas = [];
  if (commits.length > 0) {
    const recentMessages = commits.slice(0, 5).map(c => c.message);
    recentMessages.forEach((msg, i) => {
      const severities = ['high', 'medium', 'low'];
      riskAreas.push({
        area: msg.split(':')[0]?.trim() || `Commit ${i + 1}`,
        risk: msg,
        severity: severities[Math.floor(seededRandom(seed, 40 + i) * 3)],
      });
    });
  } else {
    riskAreas.push(
      { area: 'Code changes', risk: `Recent updates to ${ctx.name}`, severity: 'medium' },
      { area: 'Dependencies', risk: 'Package updates may introduce breaking changes', severity: 'low' },
    );
  }

  const totalAdditions = Math.floor(seededRandom(seed, 50) * 800) + 100;
  const totalDeletions = Math.floor(seededRandom(seed, 51) * 400) + 50;

  return {
    commitSha: commit.sha || commits[0]?.sha || 'latest',
    message: commit.message || commits[0]?.message || `Updates to ${ctx.name}`,
    impactedModules: modules,
    riskAreas: riskAreas.slice(0, 4),
    dependencyGraph: {
      nodes: modules.map(m => m.name),
      edges: modules.length >= 2 ? [
        { from: modules[0].name, to: modules[1].name, type: 'imports' },
        ...(modules.length >= 3 ? [{ from: modules[1].name, to: modules[2].name, type: 'depends' }] : []),
      ] : [],
    },
    codeChurn: {
      additions: totalAdditions,
      deletions: totalDeletions,
      filesChanged: modules.reduce((s, m) => s + m.filesChanged, 0),
    },
    overallRisk: calculateRiskScore(ctx, github) >= 60 ? 'high' : 'medium',
    repoUrl: ctx.repoUrl || github?.repository?.url || '',
    projectContext: { name: ctx.name, url: ctx.websiteUrl },
    timestamp: new Date().toISOString(),
  };
}


function simulateTestGeneration(context) {
  const ctx = getProjectContext();
  const github = getCachedGitHubData();
  const seed = ctx.name + ctx.repoUrl + ctx.websiteUrl;
  const websiteUrl = ctx.websiteUrl || 'https://example.com';
  const repoName = github?.repository?.name || ctx.name;
  const primaryLang = github?.repository?.language || 'JavaScript';
  const modules = deriveModules(ctx, github);
  const openIssues = github?.repository?.openIssues || 0;

  const tests = [];
  let testId = 1;

  const functionalPool = [
    { title: `Verify ${repoName} homepage loads correctly`, steps: [`Navigate to ${websiteUrl}`, 'Wait for page load', 'Verify main content is visible', 'Check no console errors'], expected: 'Homepage renders with all sections visible and interactive' },
    { title: `Verify navigation links on ${repoName}`, steps: [`Navigate to ${websiteUrl}`, 'Click each navigation link', 'Verify each page loads', 'Check URL changes correctly'], expected: 'All navigation links lead to correct pages without 404 errors' },
    { title: `Verify form submission on ${repoName}`, steps: [`Navigate to ${websiteUrl}`, 'Locate any form', 'Fill in valid data', 'Submit form'], expected: 'Form submits successfully with appropriate feedback message' },
    { title: `Validate ${repoName} page title and meta tags`, steps: [`Navigate to ${websiteUrl}`, 'Inspect document.title', 'Check meta description', 'Verify OG tags'], expected: 'Title is present and descriptive; meta description under 160 chars' },
    { title: `Test ${repoName} footer links and copyright`, steps: [`Navigate to ${websiteUrl}`, 'Scroll to footer', 'Click each footer link', 'Verify copyright year'], expected: 'All footer links work; copyright shows current year' },
    { title: `Verify ${repoName} search functionality`, steps: [`Navigate to ${websiteUrl}`, 'Locate search input', 'Enter search query', 'Check results'], expected: 'Search returns relevant results or shows "no results" message' },
    { title: `Test ${repoName} authentication flow`, steps: [`Navigate to ${websiteUrl}/login`, 'Enter valid credentials', 'Submit login form', 'Verify redirect'], expected: 'User is authenticated and redirected to dashboard' },
  ];

  const funcCount = Math.floor(seededRandom(seed, 100) * 4) + 2; // 2-5
  for (let i = 0; i < funcCount && i < functionalPool.length; i++) {
    const t = functionalPool[i];
    tests.push({
      id: `TC-${String(testId++).padStart(3, '0')}`, title: t.title, type: 'functional',
      priority: i === 0 ? 'high' : seededRandom(seed, 110 + i) > 0.5 ? 'high' : 'medium',
      status: 'generated', isAutomated: seededRandom(seed, 120 + i) > 0.6, steps: t.steps, expectedResult: t.expected,
    });
  }

  const edgePool = [
    { title: `Handle slow network on ${repoName}`, steps: ['Throttle to Slow 3G', `Navigate to ${websiteUrl}`, 'Wait for render'], expected: 'Loading indicator shown; content loads gracefully' },
    { title: `Verify ${repoName} with JavaScript disabled`, steps: [`Navigate to ${websiteUrl} with JS disabled`, 'Check content'], expected: 'Core content visible or noscript fallback displayed' },
    { title: `Test ${repoName} responsive layout at 320px`, steps: [`Navigate to ${websiteUrl}`, 'Resize to 320px', 'Scroll all sections'], expected: 'No horizontal overflow; touch targets >= 44px' },
    { title: `${repoName} handles 404 routes gracefully`, steps: [`Navigate to ${websiteUrl}/nonexistent-page-xyz`, 'Check response'], expected: 'Custom 404 page displayed with navigation back to home' },
    { title: `Test ${repoName} with browser back/forward`, steps: [`Navigate to ${websiteUrl}`, 'Click internal links', 'Press browser back', 'Then forward'], expected: 'State preserved correctly across navigation history' },
    { title: `Verify ${repoName} under concurrent load`, steps: ['Open 10 simultaneous connections', `Send requests to ${websiteUrl}`, 'Measure response times'], expected: 'All requests complete within 5s; no 5xx errors' },
  ];

  const edgeCount = Math.floor(seededRandom(seed, 130) * 4) + 1; // 1-4
  for (let i = 0; i < edgeCount && i < edgePool.length; i++) {
    const t = edgePool[i];
    tests.push({
      id: `TC-${String(testId++).padStart(3, '0')}`, title: t.title, type: 'edge',
      priority: seededRandom(seed, 140 + i) > 0.6 ? 'high' : 'medium',
      status: 'generated', isAutomated: false, steps: t.steps, expectedResult: t.expected,
    });
  }

  const apiPool = [
    { title: `GET ${websiteUrl} returns 200`, steps: [`GET ${websiteUrl}`, 'Check status', 'Check content-type'], expected: 'Status 200, text/html', code: `test('GET /', async () => {\n  const r = await fetch('${websiteUrl}');\n  expect(r.status).toBe(200);\n});` },
    { title: `${repoName} returns valid HTML`, steps: [`Fetch ${websiteUrl}`, 'Parse HTML', 'Validate structure'], expected: 'Valid HTML5 with DOCTYPE, head, body', code: `test('Valid HTML', async () => {\n  const r = await fetch('${websiteUrl}');\n  const h = await r.text();\n  expect(h).toContain('<!DOCTYPE html>');\n});` },
    { title: `${repoName} response headers are secure`, steps: [`GET ${websiteUrl}`, 'Check X-Frame-Options', 'Check CSP header'], expected: 'Security headers present to prevent XSS and clickjacking', code: `test('Security headers', async () => {\n  const r = await fetch('${websiteUrl}');\n  expect(r.headers.has('x-frame-options') || r.headers.has('content-security-policy')).toBe(true);\n});` },
    { title: `${repoName} handles HEAD request`, steps: [`HEAD ${websiteUrl}`, 'Check status', 'Verify no body'], expected: 'Status 200, empty body, correct content-length', code: `test('HEAD request', async () => {\n  const r = await fetch('${websiteUrl}', { method: 'HEAD' });\n  expect(r.status).toBe(200);\n});` },
    { title: `${repoName} favicon exists`, steps: [`GET ${websiteUrl}/favicon.ico`, 'Check status'], expected: 'Status 200 or 301 redirect to favicon', code: `test('Favicon', async () => {\n  const r = await fetch('${websiteUrl}/favicon.ico');\n  expect([200, 301, 302]).toContain(r.status);\n});` },
  ];

  const apiCount = Math.floor(seededRandom(seed, 150) * 3) + 1; // 1-3
  for (let i = 0; i < apiCount && i < apiPool.length; i++) {
    tests.push({
      id: `TC-${String(testId++).padStart(3, '0')}`, title: apiPool[i].title, type: 'api',
      priority: i === 0 ? 'high' : 'medium', status: 'generated', isAutomated: true,
      steps: apiPool[i].steps, expectedResult: apiPool[i].expected, code: apiPool[i].code,
    });
  }

  const uiPool = [
    { title: `Visual regression test for ${repoName}`, steps: [`Navigate to ${websiteUrl}`, 'Wait for assets', 'Screenshot', 'Compare baseline'], expected: 'No unexpected visual differences', code: `test('Visual regression', async ({ page }) => {\n  await page.goto('${websiteUrl}');\n  await expect(page).toHaveScreenshot('home.png');\n});` },
    { title: `Test ${repoName} interactive elements`, steps: [`Navigate to ${websiteUrl}`, 'Find clickable elements', 'Click each', 'Verify response'], expected: 'All elements respond with visual feedback', code: `test('Interactive', async ({ page }) => {\n  await page.goto('${websiteUrl}');\n  const btns = await page.locator('button, a[href]').all();\n  expect(btns.length).toBeGreaterThan(0);\n});` },
    { title: `${repoName} dark/light mode toggle`, steps: [`Navigate to ${websiteUrl}`, 'Find theme toggle', 'Click to switch', 'Verify styles change'], expected: 'Theme switches correctly; no layout breakage' },
    { title: `Verify ${repoName} loading skeleton`, steps: [`Open ${websiteUrl} with throttled CPU`, 'Observe initial render', 'Check skeleton state'], expected: 'Skeleton placeholders shown before real content loads' },
  ];

  const uiCount = Math.floor(seededRandom(seed, 160) * 3) + 1; // 1-3
  for (let i = 0; i < uiCount && i < uiPool.length; i++) {
    tests.push({
      id: `TC-${String(testId++).padStart(3, '0')}`, title: uiPool[i].title, type: 'ui',
      priority: i === 0 ? 'high' : 'medium', status: 'generated', isAutomated: true,
      steps: uiPool[i].steps, expectedResult: uiPool[i].expected, code: uiPool[i].code,
    });
  }

  if (openIssues > 100) {
    tests.push({
      id: `TC-${String(testId++).padStart(3, '0')}`,
      title: `Regression: verify ${repoName} bug fixes from recent issues`,
      type: 'functional', priority: 'critical', status: 'generated', isAutomated: false,
      steps: ['Review top 10 recently closed issues', `Navigate to ${websiteUrl}`, 'Test each fix scenario', 'Confirm no regression'],
      expectedResult: 'All recently fixed issues remain resolved',
    });
  }

  modules.forEach((mod, mi) => {
    if (mi < 2 && seededRandom(seed, 170 + mi) > 0.4) {
      tests.push({
        id: `TC-${String(testId++).padStart(3, '0')}`,
        title: `Verify ${mod.name} module integration on ${repoName}`,
        type: 'functional', priority: mod.impact === 'high' ? 'high' : 'medium',
        status: 'generated', isAutomated: false,
        steps: [`Navigate to ${websiteUrl}`, `Trigger ${mod.name} functionality`, 'Verify output', 'Check error handling'],
        expectedResult: `${mod.name} module works correctly with no errors (${mod.filesChanged} files, ${mod.linesChanged} lines changed)`,
      });
    }
  });

  return {
    projectId: context.projectId || 'project',
    projectContext: { name: ctx.name, url: ctx.websiteUrl, repo: ctx.repoUrl, language: primaryLang },
    totalGenerated: tests.length,
    tests,
    coverage: {
      functional: tests.filter(t => t.type === 'functional').length,
      edge: tests.filter(t => t.type === 'edge').length,
      api: tests.filter(t => t.type === 'api').length,
      ui: tests.filter(t => t.type === 'ui').length,
    },
    generatedAt: new Date().toISOString(),
  };
}


function simulateRiskPrediction(context) {
  const ctx = getProjectContext();
  const github = getCachedGitHubData();
  const seed = ctx.name + ctx.repoUrl;
  const riskScore = calculateRiskScore(ctx, github);
  const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
  const modules = deriveModules(ctx, github);
  const repoName = github?.repository?.name || ctx.name;

  // Generate factors based on actual project data
  const totalFiles = modules.reduce((s, m) => s + m.filesChanged, 0);
  const totalLines = modules.reduce((s, m) => s + m.linesChanged, 0);
  const openIssues = github?.repository?.openIssues || Math.floor(seededRandom(seed, 60) * 20);
  const commitCount = github?.recentCommits?.length || Math.floor(seededRandom(seed, 61) * 8) + 2;
  const codeCoverage = Math.floor(seededRandom(seed, 62) * 40) + 40; // 40-80%

  const factors = [
    { name: 'Code Churn', score: Math.min(95, Math.floor(totalLines / 8) + 15), weight: 0.25, description: `${totalLines} lines changed across ${totalFiles} files in ${modules.length} modules` },
    { name: 'Test Coverage', score: 100 - codeCoverage, weight: 0.20, description: `Estimated coverage at ${codeCoverage}% — ${codeCoverage < 70 ? 'below' : 'near'} recommended 80% threshold` },
    { name: 'Open Issues', score: Math.min(90, openIssues * 2 + 10), weight: 0.15, description: `${openIssues} open issues on ${repoName} repository` },
    { name: 'Commit Velocity', score: Math.min(85, commitCount * 8 + 5), weight: 0.15, description: `${commitCount} commits in recent history — ${commitCount > 5 ? 'high' : 'moderate'} development activity` },
    { name: 'Dependency Risk', score: Math.floor(seededRandom(seed, 63) * 40) + 20, weight: 0.15, description: `Third-party dependencies may introduce compatibility issues` },
    { name: 'Review Coverage', score: Math.floor(seededRandom(seed, 64) * 50) + 15, weight: 0.10, description: `Code review coverage for recent changes` },
  ];

  const highModules = modules.filter(m => m.impact === 'high');
  const explanation = `This release for ${ctx.name} has a risk score of ${riskScore}/100. ` +
    `${totalLines} lines were changed across ${totalFiles} files in ${modules.length} modules. ` +
    (highModules.length > 0 ? `High-impact modules: ${highModules.map(m => m.name).join(', ')}. ` : '') +
    `Test coverage is estimated at ${codeCoverage}%${codeCoverage < 70 ? ', below the recommended 80% threshold' : ''}. ` +
    (openIssues > 10 ? `There are ${openIssues} open issues that may affect stability. ` : '') +
    `${commitCount} recent commits indicate ${commitCount > 5 ? 'active' : 'moderate'} development velocity.`;

  const recommendations = [
    `Review all changes in ${highModules.length > 0 ? highModules[0].name : modules[0]?.name || 'core'} module before deployment`,
    codeCoverage < 70 ? `Increase test coverage from ${codeCoverage}% to at least 80%` : `Maintain current ${codeCoverage}% test coverage`,
    `Run full regression suite against ${ctx.websiteUrl || 'staging environment'}`,
    openIssues > 5 ? `Triage ${openIssues} open issues — prioritize critical bugs` : `Continue monitoring ${openIssues} open issues`,
    `Set up post-deployment monitoring for error rate spikes`,
    `Prepare rollback plan before production deployment`,
  ];

  return {
    riskScore,
    riskLevel,
    factors,
    explanation,
    recommendations,
    deployment: riskScore >= 70 ? 'blocked' : 'approved',
    confidence: Math.round((seededRandom(seed, 65) * 0.12 + 0.83) * 100) / 100,
    analyzedAt: new Date().toISOString(),
  };
}


function simulateRegressionOptimization(tests) {
  const ctx = getProjectContext();
  const seed = ctx.name + ctx.repoUrl;
  const totalTests = Math.floor(seededRandom(seed, 70) * 120) + 80;
  const reductionPercent = Math.floor(seededRandom(seed, 71) * 30) + 50;
  const selectedCount = Math.floor(totalTests * (1 - reductionPercent / 100));
  const timeSaved = Math.floor(seededRandom(seed, 72) * 25) + 8;

  return {
    totalAvailable: totalTests,
    selected: selectedCount,
    skipped: totalTests - selectedCount,
    reductionPercent,
    estimatedTimeSaved: `${timeSaved} minutes`,
    selectionCriteria: [
      `Tests covering modules modified in ${ctx.name}`,
      'Previously failed tests from last 3 sprints',
      'High-priority tests for critical user flows',
      'Tests with dependency on changed components',
    ],
    optimizedAt: new Date().toISOString(),
  };
}


function simulateGatekeeperDecision(riskReport) {
  const ctx = getProjectContext();
  const score = riskReport.riskScore || 50;
  const blocked = score >= 70;

  return {
    decision: blocked ? 'BLOCKED' : 'APPROVED',
    riskScore: score,
    riskLevel: riskReport.riskLevel || 'medium',
    reasoning: blocked
      ? `Deployment of ${ctx.name} blocked: Risk score ${score}/100 exceeds the safety threshold of 70. ${riskReport.explanation || 'Multiple risk factors detected.'} Manual review and additional test coverage are required before this release can proceed.`
      : `Deployment of ${ctx.name} approved: Risk score ${score}/100 is within acceptable range. All critical checks passed. Recommended to monitor error rates for 24 hours after deployment to ${ctx.websiteUrl || 'production'}.`,
    conditions: blocked
      ? [
          'Increase test coverage to minimum 80% on high-impact modules',
          'Complete peer review on all pending pull requests',
          `Run full E2E test suite against ${ctx.websiteUrl || 'staging'}`,
          'Prepare documented rollback plan',
        ]
      : [
          `Monitor ${ctx.websiteUrl || 'production'} error rates for 24 hours`,
          'Keep rollback plan ready for 48 hours',
        ],
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  simulateRequirementAnalysis,
  simulateCommitAnalysis,
  simulateTestGeneration,
  simulateRiskPrediction,
  simulateRegressionOptimization,
  simulateGatekeeperDecision,
  setProjectContext,
  getProjectContext,
  setCachedGitHubData,
  getCachedGitHubData,
};
