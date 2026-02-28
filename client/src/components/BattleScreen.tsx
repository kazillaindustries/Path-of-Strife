import { useState, useCallback, useEffect } from "react";
import ReportBugButton from "./ReportBugButton";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import type { Battle, BattleEvent } from "../types";
import { getBattle, useAbility, useBasicAttack, useRecovery } from "../api";
import { EnemyPanel } from "./EnemyPanel";
import { PartyPanel } from "./PartyPanel";
import { ActionBar } from "./ActionBar";
import { BattleLog } from "./BattleLog";

export function BattleScreen() {
  const { battleId: routeBattleId } = useParams<{ battleId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runId = searchParams.get("runId");

  const [battleId, setBattleId] = useState<string>(routeBattleId ?? "");
  const [battle, setBattle] = useState<Battle | null>(null);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // big brain stuff over here
  const loadBattle = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBattle(id);
      setBattle(data);
      setBattleId(id);
      // pick first char that hasnt acted yet
      const firstReady = data.participants.find(
        (p) => p.currentHp > 0 && !p.hasActed,
      );
      setSelectedCharacterId(firstReady?.characterId ?? null);
      // pick the first alive enemy
      const firstEnemy = data.enemies.find((e) => e.hp > 0);
      setSelectedEnemyId(firstEnemy?.id ?? null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // grab the battle id from the url and load it
  useEffect(() => {
    if (routeBattleId) {
      loadBattle(routeBattleId);
    }
  }, [routeBattleId, loadBattle]);

  // update everything after an action happens
  const handleResult = useCallback(
    async (result: any) => {
      // throw the events in the log
      const newEvents: BattleEvent[] = result.events ?? [];
      setEvents((prev) => [...prev, ...newEvents]);

      // refresh battle with all the new data
      const fresh = await getBattle(battleId);
      setBattle(fresh);

      // pick the next char to go
      const nextReady = fresh.participants.find(
        (p) => p.currentHp > 0 && !p.hasActed,
      );
      setSelectedCharacterId(nextReady?.characterId ?? null);

      // if the target is dead grab another one
      const currentEnemy = fresh.enemies.find(
        (e) => e.id === selectedEnemyId && e.hp > 0,
      );
      if (!currentEnemy) {
        const nextEnemy = fresh.enemies.find((e) => e.hp > 0);
        setSelectedEnemyId(nextEnemy?.id ?? null);
      }
    },
    [selectedEnemyId, battleId],
  );

  const handleAbility = useCallback(
    async (abilityName: string, targetAllyId?: string) => {
      if (!battle || !selectedCharacterId) return;

      let targetEnemyId: string;
      if (targetAllyId) {
        targetEnemyId = "dummy";
      } else if (selectedEnemyId) {
        targetEnemyId = selectedEnemyId;
      } else {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await useAbility(
          battle.id,
          selectedCharacterId,
          abilityName,
          targetEnemyId,
          targetAllyId,
        );
        handleResult(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [battle, selectedCharacterId, selectedEnemyId, handleResult],
  );

  const handleAttack = useCallback(async () => {
    if (!battle || !selectedCharacterId || !selectedEnemyId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await useBasicAttack(
        battle.id,
        selectedCharacterId,
        selectedEnemyId,
      );
      handleResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [battle, selectedCharacterId, selectedEnemyId, handleResult]);

  const handleRecovery = useCallback(
    async (action: "rest" | "meditate") => {
      if (!battle || !selectedCharacterId) return;
      try {
        setLoading(true);
        setError(null);
        const result = await useRecovery(
          battle.id,
          selectedCharacterId,
          action,
        );
        handleResult(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [battle, selectedCharacterId, handleResult],
  );

  // report handled by ReportBugButton

  const handleContinue = useCallback(() => {
    if (runId) {
      navigate(`/run-progress/${runId}`);
    } else {
      setBattle(null);
      setEvents([]);
      setBattleId("");
      navigate("/");
    }
  }, [runId, navigate]);

  // show input screen if no battle loaded
  if (!battle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] max-w-md w-full">
          <h1 className="text-xl font-bold mb-4">Battle Viewer</h1>
          <p className="text-sm text-[var(--color-text-dim)] mb-4">
            Enter a battle ID to load it, or start a run from the home page.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={battleId}
              onChange={(e) => setBattleId(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && battleId && loadBattle(battleId)
              }
              placeholder="Battle ID..."
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              onClick={() => battleId && loadBattle(battleId)}
              disabled={!battleId || loading}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent)]/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Loading..." : "Load"}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-[var(--color-damage)]">{error}</p>
          )}
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] cursor-pointer"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // render the battle screen
  const selectedParticipant =
    battle.participants.find((p) => p.characterId === selectedCharacterId) ??
    null;

  return (
    <div className="h-screen flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Battle</h1>
          <span className="text-sm text-[var(--color-text-dim)]">
            Turn {battle.turn}
          </span>
          {battle.finished && (
            <span
              className={`text-sm font-bold px-2 py-0.5 rounded ${
                battle.won
                  ? "bg-[var(--color-heal)]/20 text-[var(--color-heal)]"
                  : "bg-[var(--color-damage)]/20 text-[var(--color-damage)]"
              }`}
            >
              {battle.won ? "VICTORY" : "DEFEAT"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ReportBugButton screen="battle" context={{ battleId: battle.id }} />
          <button
            onClick={() => {
              if (runId) {
                navigate(`/run-progress/${runId}`);
              } else {
                setBattle(null);
                setEvents([]);
                setBattleId("");
                navigate("/");
              }
            }}
            className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] cursor-pointer"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-[var(--color-damage)]/10 border border-[var(--color-damage)]/30 text-sm text-[var(--color-damage)]">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 grid grid-cols-[280px_1fr_320px] gap-4 min-h-0">
        {/* Left: Enemies */}
        <div className="overflow-y-auto">
          <EnemyPanel
            enemies={battle.enemies}
            statusEffects={battle.statusEffects}
            selectedEnemyId={selectedEnemyId}
            onSelectEnemy={setSelectedEnemyId}
          />
        </div>

        {/* Center: Battle Log */}
        <div className="min-h-0">
          <BattleLog events={events} />
        </div>

        {/* Right: Party */}
        <div className="overflow-y-auto">
          <PartyPanel
            participants={battle.participants}
            statusEffects={battle.statusEffects}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
          />
        </div>
      </div>

      {/* Bottom: Actions */}
      <ActionBar
        participant={selectedParticipant}
        selectedEnemyId={selectedEnemyId}
        allParticipants={battle.participants}
        onAbility={handleAbility}
        onAttack={handleAttack}
        onRecovery={handleRecovery}
        disabled={loading}
        battleFinished={battle.finished}
        battleWon={battle.won}
        onContinue={handleContinue}
      />
    </div>
  );
}
