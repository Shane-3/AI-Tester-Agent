/**
 * Code Analyzer Service
 * 
 * Fetches repository file tree and contents via GitHub API,
 * intelligently selects relevant files based on test failures or user questions,
 * and prepares them for AI analysis.
 */

const GITHUB_API = 'https://api.github.com';

function getHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'AI-Tester-Agent/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * Parse a GitHub URL into owner and repo
 */
function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/**
 * Fetch the full file tree of a repository
 */
async function fetchRepoTree(owner, repo, branch = 'main') {
  // Try specified branch first, then fallback to 'master'
  for (const b of [branch, 'master']) {
    try {
      const res = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${b}?recursive=1`,
        { headers: getHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        console.log(`[CodeAnalyzer] Fetched tree for ${owner}/${repo} (${b}): ${data.tree?.length || 0} items`);
        return { tree: data.tree || [], branch: b };
      }
    } catch (err) {
      // try next branch
    }
  }
  throw new Error(`Could not fetch repository tree for ${owner}/${repo}`);
}

// ─── File Filtering ──────────────────────────────────────────────────────────

const SKIP_DIRS = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  'vendor', '.venv', 'venv', 'coverage', '.cache', '.turbo',
  'public/assets', 'static/assets',
];

const SKIP_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.mp4', '.mp3',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.lock', '.map', '.min.js', '.min.css',
  '.pyc', '.pyo', '.class', '.o', '.so', '.dll',
  '.zip', '.tar', '.gz', '.rar',
  '.pdf', '.doc', '.docx',
];

const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.java',
  '.html', '.css', '.scss', '.less',
  '.json', '.yaml', '.yml', '.toml', '.env',
  '.md', '.txt', '.cfg', '.conf', '.ini',
  '.sh', '.bash', '.dockerfile',
  '.vue', '.svelte', '.astro',
  '.php', '.rs', '.swift', '.kt',
];

function shouldIncludeFile(path) {
  const lower = path.toLowerCase();
  // Skip directories
  if (SKIP_DIRS.some(dir => lower.includes(`${dir}/`) || lower.startsWith(`${dir}/`))) return false;
  // Skip binary/asset extensions
  if (SKIP_EXTENSIONS.some(ext => lower.endsWith(ext))) return false;
  // Must have a code-like extension
  return CODE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

/**
 * Smart file selection based on test failures
 * Returns the most relevant files to analyze for fixes
 */
function selectRelevantFiles(tree, testResults = [], siteAnalysis = null) {
  // Filter to code files only
  const codeFiles = tree.filter(item => item.type === 'blob' && shouldIncludeFile(item.path));

  // Score each file based on relevance to test failures
  const scored = codeFiles.map(file => {
    let score = 0;
    const lower = file.path.toLowerCase();
    const basename = lower.split('/').pop();

    // High-priority files (config, entry points, middleware)
    if (['server.js', 'app.js', 'index.js', 'main.js', 'index.ts', 'app.ts'].includes(basename)) score += 30;
    if (basename.includes('config') || basename.includes('middleware')) score += 25;
    if (basename.includes('.env') || basename === 'next.config.js' || basename === 'next.config.ts') score += 20;
    if (basename === 'package.json') score += 15;

    // Security-related files (boost if security tests failed)
    const securityFailed = testResults.some(t => !t.passed && (
      t.title.includes('Security') || t.title.includes('HTTPS') || t.title.includes('Header')
    ));
    if (securityFailed && (
      lower.includes('security') || lower.includes('helmet') || lower.includes('cors') ||
      lower.includes('middleware') || lower.includes('server') || lower.includes('app.')
    )) score += 35;

    // SEO-related files (boost if meta/SEO tests failed)
    const seoFailed = testResults.some(t => !t.passed && (
      t.title.includes('Meta') || t.title.includes('Title') || t.title.includes('Open Graph') ||
      t.title.includes('SEO')
    ));
    if (seoFailed && (
      lower.includes('head') || lower.includes('seo') || lower.includes('meta') ||
      lower.includes('layout') || lower.includes('_document') || lower.includes('_app') ||
      lower.endsWith('.html')
    )) score += 35;

    // Accessibility files
    const a11yFailed = testResults.some(t => !t.passed && (
      t.title.includes('Alt') || t.title.includes('Accessibility') || t.title.includes('WCAG')
    ));
    if (a11yFailed && (lower.endsWith('.html') || lower.endsWith('.jsx') || lower.endsWith('.tsx'))) {
      score += 20;
    }

    // Form-related
    const formFailed = testResults.some(t => !t.passed && t.title.includes('Form'));
    if (formFailed && (lower.includes('form') || lower.includes('contact') || lower.includes('login'))) {
      score += 25;
    }

    // Layout/page files get moderate boost
    if (lower.includes('page') || lower.includes('layout') || lower.includes('template')) score += 10;
    if (lower.endsWith('.html')) score += 15;

    // Penalize deep nesting
    const depth = file.path.split('/').length;
    if (depth > 5) score -= 10;

    // Prefer smaller files (more likely to be meaningful)
    if (file.size && file.size < 5000) score += 5;
    if (file.size && file.size > 50000) score -= 10;

    return { ...file, score };
  });

  // Sort by score, take top 10
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10);
}

/**
 * Smart file selection based on a natural language question
 */
function selectFilesForQuestion(tree, question) {
  const codeFiles = tree.filter(item => item.type === 'blob' && shouldIncludeFile(item.path));
  const questionLower = question.toLowerCase();

  // Extract keywords from the question
  const stopWords = new Set(['what', 'how', 'where', 'when', 'does', 'the', 'this', 'that', 'with', 'from', 'have', 'will', 'can', 'are', 'for', 'and', 'not', 'any', 'there', 'check', 'about', 'your', 'code', 'tell', 'show', 'find', 'like', 'also', 'use', 'using']);
  const keywords = questionLower
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const scored = codeFiles.map(file => {
    let score = 0;
    const lower = file.path.toLowerCase();
    const basename = lower.split('/').pop().replace(/\.[^.]+$/, '');

    // ── Always-relevant core files get a base boost ──
    const coreFiles = ['server.js', 'app.js', 'index.js', 'main.js', 'index.ts', 'app.ts', 'index.html'];
    if (coreFiles.some(cf => basename + '.' + lower.split('.').pop() === cf || lower.endsWith(cf))) score += 15;
    if (lower === 'package.json' || lower === 'readme.md') score += 12;

    // ── Keyword matching against file paths ──
    for (const keyword of keywords) {
      if (lower.includes(keyword)) score += 30;
      if (basename.includes(keyword)) score += 20;
    }

    // ── Broad semantic matching — many topic→file associations ──
    const topicMap = {
      'auth|login|signup|register|password|session|token|jwt': /auth|login|signup|register|session|passport|middleware|user|guard/,
      'payment|checkout|cart|order|billing|stripe|paypal|price': /payment|checkout|cart|order|billing|stripe|paypal|price|shop|store/,
      'database|db|query|schema|migration|model|orm|prisma|mongoose': /db|model|schema|migration|prisma|mongo|sequelize|database|entity/,
      'api|endpoint|route|request|response|rest|graphql|fetch': /api|route|controller|endpoint|handler|service|middleware/,
      'security|vulnerab|xss|csrf|injection|hack|exploit|spam|bot': /security|auth|middleware|cors|helmet|sanitize|validator|guard|server|app\./,
      'test|spec|coverage|unit|integration|e2e': /test|spec|__test|cypress|jest|mocha/,
      'error|bug|crash|fail|exception|debug|log': /error|handler|middleware|exception|logger|debug|catch/,
      'config|setting|environment|env|deploy': /config|env|setting|deploy|docker|ci|yaml|yml/,
      'style|css|design|layout|theme|color|font|ui|component': /style|css|scss|less|theme|layout|component|design/,
      'link|navigation|nav|menu|route|page|url|redirect|broken': /nav|menu|link|route|page|header|footer|layout|sitemap|index\.html/,
      'image|photo|media|upload|asset|icon|logo': /image|photo|media|upload|asset|icon|logo|gallery/,
      'form|input|validation|submit|contact|email': /form|input|validator|contact|email|submit|field/,
      'performance|speed|load|optimize|cache|lazy|bundle': /perf|speed|cache|bundle|webpack|vite|optimize|compress|lazy/,
      'seo|meta|title|description|sitemap|robot|crawl|search': /seo|meta|sitemap|robot|head|layout|_document|_app|index\.html/,
      'responsive|mobile|tablet|breakpoint|media.query': /responsive|mobile|layout|media|breakpoint|grid|flex/,
      'accessibility|aria|a11y|screen.reader|alt|wcag': /access|aria|a11y|alt|label|semantic|heading|landmark/,
    };

    for (const [topics, filePattern] of Object.entries(topicMap)) {
      if (new RegExp(topics).test(questionLower) && filePattern.test(lower)) {
        score += 40;
      }
    }

    // Penalize deep nesting
    const depth = file.path.split('/').length;
    if (depth > 5) score -= 5;

    // Prefer smaller files (more meaningful, less noise)
    if (file.size && file.size < 10000) score += 3;
    if (file.size && file.size > 50000) score -= 10;

    return { ...file, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Always return at least core files even if no keyword matches
  const results = scored.filter(f => f.score > 0).slice(0, 10);
  if (results.length < 3) {
    const coreExtras = scored.filter(f => f.score >= 10 && !results.find(r => r.path === f.path));
    results.push(...coreExtras.slice(0, 5 - results.length));
  }

  return results;
}

/**
 * Fetch contents of multiple files from GitHub
 */
async function fetchFileContents(owner, repo, filePaths) {
  const headers = getHeaders();
  const results = [];
  const MAX_FILE_SIZE = 15000; // ~500 lines, keep under token limit

  // Fetch in batches of 3 to avoid rate limits
  for (let i = 0; i < filePaths.length; i += 3) {
    const batch = filePaths.slice(i, i + 3);
    const promises = batch.map(async (filePath) => {
      try {
        const res = await fetch(
          `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
          { headers }
        );
        if (!res.ok) return null;
        const data = await res.json();

        // Decode base64 content
        if (data.content && data.encoding === 'base64') {
          let content = Buffer.from(data.content, 'base64').toString('utf-8');
          // Truncate very large files
          if (content.length > MAX_FILE_SIZE) {
            content = content.substring(0, MAX_FILE_SIZE) + '\n\n... [truncated — file too large]';
          }
          return { path: filePath, content, size: data.size };
        }
        return null;
      } catch (err) {
        console.error(`[CodeAnalyzer] Failed to fetch ${filePath}:`, err.message);
        return null;
      }
    });
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter(Boolean));
  }

  console.log(`[CodeAnalyzer] Fetched ${results.length}/${filePaths.length} files`);
  return results;
}

module.exports = {
  parseGitHubUrl,
  fetchRepoTree,
  selectRelevantFiles,
  selectFilesForQuestion,
  fetchFileContents,
};
