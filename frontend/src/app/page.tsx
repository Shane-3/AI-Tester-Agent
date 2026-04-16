"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Zap,
  ShieldAlert,
  ShieldCheck,
  FileCode2,
  Pencil,
  Globe,
  Star,
  GitFork,
  AlertCircle,
  Settings,
  ExternalLink,
  Loader2,
  TrendingDown,
} from "lucide-react";

// ─── Project Config Panel ────────────────────────────────────────────────────

function ProjectConfigPanel() {
  const {
    projectConfig, configureProject: saveProject, loadProjectInfo,
    githubRepo, githubLoading, fetchGitHubRepo,
    loadDashboard,
  } = useAppStore();

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProjectInfo();
  }, [loadProjectInfo]);

  useEffect(() => {
    if (projectConfig) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWebsiteUrl(projectConfig.websiteUrl || "");
      setRepoUrl(projectConfig.repoUrl || "");
      setProjectName(projectConfig.name || "");
    }
  }, [projectConfig]);

  const handleSave = async () => {
    await saveProject({ name: projectName, websiteUrl, repoUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (repoUrl && repoUrl.includes("github.com")) {
      await fetchGitHubRepo(repoUrl);
    }
    loadDashboard();
  };

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: 4,
    background: "var(--bg-input)", border: "1px solid var(--border-color)",
    color: "var(--text-primary)", fontSize: 13, outline: "none",
  };

  return (
    <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Settings size={15} color="var(--text-muted)" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Project Configuration</span>
        {saved && (
          <span style={{ fontSize: 11, color: "var(--accent-green)", marginLeft: "auto" }}>
            Saved
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
            Project Name
          </label>
          <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
            placeholder="My Project" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
            Website URL
          </label>
          <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://example.com" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
            GitHub Repository
          </label>
          <input type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo" style={inputStyle} />
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave} style={{ marginBottom: githubRepo ? 16 : 0 }}>
        {githubLoading ? <><Loader2 size={13} className="animate-spin" /> Connecting...</> : "Save & Connect"}
      </button>

      {githubRepo?.repository && (
        <div style={{ padding: 14, background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border-color)", marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{githubRepo.repository.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{githubRepo.repository.description}</div>
            </div>
            <a href={githubRepo.repository.url} target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--accent-blue)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
              Open <ExternalLink size={10} />
            </a>
          </div>

          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Star size={12} /> {githubRepo.repository.stars}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><GitFork size={12} /> {githubRepo.repository.forks}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><AlertCircle size={12} /> {githubRepo.repository.openIssues} issues</span>
            <span>{githubRepo.repository.language}</span>
          </div>

          {githubRepo.recentCommits?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Recent Commits</div>
              {githubRepo.recentCommits.slice(0, 5).map((c: { sha: string; message: string; author: string }, i: number) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, padding: "4px 0", borderBottom: i < 4 ? "1px solid var(--border-color)" : "none" }}>
                  <code style={{ color: "var(--accent-cyan)", fontSize: 11, fontFamily: "'Fira Code', monospace", flexShrink: 0 }}>{c.sha}</code>
                  <span style={{ color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.message}</span>
                  <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{c.author}</span>
                </div>
              ))}
            </div>
          )}

          {githubRepo.languages?.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {githubRepo.languages.map((lang: { name: string; percentage: number }, i: number) => (
                <span key={i} style={{ padding: "2px 8px", borderRadius: 3, fontSize: 11, background: "#333", color: "var(--text-secondary)" }}>
                  {lang.name} {lang.percentage}%
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Risk Bar (replaces SVG circle gauge) ────────────────────────────────────

function RiskBar({ score, level }: { score: number; level: string }) {
  const color = level === "high" ? "var(--accent-red)" : level === "medium" ? "var(--accent-amber)" : "var(--accent-green)";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 36, fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/ 100</span>
        <span className={`badge badge-${level}`} style={{ marginLeft: "auto" }}>{level.toUpperCase()} RISK</span>
      </div>
      <div className="progress-bar" style={{ height: 8 }}>
        <div className="progress-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Stats Card ──────────────────────────────────────────────────────────────

function StatsCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon size={16} color={color} />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Module Card ─────────────────────────────────────────────────────────────

function ModuleCard({ module }: { module: { name: string; impact: string; filesChanged: number; linesChanged: number; description?: string } }) {
  const color = module.impact === "high" ? "var(--accent-red)" : module.impact === "medium" ? "var(--accent-amber)" : "var(--accent-green)";

  return (
    <div style={{ padding: 14, background: "var(--bg-primary)", borderRadius: 4, border: "1px solid var(--border-color)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{module.name}</span>
        <span className={`badge badge-${module.impact}`}>{module.impact}</span>
      </div>
      {module.description && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{module.description}</div>
      )}
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><FileCode2 size={11} /> {module.filesChanged} files</span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Pencil size={11} /> {module.linesChanged} lines</span>
      </div>
      <div className="progress-bar" style={{ marginTop: 8 }}>
        <div className="progress-bar-fill" style={{ width: `${module.impact === "high" ? 85 : module.impact === "medium" ? 55 : 25}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { dashboard, dashboardLoading, loadDashboard, refreshDashboard } = useAppStore();

  useEffect(() => {
    // Only fetch if no data yet (prevents re-running AI pipeline on tab switches)
    if (!dashboard && !dashboardLoading) {
      loadDashboard();
    }
  }, [dashboard, dashboardLoading, loadDashboard]);

  if (dashboardLoading || !dashboard) {
    return (
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
          <div style={{ marginBottom: 24 }}>
            <div className="skeleton" style={{ width: 200, height: 24, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 150, height: 14 }} />
          </div>
          <div style={{ padding: 40, textAlign: "center" }}>
            <Loader2 size={24} color="var(--text-muted)" className="animate-spin" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Crawling website and running tests...</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>This may take 10-20 seconds</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 20 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        </main>
      </div>
    );
  }

  const { riskOverview, testMetrics, impactedModules } = dashboard;
  const passRate = testMetrics.totalGenerated > 0 ? Math.round((testMetrics.byStatus.passed / testMetrics.totalGenerated) * 100) : 0;

  // ─── Unconfigured State ─────────────────────────────────────────────────────
  if (dashboard.unconfigured) {
    return (
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Release Dashboard</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Configure your project to get started
            </p>
          </div>

          <ProjectConfigPanel />

          {/* Welcome / Setup prompt */}
          <div className="glass-card" style={{ padding: 40, textAlign: "center", marginBottom: 20 }}>
            <Globe size={36} color="var(--accent-blue)" style={{ margin: "0 auto 16px", opacity: 0.7 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Welcome to AI Tester Agent</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.6 }}>
              Enter your <strong>project name</strong> and <strong>website URL</strong> above, then click <strong>Save &amp; Connect</strong> to run the AI-powered test pipeline. Optionally add a GitHub repository for code intelligence features.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <FlaskConical size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tests Executed</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-muted)" }}>0</div>
              </div>
              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <CheckCircle2 size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tests Passed</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-muted)" }}>0</div>
              </div>
              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <XCircle size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tests Failed</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-muted)" }}>0</div>
              </div>
              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Zap size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Pass Rate</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-muted)" }}>0%</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
        {/* Header */}
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Release Dashboard</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              {dashboard.project?.name} &middot; Last updated {new Date(dashboard.lastUpdated).toLocaleTimeString()}
            </p>
          </div>
          <div>
            <button
              className="btn-primary"
              onClick={() => refreshDashboard()}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Zap size={13} /> Re-run After Fix
            </button>
          </div>
        </div>

        {/* Delta Card (Feature 2) */}
        {dashboard.delta?.hasDelta && (
          <div className="glass-card animated-pulse" style={{ padding: "16px 20px", marginBottom: 20, background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-blue)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <TrendingDown size={14} /> Risk Improved
                </h3>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Compared to the previous run before fixes
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Risk Score</div>
                  <div style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ color: "var(--text-muted)", textDecoration: "line-through", fontSize: 14 }}>{dashboard.delta.previousScore}</span>
                    <span style={{ color: "var(--accent-green)" }}>{dashboard.delta.currentScore}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Tests Passed</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: dashboard.delta.passedChange > 0 ? "var(--status-green)" : "var(--text-primary)" }}>
                    {dashboard.delta.passedChange > 0 ? "+" : ""}{dashboard.delta.passedChange}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ProjectConfigPanel />

        {/* Deployment Status */}
        <div className="glass-card" style={{
          padding: "14px 20px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderColor: riskOverview.deployment === "blocked" ? "rgba(239 68 68 / 0.3)" : "rgba(34 197 94 / 0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {riskOverview.deployment === "blocked"
              ? <ShieldAlert size={20} color="var(--accent-red)" />
              : <ShieldCheck size={20} color="var(--accent-green)" />
            }
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                Deployment {riskOverview.deployment === "blocked" ? "BLOCKED" : "APPROVED"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>CI/CD Gatekeeper Decision</div>
            </div>
          </div>
          <span className={`badge badge-${riskOverview.deployment === "blocked" ? "blocked" : "approved"}`}>
            {riskOverview.deployment?.toUpperCase()}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          <StatsCard icon={FlaskConical} label="Tests Executed" value={testMetrics.totalGenerated} sub={`${testMetrics.coverage.functional || 0} frontend, ${testMetrics.coverage.security || 0} security, ${testMetrics.coverage.accessibility || 0} a11y, ${testMetrics.coverage.performance || 0} perf`} color="var(--accent-blue)" />
          <StatsCard icon={CheckCircle2} label="Tests Passed" value={testMetrics.byStatus.passed} sub={`${passRate}% pass rate`} color="var(--accent-green)" />
          <StatsCard icon={XCircle} label="Tests Failed" value={testMetrics.byStatus.failed} color="var(--accent-red)" />
          <StatsCard icon={Zap} label="Pass Rate" value={`${passRate}%`} sub={dashboard.pipelineDuration ? `Pipeline: ${dashboard.pipelineDuration}` : ""} color={passRate >= 80 ? "var(--accent-green)" : passRate >= 60 ? "var(--accent-amber)" : "var(--accent-red)"} />
        </div>

        {/* Risk + Modules */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Release Risk Score</h2>
            <RiskBar score={riskOverview.score} level={riskOverview.level} />
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 14, lineHeight: 1.6 }}>
              {riskOverview.explanation}
            </p>
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Impacted Modules</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {impactedModules?.map((mod: { name: string; impact: string; filesChanged: number; linesChanged: number; description?: string }, i: number) => (
                <ModuleCard key={i} module={mod} />
              ))}
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Risk Factor Breakdown</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {riskOverview.factors?.map((factor: { name: string; score: number; description: string; weight: number }, i: number) => (
              <div key={i} className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{factor.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(factor.weight * 100)}%</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 6 }}>
                  <div className="progress-bar-fill" style={{
                    width: `${factor.score}%`,
                    background: factor.score >= 70 ? "var(--accent-red)" : factor.score >= 40 ? "var(--accent-amber)" : "var(--accent-green)",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{factor.description}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{factor.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Recommendations</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {riskOverview.recommendations?.map((rec: string, i: number) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "var(--bg-primary)",
                borderRadius: 4, border: "1px solid var(--border-color)",
                fontSize: 12, color: "var(--text-secondary)",
              }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
