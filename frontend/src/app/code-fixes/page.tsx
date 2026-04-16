"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import {
  Code2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldAlert,
  TrendingDown,
  Shield,
} from "lucide-react";
import Link from "next/link";

export default function CodeFixesPage() {
  const {
    codeFixes,
    codeFixesLoading,
    runCodeAnalysis,
    projectConfig,
    loadProjectInfo,
  } = useAppStore();

  const [expandedFix, setExpandedFix] = useState<number | null>(null);
  const hasFetchedFixes = useRef(false);
  const hasFetchedProject = useRef(false);

  useEffect(() => {
    if (!hasFetchedProject.current && !projectConfig) {
      hasFetchedProject.current = true;
      loadProjectInfo();
    }
  }, [projectConfig, loadProjectInfo]);

  useEffect(() => {
    if (!hasFetchedFixes.current && !codeFixes && !codeFixesLoading) {
      hasFetchedFixes.current = true;
      runCodeAnalysis(projectConfig?.repoUrl || undefined);
    }
  }, [codeFixes, codeFixesLoading, runCodeAnalysis, projectConfig]);

  const fixes = codeFixes?.fixes || [];
  const meta = codeFixes?.meta || {};
  const riskProjection = codeFixes?.riskProjection || null;
  const projectName = projectConfig?.name || "Project";
  const hasRepoUrl = !!projectConfig?.repoUrl;

  if (!hasRepoUrl) {
    return (
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Code Intelligence</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Line-level fix suggestions powered by Gemini
            </p>
          </div>
          <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
            <ShieldAlert size={32} color="var(--accent-amber)" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>GitHub Repository Required</div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, maxWidth: 400, margin: "0 auto 16px" }}>
              To analyze source code and suggest fixes, the AI Tester Agent needs access to your GitHub repository.
            </p>
            <Link href="/">
              <button className="btn-primary">Go to Dashboard to Configure</button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Code Intelligence</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              AI-generated fix suggestions for <strong style={{ color: "var(--text-secondary)" }}>{projectName}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/">
              <button className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.9 }}>
                <RefreshCw size={13} /> Re-test Post Fix
              </button>
            </Link>
            <button
              className="btn-primary"
              onClick={() => runCodeAnalysis(projectConfig?.repoUrl || undefined, true)}
              disabled={codeFixesLoading}
            >
              <Code2 size={13} className={codeFixesLoading ? "animate-spin" : ""} />
              {codeFixesLoading ? "Analyzing..." : "Re-Analyze Code"}
            </button>
          </div>
        </div>

        {codeFixesLoading ? (
          <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
            <Loader2 size={28} color="var(--accent-blue)" className="animate-spin" style={{ margin: "0 auto 16px" }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Analyzing Repository Source Code</div>
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Fetching files from GitHub, correlating with test failures, and generating precise fixes...
            </div>
          </div>
        ) : fixes.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
            <FileCode size={24} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No Fix Suggestions Found</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              All tests may be passing, or the AI couldn't confidently trace failures to specific files.
            </p>
          </div>
        ) : (
          <>
            {/* Meta Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <div className="stat-card">
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Files Analyzed</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{meta.filesAnalyzed}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>From {meta.totalRepoFiles} total files</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Fixes Suggested</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-blue)" }}>{fixes.length}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Targeting {meta.failedTests} test failures</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>AI Engine</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 700, color: "var(--accent-violet)" }}>
                  <Code2 size={16} /> {codeFixes.source === "gemini" ? "Gemini Pro" : "Rule-based Fallback"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Analysis took {meta.pipelineDurationMs ? `${(meta.pipelineDurationMs / 1000).toFixed(1)}s` : "--"}</div>
              </div>
            </div>

            {/* Risk Projection Card */}
            {riskProjection && (
              <div className="glass-card" style={{
                padding: "16px 20px", marginBottom: 16,
                background: "rgba(34, 197, 94, 0.03)",
                border: "1px solid rgba(34, 197, 94, 0.15)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Shield size={16} color="var(--accent-blue)" />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Deployment Risk Projection</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>If all {fixes.length} fixes are applied</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {/* Current Risk */}
                  <div style={{ textAlign: "center", minWidth: 80 }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Current</div>
                    <div style={{
                      fontSize: 28, fontWeight: 800,
                      color: riskProjection.currentRiskScore >= 60 ? "var(--accent-red)" : riskProjection.currentRiskScore >= 30 ? "var(--accent-amber)" : "var(--accent-green)",
                    }}>
                      {riskProjection.currentRiskScore}%
                    </div>
                  </div>

                  {/* Arrow with reduction */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                      <div style={{ flex: 1, position: "relative" }}>
                        {/* Background bar */}
                        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          {/* Current risk fill */}
                          <div style={{
                            height: "100%", borderRadius: 4,
                            background: `linear-gradient(90deg, var(--accent-green) ${100 - riskProjection.currentRiskScore}%, var(--accent-red))`,
                            width: `${riskProjection.currentRiskScore}%`,
                            transition: "width 0.5s ease",
                          }} />
                        </div>
                        {/* Projected overlay */}
                        <div style={{
                          position: "absolute", top: 0, left: 0,
                          height: 8, borderRadius: 4,
                          background: "var(--accent-green)",
                          width: `${riskProjection.projectedRiskScore}%`,
                          opacity: 0.5,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <TrendingDown size={12} color="var(--accent-green)" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-green)" }}>
                        −{riskProjection.totalReduction}% risk reduction
                      </span>
                    </div>
                  </div>

                  {/* Projected Risk */}
                  <div style={{ textAlign: "center", minWidth: 80 }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>After Fix</div>
                    <div style={{
                      fontSize: 28, fontWeight: 800,
                      color: riskProjection.projectedRiskScore >= 60 ? "var(--accent-red)" : riskProjection.projectedRiskScore >= 30 ? "var(--accent-amber)" : "var(--accent-green)",
                    }}>
                      {riskProjection.projectedRiskScore}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* List of Fixes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {fixes.map((fix: any, index: number) => {
                const isExpanded = expandedFix === index;
                const severityColor =
                  fix.severity === "critical" ? "var(--status-red)" :
                  fix.severity === "high" ? "var(--status-amber)" :
                  "var(--accent-blue)";

                return (
                  <div key={index} className="glass-card" style={{ overflow: "hidden" }}>
                    {/* Header */}
                    <div
                      style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", background: isExpanded ? "rgba(255,255,255,0.02)" : "transparent" }}
                      onClick={() => setExpandedFix(isExpanded ? null : index)}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ marginTop: 2 }}>
                          <AlertTriangle size={18} color={severityColor} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {fix.file || "Project Architecture"}
                            {fix.line && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                                background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-blue)",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                                fontFamily: "monospace",
                              }}>
                                Line {fix.line}
                              </span>
                            )}
                            <span className={`badge`} style={{ borderColor: severityColor, color: severityColor }}>{fix.severity || "medium"}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                            {fix.problem}
                          </div>
                        </div>
                      </div>
                      <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Details */}
                    {isExpanded && (
                      <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border-subtle)" }}>
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 8 }}>
                            Suggested Code Fix
                            {fix.line && (
                              <span style={{
                                fontSize: 10, fontWeight: 600, color: "var(--accent-blue)",
                                textTransform: "none", letterSpacing: "normal",
                              }}>
                                — Update at line {fix.line} in {fix.file?.split("/").pop() || "file"}
                              </span>
                            )}
                          </div>
                          <div className="code-block" style={{ margin: 0, border: "1px solid var(--border-color)", background: "#0d1117" }}>
                            <pre style={{ margin: 0, padding: 16, fontSize: 13, lineHeight: 1.5, color: "#e6edf3", overflowX: "auto" }}>
                              <code>{fix.fix}</code>
                            </pre>
                          </div>
                        </div>

                        {/* Risk reduction per fix */}
                        {fix.riskReduction && (
                          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(34, 197, 94, 0.06)", borderRadius: 6, border: "1px solid rgba(34, 197, 94, 0.15)" }}>
                            <TrendingDown size={14} color="var(--accent-green)" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: "var(--text-primary)", marginBottom: 4 }}>
                                <strong style={{ color: "var(--accent-green)" }}>Risk Impact:</strong> Applying this fix reduces deployment risk by <strong style={{ color: "var(--accent-green)" }}>−{fix.riskReduction}%</strong>
                              </div>
                              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 2, background: "var(--accent-green)", width: `${Math.min(fix.riskReduction * 3, 100)}%`, transition: "width 0.3s" }} />
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center", padding: "10px 14px", background: "rgba(239, 68, 68, 0.05)", borderRadius: 6, border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                          <AlertTriangle size={14} color="var(--status-red)" />
                          <div style={{ fontSize: 12, color: "var(--text-primary)" }}>
                            <strong style={{ color: "var(--status-red)" }}>Impact if ignored:</strong> {fix.consequence}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
