import { useRef, useEffect } from "react";
import type { BattleEvent } from "../types";

interface Props {
  events: BattleEvent[];
}

export function BattleLog({ events }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-dim)] p-3 pb-2">
        Battle Log
      </h2>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0"
      >
        {events.length === 0 && (
          <p className="text-xs text-[var(--color-text-dim)] italic">
            Battle begins...
          </p>
        )}
        {events.map((event, i) => (
          <LogEntry key={i} event={event} />
        ))}
      </div>
    </div>
  );
}

function LogEntry({ event }: { event: BattleEvent }) {
  const { colorClass, icon } = getEventStyle(event.type);

  return (
    <div className={`text-xs leading-relaxed ${colorClass}`}>
      {icon && <span className="mr-1">{icon}</span>}
      <span>{event.message ?? formatEvent(event)}</span>
    </div>
  );
}

function getEventStyle(type: string): { colorClass: string; icon: string } {
  switch (type) {
    case "attack":
    case "ability":
      return { colorClass: "text-[var(--color-text)]", icon: "⚔️" };
    case "enemy_attack":
    case "enemy_ability":
      return { colorClass: "text-[var(--color-enemy)]", icon: "🗡️" };
    case "recovery":
      return { colorClass: "text-[var(--color-heal)]", icon: "💚" };
    case "dot":
      return { colorClass: "text-[var(--color-damage)]", icon: "🔥" };
    case "effect":
      return { colorClass: "text-[var(--color-mana)]", icon: "✨" };
    case "reward":
      return { colorClass: "text-[var(--color-gold)]", icon: "🏆" };
    case "dodge":
    case "parry":
      return { colorClass: "text-[var(--color-heal)]", icon: "💨" };
    case "miss":
      return { colorClass: "text-[var(--color-text-dim)]", icon: "💨" };
    case "phase":
      return { colorClass: "text-[var(--color-enemy)] font-bold", icon: "⚠️" };
    case "toggle":
      return { colorClass: "text-[var(--color-accent)]", icon: "🔄" };
    default:
      return { colorClass: "text-[var(--color-text-dim)]", icon: "" };
  }
}

function formatEvent(event: BattleEvent): string {
  if (event.message) return event.message;
  return JSON.stringify(event);
}
