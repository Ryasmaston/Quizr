import { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { login, forgotPassword } from "../../services/authentication";
import { PasswordInput } from "../../components/PasswordInput";
import { useTheme } from "../../hooks/useTheme";
import { Sun, Moon } from "lucide-react";

const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
const NORMALIZED_BASE = RAW_BACKEND_URL.replace(/\/$/, "");
const BACKEND_URL = NORMALIZED_BASE
  ? (NORMALIZED_BASE.endsWith("/api") ? NORMALIZED_BASE : `${NORMALIZED_BASE}/api`)
  : "/api";

export function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/")
    })
    return unsub
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      const raw = identifier;

      // If input doesn't look like an email, resolve username → email
      if (!raw.includes("@")) {
        // Reject leading/trailing whitespace — must be exact username
        if (!raw || raw !== raw.trim()) {
          setError("Invalid username/email or password.");
          return;
        }
        const res = await fetch(
          `${BACKEND_URL}/users/resolve?username=${encodeURIComponent(raw)}`
        );
        if (!res.ok) {
          setError("Invalid username/email or password.");
          return;
        }
        const body = await res.json();
        await login(body.email, password);
      } else {
        await login(raw.trim(), password);
      }
    } catch (err) {
      setError("Invalid username/email or password.");
    }
  }

  async function handleForgotSubmit(event) {
    event.preventDefault();
    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail);
    } catch {
      // Intentionally swallow errors to prevent email enumeration
    } finally {
      setForgotSent(true);
      setForgotLoading(false);
    }
  }

  function handleBackToLogin() {
    setIsForgotMode(false);
    setForgotSent(false);
    setForgotEmail("");
    setError(null);
  }

  return (
    <>
      <div
        className="fixed inset-0"
        style={{
          backgroundColor: "var(--opal-bg-color)",
          backgroundImage: "var(--opal-backdrop-image)"
        }}
      ></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-amber-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-rose-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] -translate-x-1/2 -translate-y-1/2 bg-sky-200/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/50 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="fixed inset-0 pt-16 pb-16 flex flex-col overflow-y-auto">
        <main className="relative w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 my-auto">
          <div className="mb-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-800 mb-2 select-none">
              {isForgotMode ? "Reset password" : "Welcome back"}
            </h1>
            <p className="text-slate-600">
              {isForgotMode ? "We'll send a reset link to your email" : "Log in to continue"}
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            {isForgotMode ? (
              <>
                {forgotSent ? (
                  <div className="mt-1">
                    <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
                      If an account with that email exists, a reset link has been sent. Check your inbox.
                    </p>
                    <button
                      onClick={handleBackToLogin}
                      className="mt-4 text-sm text-slate-600 underline underline-offset-4 hover:text-slate-800"
                    >
                      Back to log in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="mt-5 space-y-4">
                    <label htmlFor="forgot-email" className="block text-sm text-slate-600">Email</label>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300/70"
                    />
                    <input
                      type="submit"
                      disabled={forgotLoading}
                      value={forgotLoading ? "Sending..." : "Send reset link"}
                      className="mt-2 w-full cursor-pointer rounded-xl bg-slate-800 dark:bg-blue-950/60 text-white px-6 py-3 font-semibold transition-colors hover:bg-slate-700 dark:hover:bg-blue-900/60 dark:border dark:border-blue-400/30 disabled:opacity-60"
                    />
                    <p className="text-sm text-slate-600">
                      <button
                        type="button"
                        onClick={handleBackToLogin}
                        className="underline underline-offset-4 hover:text-slate-800"
                      >
                        Back to log in
                      </button>
                    </p>
                  </form>
                )}
              </>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <label htmlFor="identifier" className="block text-sm text-slate-600">Email or username</label>
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300/70"
                  />
                  <p className="text-xs mt-0.5 pl-0.5 min-h-[1.25rem] text-transparent">
                    &nbsp;
                  </p>
                  <label htmlFor="password" className="block text-sm text-slate-600">Password</label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="flex justify-center -mt-1">
                    <button
                      type="button"
                      onClick={() => { setIsForgotMode(true); setError(null); }}
                      className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-4 pt-0.5 pb-2 px-2"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    role="submit-button"
                    id="submit"
                    type="submit"
                    value="Log in"
                    disabled={!identifier || !password}
                    className="mt-2 w-full cursor-pointer rounded-xl bg-slate-800 dark:bg-blue-950/60 text-white px-6 py-3 font-semibold transition-colors hover:bg-slate-700 dark:hover:bg-blue-900/60 dark:border dark:border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </form>
                {error && (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                )}
                <p className="mt-4 text-sm text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-slate-800 underline underline-offset-4 hover:text-slate-600 pt-0.5 pb-2 px-1"
                  >
                    Sign up
                  </Link>
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
