import type { Battle, ActionResult, Character } from "./types";

const envBase = (import.meta.env.VITE_API_URL as string) ?? "";
const BASE = (envBase.endsWith("/") ? envBase.slice(0, -1) : envBase) + "/api";

// runtime debugging
console.log("VITE_API_URL (build-time):", import.meta.env.VITE_API_URL);
console.log("Computed API BASE:", BASE);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("authToken");
  const headers: HeadersInit = { "Content-Type": "application/json" };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  // sisyphus
  if (res.status === 204) return undefined as T;
  return res.json();
}

// health check

export async function ensureBackendReady(maxRetries = 10): Promise<void> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {}
    retries++;
    await new Promise((resolve) => setTimeout(resolve, 100 * (retries + 1)));
  }
  throw new Error("Backend failed to start");
}

// auth

export async function joinWithEmail(email: string): Promise<{
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}> {
  return request("/auth/join", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// characters

export function getClasses() {
  return request<any[]>("/characters/classes");
}

export function getCharacters(): Promise<Character[]> {
  return request<Character[]>("/characters");
}

export function createCharacter(data: { name: string; class: string }) {
  return request<Character>("/characters", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteCharacter(characterId: string) {
  return request<void>(`/characters/${characterId}`, { method: "DELETE" });
}

// party

export function getParties() {
  return request<any[]>("/parties");
}

export function createParty(
  userId: string,
  name: string,
  characterIds?: string[],
) {
  return request<any>("/parties", {
    method: "POST",
    body: JSON.stringify({ userId, name, characterIds }),
  });
}

export function getParty(partyId: string) {
  return request<any>(`/parties/${partyId}`);
}

export function addCharacterToParty(partyId: string, characterId: string) {
  return request<any>(`/parties/${partyId}/characters`, {
    method: "POST",
    body: JSON.stringify({ characterId }),
  });
}

export function removeCharacterFromParty(partyId: string, characterId: string) {
  return request<void>(`/parties/${partyId}/characters/${characterId}`, {
    method: "DELETE",
  });
}

export function deleteParty(partyId: string) {
  return request<void>(`/parties/${partyId}`, {
    method: "DELETE",
  });
}

export function updatePartyEasyMode(partyId: string, easyMode: boolean) {
  return request<any>(`/parties/${partyId}/easy-mode`, {
    method: "PUT",
    body: JSON.stringify({ easyMode }),
  });
}

// campaign

export function getActiveRun(partyId: string) {
  return request<any>(`/runs/active/${partyId}`);
}

export function startRun(partyId: string) {
  return request<any>("/runs/start", {
    method: "POST",
    body: JSON.stringify({ partyId }),
  });
}

export function getRun(runId: string) {
  return request<any>(`/runs/${runId}`);
}

export function advanceRun(runId: string) {
  return request<any>(`/runs/${runId}/advance`, { method: "POST" });
}

export function abandonRun(runId: string) {
  return request<any>(`/runs/${runId}/abandon`, { method: "POST" });
}

export function getShop(runId: string) {
  return request<any>(`/runs/${runId}/shop`);
}

export function purchaseBlessing(runId: string, service: string) {
  return request<any>(`/runs/${runId}/shop`, {
    method: "POST",
    body: JSON.stringify({ service }),
  });
}

// combat

export function getBattle(battleId: string): Promise<Battle> {
  return request<Battle>(`/battles/${battleId}`);
}

export function useAbility(
  battleId: string,
  characterId: string,
  abilityName: string,
  targetEnemyId: string,
  targetAllyId?: string,
): Promise<ActionResult> {
  return request<ActionResult>(`/battles/${battleId}/ability`, {
    method: "POST",
    body: JSON.stringify({
      characterId,
      abilityName,
      targetEnemyId,
      targetAllyId,
    }),
  });
}

export function useBasicAttack(
  battleId: string,
  characterId: string,
  targetEnemyId: string,
): Promise<ActionResult> {
  return request<ActionResult>(`/battles/${battleId}/attack`, {
    method: "POST",
    body: JSON.stringify({ characterId, targetEnemyId }),
  });
}

export function useRecovery(
  battleId: string,
  characterId: string,
  action: "rest" | "meditate",
): Promise<ActionResult> {
  return request<ActionResult>(`/battles/${battleId}/recovery`, {
    method: "POST",
    body: JSON.stringify({ characterId, action }),
  });
}
