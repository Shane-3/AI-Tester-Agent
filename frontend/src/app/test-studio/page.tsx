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
  Clock,
} from "lucide-react";

type TestType = "all" | "functional" | "api" | "ui";

interface TestResult {
  id: string;
  title: string;
  type: string;
  priority: string;
  passed: boolean;
  expected: string;
  actual: string;
  explanation: string;
  duration: number;
  steps?: string[];
  code?: string;
}

const typeConfig: Record<string, { color: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  functional: { color: "var(--accent-blue)", icon: Wrench },
  edge: { color: "var(--accent-amber)", icon: AlertTriangle },
  api: { color: "var(--accent-cyan)", icon: Globe },
  ui: { color: "var(--accent-violet)", icon: Monitor },
};

export default function TestStudioPage() {
  const { generatedTests, testsLoading, runTestGeneration, projectConfig, loadProjectInfo, dashboard } = useAppStore();
  const [filter, setFilter] = useState<TestType>("all");
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  useEffect(() => {
    if (!generatedTests) runTestGeneration();
    if (!projectConfig) loadProjectInfo();
  }, [generatedTests, runTestGeneration, projectConfig, loadProjectInfo]);

  const tests: TestResult[] = generatedTests?.generation?.tests || [];
  const filteredTests = filter === "all" ? tests : tests.filter(t => t.type === filter);
  const coverage = generatedTests?.generation?.coverage || { functional: 0, edge: 0, api: 0, ui: 0 };
  const summary = generatedTests?.summary || null;
  const projectName = generatedTests?.generation?.projectContext?.name || dashboard?.project?.name || projectConfig?.name || "Project";
  const websiteUrl = generatedTests?.generation?.projectContext?.url || projectConfig?.websiteUrl || "";

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  const total = tests.length;
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

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setFilter("all")}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Total Tests</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{total}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Passed</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--status-green)" }}>{passed}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Failed</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--status-red)" }}>{failed}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Pass Rate</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: passRate >= 80 ? "var(--status-green)" : passRate >= 60 ? "var(--status-amber)" : "var(--status-red)" }}>{passRate}%</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Duration</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-secondary)" }}>{summary?.totalDuration ? `${(summary.totalDuration / 1000).toFixed(1)}s` : "--"}</div>
          </div>
        </div>

        {/* Type Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {(["functional", "edge", "api", "ui"] as const).map((type) => {
            const config = typeConfig[type];
            const Icon = config.icon;
            const typeTests = tests.filter(t => t.type === type);
            const typePassed = typeTests.filter(t => t.passed).length;
            return (
              <div key={type} className="stat-card" style={{ cursor: "pointer" }} onClick={() => setFilter(type as TestType)}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Icon size={14} color={config.color} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{type}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: config.color }}>{coverage[type as keyof typeof coverage]}</div>
                {typeTests.length > 0 && (
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                    {typePassed}/{typeTests.length} passed
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="glass-card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(["all", "functional", "api", "ui"] as const).map((type) => (
              <button key={type} onClick={() => setFilter(type)} style={{
                padding: "6px 12px", borderRadius: 3, border: "none",
                background: filter === type ? "var(--accent-blue)" : "transparent",
                color: filter === type ? "white" : "var(--text-secondary)",
                fontSize: 12, cursor: "pointer", textTransform: "capitalize",
              }}>
                {type === "all" ? "All" : type}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" onClick={downloadTests} disabled={tests.length === 0}>
              <Download size={13} /> Export
            </button>
            <button className="btn-primary" onClick={() => runTestGeneration()} disabled={testsLoading}>
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
              <button className="btn-primary" onClick={() => runTestGeneration()}><RefreshCw size={13} /> Run Tests</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Result</th>
                  <th style={{ width: "40%" }}>Test Case</th>
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
                  return (
                    <>
                      <tr key={test.id} style={{ cursor: "pointer" }} onClick={() => setExpandedTest(isOpen ? null : test.id)}>
                        <td>
                          {test.passed
                            ? <CheckCircle2 size={16} color="var(--status-green)" />
                            : <XCircle size={16} color="var(--status-red)" />}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, marginBottom: 2, color: test.passed ? "var(--text-primary)" : "var(--text-primary)" }}>{test.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {test.explanation?.slice(0, 80)}{test.explanation?.length > 80 ? "..." : ""}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: config.color, textTransform: "capitalize" }}>
                            {test.type}
                          </span>
                        </td>
                        <td><span className={`badge badge-${test.priority === "high" || test.priority === "critical" ? "high" : test.priority === "medium" ? "medium" : "low"}`}>{test.priority}</span></td>
                        <td><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{test.duration ? `${test.duration}ms` : "<1ms"}</span></td>
                        <td>{isOpen ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}</td>
                      </tr>
                      {isOpen && (
                        <tr key={`${test.id}-detail`}>
                          <td colSpan={6} style={{ padding: "16px 20px" }}>
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
