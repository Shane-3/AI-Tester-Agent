"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import {
  ClipboardList,
  Search,
  FlaskConical,
  Zap,
  BarChart3,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
} from "lucide-react";

interface AgentActivity {
  id: string;
  agent: string;
  status: string;
  startedAt: string;
  completedAt: string;
  duration: string;
  durationMs?: number;
  summary: string;
  output: Record<string, unknown>;
}

const agentIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  "Requirement Intelligence Agent": ClipboardList,
  "Code Analysis Agent": Search,
  "Test Generation Agent": FlaskConical,
  "Regression Optimization Agent": Zap,
  "Risk Prediction Agent": BarChart3,
  "CI/CD Gatekeeper Agent": ShieldCheck,
};

function formatTotalDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function TimelinePage() {
  const { dashboard, dashboardLoading, loadDashboard, projectConfig, loadProjectInfo } = useAppStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!dashboard) loadDashboard();
    if (!projectConfig) loadProjectInfo();
  }, [dashboard, loadDashboard, projectConfig, loadProjectInfo]);

  const timeline: AgentActivity[] = dashboard?.agentTimeline || [];
  const completedCount = timeline.filter(a => a.status === "completed").length;
  const totalDurationMs = timeline.reduce((sum, a) => sum + (a.durationMs || 0), 0);
  const totalDuration = dashboard?.pipelineDuration || formatTotalDuration(totalDurationMs);
  const projectName = dashboard?.project?.name || projectConfig?.name || "Project";

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Agent Timeline</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Analysis pipeline for <strong style={{ color: "var(--text-secondary)" }}>{projectName}</strong>
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Agents</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{timeline.length}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Completed</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-green)" }}>{completedCount}/{timeline.length}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Pipeline Time</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{totalDuration}</div>
          </div>
        </div>

        {dashboardLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
          </div>
        ) : timeline.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 13, marginBottom: 12 }}>No agent activity</div>
            <button className="btn-primary" onClick={() => loadDashboard()}>
              <RefreshCw size={13} /> Load
            </button>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 20 }}>
            {timeline.map((activity, index) => {
              const IconComponent = agentIconMap[activity.agent] || Cpu;
              const isOpen = expanded === activity.id;

              return (
                <div key={activity.id} className="timeline-item">
                  <div className={`timeline-dot ${activity.status === "completed" ? "completed" : ""}`}>
                    {activity.status === "completed"
                      ? <CheckCircle2 size={9} color="white" />
                      : <Clock size={9} color="#888" />
                    }
                  </div>

                  <div style={{
                    padding: 16, cursor: "pointer",
                    background: "var(--bg-primary)", borderRadius: 4,
                    border: "1px solid var(--border-color)",
                  }} onClick={() => setExpanded(isOpen ? null : activity.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <IconComponent size={15} color="var(--text-secondary)" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{activity.agent}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({index + 1}/{timeline.length})</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={10} /> {activity.duration}
                        </span>
                        <span className={`badge ${activity.status === "completed" ? "badge-approved" : "badge-medium"}`}>
                          {activity.status}
                        </span>
                        {isOpen ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                      {activity.summary}
                    </p>

                    <div style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 12 }}>
                      <span>Started: {new Date(activity.startedAt).toLocaleTimeString()}</span>
                      <span>Completed: {new Date(activity.completedAt).toLocaleTimeString()}</span>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 12, padding: 12, background: "var(--bg-card)", borderRadius: 4, border: "1px solid var(--border-color)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>Agent Output</div>
                        <div className="code-block" style={{ maxHeight: 250, overflow: "auto" }}>
                          {JSON.stringify(activity.output, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{
              marginTop: 12, padding: 14, background: "var(--bg-primary)",
              borderRadius: 4, border: "1px solid var(--border-color)",
              textAlign: "center", fontSize: 12, color: "var(--text-muted)",
            }}>
              Pipeline complete &middot; {timeline.length} agents &middot; Total: {totalDuration}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
