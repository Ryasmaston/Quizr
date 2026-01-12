import { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../../services/authentication";
import { apiFetch } from "../../services/api";

const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
const NORMALIZED_BASE = RAW_BACKEND_URL.replace(/\/$/, "");
const BACKEND_URL = NORMALIZED_BASE
  ? (NORMALIZED_BASE.endsWith("/api") ? NORMALIZED_BASE : `${NORMALIZED_BASE}/api`)
  : "/api";

export function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState(null);

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
      if (!username.trim()) {
        setError("Username is required");
        return;
      }
      const availabilityRes = await fetch(
        `${BACKEND_URL}/users/availability?username=${encodeURIComponent(username)}`);
      // two lines of code changed: await fetch replaced with apiFetch to follow README rule never call fetch() directly for our API
      // const availabilityRes = await apiFetch(
      // `/users/availability?username=${encodeURIComponent(username)}`
      // );
      const availabilityBody = await availabilityRes.json().catch(() => ({}));
      if (!availabilityRes.ok) {
        throw new Error(availabilityBody.message || "Unable to check username");
      }
      const { available } = availabilityBody;
      if (!available) {
        setError("Username already taken");
        return;
      }

      await signup(email, password); // creates user + signs them in
      const res = await apiFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Unable to create user");
      }
      // onAuthStateChanged redirects on its own, but to be safe:
      // navigate("/")
    } catch (err) {
      setError(err.message || "Signup failed");
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
      <div className="relative min-h-screen pt-16 sm:pt-20">
        <main className="relative max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="mb-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-800 mb-2 select-none">Create your account</h1>
            <p className="text-slate-600">Join Quizr and start playing</p>
          </div>
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Sign up</h2>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label htmlFor="username" className="block text-sm text-slate-600">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300/70"
              />
              <label htmlFor="email" className="block text-sm text-slate-600">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300/70"
              />
              <label htmlFor="password" className="block text-sm text-slate-600">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300/70"
              />
              <input
                role="submit-button"
                id="submit"
                type="submit"
                value="Sign up"
                className="mt-2 w-full cursor-pointer rounded-xl bg-slate-800 dark:bg-blue-950/60 text-white px-6 py-3 font-semibold transition-colors hover:bg-slate-700 dark:hover:bg-blue-900/60 dark:border dark:border-blue-400/30"
              />
            </form>
            {error && (
              <p className="mt-4 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-100/80 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
                {error}
              </p>
            )}
            <p className="mt-4 text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-slate-800 underline underline-offset-4 hover:text-slate-600"
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
