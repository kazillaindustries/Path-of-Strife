import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getActiveRun,
  startRun,
  advanceRun,
  abandonRun,
  getShop,
  purchaseBlessing,
} from "../api";

interface RunPath {
  areaName: string;
  stageName: string;
}

interface RunData {
  id: string;
  partyId: string;
  path: RunPath[];
  currentArea: number;
  currentBattle: number;
  finished: boolean;
  won: boolean;
  atRestStop: boolean;
  blessings: string[];
  totalAreas: number;
  battlesPerArea: number;
  totalBattles: number;
  progress?: {
    area: number;
    areaName: string;
    stageName: string;
    battle: number;
    battleType: string;
  };
  battles?: {
    id: string;
    finished: boolean;
    won: boolean;
  }[];
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

export function RunScreen() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();

  const [run, setRun] = useState<RunData | null>(null);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // start/resume run
  const initRun = useCallback(async () => {
    if (!partyId) return;
    try {
      setLoading(true);
      setError(null);

      // check for ongoing run
      try {
        const existingRun = await getActiveRun(partyId);
        setRun(existingRun);

        // check if at the shop -> load shop
        if (existingRun.atRestStop) {
          const shopData = await getShop(existingRun.id);
          setShop(shopData);
          return;
        }

        // and check if in combat -> load combat
        const lastBattle = existingRun.battles?.length
          ? existingRun.battles[existingRun.battles.length - 1]
          : null;
        if (lastBattle && !lastBattle.finished) {
          navigate(`/battle/${lastBattle.id}?runId=${existingRun.id}`, {
            replace: true,
          });
        }
        return;
      } catch {
        // else no active run -> we go agane
      }

      const result = await startRun(partyId);
      setRun(result.run);
      setMessage(null);

      // navigate to battle
      if (result.currentBattle) {
        navigate(`/battle/${result.currentBattle.id}?runId=${result.run.id}`, {
          replace: true,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [partyId, navigate]);

  useEffect(() => {
    initRun();
  }, [initRun]);

  // this saves the id to resume
  useEffect(() => {
    if (run?.id && partyId) {
      localStorage.setItem(`run_${partyId}`, run.id);
    }
  }, [run?.id, partyId]);

  // go next
  const handleAdvance = async () => {
    if (!run) return;
    try {
      setLoading(true);
      setError(null);
      const result = await advanceRun(run.id);
      setRun(result.run);
      setMessage(result.message);

      if (result.restStop) {
        // load shop
        const shopData = await getShop(run.id);
        setShop(shopData);
      } else if (result.nextBattle) {
        navigate(`/battle/${result.nextBattle.id}?runId=${run.id}`);
      } else if (result.run.finished) {
        if (partyId) localStorage.removeItem(`run_${partyId}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // blessing handler
  const handlePurchase = async (serviceKey: string) => {
    if (!run) return;
    try {
      setLoading(true);
      setError(null);
      await purchaseBlessing(run.id, serviceKey);
      // refetch and update shop when player buys shit
      const updatedShop = await getShop(run.id);
      setShop(updatedShop);
      setMessage(`Purchased ${serviceKey}!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // resume from shop
  const handleContinue = async () => {
    if (!run) return;
    try {
      setLoading(true);
      setError(null);
      const result = await advanceRun(run.id);
      setRun(result.run);
      setShop(null);
      setMessage(result.message);

      if (result.nextBattle) {
        navigate(`/battle/${result.nextBattle.id}?runId=${run.id}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // abandon run
  const handleAbandon = async () => {
    if (!run || !confirm("Abandon this run? Progress will be lost.")) return;
    try {
      setLoading(true);
      await abandonRun(run.id);
      if (partyId) localStorage.removeItem(`run_${partyId}`);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // show loading while starting the run
  if (loading && !run) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-[var(--color-text-dim)]">Starting run...</span>
      </div>
    );
  }

  // couldn't load the run
  if (!run) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-bold">Run Error</h1>
          {error && (
            <p className="text-sm text-[var(--color-damage)]">{error}</p>
          )}
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:text-[var(--color-text)] text-[var(--color-text-dim)] cursor-pointer"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const path = run.path ?? [];
  const currentAreaName = path[run.currentArea]?.areaName ?? "Complete";
  const currentStageName = path[run.currentArea]?.stageName ?? "";

  // finds last created battle
  const currentBattle = run.battles?.length
    ? run.battles[run.battles.length - 1]
    : null;

  // run over
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
            {run.won
              ? "Your party conquered all areas!"
              : "Your party was defeated. Better luck next time."}
          </p>
          {message && (
            <p className="text-sm text-[var(--color-text)]">{message}</p>
          )}
          <button
            onClick={() => {
              if (partyId) localStorage.removeItem(`run_${partyId}`);
              navigate("/");
            }}
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // rest stop
  if (run.atRestStop && shop) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">⛺ Rest Stop</h1>
            <p className="text-sm text-[var(--color-text-dim)]">
              Next area: {currentAreaName} — {currentStageName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[var(--color-gold)] font-bold">
              {shop.gold}g
            </div>
            <div className="text-xs text-[var(--color-text-dim)]">
              Party Gold
            </div>
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
          {shop.services.map((service) => {
            const purchased = shop.currentBlessings.includes(service.key);
            const canAfford = shop.gold >= service.cost;
            return (
              <div
                key={service.key}
                className={`p-4 rounded-lg border ${
                  purchased
                    ? "border-[var(--color-heal)]/30 bg-[var(--color-heal)]/5"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{service.name}</span>
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
                          {service.cost}g
                        </span>
                        <button
                          onClick={() => handlePurchase(service.key)}
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
                  {service.description}
                </p>
                {service.instant && (
                  <span className="text-[10px] text-[var(--color-mana)] mt-1 inline-block">
                    Applied immediately
                  </span>
                )}
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

  // run in progress
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

      {/* Progress bar */}
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
          {path.map((p, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i < run.currentArea
                  ? "bg-[var(--color-heal)]"
                  : i === run.currentArea
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-border)]"
              }`}
              title={`${p.areaName} — ${p.stageName}`}
            />
          ))}
        </div>
      </div>

      {/* Area path display */}
      <div className="grid grid-cols-2 gap-2">
        {path.map((p, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg border ${
              i === run.currentArea
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                : i < run.currentArea
                  ? "border-[var(--color-heal)]/30 bg-[var(--color-heal)]/5"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] opacity-50"
            }`}
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
              navigate(`/battle/${currentBattle.id}?runId=${run.id}`)
            }
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent)]/80 cursor-pointer"
          >
            Enter Battle →
          </button>
        )}
        {currentBattle && currentBattle.finished && currentBattle.won && (
          <button
            onClick={handleAdvance}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-heal)]/20 text-[var(--color-heal)] font-medium hover:bg-[var(--color-heal)]/30 disabled:opacity-40 cursor-pointer"
          >
            {loading ? "Advancing..." : "Advance →"}
          </button>
        )}
        {currentBattle && currentBattle.finished && !currentBattle.won && (
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
