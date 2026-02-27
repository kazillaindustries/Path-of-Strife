// shared types

export interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  battlesWon: number;
}

export interface BattleParticipant {
  id: string;
  characterId: string;
  battleId: string;
  currentHp: number;
  currentMana: number;
  currentStamina: number;
  hasActed: boolean;
  toggles: string[];
  character: Character;
  // populated by getBattleById call
  abilities?: Ability[];
  passive?: { name: string; description: string };
  canRest?: boolean;
  canMeditate?: boolean;
}

export interface Ability {
  name: string;
  resource?: "stamina" | "mana";
  cost?: number;
  description: string;
  unlockLevel: number;
  effects?: {
    heal?: { dice: number; sides: number; modifier?: number };
    damage?: any;
    [key: string]: any;
  };
}

export interface EnemyAbility {
  name: string;
  damage?: { dice: number; sides: number; modifier?: number };
  aoe?: boolean;
  selfHealPercent?: number;
  selfBuff?: { type: string; percent: number; turns: number };
  selfShield?: { percent: number; turns: number };
  effects?: Record<string, unknown>;
  weight: number;
}

export interface BattleEnemy {
  id: string;
  definitionName: string;
  name: string;
  hp: number;
  maxHp: number;
  abilities: EnemyAbility[];
  phases?: { hpPercent: number; message: string; damageMultiplier?: number }[];
  isBoss: boolean;
}

export interface StatusEffect {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  turnsRemaining: number;
  value?: number;
}

export interface BattleEvent {
  type: string;
  actorId?: string;
  targetId?: string;
  damage?: number;
  healing?: number;
  message?: string;
  enemyName?: string;
  effectName?: string;
  characterName?: string;
  goldReward?: number;
  xpReward?: number;
}

export interface Battle {
  id: string;
  type: string;
  turn: number;
  finished: boolean;
  won: boolean;
  partyId: string;
  runId: string | null;
  enemies: BattleEnemy[];
  statusEffects: StatusEffect[];
  participants: BattleParticipant[];
}

export interface ActionResult {
  battle: Battle;
  events: BattleEvent[];
}
