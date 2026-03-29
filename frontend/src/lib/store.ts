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

  // Test generation
  generatedTests: AnyData | null;
  testsLoading: boolean;
  runTestGeneration: (projectId?: string) => Promise<void>;

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
}

export const useAppStore = create<AppState>((set) => ({
  // ─── Project Config ───────────────────────────────────────────────────────
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

  // ─── GitHub Repo ──────────────────────────────────────────────────────────
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

  // ─── Dashboard ────────────────────────────────────────────────────────────
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

  // ─── Test Generation ──────────────────────────────────────────────────────
  generatedTests: null,
  testsLoading: false,
  runTestGeneration: async (projectId = 'demo') => {
    set({ testsLoading: true });
    try {
      const data = await generateTests(projectId);
      set({ generatedTests: data, testsLoading: false });
    } catch {
      set({ testsLoading: false });
    }
  },

  // ─── Risk Prediction ──────────────────────────────────────────────────────
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

  // ─── Requirement Analysis ─────────────────────────────────────────────────
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

  // ─── Commit Analysis ──────────────────────────────────────────────────────
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

  // ─── Active Tab ───────────────────────────────────────────────────────────
  activeTab: 'dashboard',
  setActiveTab: (tab: string) => set({ activeTab: tab }),
}));
