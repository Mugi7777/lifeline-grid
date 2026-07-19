"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzeRegionalAccess } from "@/lib/regional";
import {
  CONTINUITY_CAPSULE_MAX_BYTES,
  buildContinuityCapsule,
  serializedCapsuleBytes,
  verifyContinuityCapsule,
  type PortableTwinCapsule,
} from "@/lib/continuity-capsule";

const LOCAL_CAPSULE_KEY = "lifeline-grid:portable-twin:v1";

interface ContinuityCapsuleProps {
  closedSegmentId: string | null;
  repairBudgetM: number;
  onRestore: (closedSegmentId: string | null, repairBudgetM: number) => void;
}

function shortDigest(value: string) {
  return `${value.slice(0, 18)}…${value.slice(-8)}`;
}

export default function ContinuityCapsule({ closedSegmentId, repairBudgetM, onRestore }: ContinuityCapsuleProps) {
  const [localAvailable, setLocalAvailable] = useState(false);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "verified" | "stale" | "rejected">("idle");
  const [message, setMessage] = useState("No portable snapshot has been verified in this session.");
  const [lastCapsule, setLastCapsule] = useState<PortableTwinCapsule | null>(null);
  const analysis = useMemo(() => analyzeRegionalAccess(closedSegmentId, repairBudgetM), [closedSegmentId, repairBudgetM]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setLocalAvailable(window.localStorage.getItem(LOCAL_CAPSULE_KEY) !== null);
      } catch {
        setLocalAvailable(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function saveCapsule() {
    setWorking(true);
    try {
      const capsule = await buildContinuityCapsule(closedSegmentId, repairBudgetM);
      const serialized = JSON.stringify(capsule, null, 2);
      if (serializedCapsuleBytes(serialized) > CONTINUITY_CAPSULE_MAX_BYTES) throw new Error("Capsule exceeded the bounded file size");
      let storedLocally = false;
      try {
        window.localStorage.setItem(LOCAL_CAPSULE_KEY, serialized);
        storedLocally = true;
        setLocalAvailable(true);
      } catch {
        storedLocally = false;
      }
      const url = URL.createObjectURL(new Blob([serialized], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lifeline-grid-twin-${capsule.payload.capsuleId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setLastCapsule(capsule);
      setStatus("saved");
      setMessage(storedLocally
        ? "Verified capsule saved to this browser and downloaded as JSON."
        : "Browser storage was unavailable; the verified JSON download was still created.");
    } catch {
      setStatus("rejected");
      setMessage("The current twin could not be packaged. No partial snapshot was accepted.");
    } finally {
      setWorking(false);
    }
  }

  async function verifyAndRestore(value: unknown) {
    const result = await verifyContinuityCapsule(value);
    if (!result.ok) {
      setStatus("rejected");
      setMessage(`${result.code.replaceAll("_", " ")}: ${result.message}`);
      return;
    }
    onRestore(result.restore.closedSegmentId, result.restore.repairBudgetM);
    setLastCapsule(result.capsule);
    setStatus(result.status === "verified_stale" ? "stale" : "verified");
    setMessage(`${result.status === "verified_stale" ? "Stale capsule verified" : "Capsule verified"}; deterministic plan reproduced. ${result.warnings[0]}`);
  }

  async function restoreBrowserCopy() {
    setWorking(true);
    try {
      const serialized = window.localStorage.getItem(LOCAL_CAPSULE_KEY);
      if (!serialized) {
        setLocalAvailable(false);
        setStatus("rejected");
        setMessage("No browser copy exists on this device.");
        return;
      }
      if (serializedCapsuleBytes(serialized) > CONTINUITY_CAPSULE_MAX_BYTES) throw new Error("Stored capsule is oversized");
      await verifyAndRestore(JSON.parse(serialized));
    } catch {
      setStatus("rejected");
      setMessage("The browser copy is malformed or unreadable and was not restored.");
    } finally {
      setWorking(false);
    }
  }

  async function importCapsule(file: File | undefined) {
    if (!file) return;
    setWorking(true);
    try {
      if (file.size > CONTINUITY_CAPSULE_MAX_BYTES) throw new Error("Capsule is too large");
      const serialized = await file.text();
      if (serializedCapsuleBytes(serialized) > CONTINUITY_CAPSULE_MAX_BYTES) throw new Error("Capsule is too large");
      await verifyAndRestore(JSON.parse(serialized));
    } catch {
      setStatus("rejected");
      setMessage("The selected file is malformed, oversized, or not a Lifeline Grid capsule.");
    } finally {
      setWorking(false);
    }
  }

  function clearBrowserCopy() {
    try { window.localStorage.removeItem(LOCAL_CAPSULE_KEY); } catch { /* storage remains unavailable */ }
    setLocalAvailable(false);
    setStatus("idle");
    setMessage("The device-local snapshot was removed. Downloaded JSON files are unchanged.");
  }

  return (
    <section className="panel continuity-panel" aria-labelledby="continuity-title">
      <div className="continuity-heading">
        <div>
          <p className="panel-kicker">PORTABLE TWIN CAPSULE × DETERMINISTIC RECOVERY</p>
          <h2 id="continuity-title">Carry the regional state across devices and outages.</h2>
          <p>Package the active closure, repair budget, reproduced plan evidence, model identity and integrity digest. Restore only after the current engine reproduces the same result.</p>
        </div>
        <span className={`continuity-status ${status}`}><i />{status === "saved" ? "SAVED + DOWNLOADED" : status === "verified" ? "VERIFIED + RESTORED" : status === "stale" ? "STALE · REFRESH SOURCES" : status === "rejected" ? "RESTORE REJECTED" : "RECOVERY READY"}</span>
      </div>

      <div className="continuity-workspace">
        <article className="continuity-current">
          <header><span>CURRENT PORTABLE STATE</span><em>SYNTHETIC DEMO</em></header>
          <h3>{closedSegmentId ? "Active road disruption" : "Baseline road network"}</h3>
          <div>
            <span><b>{analysis.activePlan.metrics.serviceCoveragePercent}%</b><small>household access</small></span>
            <span><b>¥{repairBudgetM}m</b><small>repair budget</small></span>
            <span><b>{analysis.activePlan.routes.length}</b><small>reproduced routes</small></span>
          </div>
          <p>{closedSegmentId ? `${closedSegmentId} is carried as scenario state.` : "No road closure is carried in this snapshot."}</p>
        </article>

        <article className="continuity-actions">
          <button type="button" onClick={() => void saveCapsule()} disabled={working}><i>1</i><span><b>{working ? "Verifying…" : "Save browser copy + JSON"}</b><small>SHA-256 integrity · bounded synthetic state</small></span><em>↓</em></button>
          <button type="button" onClick={() => void restoreBrowserCopy()} disabled={working || !localAvailable}><i>2</i><span><b>Verify device copy</b><small>{localAvailable ? "A local capsule is available" : "No local capsule on this device"}</small></span><em>↺</em></button>
          <label className={working ? "disabled" : ""}><i>3</i><span><b>Verify imported JSON</b><small>Recompute model, plan and every digest</small></span><em>↑</em><input type="file" accept="application/json,.json" disabled={working} onChange={(event) => { void importCapsule(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
        </article>

        <aside className={`continuity-proof ${status}`} aria-live="polite">
          <span>RECOVERY VERDICT</span>
          <h3>{message}</h3>
          {lastCapsule ? (
            <dl><div><dt>Capsule</dt><dd>{lastCapsule.payload.capsuleId}</dd></div><div><dt>Payload digest</dt><dd><code>{shortDigest(lastCapsule.payloadDigest)}</code></dd></div><div><dt>Created</dt><dd>{new Date(lastCapsule.payload.createdAt).toLocaleString()}</dd></div></dl>
          ) : (
            <ol><li><i>✓</i>Strict version and size contract</li><li><i>✓</i>Current regional-model digest</li><li><i>✓</i>Deterministic plan reproduction</li><li><i>!</i>Source freshness still requires live revalidation</li></ol>
          )}
          {localAvailable ? <button type="button" onClick={clearBrowserCopy}>Remove browser copy</button> : null}
        </aside>
      </div>

      <p className="continuity-boundary">This capsule preserves synthetic planning state—not the Lifeline Grid source code, map tiles, API key, live feeds or server ledger. Its hash detects accidental or unsophisticated modification; it is not a digital identity signature. Keep the source separately in GitHub and an offline ZIP.</p>
    </section>
  );
}
