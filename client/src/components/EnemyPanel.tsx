import type { BattleEnemy, StatusEffect } from "../types";

interface Props {
  enemies: BattleEnemy[];
  statusEffects: StatusEffect[];
  selectedEnemyId: string | null;
  onSelectEnemy: (id: string) => void;
}

export function EnemyPanel({
  enemies,
  statusEffects,
  selectedEnemyId,
  onSelectEnemy,
}: Props) {
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  const deadEnemies = enemies.filter((e) => e.hp <= 0);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-enemy)] mb-3">
        Enemies
      </h2>
      {aliveEnemies.map((enemy) => {
        const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
        const isSelected = selectedEnemyId === enemy.id;
        const effects = statusEffects.filter((e) => e.targetId === enemy.id);

        return (
          <button
            key={enemy.id}
            onClick={() => onSelectEnemy(enemy.id)}
            className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
              isSelected
                ? "border-[var(--color-enemy)] bg-[var(--color-enemy)]/10"
                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-enemy)]/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">
                {enemy.isBoss && (
                  <span className="text-[var(--color-enemy)] mr-1">★</span>
                )}
                {enemy.name}
              </span>
              <span className="text-xs text-[var(--color-text-dim)]">
                {enemy.hp}/{enemy.maxHp}
              </span>
            </div>

            {/* HP Bar */}
            <div className="h-2 bg-[var(--color-bg)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${hpPercent}%`,
                  backgroundColor:
                    hpPercent > 50
                      ? "#22c55e"
                      : hpPercent > 25
                        ? "#eab308"
                        : "#ef4444",
                }}
              />
            </div>

            {/* Status effects */}
            {effects.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {effects.map((eff) => (
                  <span
                    key={eff.id}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] text-[var(--color-text-dim)]"
                    title={`${eff.type} (${eff.turnsRemaining} turns)`}
                  >
                    {formatEffectName(eff.type)}
                    {eff.turnsRemaining < 999 && ` ${eff.turnsRemaining}`}
                  </span>
                ))}
              </div>
            )}
          </button>
        );
      })}

      {deadEnemies.length > 0 && (
        <div className="mt-2 space-y-1">
          {deadEnemies.map((enemy) => (
            <div
              key={enemy.id}
              className="p-2 rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-surface)]/50 opacity-40"
            >
              <span className="text-xs line-through text-[var(--color-text-dim)]">
                {enemy.isBoss && "★ "}
                {enemy.name} — Defeated
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatEffectName(type: string): string {
  const map: Record<string, string> = {
    burn: "🔥",
    poison: "☠️",
    slow: "🐌",
    blind: "🌑",
    huntersMark: "🎯",
    vulnerability: "💔",
    bossDamageReduction: "🛡️↓",
  };
  return map[type] ?? type;
}
