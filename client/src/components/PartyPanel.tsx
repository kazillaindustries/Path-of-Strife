import type { BattleParticipant, StatusEffect } from "../types";

interface Props {
  participants: BattleParticipant[];
  statusEffects: StatusEffect[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
}

export function PartyPanel({
  participants,
  statusEffects,
  selectedCharacterId,
  onSelectCharacter,
}: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-accent)] mb-3">
        Party
      </h2>
      {participants.map((p) => {
        const char = p.character;
        const isSelected = selectedCharacterId === p.characterId;
        const isDead = p.currentHp <= 0;
        const hasActed = p.hasActed;
        const effects = statusEffects.filter(
          (e) => e.targetId === p.characterId || e.targetId === "party",
        );

        const hpPercent = Math.max(0, (p.currentHp / char.maxHp) * 100);
        const manaPercent =
          char.maxMana > 0
            ? Math.max(0, (p.currentMana / char.maxMana) * 100)
            : 0;
        const staminaPercent =
          char.maxStamina > 0
            ? Math.max(0, (p.currentStamina / char.maxStamina) * 100)
            : 0;

        return (
          <button
            key={p.id}
            onClick={() =>
              !isDead && !hasActed && onSelectCharacter(p.characterId)
            }
            disabled={isDead || hasActed}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              isDead
                ? "border-[var(--color-border)]/50 bg-[var(--color-surface)]/50 opacity-40 cursor-not-allowed"
                : hasActed
                  ? "border-[var(--color-border)]/50 bg-[var(--color-surface)] opacity-60 cursor-not-allowed"
                  : isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 cursor-pointer"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/50 cursor-pointer"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{char.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                  {char.class}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isDead && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-damage)]/20 text-[var(--color-damage)]">
                    DEAD
                  </span>
                )}
                {hasActed && !isDead && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-text-dim)]/20 text-[var(--color-text-dim)]">
                    DONE
                  </span>
                )}
                <span className="text-xs text-[var(--color-text-dim)]">
                  Lv.{char.level}
                </span>
              </div>
            </div>

            {/* HP Bar */}
            <ResourceBar
              current={p.currentHp}
              max={char.maxHp}
              percent={hpPercent}
              color="var(--color-hp)"
              label="HP"
            />

            {/* Mana Bar (if applicable) */}
            {char.maxMana > 0 && (
              <ResourceBar
                current={p.currentMana}
                max={char.maxMana}
                percent={manaPercent}
                color="var(--color-mana)"
                label="MP"
              />
            )}

            {/* Stamina Bar (if applicable) */}
            {char.maxStamina > 0 && (
              <ResourceBar
                current={p.currentStamina}
                max={char.maxStamina}
                percent={staminaPercent}
                color="var(--color-stamina)"
                label="SP"
              />
            )}

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
    </div>
  );
}

function ResourceBar({
  current,
  max,
  percent,
  color,
  label,
}: {
  current: number;
  max: number;
  percent: number;
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[10px] w-5 text-[var(--color-text-dim)]">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-[var(--color-text-dim)] w-14 text-right">
        {current}/{max}
      </span>
    </div>
  );
}

function formatEffectName(type: string): string {
  const emojiMap: Record<string, string> = {
    burn: "🔥",
    poison: "☠️",
    slow: "🐌",
    blind: "🌑",
    frenzy: "😤",
    haste: "⚡",
    partyEvasion: "💨",
    partyDamageBuff: "🎵",
    selfDamageBuff: "💪",
    shieldUntilHit: "🛡️",
    parry: "⚔️🛡️",
    partyDamageReduction: "🛡️↑",
    huntersMark: "🎯",
    vulnerability: "💔",
    selfWeakness: "💀",
    bossDamageReduction: "🛡️↓",
  };

  const nameMap: Record<string, string> = {
    burn: "Burn",
    poison: "Poison",
    slow: "Slow",
    blind: "Blind",
    frenzy: "Frenzy",
    haste: "Haste",
    partyEvasion: "Party Evasion",
    partyDamageBuff: "Party Damage Buff",
    selfDamageBuff: "Damage Buff",
    shieldUntilHit: "Shield",
    parry: "Parry",
    partyDamageReduction: "Party Protection",
    huntersMark: "Hunter's Mark",
    vulnerability: "Vulnerability",
    selfWeakness: "Weakness",
    bossDamageReduction: "Weakened",
  };

  const emoji = emojiMap[type] ?? "";
  const name = nameMap[type] ?? type;
  return emoji ? `${emoji} ${name}` : name;
}
