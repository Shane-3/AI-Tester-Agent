/**
 * Zustand Store
 * 
 * Global state management for the AI Tester Agent dashboard.
 */

import { create } from 'zustand';
import {
  fetchDashboardData,
  analyzeRequirements,
  analyzeCommit,
  generateTests,
  predictRisk,
  configureProject,
  fetchProjectInfo,
  fetchGitHubRepo,
  fetchCodeFixes,
  askCodeQuestion,
  fetchMetrics,
  submitDeploymentFeedback,
} from './api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

interface AppState {
  // Project config
  projectConfig: AnyData | null;
  configureProject: (data: { name?: string; websiteUrl?: string; repoUrl?: string }) => Promise<void>;
  loadProjectInfo: () => Promise<void>;

  // GitHub repo
  githubRepo: AnyData | null;
  githubLoading: boolean;
  fetchGitHubRepo: (url?: string) => Promise<void>;

  // Dashboard data
  dashboard: AnyData | null;
  dashboardLoading: boolean;
  dashboardError: string | null;
  loadDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;

  // Code Fixes
  codeFixes: AnyData | null;
  codeFixesLoading: boolean;
  runCodeAnalysis: (repoUrl?: string, refresh?: boolean) => Promise<void>;

  // Ask AI
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string; references?: AnyData[]; confidence?: number }>;
  chatLoading: boolean;
  askQuestion: (question: string, repoUrl?: string) => Promise<void>;

  // Test generation
  generatedTests: AnyData | null;
  testsLoading: boolean;
  runTestGeneration: (projectId?: string, refresh?: boolean) => Promise<void>;

  // Risk prediction
  riskReport: AnyData | null;
  riskLoading: boolean;
  runRiskPrediction: (projectId?: string) => Promise<void>;

  // Requirement analysis
  requirementAnalysis: AnyData | null;
  requirementLoading: boolean;
  runRequirementAnalysis: (stories: Array<{ title: string; description: string }>) => Promise<void>;

  // Commit analysis
  commitAnalysis: AnyData | null;
  commitLoading: boolean;
  runCommitAnalysis: (commits: Array<{ sha: string; message: string }>) => Promise<void>;

  // Active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Metrics
  metrics: AnyData | null;
  metricsLoading: boolean;
  loadMetrics: () => Promise<void>;
  submitFeedback: (predictionId: string, outcome: 'smooth' | 'minor' | 'major') => Promise<AnyData | null>;
}

export const useAppStore = create<AppState>((set) => ({
  projectConfig: null,
  configureProject: async (data) => {
    try {
      const result: AnyData = await configureProject(data);
      // Clear ALL cached page data so pages re-fetch with new project context
      set({
        projectConfig: result.project,
        generatedTests: null,
        riskReport: null,
        requirementAnalysis: null,
        commitAnalysis: null,
        dashboard: null,
        codeFixes: null,
        chatHistory: [],
      });
    } catch {
      // silent fail
    }
  },
  loadProjectInfo: async () => {
    try {
      const result: AnyData = await fetchProjectInfo();
      set({ projectConfig: result.project });
    } catch {
      // silent fail
    }
  },

  githubRepo: null,
  githubLoading: false,
  fetchGitHubRepo: async (url) => {
    set({ githubLoading: true });
    try {
      const data = await fetchGitHubRepo(url);
      set({ githubRepo: data, githubLoading: false });
    } catch {
      set({ githubLoading: false });
    }
  },

  dashboard: null,
  dashboardLoading: false,
  dashboardError: null,
  loadDashboard: async () => {
    set({ dashboardLoading: true, dashboardError: null });
    try {
      const data = await fetchDashboardData();
      set({ dashboard: data, dashboardLoading: false });
    } catch (error) {
      set({
        dashboardError: error instanceof Error ? error.message : 'Failed to load dashboard',
        dashboardLoading: false,
      });
    }
  },
  refreshDashboard: async () => {
    set({ dashboardLoading: true, dashboardError: null });
    try {
      const data = await fetchDashboardData(true); // pass refresh=true
      set({ dashboard: data, dashboardLoading: false });
    } catch (error) {
      set({
        dashboardError: error instanceof Error ? error.message : 'Failed to refresh dashboard',
        dashboardLoading: false,
      });
    }
  },

  generatedTests: null,
  testsLoading: false,
  runTestGeneration: async (projectId = 'demo', refresh = false) => {
    set({ testsLoading: true });
    try {
      const data = await generateTests(projectId, undefined, refresh);
      set({ generatedTests: data, testsLoading: false });
    } catch {
      set({ testsLoading: false });
    }
  },

  riskReport: null,
  riskLoading: false,
  runRiskPrediction: async (projectId = 'demo') => {
    set({ riskLoading: true });
    try {
      const data = await predictRisk(projectId);
      set({ riskReport: data, riskLoading: false });
    } catch {
      set({ riskLoading: false });
    }
  },

  requirementAnalysis: null,
  requirementLoading: false,
  runRequirementAnalysis: async (stories) => {
    set({ requirementLoading: true });
    try {
      const data = await analyzeRequirements(stories);
      set({ requirementAnalysis: data, requirementLoading: false });
    } catch {
      set({ requirementLoading: false });
    }
  },

  commitAnalysis: null,
  commitLoading: false,
  runCommitAnalysis: async (commits) => {
    set({ commitLoading: true });
    try {
      const data = await analyzeCommit(commits);
      set({ commitAnalysis: data, commitLoading: false });
    } catch {
      set({ commitLoading: false });
    }
  },

  activeTab: 'dashboard',
  setActiveTab: (tab: string) => set({ activeTab: tab }),

  codeFixes: null,
  codeFixesLoading: false,
  runCodeAnalysis: async (repoUrl, refresh = false) => {
    set({ codeFixesLoading: true });
    try {
      const data = await fetchCodeFixes(repoUrl, refresh);
      set({ codeFixes: data, codeFixesLoading: false });
    } catch {
      // Set error sentinel so the page doesn't re-trigger in a loop
      set({ codeFixes: { error: true, fixes: [] }, codeFixesLoading: false });
    }
  },

  chatHistory: [],
  chatLoading: false,
  askQuestion: async (question, repoUrl) => {
    // Add user message immediately
    set((state) => ({
      chatHistory: [...state.chatHistory, { role: 'user', content: question }],
      chatLoading: true,
    }));
    try {
      const data: AnyData = await askCodeQuestion(question, repoUrl);
      set((state) => ({
        chatHistory: [
          ...state.chatHistory,
          { role: 'assistant', content: data.answer, references: data.references, confidence: data.confidence },
        ],
        chatLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while communicating with the AI. Please try again.';
      set((state) => ({
        chatHistory: [
          ...state.chatHistory,
          { role: 'assistant', content: errorMessage },
        ],
        chatLoading: false,
      }));
    }
  },

  metrics: null,
  metricsLoading: false,
  loadMetrics: async () => {
    set({ metricsLoading: true });
    try {
      const data = await fetchMetrics();
      set({ metrics: data, metricsLoading: false });
    } catch {
      set({ metricsLoading: false });
    }
  },
  submitFeedback: async (predictionId: string, outcome: 'smooth' | 'minor' | 'major') => {
    try {
      const data: AnyData = await submitDeploymentFeedback(predictionId, outcome);
      const metrics = await fetchMetrics();
      set({ metrics });
      return data;
    } catch {
      return null;
    }
  },
}));
