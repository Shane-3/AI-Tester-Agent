"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import {
  MessageSquare,
  Send,
  Loader2,
  FileCode2,
  Bot,
  User,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function AskPage() {
  const {
    chatHistory,
    chatLoading,
    askQuestion,
    projectConfig,
    loadProjectInfo,
  } = useAppStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectConfig) loadProjectInfo();
  }, [projectConfig, loadProjectInfo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    askQuestion(input, projectConfig?.repoUrl || undefined);
    setInput("");
  };

  const hasRepoUrl = !!projectConfig?.repoUrl;
  const projectName = projectConfig?.name || "Project";

  if (!hasRepoUrl) {
    return (
      <div style={{ display: "flex", height: "100vh" }}>
        <Sidebar />
        <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Ask AI</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Natural language codebase Q&A
            </p>
          </div>
          <div className="glass-card" style={{ padding: 40, textAlign: "center", margin: "auto 0" }}>
            <ShieldAlert size={32} color="var(--accent-amber)" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>GitHub Repository Required</div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, maxWidth: 400, margin: "0 auto 16px" }}>
              To answer questions about your code, the AI Tester Agent needs access to your GitHub repository.
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
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 20, flexShrink: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Ask AI</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Chat with Gemini about the <strong style={{ color: "var(--text-secondary)" }}>{projectName}</strong> codebase
          </p>
        </div>

        {/* Chat Area */}
        <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
            {chatHistory.length === 0 ? (
              <div style={{ margin: "auto", textAlign: "center", maxWidth: 500 }}>
                <MessageSquare size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>What do you want to know about your code?</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
                  The AI Tester Agent will read your repository files and answer questions about architecture, failure scenarios, security, and more.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    "What happens if the database goes down?",
                    "Which files handle user authentication?",
                    "Are there any security vulnerabilities in the middleware?",
                    "Explain the overall system architecture."
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => askQuestion(q, projectConfig?.repoUrl || undefined)}
                      style={{
                        padding: "12px 16px", background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)", borderRadius: 8,
                        color: "var(--text-secondary)", fontSize: 13, textAlign: "left",
                        cursor: "pointer", transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--accent-blue)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: 16 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: msg.role === "user" ? "var(--bg-primary)" : "var(--accent-blue)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: msg.role === "user" ? "1px solid var(--border-color)" : "none",
                  }}>
                    {msg.role === "user" ? <User size={16} color="var(--text-muted)" /> : <Bot size={16} color="white" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                      {msg.role === "user" ? "You" : "AI Agent"}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)" }}>
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            return inline ? (
                              <code style={{ background: "rgba(255,255,255,0.1)", padding: "2px 4px", borderRadius: 3, fontSize: "0.9em" }} {...props}>{children}</code>
                            ) : (
                              <pre style={{ background: "#0d1117", padding: 12, borderRadius: 6, overflowX: "auto", border: "1px solid var(--border-color)", marginTop: 8, marginBottom: 8 }}>
                                <code {...props}>{children}</code>
                              </pre>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* AI References */}
                    {msg.role === "assistant" && msg.references && msg.references.length > 0 && (
                      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {msg.references.map((ref: any, refIdx: number) => (
                          <div key={refIdx} style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 10px", background: "rgba(59, 130, 246, 0.1)",
                            border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: 4,
                            fontSize: 11, color: "var(--accent-blue)"
                          }}>
                            <FileCode2 size={12} />
                            <span>{ref.file}</span>
                            {ref.lines && <span style={{ opacity: 0.7 }}>({ref.lines})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bot size={16} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>AI Agent</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 13 }}>
                    <Loader2 size={14} className="animate-spin" /> Reading files and analyzing...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: 16, borderTop: "1px solid var(--border-color)", background: "var(--bg-card)" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12 }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about the codebase..."
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-color)",
                  background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14,
                  outline: "none"
                }}
                disabled={chatLoading}
                onFocus={(e) => e.target.style.borderColor = "var(--accent-blue)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-color)"}
              />
              <button
                type="submit"
                disabled={!input.trim() || chatLoading}
                style={{
                  padding: "0 20px", borderRadius: 8, border: "none",
                  background: !input.trim() || chatLoading ? "var(--border-color)" : "var(--accent-blue)",
                  color: !input.trim() || chatLoading ? "var(--text-muted)" : "white",
                  cursor: !input.trim() || chatLoading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s"
                }}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
