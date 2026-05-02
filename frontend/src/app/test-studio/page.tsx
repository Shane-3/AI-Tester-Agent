"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import {
  Wrench,
  AlertTriangle,
  Globe,
  Monitor,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Shield,
  Gauge,
  Accessibility,
  Rocket,
} from "lucide-react";

type TestType = "all" | "functional" | "api" | "ui" | "security" | "performance" | "accessibility" | "deployment";
type StatusFilter = "all" | "passed" | "failed";

interface TestResult {
  id: string;
  title: string;
  type: string;
  priority: string;
  passed: boolean | null;
  expected: string;
  actual: string;
  explanation: string;
  duration: number;
  steps?: string[];
  code?: string;
  aiGenerated?: boolean;
  source?: string;
}

const typeConfig: Record<string, { color: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  functional: { color: "var(--accent-blue)", icon: Wrench },
  edge: { color: "var(--accent-amber)", icon: AlertTriangle },
  api: { color: "var(--accent-cyan)", icon: Globe },
  ui: { color: "var(--accent-violet)", icon: Monitor },
  security: { color: "var(--accent-red, #ef4444)", icon: Shield },
  performance: { color: "var(--accent-amber)", icon: Gauge },
  accessibility: { color: "var(--accent-green, #22c55e)", icon: Accessibility },
  deployment: { color: "var(--accent-cyan)", icon: Rocket },
};

export default function TestStudioPage() {
  const { generatedTests, testsLoading, runTestGeneration, projectConfig, loadProjectInfo, dashboard } = useAppStore();
  const [filter, setFilter] = useState<TestType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  useEffect(() => {
    // Load tests — the backend will return cached results from Dashboard pipeline instantly
    if (!generatedTests && !testsLoading) runTestGeneration();
    if (!projectConfig) loadProjectInfo();
  }, [generatedTests, testsLoading, runTestGeneration, projectConfig, loadProjectInfo]);

  const tests: TestResult[] = generatedTests?.generation?.tests || [];
  const typeFiltered = filter === "all" ? tests : tests.filter(t => t.type === filter);
  const filteredTests = statusFilter === "all" ? typeFiltered
    : statusFilter === "passed" ? typeFiltered.filter(t => t.passed === true)
    : typeFiltered.filter(t => t.passed === false || t.passed === null);
  const summary = generatedTests?.summary || null;
  const projectName = generatedTests?.generation?.projectContext?.name || dashboard?.project?.name || projectConfig?.name || "Project";
  const websiteUrl = generatedTests?.generation?.projectContext?.url || projectConfig?.websiteUrl || "";
  const aiTestCount = tests.filter(t => t.aiGenerated).length;

  const realTests = tests.filter(t => !t.aiGenerated);
  const passed = realTests.filter(t => t.passed).length;
  const failed = realTests.filter(t => !t.passed).length;
  const total = realTests.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const downloadTests = () => {
    const blob = new Blob([JSON.stringify(filteredTests, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-results-${projectName.replace(/\s+/g, "-")}-${filter}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Collect all unique test types for dynamic filter tabs
  const allTypes = [...new Set(tests.map(t => t.type))];
  const filterTabs: TestType[] = ["all", ...allTypes.filter(t => t !== "edge") as TestType[]];

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Test Studio</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Live test results for <strong style={{ color: "var(--text-secondary)" }}>{projectName}</strong>
            {websiteUrl && <> &middot; Target: <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-blue)" }}>{websiteUrl}</a></>}
          </p>
        </div>

        {/* Overall Result Banner */}
        {total > 0 && (
          <div style={{
            marginBottom: 16, padding: "16px 20px", borderRadius: 8,
            background: passRate >= 80
              ? "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))"
              : passRate >= 60
                ? "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.02))"
                : "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))",
            border: `1px solid ${passRate >= 80 ? "rgba(34,197,94,0.25)" : passRate >= 60 ? "rgba(234,179,8,0.25)" : "rgba(239,68,68,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {passRate >= 80
                ? <CheckCircle2 size={28} color="#22c55e" />
                : passRate >= 60
                  ? <AlertTriangle size={28} color="#eab308" />
                  : <XCircle size={28} color="#ef4444" />}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: passRate >= 80 ? "#22c55e" : passRate >= 60 ? "#eab308" : "#ef4444" }}>
                  {passRate >= 80 ? "Tests Passing" : passRate >= 60 ? "Needs Attention" : "Tests Failing"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {passed} of {total} tests passed &middot; {failed} failed
                  {summary?.totalDuration ? ` · ${(summary.totalDuration / 1000).toFixed(1)}s total` : ""}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 140 }}>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 4, transition: "width 0.6s ease",
                    width: `${passRate}%`,
                    background: passRate >= 80 ? "#22c55e" : passRate >= 60 ? "#eab308" : "#ef4444",
                  }} />
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: passRate >= 80 ? "#22c55e" : passRate >= 60 ? "#eab308" : "#ef4444" }}>
                {passRate}%
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
          <div className="stat-card" style={{ cursor: "pointer", borderColor: statusFilter === "all" && filter === "all" ? "var(--accent-blue)" : undefined }} onClick={() => { setFilter("all"); setStatusFilter("all"); }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Total Tests</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{total}</div>
          </div>
          <div className="stat-card" style={{ cursor: "pointer", borderColor: statusFilter === "passed" ? "#22c55e" : undefined }} onClick={() => setStatusFilter(statusFilter === "passed" ? "all" : "passed")}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Passed</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{passed}</div>
          </div>
          <div className="stat-card" style={{ cursor: "pointer", borderColor: statusFilter === "failed" ? "#ef4444" : undefined }} onClick={() => setStatusFilter(statusFilter === "failed" ? "all" : "failed")}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Failed</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>{failed}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Pass Rate</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: passRate >= 80 ? "#22c55e" : passRate >= 60 ? "#eab308" : "#ef4444" }}>{passRate}%</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Duration</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-secondary)" }}>{summary?.totalDuration ? `${(summary.totalDuration / 1000).toFixed(1)}s` : "--"}</div>
          </div>
        </div>

        {/* Type Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(allTypes.length || 4, 6)}, 1fr)`, gap: 12, marginBottom: 16 }}>
          {(allTypes.length > 0 ? allTypes : ["functional", "edge", "api", "ui"]).map((type) => {
            const config = typeConfig[type] || typeConfig.functional;
            const Icon = config.icon;
            const typeTests = tests.filter(t => t.type === type && !t.aiGenerated);
            const typePassed = typeTests.filter(t => t.passed).length;
            return (
              <div key={type} className="stat-card" style={{ cursor: "pointer" }} onClick={() => setFilter(type as TestType)}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Icon size={14} color={config.color} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{type}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: config.color }}>{typeTests.length}</div>
                {typeTests.length > 0 && (
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                    {typePassed}/{typeTests.length} passed
                  </div>
                )}
              </div>
            );
          })}
          {/* AI-Suggested Tests Card */}
          {aiTestCount > 0 && (
            <div className="stat-card" style={{ cursor: "pointer", background: "rgba(168, 85, 247, 0.05)", border: "1px solid rgba(168, 85, 247, 0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Sparkles size={14} color="var(--accent-violet)" />
                <span style={{ fontSize: 11, color: "var(--accent-violet)" }}>AI Suggested</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-violet)" }}>{aiTestCount}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                Dynamic by Gemini
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="glass-card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {filterTabs.map((type) => (
              <button key={type} onClick={() => setFilter(type)} style={{
                padding: "6px 12px", borderRadius: 3, border: "none",
                background: filter === type ? "var(--accent-blue)" : "transparent",
                color: filter === type ? "white" : "var(--text-secondary)",
                fontSize: 12, cursor: "pointer", textTransform: "capitalize",
              }}>
                {type === "all" ? "All" : type}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: "var(--border-color)", margin: "0 6px" }} />
            <button onClick={() => setStatusFilter("all")} style={{
              padding: "5px 10px", borderRadius: 3, fontSize: 11, cursor: "pointer",
              border: statusFilter === "all" ? "1px solid var(--accent-blue)" : "1px solid transparent",
              background: statusFilter === "all" ? "rgba(59,130,246,0.1)" : "transparent",
              color: statusFilter === "all" ? "var(--accent-blue)" : "var(--text-muted)",
            }}>All Status</button>
            <button onClick={() => setStatusFilter("passed")} style={{
              padding: "5px 10px", borderRadius: 3, fontSize: 11, cursor: "pointer",
              border: statusFilter === "passed" ? "1px solid #22c55e" : "1px solid transparent",
              background: statusFilter === "passed" ? "rgba(34,197,94,0.1)" : "transparent",
              color: statusFilter === "passed" ? "#22c55e" : "var(--text-muted)",
              display: "flex", alignItems: "center", gap: 4,
            }}><CheckCircle2 size={11} /> Passed</button>
            <button onClick={() => setStatusFilter("failed")} style={{
              padding: "5px 10px", borderRadius: 3, fontSize: 11, cursor: "pointer",
              border: statusFilter === "failed" ? "1px solid #ef4444" : "1px solid transparent",
              background: statusFilter === "failed" ? "rgba(239,68,68,0.1)" : "transparent",
              color: statusFilter === "failed" ? "#ef4444" : "var(--text-muted)",
              display: "flex", alignItems: "center", gap: 4,
            }}><XCircle size={11} /> Failed</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" onClick={downloadTests} disabled={tests.length === 0}>
              <Download size={13} /> Export
            </button>
            <button className="btn-primary" onClick={() => runTestGeneration('demo', true)} disabled={testsLoading}>
              <RefreshCw size={13} className={testsLoading ? "animate-spin" : ""} />
              {testsLoading ? "Running..." : "Re-run Tests"}
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="glass-card" style={{ overflow: "hidden" }}>
          {testsLoading ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Loader2 size={20} color="var(--text-muted)" className="animate-spin" style={{ margin: "0 auto 8px" }} />
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Crawling {websiteUrl || "website"} and executing tests...</div>
              <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>This may take 5-15 seconds</div>
            </div>
          ) : tests.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <FlaskConical size={24} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, marginBottom: 8 }}>No tests run yet</div>
              <button className="btn-primary" onClick={() => runTestGeneration('demo', true)}><RefreshCw size={13} /> Run Tests</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Result</th>
                  <th style={{ width: "35%" }}>Test Case</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Duration</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test) => {
                  const config = typeConfig[test.type] || typeConfig.functional;
                  const isOpen = expandedTest === test.id;
                  const isAI = test.aiGenerated;
                  return (
                    <>
                      <tr key={test.id} style={{
                        cursor: "pointer",
                        background: isAI ? "rgba(168, 85, 247, 0.03)" : "transparent",
                        borderLeft: isAI ? "3px solid var(--accent-violet)" : test.passed ? "3px solid #22c55e" : "3px solid #ef4444",
                      }} onClick={() => setExpandedTest(isOpen ? null : test.id)}>
                        <td>
                          {isAI
                            ? <Sparkles size={16} color="var(--accent-violet)" />
                            : test.passed
                              ? <CheckCircle2 size={16} color="#22c55e" />
                              : <XCircle size={16} color="#ef4444" />}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
                            {test.title}
                            {isAI && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 3,
                                padding: "1px 8px", borderRadius: 3, fontSize: 10, fontWeight: 600,
                                background: "rgba(168, 85, 247, 0.12)", color: "var(--accent-violet)",
                                border: "1px solid rgba(168, 85, 247, 0.25)",
                              }}>
                                <Sparkles size={9} /> AI Generated
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {test.explanation?.slice(0, 80)}{test.explanation?.length > 80 ? "..." : ""}
                          </div>
                        </td>
                        <td>
                          {isAI ? (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                              background: "rgba(168,85,247,0.12)", color: "var(--accent-violet)",
                              letterSpacing: "0.3px",
                            }}>SUGGESTED</span>
                          ) : test.passed ? (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                              background: "rgba(34,197,94,0.15)", color: "#22c55e",
                              letterSpacing: "0.3px",
                            }}><CheckCircle2 size={11} /> PASSED</span>
                          ) : (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                              background: "rgba(239,68,68,0.15)", color: "#ef4444",
                              letterSpacing: "0.3px",
                            }}><XCircle size={11} /> FAILED</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: config.color, textTransform: "capitalize" }}>
                            {test.type}
                          </span>
                        </td>
                        <td><span className={`badge badge-${test.priority === "high" || test.priority === "critical" ? "high" : test.priority === "medium" ? "medium" : "low"}`}>{test.priority}</span></td>
                        <td><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isAI ? "—" : test.duration ? `${test.duration}ms` : "<1ms"}</span></td>
                        <td>{isOpen ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}</td>
                      </tr>
                      {isOpen && (
                        <tr key={`${test.id}-detail`}>
                          <td colSpan={7} style={{ padding: "16px 20px" }}>
                            {isAI ? (
                              <div>
                                <div style={{
                                  padding: "12px 16px", borderRadius: 6, marginBottom: 12,
                                  background: "rgba(168, 85, 247, 0.06)",
                                  border: "1px solid rgba(168, 85, 247, 0.15)",
                                  display: "flex", alignItems: "center", gap: 10,
                                }}>
                                  <Sparkles size={16} color="var(--accent-violet)" />
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-violet)", marginBottom: 2 }}>AI-Generated Test Case</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                      This test was dynamically generated by Gemini based on your site analysis. It has not been executed yet.
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Expected</div>
                                    <div style={{ fontSize: 12, color: "var(--status-green)", padding: "8px 12px", background: "rgba(34,197,94,0.05)", borderRadius: 4, border: "1px solid rgba(34,197,94,0.15)" }}>
                                      {test.expected}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Actual</div>
                                    <div style={{
                                      fontSize: 12,
                                      color: test.passed === true ? "var(--status-green)" : test.passed === false ? "var(--status-red)" : "var(--accent-violet)",
                                      padding: "8px 12px",
                                      background: test.passed === true ? "rgba(34,197,94,0.05)" : test.passed === false ? "rgba(239,68,68,0.05)" : "rgba(168,85,247,0.05)",
                                      borderRadius: 4,
                                      border: `1px solid ${test.passed === true ? "rgba(34,197,94,0.15)" : test.passed === false ? "rgba(239,68,68,0.15)" : "rgba(168,85,247,0.15)"}`,
                                    }}>
                                      {test.actual}
                                    </div>
                                  </div>
                                </div>

                                {test.steps && test.steps.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Steps</div>
                                    <ol style={{ paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
                                      {test.steps.map((step: string, i: number) => <li key={i}>{step}</li>)}
                                    </ol>
                                  </div>
                                )}

                                <div style={{ marginTop: 12 }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Why This Test Matters</div>
                                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, padding: "8px 12px", background: "var(--bg-card)", borderRadius: 4, border: "1px solid var(--border-subtle)" }}>
                                    {test.explanation}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Expected</div>
                                    <div style={{ fontSize: 12, color: "var(--status-green)", padding: "8px 12px", background: "rgba(34,197,94,0.05)", borderRadius: 4, border: "1px solid rgba(34,197,94,0.15)" }}>
                                      {test.expected}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Actual</div>
                                    <div style={{
                                      fontSize: 12,
                                      color: test.passed ? "var(--status-green)" : "var(--status-red)",
                                      padding: "8px 12px",
                                      background: test.passed ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
                                      borderRadius: 4,
                                      border: `1px solid ${test.passed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                                    }}>
                                      {test.actual}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Explanation</div>
                                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, padding: "8px 12px", background: "var(--bg-card)", borderRadius: 4, border: "1px solid var(--border-subtle)" }}>
                                    {test.explanation}
                                  </div>
                                </div>
                                {test.steps && test.steps.length > 0 && (
                                  <div style={{ marginTop: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Steps</div>
                                    <ol style={{ paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
                                      {test.steps.map((step: string, i: number) => <li key={i}>{step}</li>)}
                                    </ol>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
