import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./components/HomePage";
import { RunScreen } from "./components/RunScreen";
import { RunProgress } from "./components/RunProgress";
import { BattleScreen } from "./components/BattleScreen";
import { joinWithEmail } from "./api";

function AppContent() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/run/:partyId" element={<RunScreen />} />
          <Route path="/run-progress/:runId" element={<RunProgress />} />
          <Route path="/battle/:battleId" element={<BattleScreen />} />
          <Route path="/battle" element={<BattleScreen />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function AuthPrompt() {
  const [email, setEmail] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email to play");
      return;
    }
    setError(null);
    setConfirmedEmail(email);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const { token, user } = await joinWithEmail(confirmedEmail!);
      localStorage.setItem("authToken", token);
      localStorage.setItem("rpg_user_id", user.id);
      localStorage.setItem("userEmail", user.email);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setConfirmedEmail(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <h1 className="text-2xl font-bold mb-2">Path of Strife</h1>
          <p className="text-sm text-[var(--color-text-dim)] mb-6">
            o struggler, go forth and conquer.
          </p>

          {!confirmedEmail ? (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text-dim)]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)]"
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-sm text-[var(--color-damage)]">{error}</div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-3 rounded-lg bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent)]/80 cursor-pointer"
              >
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-[var(--color-text-dim)] mb-2">
                  Sign in as:
                </p>
                <div className="px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]">
                  {confirmedEmail}
                </div>
              </div>

              {error && (
                <div className="text-sm text-[var(--color-damage)]">{error}</div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedEmail(null);
                    setEmail("");
                    setError(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-border)] text-[var(--color-text)] font-medium hover:bg-[var(--color-border)]/70 cursor-pointer"
                  disabled={loading}
                >
                  Change
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent)]/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? "Joining..." : "Join"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // check if we have a saved token
    const token = localStorage.getItem("authToken");
    setAuthenticated(!!token);
  }, []);

  if (authenticated === null) {
    // loading
    return null;
  }

  return authenticated ? <AppContent /> : <AuthPrompt />;
}

export default App;
