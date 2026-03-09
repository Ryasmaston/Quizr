import { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { login, forgotPassword } from "../../services/authentication";
import { PasswordInput } from "../../components/PasswordInput";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [emailWarning, setEmailWarning] = useState(null);
  const navigate = useNavigate();

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
    setError(null)
    try {
      await login(email, password);
    } catch (err) {
      setError("Invalid email or password");
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
                    className="mt-2 w-full cursor-pointer rounded-xl bg-slate-800 dark:bg-blue-950/60 text-white px-6 py-3 font-semibold transition-colors hover:bg-slate-700 dark:hover:bg-blue-900/60 dark:border dark:border-blue-400/30"
                  />
                </form>
                {error && (
                  <p className="mt-4 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-100/80 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
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
