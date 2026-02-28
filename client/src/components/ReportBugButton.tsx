import { useCallback } from "react";

export default function ReportBugButton({
  screen,
  context,
}: {
  screen: string;
  context?: Record<string, any> | undefined;
}) {
  const handleReport = useCallback(async () => {
    try {
      // Battle-specific: if we have a battleId, try server endpoint
      const battleId = context?.battleId as string | undefined;
      if (screen === "battle" && battleId) {
        const res = await fetch(`/api/battles/${battleId}/bug-report`);
        if (!res.ok) throw new Error("Failed to generate bug report");
        const bugReport = await res.json();
        const reportText = JSON.stringify(bugReport, null, 2);
        await navigator.clipboard.writeText(reportText);
        alert("Report copied to clipboard — please send it to the devs.");
        return;
      }

      // Generic client-side report
      const report = {
        screen,
        url: window.location.href,
        userEmail: localStorage.getItem("userEmail") || null,
        timestamp: new Date().toISOString(),
        context: context ?? null,
        navigator: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      };
      const text = JSON.stringify(report, null, 2);
      await navigator.clipboard.writeText(text);
      alert("Report copied to clipboard — please send it to the devs.");
    } catch (err: any) {
      console.error(err);
      alert("Failed to create bug report: " + (err.message ?? err));
    }
  }, [screen, context]);

  return (
    <button
      onClick={handleReport}
      className="text-xs px-3 py-1.5 rounded font-bold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90 disabled:opacity-40 cursor-pointer transition"
    >
      Report Bug
    </button>
  );
}
