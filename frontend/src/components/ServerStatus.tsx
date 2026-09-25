"use client";

import { useEffect } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { useAppStore } from "@/lib/store";

/**
 * Banner shown while the backend is unreachable. Free hosting tiers put idle
 * servers to sleep, and the first request can take up to a minute to wake it.
 */
export default function ServerStatus() {
  const { serverStatus, checkServer } = useAppStore();

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  if (serverStatus === "online" || serverStatus === "checking") return null;

  const waking = serverStatus === "waking";
  return (
    <div
      role="status"
      style={{
        position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 50,
        display: "flex", alignItems: "center", gap: 8, maxWidth: "calc(100vw - 32px)",
        padding: "8px 14px", borderRadius: 6, fontSize: 12,
        background: "var(--bg-card, #1a1a1a)", color: "var(--text-primary)",
        border: `1px solid ${waking ? "var(--accent-amber)" : "var(--accent-red)"}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      {waking ? (
        <>
          <Loader2 size={14} className="animate-spin" color="var(--accent-amber)" />
          <span>Waking up the server — this can take up to a minute on first visit…</span>
        </>
      ) : (
        <>
          <WifiOff size={14} color="var(--accent-red)" />
          <span>Server is unreachable.</span>
          <button
            onClick={() => checkServer()}
            style={{ background: "none", border: "none", color: "var(--accent-blue)", cursor: "pointer", fontSize: 12, padding: 0 }}
          >
            Retry
          </button>
        </>
      )}
    </div>
  );
}
