/**
 * API Client
 * 
 * Centralized fetch wrappers for all backend API endpoints.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── Project Configuration ──────────────────────────────────────────────────

export async function configureProject(data: { name?: string; websiteUrl?: string; repoUrl?: string }) {
  return apiFetch('/configure-project', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchProjectInfo() {
  return apiFetch('/project-info');
}

export async function fetchGitHubRepo(url?: string) {
  const query = url ? `?url=${encodeURIComponent(url)}` : '';
  return apiFetch(`/github-repo${query}`);
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function fetchDashboardData() {
  return apiFetch('/dashboard-data');
}

// ─── Requirements Analysis ──────────────────────────────────────────────────

export async function analyzeRequirements(stories: Array<{ title: string; description: string }>) {
  return apiFetch('/analyze-requirements', {
    method: 'POST',
    body: JSON.stringify({ stories }),
  });
}

// ─── Commit Analysis ────────────────────────────────────────────────────────

export async function analyzeCommit(commits: Array<{ sha: string; message: string; filesChanged?: string[] }>) {
  return apiFetch('/analyze-commit', {
    method: 'POST',
    body: JSON.stringify({ commits }),
  });
}

// ─── Test Generation ────────────────────────────────────────────────────────

export async function generateTests(projectId: string, context?: Record<string, unknown>) {
  return apiFetch('/generate-tests', {
    method: 'POST',
    body: JSON.stringify({ projectId, context }),
  });
}

// ─── Risk Prediction ────────────────────────────────────────────────────────

export async function predictRisk(projectId: string, context?: Record<string, unknown>) {
  return apiFetch('/predict-risk', {
    method: 'POST',
    body: JSON.stringify({ projectId, context }),
  });
}
