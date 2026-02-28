import { useState, useEffect, useCallback } from "react";
import ReportBugButton from "./ReportBugButton";
import { useNavigate } from "react-router-dom";
import {
  getCharacters,
  getClasses,
  createCharacter,
  deleteCharacter,
  getParties,
  createParty,
  addCharacterToParty,
  removeCharacterFromParty,
  deleteParty,
  getParty,
  updatePartyEasyMode,
} from "../api";
import type { Character } from "../types";

const USER_ID_KEY = "rpg_user_id";

interface ClassInfo {
  name: string;
  baseStats: { hp: number; mana: number; stamina: number };
  passive: string;
}

export function HomePage() {
  const navigate = useNavigate();

  // state checking
  const [userId] = useState<string | null>(() =>
    localStorage.getItem(USER_ID_KEY),
  );
  const [characters, setCharacters] = useState<Character[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // character creation
  const [showCreateChar, setShowCreateChar] = useState(false);
  const [newCharName, setNewCharName] = useState("");
  const [newCharClass, setNewCharClass] = useState("");

  // party maker
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");

  // party management modal
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [partyDetail, setPartyDetail] = useState<any>(null);

  // tooltip state
  const [showTooltip, setShowTooltip] = useState(false);

  // load
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // loading char and class
      const [chars, cls] = await Promise.all([getCharacters(), getClasses()]);
      setCharacters(chars);
      setClasses(cls);

      // load parties for this user
      const pts = await getParties();
      setParties(pts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // party details
  useEffect(() => {
    if (!selectedPartyId) {
      setPartyDetail(null);
      return;
    }
    getParty(selectedPartyId)
      .then(setPartyDetail)
      .catch(() => setPartyDetail(null));
  }, [selectedPartyId]);

  // where the magic happens
  const handleCreateCharacter = async () => {
    if (!newCharName.trim() || !newCharClass) return;
    try {
      setError(null);
      await createCharacter({ name: newCharName.trim(), class: newCharClass });
      setNewCharName("");
      setNewCharClass("");
      setShowCreateChar(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm("Delete this character? This cannot be undone.")) return;
    try {
      setError(null);
      await deleteCharacter(characterId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateParty = async () => {
    if (!newPartyName.trim() || !userId) return;
    try {
      setError(null);
      await createParty(userId, newPartyName.trim());
      setNewPartyName("");
      setShowCreateParty(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddToParty = async (characterId: string) => {
    if (!selectedPartyId) return;
    try {
      setError(null);
      await addCharacterToParty(selectedPartyId, characterId);
      const updated = await getParty(selectedPartyId);
      setPartyDetail(updated);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveFromParty = async (characterId: string) => {
    if (!selectedPartyId) return;
    try {
      setError(null);
      await removeCharacterFromParty(selectedPartyId, characterId);
      const updated = await getParty(selectedPartyId);
      setPartyDetail(updated);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteParty = async (partyId: string) => {
    if (!confirm("Delete this party? This cannot be undone.")) return;
    try {
      setError(null);
      await deleteParty(partyId);
      setSelectedPartyId(null);
      setPartyDetail(null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleEasyMode = async (newValue: boolean) => {
    if (!selectedPartyId) return;

    // easy mode warn
    if (newValue && !partyDetail.easyMode) {
      const confirmed = confirm(
        "Enable Easy Mode? This action is irreversible once you start a run. Easy Mode reduces enemy difficulty by 50% but your party will be locked into this mode.",
      );
      if (!confirmed) return;
    }

    try {
      setError(null);
      const updated = await updatePartyEasyMode(selectedPartyId, newValue);
      setPartyDetail(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-[var(--color-text-dim)]">Loading...</span>
      </div>
    );
  }

  const partyMembers = partyDetail?.members?.map((m: any) => m.character) ?? [];
  const partyMemberIds = new Set(partyMembers.map((c: Character) => c.id));
  const availableChars = characters.filter((c) => !partyMemberIds.has(c.id));

  const handleLogout = () => {
    if (confirm("Log out and switch accounts?")) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      window.location.reload();
    }
  };

  const userEmail = localStorage.getItem("userEmail") || "unknown";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Path of Strife</h1>
          <p className="text-sm italic text-gray-400 mt-1">
            O struggler, go forth and conquer
          </p>
        </div>
        <div className="relative flex items-center gap-2">
          <ReportBugButton screen="home" context={{}} />
          <button
            onClick={handleLogout}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-border)] text-[var(--color-text)] text-sm hover:bg-[var(--color-border)]/70 cursor-pointer"
          >
            Switch Account
          </button>
          {showTooltip && (
            <div className="absolute top-full mt-2 right-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-dim)] whitespace-nowrap z-10 pointer-events-none">
              You are logged in as:<br />
              <span className="text-[var(--color-accent)]">{userEmail}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-[var(--color-damage)]/10 border border-[var(--color-damage)]/30 text-sm text-[var(--color-damage)]">
          {error}
        </div>
      )}

      {/* ─── Characters Section ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Characters</h2>
          <button
            onClick={() => setShowCreateChar(!showCreateChar)}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-sm hover:bg-[var(--color-accent)]/80 cursor-pointer"
          >
            + New Character
          </button>
        </div>

        {showCreateChar && (
          <div className="p-4 mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
            <input
              type="text"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              placeholder="Character name..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <div className="grid grid-cols-4 gap-2">
              {classes.map((cls) => (
                <button
                  key={cls.name}
                  onClick={() => setNewCharClass(cls.name)}
                  className={`p-2 rounded-lg border text-sm text-left transition-all cursor-pointer ${
                    newCharClass === cls.name
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                  }`}
                >
                  <div className="font-medium">{cls.name}</div>
                  <div className="text-[10px] text-[var(--color-text-dim)] mt-0.5">
                    HP:{cls.baseStats.hp}
                    {cls.baseStats.mana > 0 && ` MP:${cls.baseStats.mana}`}
                    {cls.baseStats.stamina > 0 &&
                      ` SP:${cls.baseStats.stamina}`}
                  </div>
                  <div className="text-[10px] text-[var(--color-accent)] mt-0.5">
                    {cls.passive}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateCharacter}
                disabled={!newCharName.trim() || !newCharClass}
                className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateChar(false)}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-dim)] hover:text-[var(--color-text)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {characters.length === 0 ? (
          <p className="text-sm text-[var(--color-text-dim)]">
            No characters yet. Create one to get started!
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {characters.map((char) => (
              <div
                key={char.id}
                className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{char.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-dim)]">
                      Lv.{char.level}
                    </span>
                    <button
                      onClick={() => handleDeleteCharacter(char.id)}
                      className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-damage)] cursor-pointer"
                      title="Delete character"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                    {char.class}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-dim)]">
                    {char.battlesWon} wins
                  </span>
                </div>
                <div className="text-[10px] text-[var(--color-text-dim)] space-y-0.5">
                  <div>
                    HP: {char.hp}/{char.maxHp}
                  </div>
                  {char.maxMana > 0 && (
                    <div>
                      MP: {char.mana}/{char.maxMana}
                    </div>
                  )}
                  {char.maxStamina > 0 && (
                    <div>
                      SP: {char.stamina}/{char.maxStamina}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Parties Section ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Parties</h2>
          <button
            onClick={() => setShowCreateParty(!showCreateParty)}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-sm hover:bg-[var(--color-accent)]/80 cursor-pointer"
          >
            + New Party
          </button>
        </div>

        {showCreateParty && (
          <div className="p-4 mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex gap-2">
            <input
              type="text"
              value={newPartyName}
              onChange={(e) => setNewPartyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateParty()}
              placeholder="Party name..."
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              onClick={handleCreateParty}
              disabled={!newPartyName.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm disabled:opacity-40 cursor-pointer"
            >
              Create
            </button>
          </div>
        )}

        {parties.length === 0 ? (
          <p className="text-sm text-[var(--color-text-dim)]">
            No parties yet. Create one and add characters!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {parties.map((party) => {
              const isSelected = selectedPartyId === party.id;
              const memberCount = party.members?.length ?? 0;
              return (
                <div
                  key={party.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/50"
                  }`}
                  onClick={() =>
                    setSelectedPartyId(isSelected ? null : party.id)
                  }
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{party.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-gold)]">
                        {party.gold}g
                      </span>
                      <span className="text-xs text-[var(--color-text-dim)]">
                        {memberCount} members
                      </span>
                    </div>
                  </div>
                  {party.members?.map((m: any) => (
                    <span
                      key={m.character.id}
                      className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] mr-1 mb-1"
                    >
                      {m.character.name} ({m.character.class})
                    </span>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/run/${party.id}`);
                      }}
                      disabled={memberCount === 0}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-heal)]/20 text-[var(--color-heal)] text-xs hover:bg-[var(--color-heal)]/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Start Run
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteParty(party.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-damage)]/20 text-[var(--color-damage)] text-xs hover:bg-[var(--color-damage)]/30 cursor-pointer"
                      title="Delete party"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Party Management Panel ─── */}
      {selectedPartyId && partyDetail && (
        <section className="p-4 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-surface)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Manage Party: {partyDetail.name}</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={partyDetail.easyMode ?? false}
                onChange={(e) => handleToggleEasyMode(e.target.checked)}
                disabled={
                  (partyDetail.runs as any)?.some((r: any) => !r.finished) ??
                  false
                }
                className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span>
                Easy Mode{" "}
                {(partyDetail.runs as any)?.some((r: any) => !r.finished)
                  ? "(locked)"
                  : ""}
              </span>
            </label>
          </div>

          {/* Current members */}
          <div className="mb-4">
            <h4 className="text-xs uppercase text-[var(--color-text-dim)] mb-2">
              Current Members
            </h4>
            {partyMembers.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)]">
                No members yet
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {partyMembers.map((char: Character) => (
                  <div
                    key={char.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                  >
                    <span className="text-sm">{char.name}</span>
                    <span className="text-[10px] text-[var(--color-accent)]">
                      {char.class}
                    </span>
                    <button
                      onClick={() => handleRemoveFromParty(char.id)}
                      className="text-[var(--color-damage)] text-xs hover:text-[var(--color-damage)]/80 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available characters to add */}
          <div>
            <h4 className="text-xs uppercase text-[var(--color-text-dim)] mb-2">
              Add Character
            </h4>
            {availableChars.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)]">
                No available characters
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableChars.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => handleAddToParty(char.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]/50 text-sm cursor-pointer"
                  >
                    <span>{char.name}</span>
                    <span className="text-[10px] text-[var(--color-accent)]">
                      {char.class}
                    </span>
                    <span className="text-[var(--color-heal)]">+</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
