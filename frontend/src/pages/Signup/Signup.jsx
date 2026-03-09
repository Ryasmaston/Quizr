import { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../../services/authentication";
import { apiFetch } from "../../services/api";
import { useUser } from "../../hooks/useUser";
import { useTheme } from "../../hooks/useTheme";
import { PasswordInput } from "../../components/PasswordInput";
import { formatUsernameInput, trimTrailingSpace } from "../../utils/usernameValidation";
import { Sun, Moon } from "lucide-react";
import { setSigningUp as setSignupGate } from "../../services/signupGate";

const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
const NORMALIZED_BASE = RAW_BACKEND_URL.replace(/\/$/, "");
const BACKEND_URL = NORMALIZED_BASE
  ? (NORMALIZED_BASE.endsWith("/api") ? NORMALIZED_BASE : `${NORMALIZED_BASE}/api`)
  : "/api";

export function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [emailInUse, setEmailInUse] = useState(false);
  const [usernameWarning, setUsernameWarning] = useState(null);
  const [emailWarning, setEmailWarning] = useState(null);

  const { refreshUser } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !isSigningUp) {
        navigate("/");
      }
    });
    return unsub;
  }, [navigate, isSigningUp]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setEmailInUse(false);
    setIsSigningUp(true);
    try {
      if (!username.trim()) {
        setError("Username is required");
        setIsSigningUp(false);
        return;
      }
      if (password.length < 12) {
        setError("Password must be at least 12 characters long");
        setIsSigningUp(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setIsSigningUp(false);
        return;
      }
      const availabilityRes = await fetch(
        `${BACKEND_URL}/users/availability?username=${encodeURIComponent(username)}`);
      const availabilityBody = await availabilityRes.json().catch(() => ({}));
      if (!availabilityRes.ok) {
        throw new Error(availabilityBody.message || "Unable to check username");
      }
      const { available } = availabilityBody;
      if (!available) {
        setError("Username already taken");
        return;
      }

      setSignupGate(true);
      await signup(email, password);
      const res = await apiFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Unable to create user");
      }
      setSignupGate(false);
      await refreshUser();
      navigate("/");
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setEmailInUse(true);
      } else {
        setError(err.message || "Signup failed");
      }
      setSignupGate(false);
      setIsSigningUp(false);
    }
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
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-800 mb-2 select-none">Create your account</h1>
            <p className="text-slate-600">Join Quizr and start playing</p>
          </div>
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-3">
              <label htmlFor="username" className="block text-sm text-slate-600">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  const input = e.target;
                  const cursorPos = input.selectionStart;
                  const raw = e.target.value;
                  const { value, warning } = formatUsernameInput(raw);
                  const charsRemoved = raw.length - value.length;
                  const newCursor = Math.max(0, cursorPos - charsRemoved);
                  setUsername(value);
                  if (warning) setUsernameWarning(warning);
                  else setUsernameWarning(null);
                  requestAnimationFrame(() => {
                    input.setSelectionRange(newCursor, newCursor);
                  });
                }}
                onBlur={() => {
                  const { value, warning } = trimTrailingSpace(username);
                  setUsername(value);
                  if (warning) setUsernameWarning(warning);
                }}
                onFocus={() => setUsernameWarning(null)}
                className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300/70"
              />
              <p className={`text-xs mt-0.5 pl-0.5 min-h-[1.25rem] ${usernameWarning ? 'text-rose-500' : 'text-transparent'}`}>
                {usernameWarning || '\u00A0'}
              </p>
              <label htmlFor="email" className="block text-sm text-slate-600">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailWarning(null); }}
                onBlur={() => {
                  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    setEmailWarning("Please enter a valid email address.");
                  }
                }}
                className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300/70"
              />
              <p className={`text-xs mt-0.5 pl-0.5 min-h-[1.25rem] ${emailWarning ? 'text-rose-500' : 'text-transparent'}`}>
                {emailWarning || '\u00A0'}
              </p>
              <label htmlFor="password" className="block text-sm text-slate-600">Password</label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={12}
              />
              <p className="text-xs text-slate-500 mt-0.5 pl-0.5 min-h-[1.25rem]">Must be at least 12 characters long.</p>
              <label htmlFor="confirmPassword" className="block text-sm text-slate-600">Confirm Password</label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                minLength={12}
              />
              <p className={`text-xs mt-0.5 pl-0.5 min-h-[1.25rem] ${
                confirmPassword && confirmPassword !== password
                  ? 'text-rose-500'
                  : 'text-transparent'
              }`}>
                {confirmPassword && confirmPassword !== password ? 'Passwords do not match.' : '\u00A0'}
              </p>
              <input
                role="submit-button"
                id="submit"
                type="submit"
                value="Sign up"
                disabled={!username || !email || !password || !confirmPassword}
                className="mt-2 w-full cursor-pointer rounded-xl bg-slate-800 dark:bg-blue-950/60 text-white px-6 py-3 font-semibold transition-colors hover:bg-slate-700 dark:hover:bg-blue-900/60 dark:border dark:border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </form>
            {error && (
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}
            {emailInUse && (
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                Email already in use.{" "}
                <Link to="/login" className="underline underline-offset-4 hover:text-rose-600">Log in</Link>
              </p>
            )}
            <p className="mt-4 text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-slate-800 underline underline-offset-4 hover:text-slate-600 pt-0.5 pb-2 px-1"
              >
                Log in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
