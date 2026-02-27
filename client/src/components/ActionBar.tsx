import type { BattleParticipant, Ability } from "../types";
import { useState, useEffect } from "react";

interface Props {
  participant: BattleParticipant | null;
  selectedEnemyId: string | null;
  allParticipants?: BattleParticipant[];
  onAbility: (abilityName: string, targetAllyId?: string) => void;
  onAttack: () => void;
  onRecovery: (action: "rest" | "meditate") => void;
  disabled: boolean;
  battleFinished?: boolean;
  battleWon?: boolean;
  onContinue?: () => void;
}

export function ActionBar({
  participant,
  selectedEnemyId,
  allParticipants,
  onAbility,
  onAttack,
  onRecovery,
  disabled,
  battleFinished,
  battleWon,
  onContinue,
}: Props) {
  const [healingAbility, setHealingAbility] = useState<string | null>(null);

  // force close heal modal on character change
  useEffect(() => {
    setHealingAbility(null);
  }, [participant?.characterId]);

  // continue button
  if (battleFinished) {
    return (
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-sm font-medium mb-1">
              {battleWon ? "✓ Victory!" : "✗ Defeat"}
            </p>
            <p className="text-xs text-[var(--color-text-dim)]">
              {battleWon ? "Ready to advance" : "Run ended"}
            </p>
          </div>
          <button
            onClick={onContinue}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-lg bg-[var(--color-accent)] text-white font-bold text-sm hover:bg-[var(--color-accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-text-dim)] text-center">
          Select a character to act
        </p>
      </div>
    );
  }

  const char = participant.character;
  const abilities = participant.abilities ?? [];
  const needsEnemyTarget = !selectedEnemyId;

  // check used for targetted healing
  const isHealing = (ability: Ability) => ability.effects?.heal !== undefined;

  // and the actual use for targetted abilities
  const handleAbilityClick = (abilityName: string) => {
    const ability = abilities.find((a) => a.name === abilityName);
    if (!ability) return;

    if (isHealing(ability)) {
      // open the healing modal
      setHealingAbility(abilityName);
    } else {
      // or do damage/debuff or whatever else
      onAbility(abilityName);
    }
  };

  // ally selection handler
  const handleSelectAllyForHealing = (allyId: string) => {
    if (healingAbility) {
      onAbility(healingAbility, allyId);
      setHealingAbility(null);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{char.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
            {char.class}
          </span>
        </div>
        {needsEnemyTarget && (
          <span className="text-xs text-[var(--color-enemy)] animate-pulse">
            ← Select target
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Basic Attack */}
        <ActionButton
          label="Attack"
          description="Basic attack"
          onClick={onAttack}
          disabled={disabled || needsEnemyTarget}
          variant="attack"
        />

        {/* Abilities */}
        {abilities.map((ability) => {
          const canAfford = checkCost(participant, ability);
          const isHeal = isHealing(ability);
          const shouldDisable = isHeal ? false : needsEnemyTarget;
          const costType =
            (ability as any).costType || ability.resource || "stamina";
          return (
            <ActionButton
              key={ability.name}
              label={ability.name}
              description={`${ability.description}${ability.cost ? ` (${ability.cost} ${costType === "mana" ? "MP" : "SP"})` : ""}`}
              onClick={() => handleAbilityClick(ability.name)}
              disabled={disabled || shouldDisable || !canAfford}
              variant="ability"
              cost={
                ability.cost
                  ? `${ability.cost} ${costType === "mana" ? "MP" : "SP"}`
                  : undefined
              }
            />
          );
        })}

        {/* Recovery */}
        {participant.canRest && (
          <ActionButton
            label="Rest"
            description="Recover stamina"
            onClick={() => onRecovery("rest")}
            disabled={disabled}
            variant="recovery"
          />
        )}
        {participant.canMeditate && (
          <ActionButton
            label="Meditate"
            description="Recover mana"
            onClick={() => onRecovery("meditate")}
            disabled={disabled}
            variant="recovery"
          />
        )}
      </div>

      {/* Healing Target Popup */}
      {healingAbility && allParticipants && (
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]/30">
          <p className="text-xs text-[var(--color-text-dim)] mb-2">
            Select target to heal:
          </p>
          <div className="flex flex-wrap gap-2">
            {allParticipants
              .filter((p) => p.currentHp > 0)
              .map((p) => (
                <button
                  key={p.characterId}
                  onClick={() => handleSelectAllyForHealing(p.characterId)}
                  className="px-2 py-1 rounded text-xs border border-[var(--color-heal)]/50 bg-[var(--color-heal)]/10 hover:border-[var(--color-heal)] hover:bg-[var(--color-heal)]/20 transition-all cursor-pointer"
                >
                  {p.character.name} ({p.currentHp}/{p.character.maxHp})
                </button>
              ))}
            <button
              onClick={() => setHealingAbility(null)}
              className="px-2 py-1 rounded text-xs border border-[var(--color-text-dim)]/30 hover:border-[var(--color-text-dim)]/60 cursor-pointer opacity-50 hover:opacity-100 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  description,
  onClick,
  disabled,
  variant,
  cost,
}: {
  label: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  variant: "attack" | "ability" | "recovery";
  cost?: string;
}) {
  const colors = {
    attack:
      "border-[var(--color-damage)]/50 hover:border-[var(--color-damage)] hover:bg-[var(--color-damage)]/10",
    ability:
      "border-[var(--color-accent)]/50 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10",
    recovery:
      "border-[var(--color-heal)]/50 hover:border-[var(--color-heal)] hover:bg-[var(--color-heal)]/10",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={description}
      className={`px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer
        ${
          disabled
            ? "border-[var(--color-border)]/30 text-[var(--color-text-dim)]/50 cursor-not-allowed opacity-40"
            : `${colors[variant]} bg-[var(--color-surface)]`
        }`}
    >
      <span>{label}</span>
      {cost && (
        <span className="ml-1 text-[10px] text-[var(--color-text-dim)]">
          ({cost})
        </span>
      )}
    </button>
  );
}

function checkCost(participant: BattleParticipant, ability: Ability): boolean {
  if (!ability.cost) return true;
  if (ability.resource === "mana")
    return participant.currentMana >= ability.cost;
  if (ability.resource === "stamina")
    return participant.currentStamina >= ability.cost;
  return true;
}
