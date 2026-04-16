"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Zap,
  BarChart3,
  Timer,
  Gauge,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Activity,
  Award,
  ArrowRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
  failCount: number;
  totalTests: number;
  severity: string;
  issues: string[];
}

interface DetailedRecommendation {
  text: string;
  priority: string;
  category: string;
  effort: string;
}

interface TrendEntry {
  label: string;
  score: number;
  level: string;
  timestamp: string;
}

interface TrendData {
  entries: TrendEntry[];
  direction: string;
  avgScore: number;
  minScore: number;
  maxScore: number;
  totalRuns: number;
}

interface CategoryBreakdown {
  name: string;
  passed: number;
  failed: number;
  total: number;
  passRate: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityColor(severity: string) {
  switch (severity) {
    case "critical": return "var(--accent-red)";
    case "high": return "#f97316";
    case "medium": return "var(--accent-amber)";
    case "low": return "var(--accent-green)";
    default: return "var(--text-muted)";
  }
}

function levelColor(level: string) {
  switch (level) {
    case "high": return "var(--accent-red)";
    case "medium": return "var(--accent-amber)";
    case "low": return "var(--accent-green)";
    default: return "var(--text-muted)";
  }
}

function priorityBadge(priority: string) {
  const colors: Record<string, string> = {
    critical: "rgba(239 68 68 / 0.15)",
    high: "rgba(249 115 22 / 0.15)",
    medium: "rgba(234 179 8 / 0.15)",
    low: "rgba(34 197 94 / 0.15)",
  };
  const textColors: Record<string, string> = {
    critical: "var(--accent-red)",
    high: "#f97316",
    medium: "var(--accent-amber)",
    low: "var(--accent-green)",
  };
  return { bg: colors[priority] || colors.medium, color: textColors[priority] || textColors.medium };
}

function effortLabel(effort: string) {
  return effort === "low" ? "Quick fix" : effort === "high" ? "Major effort" : "Moderate effort";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const {
    riskReport, riskLoading, runRiskPrediction,
    dashboard, loadDashboard,
    projectConfig, loadProjectInfo,
    metrics, loadMetrics, submitFeedback,
  } = useAppStore();

  const [expandedFactors, setExpandedFactors] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [feedbackResult, setFeedbackResult] = useState<string | null>(null);

  useEffect(() => {
    if (!riskReport) runRiskPrediction();
    if (!dashboard) loadDashboard();
    if (!projectConfig) loadProjectInfo();
    if (!metrics) loadMetrics();
  }, [riskReport, dashboard, runRiskPrediction, loadDashboard, projectConfig, loadProjectInfo, metrics, loadMetrics]);

  const handleFeedback = async (outcome: 'smooth' | 'minor' | 'major') => {
    setFeedbackSent(outcome);
    const predictionId = dashboard?.predictionId || 'latest';
    const result = await submitFeedback(predictionId, outcome);
    if (result) {
      setFeedbackResult(result.correct ? 'Prediction was correct ✓' : 'Prediction was incorrect ✗');
    }
  };

  const risk = riskReport?.risk;
  const gatekeeper = riskReport?.gatekeeper;
  const trend: TrendData | null = riskReport?.trend || null;
  const testSummary = riskReport?.testSummary;
  const projectName = dashboard?.project?.name || projectConfig?.name || "Project";

  const factors: RiskFactor[] = risk?.factors || [];
  const detailedRecs: DetailedRecommendation[] = risk?.detailedRecommendations || [];
  const recommendations: string[] = risk?.recommendations || [];
  const categoryBreakdown: CategoryBreakdown[] = risk?.categoryBreakdown || [];

  const toggleFactor = (i: number) => {
    setExpandedFactors(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Release Insights</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Dynamic risk analysis for <strong style={{ color: "var(--text-secondary)" }}>{projectName}</strong>
              {risk?.source && <span style={{ marginLeft: 8, opacity: 0.6 }}>· Source: {risk.source}</span>}
              {trend && <span style={{ marginLeft: 8, opacity: 0.6 }}>· Run #{trend.totalRuns}</span>}
            </p>
          </div>
          <button className="btn-primary" onClick={() => runRiskPrediction()} disabled={riskLoading}
            style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={12} className={riskLoading ? "animate-spin" : ""} />
            {riskLoading ? "Analyzing..." : "Re-run Analysis"}
          </button>
        </div>

        {riskLoading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Loader2 size={24} color="var(--text-muted)" className="animate-spin" style={{ margin: "0 auto 12px" }} />
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Running crawl, tests, and risk analysis...</div>
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>This may take a moment</div>
          </div>
        ) : !risk ? (
          <div className="glass-card" style={{ padding: 50, textAlign: "center" }}>
            <BarChart3 size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, marginBottom: 4, fontWeight: 600 }}>No Analysis Yet</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Run a risk analysis to see detailed insights about your release</div>
            <button className="btn-primary" onClick={() => runRiskPrediction()}>
              <Zap size={13} /> Run Analysis
            </button>
          </div>
        ) : (
          <>
            {/* ─── Score Overview Cards ─── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {/* Risk Score */}
              <div className="glass-card" style={{ padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Risk Score</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: levelColor(risk.riskLevel), lineHeight: 1 }}>{risk.riskScore}</div>
                <div style={{ fontSize: 11, color: levelColor(risk.riskLevel), fontWeight: 600, marginTop: 4, textTransform: "uppercase" }}>{risk.riskLevel} risk</div>
              </div>

              {/* Pass Rate */}
              {testSummary && (
                <div className="glass-card" style={{ padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pass Rate</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: testSummary.passRate >= 80 ? "var(--accent-green)" : testSummary.passRate >= 60 ? "var(--accent-amber)" : "var(--accent-red)", lineHeight: 1 }}>
                    {testSummary.passRate}%
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{testSummary.passed}/{testSummary.total} tests</div>
                </div>
              )}

              {/* Trend */}
              {trend && (
                <div className="glass-card" style={{ padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Trend</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {trend.direction === "improving" && <TrendingDown size={24} color="var(--accent-green)" />}
                    {trend.direction === "worsening" && <TrendingUp size={24} color="var(--accent-red)" />}
                    {trend.direction === "stable" && <Minus size={24} color="var(--accent-amber)" />}
                    <span style={{
                      fontSize: 18, fontWeight: 700,
                      color: trend.direction === "improving" ? "var(--accent-green)" : trend.direction === "worsening" ? "var(--accent-red)" : "var(--accent-amber)",
                    }}>
                      {trend.direction === "improving" ? "↓ Improving" : trend.direction === "worsening" ? "↑ Worsening" : "→ Stable"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Avg: {trend.avgScore} · Range: {trend.minScore}–{trend.maxScore}</div>
                </div>
              )}

              {/* Issues */}
              <div className="glass-card" style={{ padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Issues Found</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  {factors.reduce((s, f) => s + f.failCount, 0)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  across {factors.length} categories
                </div>
              </div>
            </div>

            {/* ─── Gatekeeper Decision ─── */}
            {gatekeeper && (
              <div className="glass-card" style={{
                padding: 20, marginBottom: 20,
                borderColor: gatekeeper.decision === "BLOCKED" ? "rgba(239 68 68 / 0.3)" : "rgba(34 197 94 / 0.3)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  {gatekeeper.decision === "BLOCKED"
                    ? <ShieldAlert size={26} color="var(--accent-red)" />
                    : <ShieldCheck size={26} color="var(--accent-green)" />
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>Deployment {gatekeeper.decision}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {projectName} · Score: {gatekeeper.riskScore}/100 · {gatekeeper.riskLevel?.toUpperCase()}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 14 }}>
                  {gatekeeper.reasoning}
                </p>
                {gatekeeper.conditions?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      {gatekeeper.decision === "BLOCKED"
                        ? <><AlertTriangle size={13} color="var(--accent-red)" /> Required Actions ({gatekeeper.conditions.length})</>
                        : <><CheckCircle2 size={13} color="var(--accent-green)" /> Post-Deployment Checklist ({gatekeeper.conditions.length})</>
                      }
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {gatekeeper.conditions.map((cond: string, i: number) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "flex-start", gap: 8,
                          padding: "8px 12px", background: "var(--bg-primary)",
                          borderRadius: 4, border: "1px solid var(--border-color)",
                          fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5,
                        }}>
                          <span style={{
                            color: gatekeeper.decision === "BLOCKED" ? "var(--accent-red)" : "var(--accent-green)",
                            fontWeight: 600, flexShrink: 0, marginTop: 1,
                          }}>
                            {i + 1}.
                          </span>
                          {cond}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Risk Factors (Detailed) ─── */}
            <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600 }}>Risk Breakdown by Category</h2>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{factors.length} categories analyzed</span>
              </div>

              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                {risk?.explanation}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {factors.map((factor: RiskFactor, i: number) => {
                  const isExpanded = expandedFactors.has(i);
                  const barColor = severityColor(factor.severity);
                  return (
                    <div key={i} style={{
                      border: "1px solid var(--border-color)", borderRadius: 6,
                      overflow: "hidden", background: "var(--bg-primary)",
                    }}>
                      {/* Factor Header */}
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                          cursor: factor.issues?.length > 0 ? "pointer" : "default",
                        }}
                        onClick={() => factor.issues?.length > 0 && toggleFactor(i)}
                      >
                        {factor.issues?.length > 0 && (
                          isExpanded
                            ? <ChevronDown size={14} color="var(--text-muted)" />
                            : <ChevronRight size={14} color="var(--text-muted)" />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{factor.name}</span>
                              <span style={{
                                fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                                background: severityColor(factor.severity) + "22",
                                color: severityColor(factor.severity),
                                textTransform: "uppercase",
                              }}>
                                {factor.severity}
                              </span>
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                Weight: {Math.round(factor.weight * 100)}%
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                {factor.failCount}/{factor.totalTests} failed
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: barColor }}>{factor.score}%</span>
                            </div>
                          </div>
                          <div className="progress-bar" style={{ height: 5 }}>
                            <div className="progress-bar-fill" style={{
                              width: `${factor.score}%`, background: barColor,
                              transition: "width 0.6s ease",
                            }} />
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                            {factor.description}
                          </div>
                        </div>
                      </div>

                      {/* Expanded: show individual issues */}
                      {isExpanded && factor.issues?.length > 0 && (
                        <div style={{
                          borderTop: "1px solid var(--border-color)",
                          padding: "8px 14px 10px",
                          background: "rgba(0,0,0,0.08)",
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                            Individual Issues ({factor.issues.length})
                          </div>
                          {factor.issues.map((issue, j) => (
                            <div key={j} style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "4px 0", fontSize: 11, color: "var(--text-secondary)",
                            }}>
                              <span style={{ color: barColor, flexShrink: 0 }}>●</span>
                              {issue}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Category Breakdown ─── */}
            {categoryBreakdown.length > 0 && (
              <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Test Results by Category</h2>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(categoryBreakdown.length, 4)}, 1fr)`, gap: 10 }}>
                  {categoryBreakdown.map((cat, i) => {
                    const isSelected = selectedCategory === cat.name;
                    return (
                      <div key={i}
                        onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                        style={{
                          padding: 14, borderRadius: 6,
                          background: isSelected ? "rgba(99, 102, 241, 0.08)" : "var(--bg-primary)",
                          border: `1px solid ${isSelected ? "rgba(99, 102, 241, 0.3)" : "var(--border-color)"}`,
                          cursor: "pointer", transition: "all 0.2s",
                          textAlign: "center",
                        }}>
                        {/* Mini donut-like visual */}
                        <div style={{ position: "relative", width: 48, height: 48, margin: "0 auto 8px" }}>
                          <svg width="48" height="48" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                            <circle cx="24" cy="24" r="20" fill="none"
                              stroke={cat.passRate >= 80 ? "var(--accent-green)" : cat.passRate >= 50 ? "var(--accent-amber)" : "var(--accent-red)"}
                              strokeWidth="4"
                              strokeDasharray={`${(cat.passRate / 100) * 125.6} 125.6`}
                              strokeLinecap="round"
                              transform="rotate(-90 24 24)"
                            />
                          </svg>
                          <div style={{
                            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700,
                            color: cat.passRate >= 80 ? "var(--accent-green)" : cat.passRate >= 50 ? "var(--accent-amber)" : "var(--accent-red)",
                          }}>
                            {cat.passRate}%
                          </div>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{cat.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          <span style={{ color: "var(--accent-green)" }}>{cat.passed}✓</span>
                          {" · "}
                          <span style={{ color: cat.failed > 0 ? "var(--accent-red)" : "var(--text-muted)" }}>{cat.failed}✗</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expanded category detail */}
                {selectedCategory && (() => {
                  const factor = factors.find(f => f.name === selectedCategory);
                  if (!factor || !factor.issues?.length) return null;
                  return (
                    <div style={{
                      marginTop: 12, padding: 12, background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)", borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                        {selectedCategory} — Failed Checks
                      </div>
                      {factor.issues.map((issue, j) => (
                        <div key={j} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "3px 0", fontSize: 11, color: "var(--text-secondary)",
                        }}>
                          <AlertTriangle size={11} color="var(--accent-red)" style={{ flexShrink: 0 }} />
                          {issue}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ─── Risk Trend Chart ─── */}
            {trend && trend.entries.length > 0 && (
              <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600 }}>Risk Score Trend</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {trend.direction === "improving" && <TrendingDown size={14} color="var(--accent-green)" />}
                    {trend.direction === "worsening" && <TrendingUp size={14} color="var(--accent-red)" />}
                    {trend.direction === "stable" && <Minus size={14} color="var(--accent-amber)" />}
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: trend.direction === "improving" ? "var(--accent-green)" : trend.direction === "worsening" ? "var(--accent-red)" : "var(--accent-amber)",
                    }}>
                      {trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)} trend over {trend.totalRuns} run{trend.totalRuns > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Bar chart */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, padding: "0 4px" }}>
                  {trend.entries.map((entry, i) => {
                    const barHeight = Math.max(8, (entry.score / Math.max(trend.maxScore, 1)) * 130);
                    const barColor = levelColor(entry.level);
                    const isCurrent = i === trend.entries.length - 1;
                    return (
                      <div key={i} style={{
                        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                        opacity: isCurrent ? 1 : 0.7,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: isCurrent ? 700 : 500, color: barColor }}>{entry.score}</span>
                        <div style={{
                          width: "100%", maxWidth: 44, height: barHeight,
                          background: isCurrent
                            ? `linear-gradient(180deg, ${barColor}, ${barColor}88)`
                            : barColor,
                          borderRadius: "4px 4px 0 0",
                          border: isCurrent ? `2px solid ${barColor}` : "none",
                          boxShadow: isCurrent ? `0 0 8px ${barColor}44` : "none",
                          transition: "height 0.4s ease",
                        }} />
                        <span style={{
                          fontSize: 9, color: "var(--text-muted)",
                          fontWeight: isCurrent ? 700 : 400,
                          textAlign: "center",
                          maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {entry.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, fontSize: 10, color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent-green)" }} /> Low (0-39)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent-amber)" }} /> Medium (40-69)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent-red)" }} /> High (70-100)
                  </span>
                </div>
              </div>
            )}

            {/* ─── Mitigation Strategy ─── */}
            {(detailedRecs.length > 0 || recommendations.length > 0) && (
              <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600 }}>Mitigation Strategy</h2>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {detailedRecs.length || recommendations.length} recommendations
                  </span>
                </div>

                {detailedRecs.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {detailedRecs.map((rec, i) => {
                      const badge = priorityBadge(rec.priority);
                      return (
                        <div key={i} style={{
                          padding: "10px 14px", background: "var(--bg-primary)",
                          borderRadius: 6, border: "1px solid var(--border-color)",
                          display: "flex", alignItems: "flex-start", gap: 10,
                        }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: badge.bg, color: badge.color,
                            fontSize: 11, fontWeight: 700, marginTop: 1,
                          }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 4 }}>
                              {rec.text}
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{
                                fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                                background: badge.bg, color: badge.color,
                                textTransform: "uppercase",
                              }}>
                                {rec.priority}
                              </span>
                              <span style={{
                                fontSize: 9, padding: "2px 6px", borderRadius: 3,
                                background: "rgba(99, 102, 241, 0.1)", color: "rgb(99, 102, 241)",
                              }}>
                                {rec.category}
                              </span>
                              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                                {effortLabel(rec.effort)}
                              </span>
                            </div>
                          </div>
                          <ArrowRight size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Fallback to simple recommendations
                  <div style={{ display: "grid", gridTemplateColumns: recommendations.length > 4 ? "1fr 1fr" : "1fr", gap: 8 }}>
                    {recommendations.map((rec: string, i: number) => (
                      <div key={i} style={{
                        padding: "10px 14px", background: "var(--bg-primary)",
                        borderRadius: 4, border: "1px solid var(--border-color)",
                        fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5,
                        display: "flex", gap: 8,
                      }}>
                        <span style={{ color: "var(--text-muted)", fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
                        {rec}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Test Summary ─── */}
            {testSummary && (
              <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Test Execution Summary</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                  {[
                    { label: "Total", value: testSummary.total, color: "var(--text-primary)" },
                    { label: "Passed", value: testSummary.passed, color: "var(--accent-green)" },
                    { label: "Failed", value: testSummary.failed, color: "var(--accent-red)" },
                    { label: "Critical", value: testSummary.criticalFails, color: testSummary.criticalFails > 0 ? "var(--accent-red)" : "var(--accent-green)" },
                    { label: "High", value: testSummary.highFails, color: testSummary.highFails > 0 ? "#f97316" : "var(--accent-green)" },
                  ].map((item, i) => (
                    <div key={i} style={{
                      textAlign: "center", padding: 10,
                      background: "var(--bg-primary)", borderRadius: 6,
                      border: "1px solid var(--border-color)",
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Pass rate bar */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Overall Pass Rate</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: testSummary.passRate >= 80 ? "var(--accent-green)" : "var(--accent-amber)" }}>
                      {testSummary.passRate}%
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: 8 }}>
                    <div className="progress-bar-fill" style={{
                      width: `${testSummary.passRate}%`,
                      background: testSummary.passRate >= 80
                        ? "linear-gradient(90deg, var(--accent-green), #22c55e)"
                        : testSummary.passRate >= 60
                          ? "linear-gradient(90deg, var(--accent-amber), #eab308)"
                          : "linear-gradient(90deg, var(--accent-red), #ef4444)",
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Sprint Velocity Improvement ─── */}
            {(metrics?.sprintVelocity || dashboard?.sprintVelocity) && (() => {
              const sv = metrics?.sprintVelocity || {};
              const latestRun = dashboard?.sprintVelocity || sv.runs?.[sv.runs?.length - 1];
              if (!latestRun && !sv.totalRuns) return null;
              return (
                <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      <Timer size={16} color="rgb(99, 102, 241)" /> Sprint Velocity Improvement
                    </h2>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {sv.totalRuns || 1} run{(sv.totalRuns || 1) > 1 ? 's' : ''} tracked
                    </span>
                  </div>

                  {/* Velocity metric cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                    <div style={{ textAlign: "center", padding: 14, background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-green)", lineHeight: 1 }}>
                        {latestRun?.velocityImprovement || sv.averageImprovement || 0}%
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Faster vs Manual</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 14, background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "rgb(99, 102, 241)", lineHeight: 1 }}>
                        {latestRun?.hoursSaved || sv.averageHoursSaved || 0}h
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Hours Saved</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 14, background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-amber)", lineHeight: 1 }}>
                        {latestRun?.speedMultiplier || 0}x
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Speed Multiplier</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 14, background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                        {latestRun?.totalTests || sv.totalTestsRun || 0}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Tests Automated</div>
                    </div>
                  </div>

                  {/* Time comparison bar */}
                  <div style={{ background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border-color)", padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> Manual Testing (estimated)
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-red)" }}>
                        {latestRun?.manualEstimateFormatted || 'N/A'}
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: 8, marginBottom: 10 }}>
                      <div className="progress-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, var(--accent-red), #ef4444)' }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Zap size={12} /> AI Pipeline (actual)
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-green)" }}>
                        {latestRun?.pipelineDurationFormatted || 'N/A'}
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: 8 }}>
                      <div className="progress-bar-fill" style={{
                        width: `${Math.max(2, 100 - (latestRun?.velocityImprovement || 0))}%`,
                        background: 'linear-gradient(90deg, var(--accent-green), #22c55e)',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>

                  {/* Test breakdown */}
                  {latestRun?.testBreakdown && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {Object.entries(latestRun.testBreakdown as Record<string, number>).filter(([, v]) => v > 0).map(([key, val]) => (
                        <span key={key} style={{
                          fontSize: 10, padding: "3px 8px", borderRadius: 4,
                          background: "rgba(99, 102, 241, 0.08)", color: "rgb(139, 142, 241)",
                          border: "1px solid rgba(99, 102, 241, 0.15)",
                        }}>
                          {key}: {val as number}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─── Risk Score Accuracy ─── */}
            {metrics?.riskAccuracy && (() => {
              const acc = metrics.riskAccuracy;
              return (
                <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      <Gauge size={16} color="var(--accent-amber)" /> Risk Score Accuracy
                    </h2>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {acc.total} predictions rated · {acc.pending} pending
                    </span>
                  </div>

                  {/* Accuracy overview cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                    <div style={{ textAlign: "center", padding: 14, background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
                      <div style={{
                        fontSize: 32, fontWeight: 800, lineHeight: 1,
                        color: acc.accuracy >= 80 ? "var(--accent-green)" : acc.accuracy >= 60 ? "var(--accent-amber)" : "var(--accent-red)",
                      }}>
                        {acc.accuracy}%
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Overall Accuracy</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 14, background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent-green)", lineHeight: 1 }}>
                        {acc.correct}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Correct Predictions</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 14, background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: acc.total - acc.correct > 0 ? "var(--accent-red)" : "var(--text-muted)", lineHeight: 1 }}>
                        {acc.total - acc.correct}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Incorrect Predictions</div>
                    </div>
                  </div>

                  {/* Calibration by risk level */}
                  {acc.calibration && Object.keys(acc.calibration).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <Activity size={13} color="var(--text-muted)" /> Calibration by Risk Level
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(Object.keys(acc.calibration).length, 3)}, 1fr)`, gap: 8 }}>
                        {Object.entries(acc.calibration as Record<string, {total: number; correct: number; accuracy: number; incidentRate: number}>).map(([level, data]) => (
                          <div key={level} style={{
                            padding: 12, background: "var(--bg-primary)", borderRadius: 6,
                            border: "1px solid var(--border-color)",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                                color: level === 'high' ? 'var(--accent-red)' : level === 'medium' ? 'var(--accent-amber)' : 'var(--accent-green)',
                              }}>
                                {level} Risk
                              </span>
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{data.total} predictions</span>
                            </div>
                            <div style={{ display: "flex", gap: 12 }}>
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: data.accuracy >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                                  {data.accuracy}%
                                </div>
                                <div style={{ fontSize: 9, color: "var(--text-muted)" }}>accuracy</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>
                                  {data.incidentRate}%
                                </div>
                                <div style={{ fontSize: 9, color: "var(--text-muted)" }}>incident rate</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent predictions */}
                  {acc.recentPredictions?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Recent Predictions</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {acc.recentPredictions.slice(0, 5).map((pred: { id: string; riskScore: number; decision: string; outcome: string | null; correct: boolean | null; timestamp: string }, i: number) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                            background: "var(--bg-primary)", borderRadius: 4,
                            border: "1px solid var(--border-color)", fontSize: 11,
                          }}>
                            <span style={{ fontWeight: 600, color: "var(--text-muted)", width: 60, flexShrink: 0 }}>
                              {pred.id}
                            </span>
                            <span style={{
                              width: 40, textAlign: "center", fontWeight: 700,
                              color: pred.riskScore >= 60 ? 'var(--accent-red)' : pred.riskScore >= 40 ? 'var(--accent-amber)' : 'var(--accent-green)',
                            }}>
                              {pred.riskScore}
                            </span>
                            <span style={{
                              fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 600,
                              background: pred.decision === 'BLOCKED' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                              color: pred.decision === 'BLOCKED' ? 'var(--accent-red)' : 'var(--accent-green)',
                            }}>
                              {pred.decision}
                            </span>
                            <span style={{ flex: 1, color: "var(--text-muted)" }}>
                              {pred.outcome ? `→ ${pred.outcome}` : '⏳ awaiting feedback'}
                            </span>
                            {pred.correct !== null && (
                              pred.correct
                                ? <CheckCircle2 size={14} color="var(--accent-green)" />
                                : <AlertTriangle size={14} color="var(--accent-red)" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deployment feedback widget */}
                  <div style={{
                    padding: 14, background: "rgba(99, 102, 241, 0.05)",
                    borderRadius: 6, border: "1px solid rgba(99, 102, 241, 0.15)",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Award size={14} color="rgb(99, 102, 241)" />
                      How did the last deployment go?
                    </div>
                    {feedbackSent ? (
                      <div style={{ fontSize: 12, color: "var(--accent-green)", display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={14} /> Feedback recorded: &quot;{feedbackSent}&quot;. {feedbackResult}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleFeedback('smooth')} style={{
                          padding: "6px 14px", fontSize: 11, borderRadius: 4, border: "1px solid rgba(34,197,94,0.3)",
                          background: "rgba(34,197,94,0.08)", color: "var(--accent-green)", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4, fontWeight: 600,
                        }}>
                          <ThumbsUp size={12} /> Smooth
                        </button>
                        <button onClick={() => handleFeedback('minor')} style={{
                          padding: "6px 14px", fontSize: 11, borderRadius: 4, border: "1px solid rgba(234,179,8,0.3)",
                          background: "rgba(234,179,8,0.08)", color: "var(--accent-amber)", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4, fontWeight: 600,
                        }}>
                          <Minus size={12} /> Minor Issues
                        </button>
                        <button onClick={() => handleFeedback('major')} style={{
                          padding: "6px 14px", fontSize: 11, borderRadius: 4, border: "1px solid rgba(239,68,68,0.3)",
                          background: "rgba(239,68,68,0.08)", color: "var(--accent-red)", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4, fontWeight: 600,
                        }}>
                          <ThumbsDown size={12} /> Major Issues
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ─── Agents Used ─── */}
            {riskReport?.agents && (
              <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>AI Agents Involved</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {riskReport.agents.map((agent: string, i: number) => (
                    <span key={i} style={{
                      fontSize: 10, padding: "4px 10px", borderRadius: 12,
                      background: "rgba(99, 102, 241, 0.1)", color: "rgb(139, 142, 241)",
                      border: "1px solid rgba(99, 102, 241, 0.2)",
                    }}>
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
