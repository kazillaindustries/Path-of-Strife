// enemy scaling by area cuz i CANNOT be fucked to rebalance everything 1 by one
export const ENEMY_SCALING_MULTIPLIERS = [1.0, 1.2, 1.4, 1.7];

// enemy ability types

export interface EnemyAbility {
  name: string;
  damage?: { dice: number; sides: number; modifier?: number };
  heal?: { dice: number; sides: number; modifier?: number };
  aoe?: boolean;
  selfHealPercent?: number;
  selfBuff?: { type: "damageUp"; percent: number; turns: number };
  selfShield?: { percent: number; turns: number };
  effects?: {
    burn?: { dice: number; sides: number; turns: number };
    poison?: { dice: number; sides: number; turns: number };
    slow?: { turns: number };
    blind?: { chance: number; turns: number };
  };
  weight: number; // probability weight for better rng
}

export interface BossPhase {
  hpPercent: number; // to trigger phase transitions
  message: string;
  damageMultiplier?: number;
  extraAbilities?: EnemyAbility[];
}

// enemy definitions
export interface EnemyDefinition {
  name: string;
  hp: number;
  abilities: EnemyAbility[];
  phases?: BossPhase[]; // only used for bosses
}

// enemy states
export interface BattleEnemy {
  id: string; // for instancing enemy ids
  definitionName: string;
  name: string; // for instancing the actual display name
  hp: number;
  maxHp: number;
  abilities: EnemyAbility[];
  phases?: BossPhase[];
  isBoss: boolean;
}

// stage and area definitions

export interface StageDefinition {
  name: string;
  description: string;
  enemyPool: EnemyDefinition[]; // regular enemies to pull 4-5 from
  boss: EnemyDefinition; // boss for battle 3
  bossAds?: EnemyDefinition[]; // additional enemies that spawn with boss
}

export interface AreaDefinition {
  name: string;
  order: number;
  stages: StageDefinition[];
}

// area data

export const AREAS: AreaDefinition[] = [
  // forest (early game)
  {
    name: "Forest",
    order: 1,
    stages: [
      {
        name: "Goblin Camp",
        description: "A crude camp of goblins, led by their vicious chieftain.",
        enemyPool: [
          {
            name: "Goblin Warrior",
            hp: 25,
            abilities: [
              { name: "Slash", damage: { dice: 1, sides: 6, modifier: 1 }, weight: 3 },
              { name: "Shield Bash", damage: { dice: 1, sides: 4 }, weight: 1 },
            ],
          },
          {
            name: "Goblin Archer",
            hp: 22,
            abilities: [
              { name: "Arrow Shot", damage: { dice: 1, sides: 8 }, weight: 3 },
              {
                name: "Poison Arrow",
                damage: { dice: 1, sides: 4 },
                effects: { poison: { dice: 1, sides: 3, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Goblin Shaman",
            hp: 21,
            abilities: [
              { name: "Dark Bolt", damage: { dice: 1, sides: 8 }, weight: 2 },
              { name: "Hex", effects: { slow: { turns: 1 } }, weight: 1 },
              {
                name: "War Chant",
                selfBuff: { type: "damageUp", percent: 20, turns: 2 },
                weight: 1,
              },
            ],
          },
        ],
        boss: {
          name: "Goblin Chieftain",
          hp: 72,
          abilities: [
            { name: "Cleave", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 3 },
            { name: "Rally Cry", selfBuff: { type: "damageUp", percent: 25, turns: 2 }, weight: 1 },
            {
              name: "Poison Dagger",
              damage: { dice: 1, sides: 4 },
              effects: { poison: { dice: 1, sides: 4, turns: 2 } },
              weight: 1,
            },
          ],
        },
        bossAds: [
          {
            name: "Goblin Guard",
            hp: 28,
            abilities: [{ name: "Stab", damage: { dice: 1, sides: 6, modifier: 1 }, weight: 1 }],
          },
          {
            name: "Goblin Guard",
            hp: 28,
            abilities: [{ name: "Stab", damage: { dice: 1, sides: 6, modifier: 1 }, weight: 1 }],
          },
          {
            name: "Goblin Skulker",
            hp: 23,
            abilities: [{ name: "Backstab", damage: { dice: 1, sides: 8 }, weight: 1 }],
          },
        ],
      },
      {
        name: "Overgrown Grove",
        description: "Ancient trees stir with malice, animated by a dark presence.",
        enemyPool: [
          {
            name: "Twig Blight",
            hp: 22,
            abilities: [
              { name: "Branch Swipe", damage: { dice: 1, sides: 6 }, weight: 3 },
              { name: "Root Trip", effects: { slow: { turns: 1 } }, weight: 1 },
            ],
          },
          {
            name: "Vine Creeper",
            hp: 25,
            abilities: [
              { name: "Constrict", damage: { dice: 1, sides: 8 }, weight: 2 },
              {
                name: "Thorn Spit",
                damage: { dice: 1, sides: 4 },
                effects: { poison: { dice: 1, sides: 3, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Spore Fungus",
            hp: 25,
            abilities: [
              { name: "Spore Cloud", damage: { dice: 1, sides: 6 }, aoe: true, weight: 1 },
              {
                name: "Toxic Burst",
                effects: { poison: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
        ],
        boss: {
          name: "Ancient Treant",
          hp: 81,
          abilities: [
            { name: "Root Slam", damage: { dice: 2, sides: 6 }, weight: 3 },
            { name: "Entangling Roots", effects: { slow: { turns: 2 } }, weight: 1 },
            { name: "Vine Whip", damage: { dice: 1, sides: 4 }, aoe: true, weight: 1 },
          ],
        },
        bossAds: [
          {
            name: "Twig Blight",
            hp: 16,
            abilities: [{ name: "Branch Swipe", damage: { dice: 1, sides: 6 }, weight: 1 }],
          },
          {
            name: "Vine Creeper",
            hp: 18,
            abilities: [{ name: "Constrict", damage: { dice: 1, sides: 8 }, weight: 1 }],
          },
          {
            name: "Spore Fungus",
            hp: 13,
            abilities: [
              { name: "Spore Cloud", damage: { dice: 1, sides: 6 }, aoe: true, weight: 1 },
            ],
          },
        ],
      },
      {
        name: "Wolf Den",
        description:
          "A pack of cunning wolves terrorizing nearby settlements, led by a massive alpha.",
        enemyPool: [
          {
            name: "Timber Wolf",
            hp: 23,
            abilities: [
              { name: "Bite", damage: { dice: 1, sides: 8 }, weight: 3 },
              { name: "Lunge", damage: { dice: 1, sides: 6, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Dire Wolf",
            hp: 32,
            abilities: [
              { name: "Savage Bite", damage: { dice: 1, sides: 10 }, weight: 2 },
              { name: "Howl", selfBuff: { type: "damageUp", percent: 20, turns: 2 }, weight: 1 },
            ],
          },
          {
            name: "Wolf Pup",
            hp: 18,
            abilities: [
              { name: "Nip", damage: { dice: 1, sides: 6 }, weight: 3 },
              { name: "Yip", effects: { slow: { turns: 1 } }, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "Alpha Howler",
          hp: 83,
          abilities: [
            { name: "Crushing Jaws", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 3 },
            { name: "Pack Howl", selfBuff: { type: "damageUp", percent: 30, turns: 2 }, weight: 1 },
            { name: "Feral Pounce", damage: { dice: 2, sides: 6 }, weight: 1 },
          ],
        },
        bossAds: [
          {
            name: "Dire Wolf",
            hp: 32,
            abilities: [{ name: "Savage Bite", damage: { dice: 1, sides: 10 }, weight: 1 }],
          },
          {
            name: "Timber Wolf",
            hp: 23,
            abilities: [{ name: "Bite", damage: { dice: 1, sides: 8 }, weight: 1 }],
          },
          {
            name: "Wolf Pup",
            hp: 18,
            abilities: [{ name: "Nip", damage: { dice: 1, sides: 6 }, weight: 1 }],
          },
        ],
      },
      {
        name: "Spider Nest",
        description: "Webs choke the canopy above a broodmother's lair of chittering spawn.",
        enemyPool: [
          {
            name: "Giant Spider",
            hp: 28,
            abilities: [
              {
                name: "Fang Strike",
                damage: { dice: 1, sides: 8 },
                effects: { poison: { dice: 1, sides: 3, turns: 2 } },
                weight: 2,
              },
              { name: "Web Shot", effects: { slow: { turns: 2 } }, weight: 1 },
            ],
          },
          {
            name: "Spiderling",
            hp: 21,
            abilities: [
              { name: "Tiny Bite", damage: { dice: 1, sides: 6 }, weight: 3 },
              {
                name: "Venom Spit",
                effects: { poison: { dice: 1, sides: 2, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Trap Weaver",
            hp: 26,
            abilities: [
              { name: "Silk Lash", damage: { dice: 1, sides: 6 }, weight: 2 },
              { name: "Web Snare", effects: { slow: { turns: 2 } }, weight: 2 },
              { name: "Acid Spit", damage: { dice: 1, sides: 8 }, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "Broodmother",
          hp: 82,
          abilities: [
            {
              name: "Venom Fangs",
              damage: { dice: 1, sides: 8, modifier: 2 },
              effects: { poison: { dice: 1, sides: 4, turns: 3 } },
              weight: 2,
            },
            { name: "Deadly Silk", effects: { slow: { turns: 3 } }, weight: 1 },
            { name: "Spawn Swarm", damage: { dice: 1, sides: 4 }, aoe: true, weight: 1 },
          ],
        },
        bossAds: [
          {
            name: "Giant Spider",
            hp: 28,
            abilities: [
              {
                name: "Fang Strike",
                damage: { dice: 1, sides: 8 },
                effects: { poison: { dice: 1, sides: 3, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Giant Spider",
            hp: 28,
            abilities: [
              {
                name: "Fang Strike",
                damage: { dice: 1, sides: 8 },
                effects: { poison: { dice: 1, sides: 3, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Trap Weaver",
            hp: 26,
            abilities: [{ name: "Silk Lash", damage: { dice: 1, sides: 6 }, weight: 1 }],
          },
        ],
      },
    ],
  },

  // mountain (early mid game)
  {
    name: "Mountain",
    order: 2,
    stages: [
      {
        name: "Bandit Stronghold",
        description: "A fortified camp of ruthless bandits, ruled by a tyrant with an iron fist.",
        enemyPool: [
          {
            name: "Bandit Thug",
            hp: 35,
            abilities: [
              { name: "Club Smash", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 3 },
              {
                name: "Gut Punch",
                damage: { dice: 1, sides: 6 },
                effects: { slow: { turns: 1 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Bandit Crossbowman",
            hp: 33,
            abilities: [
              { name: "Crossbow Bolt", damage: { dice: 1, sides: 10 }, weight: 3 },
              { name: "Aimed Shot", damage: { dice: 2, sides: 6 }, weight: 1 },
            ],
          },
          {
            name: "Bandit Brute",
            hp: 42,
            abilities: [
              { name: "Overhead Slam", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 2 },
              { name: "Rage", selfBuff: { type: "damageUp", percent: 30, turns: 2 }, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "Bandit Warlord",
          hp: 114,
          abilities: [
            { name: "Heavy Strike", damage: { dice: 2, sides: 6, modifier: 3 }, weight: 3 },
            { name: "Smoke Bomb", effects: { blind: { chance: 0.4, turns: 2 } }, weight: 1 },
            { name: "War Cry", selfBuff: { type: "damageUp", percent: 30, turns: 2 }, weight: 1 },
          ],
        },
        bossAds: [
          {
            name: "Bandit Bodyguard",
            hp: 45,
            abilities: [
              { name: "Shield Slam", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Bandit Thug",
            hp: 36,
            abilities: [
              { name: "Club Smash", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Bandit Rogue",
            hp: 33,
            abilities: [{ name: "Backstab", damage: { dice: 1, sides: 10 }, weight: 1 }],
          },
        ],
      },
      {
        name: "Stone Cavern",
        description: "Deep within the mountain, a massive golem guards its territory.",
        enemyPool: [
          {
            name: "Rock Elemental",
            hp: 49,
            abilities: [
              { name: "Rock Throw", damage: { dice: 1, sides: 10 }, weight: 3 },
              { name: "Quake Stomp", damage: { dice: 1, sides: 6 }, aoe: true, weight: 1 },
            ],
          },
          {
            name: "Large Cave Bat",
            hp: 28,
            abilities: [
              { name: "Screech", effects: { blind: { chance: 0.3, turns: 1 } }, weight: 1 },
              { name: "Bite", damage: { dice: 1, sides: 8 }, weight: 2 },
            ],
          },
          {
            name: "Crystal Spider",
            hp: 33,
            abilities: [
              {
                name: "Venomous Bite",
                damage: { dice: 1, sides: 6 },
                effects: { poison: { dice: 1, sides: 4, turns: 2 } },
                weight: 2,
              },
              { name: "Web Trap", effects: { slow: { turns: 2 } }, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "Stone Colossus",
          hp: 126,
          abilities: [
            { name: "Boulder Crush", damage: { dice: 2, sides: 8, modifier: 2 }, weight: 3 },
            {
              name: "Earthquake",
              damage: { dice: 1, sides: 6 },
              aoe: true,
              effects: { slow: { turns: 1 } },
              weight: 1,
            },
            { name: "Stone Skin", selfShield: { percent: 30, turns: 2 }, weight: 1 },
          ],
        },
        bossAds: [
          {
            name: "Rock Elemental",
            hp: 49,
            abilities: [{ name: "Rock Throw", damage: { dice: 1, sides: 10 }, weight: 1 }],
          },
          {
            name: "Rock Elemental",
            hp: 49,
            abilities: [{ name: "Rock Throw", damage: { dice: 1, sides: 10 }, weight: 1 }],
          },
          {
            name: "Large Cave Bat",
            hp: 28,
            abilities: [{ name: "Bite", damage: { dice: 1, sides: 8 }, weight: 1 }],
          },
        ],
      },
      {
        name: "Orc Warcamp",
        description: "A brutal warband of orcs has made camp on the mountainside.",
        enemyPool: [
          {
            name: "Orc Raider",
            hp: 41,
            abilities: [
              { name: "Axe Chop", damage: { dice: 1, sides: 10, modifier: 1 }, weight: 3 },
              {
                name: "Shoulder Charge",
                damage: { dice: 1, sides: 8 },
                effects: { slow: { turns: 1 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Orc Shaman",
            hp: 36,
            abilities: [
              { name: "Lightning Bolt", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 2 },
              {
                name: "Blood Ritual",
                selfBuff: { type: "damageUp", percent: 25, turns: 2 },
                weight: 1,
              },
            ],
          },
          {
            name: "Orc Berserker",
            hp: 45,
            abilities: [
              { name: "Frenzy Slash", damage: { dice: 2, sides: 8 }, weight: 2 },
              { name: "War Cry", selfBuff: { type: "damageUp", percent: 35, turns: 2 }, weight: 1 },
            ],
          },
          {
            name: "Orc Archer",
            hp: 38,
            abilities: [
              { name: "Crude Arrow", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 3 },
              { name: "Volley", damage: { dice: 1, sides: 6 }, aoe: true, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "Orc Warchief",
          hp: 123,
          abilities: [
            { name: "Executioner's Axe", damage: { dice: 2, sides: 8, modifier: 3 }, weight: 2 },
            {
              name: "Rallying Shout",
              selfBuff: { type: "damageUp", percent: 35, turns: 3 },
              weight: 1,
            },
            { name: "Cleave", damage: { dice: 1, sides: 6, modifier: 2 }, aoe: true, weight: 1 },
          ],
        },
        bossAds: [
          {
            name: "Orc Raider",
            hp: 41,
            abilities: [
              { name: "Axe Chop", damage: { dice: 1, sides: 10, modifier: 1 }, weight: 1 },
            ],
          },
          {
            name: "Orc Shaman",
            hp: 36,
            abilities: [
              { name: "Lightning Bolt", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Orc Berserker",
            hp: 45,
            abilities: [{ name: "Frenzy Slash", damage: { dice: 2, sides: 8 }, weight: 1 }],
          },
        ],
      },
      {
        name: "Frozen Peak",
        description: "The summit is lashed by freezing winds. Something ancient stirs in the ice.",
        enemyPool: [
          {
            name: "Ice Wraith",
            hp: 36,
            abilities: [
              { name: "Frost Bolt", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 2 },
              {
                name: "Chilling Touch",
                damage: { dice: 1, sides: 6 },
                effects: { slow: { turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Snow Stalker",
            hp: 38,
            abilities: [
              { name: "Ambush Strike", damage: { dice: 1, sides: 10, modifier: 1 }, weight: 2 },
              { name: "Blinding Snow", effects: { blind: { chance: 0.35, turns: 1 } }, weight: 1 },
            ],
          },
          {
            name: "Frozen Golem",
            hp: 52,
            abilities: [
              { name: "Ice Smash", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 2 },
              { name: "Frost Armor", selfShield: { percent: 20, turns: 2 }, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "Frost Giant",
          hp: 122,
          abilities: [
            { name: "Glacial Hammer", damage: { dice: 2, sides: 8, modifier: 4 }, weight: 2 },
            {
              name: "Blizzard",
              damage: { dice: 1, sides: 6 },
              aoe: true,
              effects: { slow: { turns: 2 } },
              weight: 1,
            },
            { name: "Ice Wall", selfShield: { percent: 35, turns: 2 }, weight: 1 },
          ],
        },
        bossAds: [
          {
            name: "Ice Wraith",
            hp: 36,
            abilities: [
              { name: "Frost Bolt", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Snow Stalker",
            hp: 38,
            abilities: [
              { name: "Ambush Strike", damage: { dice: 1, sides: 10, modifier: 1 }, weight: 1 },
            ],
          },
          {
            name: "Frozen Golem",
            hp: 52,
            abilities: [
              { name: "Ice Smash", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 1 },
            ],
          },
        ],
      },
    ],
  },

  // volcano (mid to late game)
  {
    name: "Volcano",
    order: 3,
    stages: [
      {
        name: "Ember Wastes",
        description: "Rivers of molten rock flow beneath the lord of living flame.",
        enemyPool: [
          {
            name: "Fire Imp",
            hp: 42,
            abilities: [
              { name: "Fireball", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 2 },
              {
                name: "Flame Burst",
                damage: { dice: 1, sides: 6 },
                effects: { burn: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Lava Hound",
            hp: 48,
            abilities: [
              { name: "Lava Bite", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 2 },
              {
                name: "Molten Spit",
                damage: { dice: 1, sides: 8 },
                effects: { burn: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Salamander",
            hp: 58,
            abilities: [
              { name: "Tail Lash", damage: { dice: 1, sides: 10 }, weight: 2 },
              { name: "Heat Wave", damage: { dice: 1, sides: 6 }, aoe: true, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "Inferno Lord",
          hp: 171,
          abilities: [
            { name: "Flame Strike", damage: { dice: 2, sides: 8, modifier: 4 }, weight: 2 },
            {
              name: "Firestorm",
              damage: { dice: 1, sides: 8 },
              aoe: true,
              effects: { burn: { dice: 1, sides: 6, turns: 2 } },
              weight: 1,
            },
            {
              name: "Lava Pool",
              damage: { dice: 1, sides: 4 },
              effects: { burn: { dice: 2, sides: 6, turns: 3 } },
              weight: 1,
            },
            { name: "Molten Shield", selfShield: { percent: 40, turns: 2 }, weight: 1 },
          ],
        },
        bossAds: [
          {
            name: "Fire Imp",
            hp: 42,
            abilities: [
              { name: "Fireball", damage: { dice: 2, sides: 8, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Fire Imp",
            hp: 42,
            abilities: [
              { name: "Fireball", damage: { dice: 2, sides: 8, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Magma Lurker",
            hp: 55,
            abilities: [
              {
                name: "Lava Burst",
                damage: { dice: 2, sides: 12 },
                effects: { burn: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
        ],
      },
      {
        name: "Dragon's Lair",
        description: "An ancient drake nests atop a mountain of charred bones.",
        enemyPool: [
          {
            name: "Dragonling",
            hp: 48,
            abilities: [
              { name: "Claw Swipe", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 2 },
              {
                name: "Mini Breath",
                damage: { dice: 1, sides: 6 },
                effects: { burn: { dice: 1, sides: 3, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Flame Wyrm",
            hp: 55,
            abilities: [
              { name: "Bite", damage: { dice: 2, sides: 6 }, weight: 2 },
              {
                name: "Fire Spit",
                damage: { dice: 1, sides: 8 },
                effects: { burn: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Obsidian Gargoyle",
            hp: 59,
            abilities: [
              { name: "Stone Fist", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 2 },
              { name: "Petrifying Gaze", effects: { slow: { turns: 2 } }, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "Magma Drake",
          hp: 184,
          abilities: [
            { name: "Claw Rend", damage: { dice: 2, sides: 10, modifier: 3 }, weight: 2 },
            {
              name: "Fire Breath",
              damage: { dice: 2, sides: 6 },
              aoe: true,
              effects: { burn: { dice: 1, sides: 4, turns: 2 } },
              weight: 1,
            },
            {
              name: "Tail Sweep",
              damage: { dice: 1, sides: 8, modifier: 2 },
              aoe: true,
              weight: 1,
            },
          ],
          phases: [
            {
              hpPercent: 0.3,
              message: "The Magma Drake roars with primal rage, its scales glow white-hot!",
              damageMultiplier: 1.5,
            },
          ],
        },
        bossAds: [
          {
            name: "Dragonling",
            hp: 48,
            abilities: [
              { name: "Claw Swipe", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Flame Wyrm",
            hp: 55,
            abilities: [
              {
                name: "Fire Spit",
                damage: { dice: 1, sides: 8 },
                effects: { burn: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Obsidian Gargoyle",
            hp: 59,
            abilities: [
              { name: "Stone Fist", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 1 },
            ],
          },
        ],
      },
      {
        name: "Demonic Forge",
        description:
          "Deep within the volcano, hellish smiths hammer weapons of war for an infernal army.",
        enemyPool: [
          {
            name: "Forge Imp",
            hp: 52,
            abilities: [
              { name: "Molten Hammer", damage: { dice: 1, sides: 10, modifier: 1 }, weight: 2 },
              {
                name: "Slag Splash",
                damage: { dice: 1, sides: 6 },
                effects: { burn: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Infernal Smith",
            hp: 50,
            abilities: [
              { name: "Anvil Strike", damage: { dice: 1, sides: 10, modifier: 3 }, weight: 2 },
              {
                name: "Heated Blade",
                selfBuff: { type: "damageUp", percent: 25, turns: 2 },
                weight: 1,
              },
            ],
          },
          {
            name: "Cinder Crawler",
            hp: 58,
            abilities: [
              {
                name: "Burning Crawl",
                damage: { dice: 1, sides: 8 },
                effects: { burn: { dice: 1, sides: 3, turns: 2 } },
                weight: 2,
              },
              { name: "Ember Burst", damage: { dice: 1, sides: 6 }, aoe: true, weight: 1 },
            ],
          },
          {
            name: "Magma Slime",
            hp: 41,
            abilities: [
              {
                name: "Engulf",
                damage: { dice: 1, sides: 8, modifier: 2 },
                selfHealPercent: 25,
                weight: 2,
              },
              {
                name: "Splash",
                damage: { dice: 1, sides: 6 },
                effects: { burn: { dice: 1, sides: 3, turns: 2 } },
                weight: 1,
              },
            ],
          },
        ],
        boss: {
          name: "Forge Master",
          hp: 160,
          abilities: [
            { name: "Blazing Hammer", damage: { dice: 2, sides: 8, modifier: 4 }, weight: 2 },
            {
              name: "Forge Fire",
              damage: { dice: 1, sides: 6 },
              aoe: true,
              effects: { burn: { dice: 1, sides: 6, turns: 3 } },
              weight: 1,
            },
            { name: "Tempered Steel", selfShield: { percent: 35, turns: 2 }, weight: 1 },
            {
              name: "Molten Slag",
              damage: { dice: 1, sides: 8 },
              effects: { slow: { turns: 2 } },
              weight: 1,
            },
          ],
          phases: [
            {
              hpPercent: 0.4,
              message: "The Forge Master stokes the furnace — the room glows white-hot!",
              damageMultiplier: 1.4,
            },
          ],
        },
        bossAds: [
          {
            name: "Forge Imp",
            hp: 52,
            abilities: [
              { name: "Molten Hammer", damage: { dice: 1, sides: 10, modifier: 1 }, weight: 1 },
            ],
          },
          {
            name: "Infernal Smith",
            hp: 50,
            abilities: [
              { name: "Anvil Strike", damage: { dice: 1, sides: 10, modifier: 3 }, weight: 1 },
            ],
          },
          {
            name: "Cinder Crawler",
            hp: 58,
            abilities: [
              {
                name: "Burning Crawl",
                damage: { dice: 1, sides: 8 },
                effects: { burn: { dice: 1, sides: 3, turns: 2 } },
                weight: 1,
              },
            ],
          },
        ],
      },
      {
        name: "Ashen Ruins",
        description:
          "Ruins of an ancient city consumed by fire, haunted by spirits that burn for etenrnity.",
        enemyPool: [
          {
            name: "Ashen Revenant",
            hp: 61,
            abilities: [
              { name: "Cinder Slash", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 2 },
              { name: "Ash Cloud", effects: { blind: { chance: 0.3, turns: 2 } }, weight: 1 },
            ],
          },
          {
            name: "Charred Skeleton",
            hp: 42,
            abilities: [
              { name: "Bone Club", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 2 },
              {
                name: "Smoldering Touch",
                damage: { dice: 1, sides: 6 },
                effects: { burn: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Ember Spirit",
            hp: 38,
            abilities: [
              { name: "Spirit Fire", damage: { dice: 3, sides: 8 }, weight: 2 },
              {
                name: "Soul Burn",
                damage: { dice: 5, sides: 4 },
                effects: { burn: { dice: 1, sides: 4, turns: 3 } },
                weight: 1,
              },
            ],
          },
        ],
        boss: {
          name: "Ashen King",
          hp: 173,
          abilities: [
            { name: "Ashen Reaping", damage: { dice: 2, sides: 10, modifier: 2 }, weight: 2 },
            {
              name: "Rain of Cinders",
              damage: { dice: 1, sides: 6 },
              aoe: true,
              effects: { burn: { dice: 1, sides: 4, turns: 2 } },
              weight: 1,
            },
            { name: "Soul Drain", damage: { dice: 1, sides: 8 }, selfHealPercent: 40, weight: 1 },
          ],
          phases: [
            {
              hpPercent: 0.35,
              message: "The Ashen King screams — fire erupts from every crack in the ruins!",
              damageMultiplier: 1.45,
            },
          ],
        },
        bossAds: [
          {
            name: "Ashen Revenant",
            hp: 31,
            abilities: [
              { name: "Cinder Slash", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Charred Skeleton",
            hp: 26,
            abilities: [
              { name: "Bone Club", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Ember Spirit",
            hp: 38,
            abilities: [{ name: "Spirit Fire", damage: { dice: 3, sides: 8 }, weight: 1 }],
          },
        ],
      },
    ],
  },

  // the temple (end game)
  {
    name: "Dark Temple",
    order: 4,
    stages: [
      {
        name: "Forsaken Crypt",
        description: "The dead do not rest here. A lich commands an army of bones.",
        enemyPool: [
          {
            name: "Restless Warrior",
            hp: 65,
            abilities: [
              { name: "Bone Slash", damage: { dice: 1, sides: 8, modifier: 3 }, weight: 2 },
              { name: "Shield Block", selfShield: { percent: 20, turns: 1 }, weight: 1 },
            ],
          },
          {
            name: "Wraith",
            hp: 62,
            abilities: [
              {
                name: "Soul Siphon",
                damage: { dice: 1, sides: 8 },
                selfHealPercent: 30,
                weight: 2,
              },
              { name: "Wail", damage: { dice: 1, sides: 4 }, aoe: true, weight: 1 },
            ],
          },
          {
            name: "Death Knight",
            hp: 72,
            abilities: [
              { name: "Unholy Strike", damage: { dice: 2, sides: 6, modifier: 2 }, weight: 2 },
              {
                name: "Dark Aura",
                selfBuff: { type: "damageUp", percent: 25, turns: 2 },
                weight: 1,
              },
            ],
          },
          {
            name: "Necromancer",
            hp: 59,
            abilities: [
              { name: "Shadow Bolt", damage: { dice: 2, sides: 8, modifier: 2 }, weight: 2 },
              { name: "Curse", effects: { poison: { dice: 2, sides: 4, turns: 3 } }, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "Lich King",
          hp: 200,
          abilities: [
            { name: "Shadow Bolt", damage: { dice: 3, sides: 6, modifier: 4 }, weight: 2 },
            { name: "Soul Drain", damage: { dice: 2, sides: 6 }, selfHealPercent: 50, weight: 1 },
            { name: "Death Wave", damage: { dice: 2, sides: 6 }, aoe: true, weight: 1 },
            {
              name: "Raise Dead",
              selfBuff: { type: "damageUp", percent: 40, turns: 3 },
              weight: 1,
            },
          ],
          phases: [
            {
              hpPercent: 0.4,
              message:
                "The Lich King lets out a harrowing screech, dark energy erupts from the crypt!",
              damageMultiplier: 1.3,
              extraAbilities: [
                {
                  name: "Necrotic Burst",
                  damage: { dice: 2, sides: 8 },
                  aoe: true,
                  effects: { poison: { dice: 1, sides: 6, turns: 3 } },
                  weight: 2,
                },
              ],
            },
          ],
        },
        bossAds: [
          {
            name: "Skeleton Warrior",
            hp: 28,
            abilities: [
              { name: "Bone Slash", damage: { dice: 1, sides: 8, modifier: 3 }, weight: 1 },
            ],
          },
          {
            name: "Wraith",
            hp: 22,
            abilities: [
              {
                name: "Soul Siphon",
                damage: { dice: 1, sides: 8 },
                selfHealPercent: 30,
                weight: 1,
              },
            ],
          },
          {
            name: "Skeletal Mage",
            hp: 20,
            abilities: [
              { name: "Death Bolt", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 1 },
            ],
          },
        ],
      },
      {
        name: "Abyssal Gate",
        description:
          "Beyond the gate, a demon lord awaits, the source of all corruption in the land.",
        enemyPool: [
          {
            name: "Demon Grunt",
            hp: 67,
            abilities: [
              { name: "Claw Rip", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 2 },
              {
                name: "Flame Lash",
                damage: { dice: 1, sides: 6 },
                effects: { burn: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Succubus",
            hp: 61,
            abilities: [
              { name: "Charm", effects: { blind: { chance: 0.5, turns: 2 } }, weight: 1 },
              { name: "Dark Kiss", damage: { dice: 1, sides: 8 }, selfHealPercent: 40, weight: 2 },
            ],
          },
          {
            name: "Hellhound",
            hp: 60,
            abilities: [
              { name: "Infernal Bite", damage: { dice: 2, sides: 6, modifier: 2 }, weight: 2 },
              {
                name: "Hellfire",
                damage: { dice: 1, sides: 6 },
                aoe: true,
                effects: { burn: { dice: 1, sides: 4, turns: 2 } },
                weight: 1,
              },
            ],
          },
          {
            name: "Pit Fiend",
            hp: 68,
            abilities: [
              { name: "Abyssal Hammer", damage: { dice: 2, sides: 8, modifier: 3 }, weight: 2 },
              {
                name: "Corruption Aura",
                effects: { poison: { dice: 2, sides: 4, turns: 3 } },
                weight: 1,
              },
            ],
          },
        ],
        boss: {
          name: "Demon Lord",
          hp: 200,
          abilities: [
            { name: "Hellfire Slash", damage: { dice: 3, sides: 8, modifier: 5 }, weight: 2 },
            {
              name: "Infernal Nova",
              damage: { dice: 2, sides: 8 },
              aoe: true,
              effects: { burn: { dice: 2, sides: 4, turns: 3 } },
              weight: 1,
            },
            {
              name: "Corruption",
              damage: { dice: 1, sides: 6 },
              effects: { poison: { dice: 2, sides: 6, turns: 3 } },
              weight: 1,
            },
            { name: "Dark Pact", selfBuff: { type: "damageUp", percent: 50, turns: 2 }, weight: 1 },
          ],
          phases: [
            {
              hpPercent: 0.5,
              message: "The Demon Lord's eyes blaze crimson, the ground cracks beneath you!",
              damageMultiplier: 1.25,
            },
            {
              hpPercent: 0.25,
              message: "ENOUGH! The Demon Lord unleashes its true form!",
              damageMultiplier: 1.75,
              extraAbilities: [
                { name: "Apocalypse", damage: { dice: 3, sides: 10 }, aoe: true, weight: 1 },
              ],
            },
          ],
        },
        bossAds: [
          {
            name: "Demon Grunt",
            hp: 67,
            abilities: [
              { name: "Claw Rip", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Succubus",
            hp: 61,
            abilities: [
              { name: "Dark Kiss", damage: { dice: 1, sides: 8 }, selfHealPercent: 40, weight: 1 },
            ],
          },
          {
            name: "Hellhound",
            hp: 60,
            abilities: [
              { name: "Infernal Bite", damage: { dice: 2, sides: 6, modifier: 2 }, weight: 1 },
            ],
          },
        ],
      },
      {
        name: "Hall of Shadows",
        description:
          "The shadows themselves are alive here, twisting into monstrous shapes that feed on light.",
        enemyPool: [
          {
            name: "Shadow Stalker",
            hp: 55,
            abilities: [
              { name: "Shadow Strike", damage: { dice: 2, sides: 8, modifier: 3 }, weight: 3 },
              { name: "Vanish", effects: { slow: { turns: 2 } }, weight: 2 },
            ],
          },
          {
            name: "Void Tendril",
            hp: 64,
            abilities: [
              { name: "Lashing Dark", damage: { dice: 1, sides: 6, modifier: 2 }, weight: 2 },
              {
                name: "Engulfing Shadow",
                effects: { blind: { chance: 0.4, turns: 2 } },
                weight: 1,
              },
              { name: "Drain", damage: { dice: 3, sides: 6 }, selfHealPercent: 30, weight: 1 },
            ],
          },
          {
            name: "Shade",
            hp: 50,
            abilities: [
              { name: "Phase Strike", damage: { dice: 1, sides: 10 }, weight: 2 },
              { name: "Flicker", effects: { slow: { turns: 1 } }, weight: 1 },
            ],
          },
          {
            name: "Dark Acolyte",
            hp: 52,
            abilities: [
              { name: "Void Bolt", damage: { dice: 2, sides: 8, modifier: 1 }, weight: 2 },
              {
                name: "Shadow Pact",
                selfBuff: { type: "damageUp", percent: 30, turns: 2 },
                weight: 1,
              },
            ],
          },
        ],
        boss: {
          name: "Shadow Sovereign",
          hp: 200,
          abilities: [
            { name: "Oblivion Slash", damage: { dice: 3, sides: 6, modifier: 5 }, weight: 2 },
            {
              name: "Eclipse",
              damage: { dice: 1, sides: 8 },
              aoe: true,
              effects: { blind: { chance: 0.4, turns: 2 } },
              weight: 1,
            },
            { name: "Dark Mantle", selfShield: { percent: 35, turns: 2 }, weight: 1 },
            { name: "Soul Rend", damage: { dice: 2, sides: 8 }, selfHealPercent: 30, weight: 1 },
          ],
          phases: [
            {
              hpPercent: 0.5,
              message: "The Shadow Sovereign darkens the room, you can barely see!",
              damageMultiplier: 1.3,
              extraAbilities: [
                {
                  name: "Blinding Darkness",
                  effects: { blind: { chance: 0.6, turns: 3 } },
                  weight: 2,
                },
              ],
            },
            {
              hpPercent: 0.2,
              message:
                "The Shadow Sovereign dissolves into pure darkness, the void moves to consume you!",
              damageMultiplier: 1.6,
              extraAbilities: [
                { name: "Void Collapse", damage: { dice: 2, sides: 10 }, aoe: true, weight: 1 },
              ],
            },
          ],
        },
        bossAds: [
          {
            name: "Shadow Stalker",
            hp: 55,
            abilities: [
              { name: "Shadow Strike", damage: { dice: 1, sides: 8, modifier: 3 }, weight: 1 },
            ],
          },
          {
            name: "Shade",
            hp: 50,
            abilities: [{ name: "Phase Strike", damage: { dice: 1, sides: 10 }, weight: 1 }],
          },
          {
            name: "Void Tendril",
            hp: 64,
            abilities: [
              { name: "Lashing Dark", damage: { dice: 1, sides: 6, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Void Tendril",
            hp: 64,
            abilities: [
              { name: "Lashing Dark", damage: { dice: 1, sides: 6, modifier: 2 }, weight: 1 },
            ],
          },
        ],
      },
      {
        name: "Inner-most Sanctum",
        description:
          "Once a place of holy worship, now twisted by an ancient act of betrayal. A fallen angel guards the altar.",
        enemyPool: [
          {
            name: "Dread Templar",
            hp: 69,
            abilities: [
              { name: "Corrupted Smite", damage: { dice: 2, sides: 6, modifier: 2 }, weight: 2 },
              { name: "Dark Ward", selfShield: { percent: 25, turns: 2 }, weight: 1 },
            ],
          },
          {
            name: "Twisted Cleric",
            hp: 55,
            abilities: [
              { name: "Unholy Light", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 2 },
              {
                name: "Desecrate",
                effects: { poison: { dice: 1, sides: 6, turns: 3 } },
                weight: 1,
              },
              { name: "Profane Blessing", heal: { dice: 2, sides: 6 }, aoe: true, weight: 0.5 },
            ],
          },
          {
            name: "Corrupted Golem",
            hp: 75,
            abilities: [
              { name: "Holy Ruin", damage: { dice: 2, sides: 8 }, weight: 2 },
              { name: "Shatter", damage: { dice: 1, sides: 6 }, aoe: true, weight: 1 },
            ],
          },
          {
            name: "Heretic Mage",
            hp: 45,
            abilities: [
              {
                name: "Profane Bolts",
                damage: { dice: 1, sides: 10, modifier: 2 },
                aoe: true,
                weight: 2,
              },
              { name: "Silence", effects: { slow: { turns: 2 } }, weight: 1 },
              { name: "Drain Life", damage: { dice: 1, sides: 6 }, selfHealPercent: 35, weight: 1 },
            ],
          },
        ],
        boss: {
          name: "The Fallen One",
          hp: 200,
          abilities: [
            { name: "Ruinous Blade", damage: { dice: 3, sides: 8, modifier: 5 }, weight: 2 },
            {
              name: "Divine Corruption",
              damage: { dice: 2, sides: 6 },
              aoe: true,
              effects: { poison: { dice: 1, sides: 6, turns: 3 } },
              weight: 1,
            },
            {
              name: "Fallen Grace",
              selfShield: { percent: 30, turns: 2 },
              selfBuff: { type: "damageUp", percent: 25, turns: 2 },
              weight: 1,
            },
            { name: "Martyrdom", damage: { dice: 2, sides: 6 }, selfHealPercent: 50, weight: 1 },
          ],
          phases: [
            {
              hpPercent: 0.5,
              message:
                "The Fallen One spreads broken wings, a dark, cold radiance fills the sanctum!",
              damageMultiplier: 1.3,
            },
            {
              hpPercent: 0.2,
              message: "I WILL NOT FALL AGAIN! The Fallen One erupts with abyssal fury!",
              damageMultiplier: 1.8,
              extraAbilities: [
                { name: "Judgment", damage: { dice: 3, sides: 10 }, aoe: true, weight: 1 },
              ],
            },
          ],
        },
        bossAds: [
          {
            name: "Dread Templar",
            hp: 69,
            abilities: [
              { name: "Corrupted Smite", damage: { dice: 2, sides: 6, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Twisted Cleric",
            hp: 55,
            abilities: [
              { name: "Unholy Light", damage: { dice: 1, sides: 8, modifier: 2 }, weight: 1 },
            ],
          },
          {
            name: "Corrupted Golem",
            hp: 75,
            abilities: [{ name: "Ruin", damage: { dice: 2, sides: 8 }, weight: 1 }],
          },
          {
            name: "Heretic Mage",
            hp: 45,
            abilities: [
              { name: "Profane Bolt", damage: { dice: 1, sides: 10, modifier: 2 }, weight: 1 },
            ],
          },
        ],
      },
    ],
  },
];

// encounter constants
export const MOB_ENCOUNTER_SIZE = { min: 3, max: 5 };
export const BATTLES_PER_AREA = 3; // 2 minion fights then boss fight

// utilities
export function pickRandomStage(area: AreaDefinition): StageDefinition {
  return area.stages[Math.floor(Math.random() * area.stages.length)]!;
}

export function pickEnemies(pool: EnemyDefinition[], count: number): EnemyDefinition[] {
  const picked: EnemyDefinition[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(pool[Math.floor(Math.random() * pool.length)]!);
  }
  return picked;
}

export function rollEncounterSize(): number {
  const range = MOB_ENCOUNTER_SIZE.max - MOB_ENCOUNTER_SIZE.min + 1;
  return MOB_ENCOUNTER_SIZE.min + Math.floor(Math.random() * range);
}

export function createBattleEnemies(
  enemies: EnemyDefinition[],
  isBoss: boolean = false,
  areaOrder: number = 0,
): BattleEnemy[] {
  const nameCounts = new Map<string, number>();
  const multiplier = ENEMY_SCALING_MULTIPLIERS[areaOrder] ?? 1.0;

  return enemies.map((def) => {
    const count = (nameCounts.get(def.name) ?? 0) + 1;
    nameCounts.set(def.name, count);
    const suffix =
      count > 1 || enemies.filter((e) => e.name === def.name).length > 1
        ? ` ${"ABCDEFGHIJKLMNOP"[count - 1]}`
        : "";

    // scale damage
    const scaledAbilities = def.abilities.map((ability) => {
      const scaled = { ...ability };
      if (ability.damage && multiplier !== 1.0) {
        scaled.damage = {
          ...ability.damage,
          modifier:
            (ability.damage.modifier ?? 0) +
            Math.floor((ability.damage.modifier ?? 1) * (multiplier - 1.0)),
        };
      }
      return scaled;
    });

    const scaledHp = Math.floor(def.hp * multiplier);

    return {
      id: `enemy_${def.name.toLowerCase().replace(/\s+/g, "_")}_${count}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      definitionName: def.name,
      name: `${def.name}${suffix}`,
      hp: scaledHp,
      maxHp: scaledHp,
      abilities: scaledAbilities,
      ...(def.phases ? { phases: def.phases } : {}),
      isBoss,
    };
  });
}

export function createMobEncounter(stage: StageDefinition, areaOrder: number = 0): BattleEnemy[] {
  const count = rollEncounterSize();
  const selected = pickEnemies(stage.enemyPool, count);
  return createBattleEnemies(selected, false, areaOrder);
}

export function createBossEncounter(stage: StageDefinition, areaOrder: number = 0): BattleEnemy[] {
  const bossEnemies = createBattleEnemies([stage.boss], true, areaOrder);
  if (!stage.bossAds || stage.bossAds.length === 0) return bossEnemies;

  const selectedAds = stage.bossAds;
  const ads = createBattleEnemies(selectedAds, false, areaOrder);
  return [...bossEnemies, ...ads];
}

// weighted seleciton for abilities
export function pickEnemyAbility(enemy: BattleEnemy): EnemyAbility {
  let abilities = [...enemy.abilities];

  // phase change ability
  if (enemy.phases) {
    const hpPercent = enemy.hp / enemy.maxHp;
    for (const phase of enemy.phases) {
      if (hpPercent <= phase.hpPercent && phase.extraAbilities) {
        abilities.push(...phase.extraAbilities);
      }
    }
  }

  // prioritize healing when low hp
  const hpPercent = enemy.hp / enemy.maxHp;
  if (hpPercent < 0.5) {
    const healAbility = abilities.find((a) => a.name === "Profane Blessing");
    if (healAbility) return healAbility;
  }

  const totalWeight = abilities.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const ability of abilities) {
    roll -= ability.weight;
    if (roll <= 0) return ability;
  }
  return abilities[abilities.length - 1]!;
}

// phase dmg mult
export function getEnemyPhaseDamageMultiplier(enemy: BattleEnemy): number {
  if (!enemy.phases) return 1.0;
  const hpPercent = enemy.hp / enemy.maxHp;
  let multiplier = 1.0;
  for (const phase of enemy.phases) {
    if (hpPercent <= phase.hpPercent && phase.damageMultiplier) {
      multiplier = Math.max(multiplier, phase.damageMultiplier);
    }
  }
  return multiplier;
}

export function checkEnemyPhaseTransitions(enemy: BattleEnemy, previousHp: number): string[] {
  if (!enemy.phases) return [];
  const messages: string[] = [];
  const prevPercent = previousHp / enemy.maxHp;
  const currPercent = enemy.hp / enemy.maxHp;
  for (const phase of enemy.phases) {
    if (prevPercent > phase.hpPercent && currPercent <= phase.hpPercent) {
      messages.push(phase.message);
    }
  }
  return messages;
}

// prefer aoe as phase change damager
export function pickPhaseActionAbility(enemy: BattleEnemy): EnemyAbility {
  let aoeAbilities = enemy.abilities.filter((a) => a.aoe);

  if (aoeAbilities.length === 0) {
    // fallback to any ability with damage
    aoeAbilities = enemy.abilities.filter((a) => a.damage);
  }

  if (aoeAbilities.length === 0) {
    // last fallback to any ability
    aoeAbilities = enemy.abilities;
  }

  // a few bosses have more than one aoe esp late game so pick the one with the highest avg dice roll hehehehe
  return aoeAbilities.reduce((best, current) => {
    const currentAvg = current.damage
      ? (current.damage.dice * (current.damage.sides + 1)) / 2 + (current.damage.modifier ?? 0)
      : 0;
    const bestAvg = best.damage
      ? (best.damage.dice * (best.damage.sides + 1)) / 2 + (best.damage.modifier ?? 0)
      : 0;
    return currentAvg > bestAvg ? current : best;
  });
}

export function findStageByName(
  stageName: string,
): { area: AreaDefinition; stage: StageDefinition } | undefined {
  for (const area of AREAS) {
    for (const stage of area.stages) {
      if (stage.name === stageName) return { area, stage };
    }
  }
  return undefined;
}
