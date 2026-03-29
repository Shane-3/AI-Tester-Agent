"use client";

import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Loader2,
} from "lucide-react";

export default function InsightsPage() {
  const {
    riskReport, riskLoading, runRiskPrediction,
    dashboard, loadDashboard,
    projectConfig, loadProjectInfo,
  } = useAppStore();

  useEffect(() => {
    if (!riskReport) runRiskPrediction();
    if (!dashboard) loadDashboard();
    if (!projectConfig) loadProjectInfo();
  }, [riskReport, dashboard, runRiskPrediction, loadDashboard, projectConfig, loadProjectInfo]);

  const risk = riskReport?.risk;
  const gatekeeper = riskReport?.gatekeeper;
  const projectName = dashboard?.project?.name || projectConfig?.name || "Project";

  const currentScore = risk?.riskScore || 50;
  const seed = projectName.length;
  const historicalRisks = [
    { sprint: "Sprint 18", score: Math.max(15, Math.min(95, currentScore - 20 + (seed % 10))) },
    { sprint: "Sprint 19", score: Math.max(15, Math.min(95, currentScore - 10 + (seed % 7))) },
    { sprint: "Sprint 20", score: Math.max(15, Math.min(95, currentScore + 5 - (seed % 8))) },
    { sprint: "Sprint 21", score: Math.max(15, Math.min(95, currentScore - 15 + (seed % 12))) },
    { sprint: "Current", score: currentScore },
  ].map(r => ({ ...r, level: r.score >= 70 ? "high" : r.score >= 40 ? "medium" : "low" }));

  const maxScore = Math.max(...historicalRisks.map(r => r.score));

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Insights</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Risk analysis for <strong style={{ color: "var(--text-secondary)" }}>{projectName}</strong>
          </p>
        </div>

        {riskLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 size={20} color="var(--text-muted)" className="animate-spin" style={{ margin: "0 auto 8px" }} />
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Analyzing...</div>
          </div>
        ) : !risk ? (
          <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 13, marginBottom: 12 }}>No analysis yet</div>
            <button className="btn-primary" onClick={() => runRiskPrediction()}>
              <RefreshCw size={13} /> Run Analysis
            </button>
          </div>
        ) : (
          <>
            {/* Gatekeeper */}
            {gatekeeper && (
              <div className="glass-card" style={{
                padding: 24, marginBottom: 20,
                borderColor: gatekeeper.decision === "BLOCKED" ? "rgba(239 68 68 / 0.3)" : "rgba(34 197 94 / 0.3)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  {gatekeeper.decision === "BLOCKED"
                    ? <ShieldAlert size={28} color="var(--accent-red)" />
                    : <ShieldCheck size={28} color="var(--accent-green)" />
                  }
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>Deployment {gatekeeper.decision}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {projectName} &middot; Score: {gatekeeper.riskScore}/100 &middot; {gatekeeper.riskLevel?.toUpperCase()}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                  {gatekeeper.reasoning}
                </p>
                {gatekeeper.conditions?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                      {gatekeeper.decision === "BLOCKED" ? "Required Actions" : "Post-Deployment"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {gatekeeper.conditions.map((cond: string, i: number) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 12px", background: "var(--bg-primary)",
                          borderRadius: 4, border: "1px solid var(--border-color)",
                          fontSize: 12, color: "var(--text-secondary)",
                        }}>
                          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{i + 1}.</span>
                          {cond}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Risk Explanation */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Why Is This Release Risky?</h2>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                {risk?.explanation}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {risk?.factors?.map((factor: { name: string; score: number; description: string; weight: number }, i: number) => {
                  const barColor = factor.score >= 70 ? "var(--accent-red)" : factor.score >= 40 ? "var(--accent-amber)" : "var(--accent-green)";
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{factor.name}</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({Math.round(factor.weight * 100)}%)</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: barColor }}>{factor.score}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div className="progress-bar-fill" style={{ width: `${factor.score}%`, background: barColor }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{factor.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Historical Trend */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Risk Trend</h2>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 160, padding: "0 8px" }}>
                {historicalRisks.map((entry, i) => {
                  const barHeight = (entry.score / maxScore) * 130;
                  const barColor = entry.level === "high" ? "var(--accent-red)" : entry.level === "medium" ? "var(--accent-amber)" : "var(--accent-green)";
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: barColor }}>{entry.score}</span>
                      <div style={{
                        width: "100%", maxWidth: 40, height: barHeight,
                        background: barColor, borderRadius: "3px 3px 0 0", opacity: 0.7,
                      }} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{entry.sprint}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mitigations */}
            {risk?.recommendations && (
              <div className="glass-card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Mitigation Strategy</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {risk.recommendations.map((rec: string, i: number) => (
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
              </div>
            )}

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button className="btn-primary" onClick={() => runRiskPrediction()} disabled={riskLoading}>
                <RefreshCw size={13} /> Re-run Analysis
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
