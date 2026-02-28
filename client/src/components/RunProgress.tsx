import { useState, useEffect, useCallback } from "react";
import ReportBugButton from "./ReportBugButton";
import { useParams, useNavigate } from "react-router-dom";
import {
  getRun,
  advanceRun,
  abandonRun,
  getShop,
  purchaseBlessing,
} from "../api";

interface RunPath {
  areaName: string;
  stageName: string;
}

interface ShopService {
  key: string;
  name: string;
  description: string;
  cost: number;
  instant: boolean;
}

interface ShopInfo {
  services: ShopService[];
  currentBlessings: string[];
  gold: number;
}

export function RunProgress() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const [run, setRun] = useState<any>(null);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRun = useCallback(async () => {
    if (!runId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getRun(runId);
      setRun(data);
      if (data.atRestStop) {
        const shopData = await getShop(runId);
        setShop(shopData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  const handleAdvance = async () => {
    if (!runId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await advanceRun(runId);
      setRun(result.run);
      setMessage(result.message);

      if (result.restStop) {
        const shopData = await getShop(runId);
        setShop(shopData);
      } else if (result.nextBattle) {
        navigate(`/battle/${result.nextBattle.id}?runId=${runId}`);
      } else if (result.run.finished) {
        await loadRun();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (serviceKey: string) => {
    if (!runId) return;
    try {
      setLoading(true);
      setError(null);
      await purchaseBlessing(runId, serviceKey);
      // fetch shop data
      const updatedShop = await getShop(runId);
      setShop(updatedShop);
      setMessage(`Purchased ${serviceKey}!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!runId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await advanceRun(runId);
      setRun(result.run);
      setShop(null);
      setMessage(result.message);
      if (result.nextBattle) {
        navigate(`/battle/${result.nextBattle.id}?runId=${runId}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAbandon = async () => {
    if (!runId || !confirm("Abandon this run?")) return;
    try {
      await abandonRun(runId);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading && !run) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-[var(--color-text-dim)]">Loading run...</span>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] max-w-md text-center space-y-4">
          <p className="text-[var(--color-damage)]">
            {error ?? "Run not found"}
          </p>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-[var(--color-text-dim)] hover:text-[var(--color-text)] cursor-pointer"
          >
            ← Home
          </button>
        </div>
      </div>
    );
  }

  const path: RunPath[] = run.path ?? [];
  const currentAreaName = path[run.currentArea]?.areaName ?? "Complete";
  const currentStageName = path[run.currentArea]?.stageName ?? "";
  const currentBattle = run.battles?.length
    ? run.battles[run.battles.length - 1]
    : null;

  // end screen
  if (run.finished) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] max-w-lg w-full text-center space-y-4">
          <h1
            className={`text-2xl font-bold ${run.won ? "text-[var(--color-heal)]" : "text-[var(--color-damage)]"}`}
          >
            {run.won ? "🏆 Victory!" : "💀 Defeat"}
          </h1>
          <p className="text-[var(--color-text-dim)]">
            {run.won ? "All areas conquered!" : "Your party was defeated."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm cursor-pointer"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  // rest stop screen
  if (run.atRestStop && shop) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">⛺ Rest Stop</h1>
            <p className="text-sm text-[var(--color-text-dim)]">
              Next: {currentAreaName} — {currentStageName}
            </p>
          </div>
          <div className="text-right flex items-center gap-2">
              <div className="text-[var(--color-gold)] font-bold">
                {shop.gold}g
              </div>
              <div className="text-xs text-[var(--color-text-dim)]">Gold</div>
              <ReportBugButton screen="rest-stop" context={{ runId: runId ?? null }} />
            </div>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-[var(--color-damage)]/10 border border-[var(--color-damage)]/30 text-sm text-[var(--color-damage)]">
            {error}
          </div>
        )}
        {message && (
          <div className="px-3 py-2 rounded-lg bg-[var(--color-heal)]/10 border border-[var(--color-heal)]/30 text-sm text-[var(--color-heal)]">
            {message}
          </div>
        )}

        <div className="space-y-3">
          {shop.services.map((svc) => {
            const purchased = shop.currentBlessings.includes(svc.key);
            const canAfford = shop.gold >= svc.cost;
            return (
              <div
                key={svc.key}
                className={`p-4 rounded-lg border ${purchased ? "border-[var(--color-heal)]/30 bg-[var(--color-heal)]/5" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{svc.name}</span>
                  <div className="flex items-center gap-2">
                    {purchased ? (
                      <span className="text-xs text-[var(--color-heal)]">
                        ✓ Purchased
                      </span>
                    ) : (
                      <>
                        <span
                          className={`text-sm font-bold ${canAfford ? "text-[var(--color-gold)]" : "text-[var(--color-damage)]"}`}
                        >
                          {svc.cost}g
                        </span>
                        <button
                          onClick={() => handlePurchase(svc.key)}
                          disabled={!canAfford || loading}
                          className="px-3 py-1 rounded-lg bg-[var(--color-accent)] text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Buy
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-dim)]">
                  {svc.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-heal)]/20 text-[var(--color-heal)] font-medium hover:bg-[var(--color-heal)]/30 disabled:opacity-40 cursor-pointer"
          >
            Continue to {currentAreaName} →
          </button>
          <button
            onClick={handleAbandon}
            disabled={loading}
            className="px-4 py-3 rounded-lg border border-[var(--color-damage)]/30 text-[var(--color-damage)] text-sm hover:bg-[var(--color-damage)]/10 cursor-pointer"
          >
            Abandon
          </button>
        </div>
      </div>
    );
  }

  // progress
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">⚔️ Run Progress</h1>
          <p className="text-sm text-[var(--color-text-dim)]">
            {currentAreaName} — {currentStageName}
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] cursor-pointer"
        >
          ← Home
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-[var(--color-damage)]/10 border border-[var(--color-damage)]/30 text-sm text-[var(--color-damage)]">
          {error}
        </div>
      )}
      {message && (
        <div className="px-3 py-2 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-sm text-[var(--color-accent)]">
          {message}
        </div>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[var(--color-text-dim)]">
          <span>
            Area {run.currentArea + 1}/{run.totalAreas}
          </span>
          <span>
            Battle {run.currentBattle + 1}/{run.battlesPerArea}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all"
            style={{
              width: `${((run.currentArea * run.battlesPerArea + run.currentBattle) / run.totalBattles) * 100}%`,
            }}
          />
        </div>
        <div className="flex gap-1">
          {path.map((p: RunPath, i: number) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full ${i < run.currentArea ? "bg-[var(--color-heal)]" : i === run.currentArea ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
              title={`${p.areaName} — ${p.stageName}`}
            />
          ))}
        </div>
      </div>

      {/* Area cards */}
      <div className="flex flex-col gap-2">
        {path.map((p: RunPath, i: number) => (
          <div
            key={i}
            className={`w-full p-3 rounded-lg border ${i === run.currentArea ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : i < run.currentArea ? "border-[var(--color-heal)]/30 bg-[var(--color-heal)]/5" : "border-[var(--color-border)] bg-[var(--color-surface)] opacity-50"}`}
          >
            <div className="text-sm font-medium">{p.areaName}</div>
            <div className="text-xs text-[var(--color-text-dim)]">
              {p.stageName}
            </div>
            {i < run.currentArea && (
              <span className="text-[10px] text-[var(--color-heal)]">
                ✓ Cleared
              </span>
            )}
            {i === run.currentArea && (
              <span className="text-[10px] text-[var(--color-accent)]">
                ● Current
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {currentBattle && !currentBattle.finished && (
          <button
            onClick={() =>
              navigate(`/battle/${currentBattle.id}?runId=${runId}`)
            }
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent)]/80 cursor-pointer"
          >
            Enter Battle →
          </button>
        )}
        {currentBattle?.finished && currentBattle.won && (
          <button
            onClick={handleAdvance}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-heal)]/20 text-[var(--color-heal)] font-medium hover:bg-[var(--color-heal)]/30 disabled:opacity-40 cursor-pointer"
          >
            {loading ? "Advancing..." : "Advance →"}
          </button>
        )}
        {currentBattle?.finished && !currentBattle.won && (
          <div className="flex-1 text-center py-3 text-[var(--color-damage)]">
            Battle Lost — Run Failed
          </div>
        )}
        <button
          onClick={handleAbandon}
          disabled={loading}
          className="px-4 py-3 rounded-lg border border-[var(--color-damage)]/30 text-[var(--color-damage)] text-sm hover:bg-[var(--color-damage)]/10 cursor-pointer"
        >
          Abandon
        </button>
      </div>
    </div>
  );
}
