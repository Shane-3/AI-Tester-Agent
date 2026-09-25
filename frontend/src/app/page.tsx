"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import {
  getGitHubToken, setGitHubToken,
  getSiteLogin, setSiteLogin, isLoginSkipped, setLoginSkipped, detectLogin,
} from "@/lib/api";
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
  TrendingUp,
  Minus,
  Lock,
} from "lucide-react";


/** Same normalization the backend applies (adds https:// if missing). */
function normalizeSite(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function pathOf(url: string) {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}

function ProjectConfigPanel() {
  const {
    projectConfig, projectError, configureProject: saveProject, loadProjectInfo,
    githubRepo, githubLoading, githubError, fetchGitHubRepo,
    loadDashboard, loginPrompt, setLoginPrompt, setHoldPipeline,
  } = useAppStore();

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [githubToken, setGithubTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Test-account login for the user's site
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUrl, setLoginUrl] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [hasSavedLogin, setHasSavedLogin] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    loadProjectInfo();
    const token = getGitHubToken();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGithubTokenInput(token);
    setShowToken(!!token);
  }, [loadProjectInfo]);

  useEffect(() => {
    if (projectConfig) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWebsiteUrl(projectConfig.websiteUrl || "");
      setRepoUrl(projectConfig.repoUrl || "");
      setProjectName(projectConfig.name || "");
      const savedLogin = getSiteLogin(projectConfig.websiteUrl);
      setLoginUrl(savedLogin?.loginUrl || "");
      setLoginUser(savedLogin?.username || "");
      setLoginPass(savedLogin?.password || "");
      setHasSavedLogin(!!savedLogin);
      if (savedLogin) setLoginOpen(true);
    }
  }, [projectConfig]);

  // "Add test account" from the results, or a login page found on Save
  useEffect(() => {
    if (loginPrompt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoginOpen(true);
      setLoginUrl((current) => current || loginPrompt.loginUrl);
      document.getElementById("site-login")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loginPrompt]);

  const handleSave = async () => {
    setLoginError(null);
    const site = normalizeSite(websiteUrl);
    const wantsLogin = !!(loginUser.trim() && loginPass);
    if ((loginUser.trim() || loginPass) && !wantsLogin) {
      setLoginError("Enter both the email/username and the password — or leave both empty.");
      return;
    }
    if (loginPrompt && !wantsLogin) {
      setLoginError("Enter the test account's email/username and password, or choose “Test public pages only”.");
      return;
    }

    setSaving(true);
    setHoldPipeline(true); // nothing starts testing until we know about the login
    setLoginPrompt(null);
    setGitHubToken(githubToken);
    if (site && wantsLogin) {
      setSiteLogin(site, { loginUrl: loginUrl.trim() || undefined, username: loginUser.trim(), password: loginPass });
      setLoginSkipped(site, false);
      setHasSavedLogin(true);
    }

    const ok = await saveProject({ name: projectName, websiteUrl, repoUrl });
    if (!ok) {
      setSaving(false);
      setHoldPipeline(false);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (repoUrl.trim()) fetchGitHubRepo(repoUrl);

    // Look for a login page first, so we can ask for a test account before testing
    if (site && !wantsLogin && !isLoginSkipped(site)) {
      setCheckingLogin(true);
      const detection = await detectLogin().catch(() => null);
      setCheckingLogin(false);
      if (detection?.detected && detection.loginUrl) {
        setLoginUrl(detection.loginUrl);
        setLoginPrompt({ loginUrl: detection.loginUrl, how: detection.how });
        setSaving(false);
        setHoldPipeline(false); // the prompt itself keeps the pipeline waiting
        return;
      }
    }

    setSaving(false);
    setHoldPipeline(false);
    loadDashboard();
  };

  const skipLogin = () => {
    const site = normalizeSite(websiteUrl);
    if (site) setLoginSkipped(site, true);
    setLoginError(null);
    setLoginPrompt(null);
    if (!useAppStore.getState().dashboard) loadDashboard();
  };

  const removeLogin = () => {
    const site = normalizeSite(websiteUrl);
    if (site) setSiteLogin(site, null);
    setLoginUser("");
    setLoginPass("");
    setLoginUrl("");
    setHasSavedLogin(false);
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

      {showToken ? (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
            GitHub Access Token <span style={{ opacity: 0.8 }}>(optional — only for private repositories)</span>
          </label>
          <input type="password" value={githubToken} onChange={(e) => setGithubTokenInput(e.target.value)}
            placeholder="github_pat_…" autoComplete="off" style={inputStyle} />
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Stored only in this browser and sent with your requests — never saved on the server.
            Use a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--accent-blue)" }}>fine-grained token</a> with read-only &quot;Contents&quot; access to the repo.
            Public repositories need no token.
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowToken(true)}
          style={{ background: "none", border: "none", padding: 0, marginBottom: 12, fontSize: 11, color: "var(--accent-blue)", cursor: "pointer" }}>
          Private repository? Add a GitHub token
        </button>
      )}

      <div id="site-login" style={{ marginBottom: 12 }}>
        {loginPrompt && (
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", marginBottom: 12,
            borderRadius: 6, border: "1px solid var(--accent-amber)", background: "rgba(234 179 8 / 0.08)",
          }}>
            <Lock size={16} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>This site has a login page</strong> ({pathOf(loginPrompt.loginUrl)}).
              {" "}Pages behind a login can only be tested with an account. Add a <strong>test account</strong> below
              {" "}so we can log in and test those pages too — or test the public pages only.
            </div>
          </div>
        )}

        {loginOpen ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Login page URL <span style={{ opacity: 0.8 }}>(optional)</span>
                </label>
                <input type="url" value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)}
                  placeholder="Found automatically" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Test account email / username
                </label>
                <input type="text" value={loginUser} onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="test@yoursite.com" autoComplete="off" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Test account password
                </label>
                <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••" autoComplete="new-password" style={inputStyle} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
              Use a <strong>test account</strong>, not your real one. It&apos;s remembered only in this browser and sent only while tests
              run — never stored on our server or shown to the AI. We only follow links after logging in (no buttons, no forms).
              Logins with CAPTCHA, 2FA codes or &quot;Sign in with Google&quot; can&apos;t be automated.
              {hasSavedLogin && (
                <button type="button" onClick={removeLogin}
                  style={{ background: "none", border: "none", padding: 0, marginLeft: 6, fontSize: 11, color: "var(--accent-red)", cursor: "pointer" }}>
                  Remove saved login
                </button>
              )}
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setLoginOpen(true)}
            style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: "var(--accent-blue)", cursor: "pointer" }}>
            Does your site have a login? Add a test account
          </button>
        )}

        {loginError && (
          <div style={{ fontSize: 12, color: "var(--accent-red)", marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
            <AlertCircle size={13} /> {loginError}
          </div>
        )}
      </div>

      {projectError && (
        <div style={{ fontSize: 12, color: "var(--accent-red)", marginBottom: 10, display: "flex", gap: 6, alignItems: "center" }}>
          <AlertCircle size={13} /> {projectError}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: githubRepo ? 16 : 0 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving || githubLoading}>
          {checkingLogin ? <><Loader2 size={13} className="animate-spin" /> Checking for a login page…</>
            : saving || githubLoading ? <><Loader2 size={13} className="animate-spin" /> Connecting...</>
            : loginPrompt ? "Save login & run tests" : "Save & Connect"}
        </button>
        {loginPrompt && (
          <button type="button" onClick={skipLogin} disabled={saving}
            style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 4, padding: "7px 12px", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
            Test public pages only
          </button>
        )}
      </div>

      {githubError && !githubLoading && (
        <div style={{ fontSize: 12, color: "var(--accent-red)", marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
          <AlertCircle size={13} /> {githubError}
        </div>
      )}

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
            {githubRepo.repository.stars != null && (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Star size={12} /> {githubRepo.repository.stars}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><GitFork size={12} /> {githubRepo.repository.forks}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><AlertCircle size={12} /> {githubRepo.repository.openIssues} issues</span>
              </>
            )}
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


type ExploredPage = {
  url: string; path: string; access: "public" | "private";
  statusCode: number | null; title: string; loadTime: number | null; issues: string[];
};

type Exploration = {
  login: { status: string; message: string; loginUrl: string | null; username: string | null };
  counts: { public: number; private: number };
  pages: ExploredPage[];
};

const LOGIN_STATUS_STYLE: Record<string, { color: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  success: { color: "var(--accent-green)", icon: CheckCircle2 },
  "not-provided": { color: "var(--accent-amber)", icon: Lock },
  none: { color: "var(--text-muted)", icon: Globe },
};

function SiteExplorationCard({ exploration }: { exploration: Exploration }) {
  const setLoginPrompt = useAppStore((s) => s.setLoginPrompt);
  const [showAll, setShowAll] = useState(false);
  const { login, counts, pages } = exploration;
  const style = LOGIN_STATUS_STYLE[login.status] || { color: "var(--accent-red)", icon: AlertCircle };
  const StatusIcon = style.icon;
  // Logged-in pages first — they're what the test account was added for
  const ordered = [...pages].sort((a, b) => Number(b.access === "private") - Number(a.access === "private"));
  const visiblePages = showAll ? ordered : ordered.slice(0, 10);
  const canAddLogin = login.status !== "none" && login.status !== "success";

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Pages Tested</h2>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {counts.public} public{counts.private > 0 ? ` · ${counts.private} logged-in` : ""}
        </span>
      </div>

      {/* Login status */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 14,
        borderRadius: 6, border: `1px solid ${style.color}`, fontSize: 12, color: "var(--text-secondary)",
      }}>
        <StatusIcon size={15} color={style.color} />
        <span style={{ flex: 1 }}>{login.message}</span>
        {canAddLogin && login.loginUrl && (
          <button className="btn-primary" style={{ fontSize: 11, padding: "5px 10px" }}
            onClick={() => setLoginPrompt({ loginUrl: login.loginUrl as string })}>
            {login.status === "not-provided" ? "Add test account" : "Edit login"}
          </button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 28 }}></th>
            <th>Page</th>
            <th style={{ width: 80 }}>Load</th>
            <th>Issues</th>
          </tr>
        </thead>
        <tbody>
          {visiblePages.map((p) => (
            <tr key={p.url}>
              <td title={p.access === "private" ? "Behind login" : "Public"}>
                {p.access === "private" ? <Lock size={13} color="var(--accent-amber)" /> : <Globe size={13} color="var(--text-muted)" />}
              </td>
              <td>
                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-primary)", fontSize: 12 }}>{p.path}</a>
                {p.title && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.title.slice(0, 70)}</div>}
              </td>
              <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {p.loadTime != null ? `${(p.loadTime / 1000).toFixed(1)}s` : "—"}
              </td>
              <td style={{ fontSize: 12, color: p.issues.length ? "var(--accent-amber)" : "var(--accent-green)" }}>
                {p.issues.length ? p.issues.join(" · ") : "No issues"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages.length > 10 && (
        <button type="button" onClick={() => setShowAll(!showAll)}
          style={{ background: "none", border: "none", padding: 0, marginTop: 10, fontSize: 12, color: "var(--accent-blue)", cursor: "pointer" }}>
          {showAll ? "Show fewer" : `Show all ${pages.length} pages`}
        </button>
      )}
    </div>
  );
}


type Delta = {
  direction: "improved" | "worse" | "unchanged";
  previousScore: number; currentScore: number;
  previousDeployment?: string; currentDeployment?: string;
  passedChange: number; improvedTests: string[]; regressionTests: string[];
};

const DELTA_STYLE = {
  improved: { color: "var(--accent-green)", tint: "rgba(34 197 94 / 0.06)", title: "Risk improved", Icon: TrendingDown },
  worse: { color: "var(--accent-red)", tint: "rgba(239 68 68 / 0.06)", title: "Risk increased", Icon: TrendingUp },
  unchanged: { color: "var(--text-secondary)", tint: "transparent", title: "No change in risk", Icon: Minus },
};

function DeltaCard({ delta }: { delta: Delta }) {
  const style = DELTA_STYLE[delta.direction] || DELTA_STYLE.unchanged;
  const { Icon } = style;
  const decisionChanged = delta.previousDeployment && delta.previousDeployment !== delta.currentDeployment;
  const list = (items: string[]) => items.slice(0, 4).join(", ") + (items.length > 4 ? ` +${items.length - 4} more` : "");

  return (
    <div className="glass-card" style={{ padding: "16px 20px", marginBottom: 20, background: style.tint, border: `1px solid ${style.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: style.color, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon size={14} /> {style.title} since the last run
            {decisionChanged && (
              <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
                · deployment {delta.previousDeployment?.toUpperCase()} → {delta.currentDeployment?.toUpperCase()}
              </span>
            )}
          </h3>
          {delta.improvedTests.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
              <span style={{ color: "var(--accent-green)" }}>Now passing ({delta.improvedTests.length}):</span> {list(delta.improvedTests)}
            </div>
          )}
          {delta.regressionTests.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent-red)" }}>Now failing ({delta.regressionTests.length}):</span> {list(delta.regressionTests)}
            </div>
          )}
          {!delta.improvedTests.length && !delta.regressionTests.length && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Same checks passed and failed as last time.</div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Risk score (lower is better)</div>
          <div style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 8, justifyContent: "flex-end" }}>
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{delta.previousScore}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>→</span>
            <span style={{ color: style.color }}>{delta.currentScore}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const { dashboard, dashboardLoading, dashboardError, loadDashboard, refreshDashboard, holdPipeline, loginPrompt, progress } = useAppStore();

  useEffect(() => {
    // Only fetch if no data yet (prevents re-running AI pipeline on tab switches).
    // After an error, wait for the user to retry instead of looping.
    if (!dashboard && !dashboardLoading && !dashboardError) {
      loadDashboard();
    }
  }, [dashboard, dashboardLoading, dashboardError, loadDashboard]);

  if (dashboardError && !dashboardLoading && !dashboard) {
    return (
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
          <div className="glass-card" style={{ padding: 40, textAlign: "center", marginTop: 40 }}>
            <AlertCircle size={24} color="var(--accent-red)" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Couldn&apos;t load the dashboard</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto 16px" }}>{dashboardError}</p>
            <button className="btn-primary" onClick={() => loadDashboard()} style={{ margin: "0 auto" }}>Try again</button>
          </div>
        </main>
      </div>
    );
  }

  // Before the first run: checking for a login page, or asking for a test account
  if (!dashboard && !dashboardLoading && (holdPipeline || loginPrompt)) {
    return (
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ marginLeft: 220, padding: 24, flex: 1, width: "calc(100% - 220px)" }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Release Dashboard</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              {loginPrompt ? "One more step before testing" : "Checking your site…"}
            </p>
          </div>
          <ProjectConfigPanel />
        </main>
      </div>
    );
  }

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
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{progress || "Crawling website and running tests..."}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Testing up to 20 pages (plus logged-in pages) can take 1–2 minutes</div>
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

        {/* Change since the previous run */}
        {dashboard.delta?.hasDelta && <DeltaCard delta={dashboard.delta} />}

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
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {riskOverview.deployment === "blocked" && riskOverview.reasons?.length
                  ? riskOverview.reasons.join(" · ")
                  : "No release blockers found"}
              </div>
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

        {dashboard.exploration && <SiteExplorationCard exploration={dashboard.exploration} />}

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
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Risk Factor Breakdown</h2>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>{riskOverview.formula}</p>
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
