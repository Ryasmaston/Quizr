import { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../../services/authentication";

const IconPalette=()=>(<svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none"><path d="M12 3a9 9 0 0 0 0 18h2.2a2.8 2.8 0 0 0 0-5.6H13.5a1 1 0 0 1 0-2h2.8A4.7 4.7 0 0 0 21 8.7C21 5.55 16.95 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.8 10.2h.01M10.3 7.9h.01M13 10.2h.01M15.6 11.7h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>);
const IconLandmark=()=>(<svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none"><path d="M12 4 3.5 8.5V11h17V8.5L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M5.8 11v8M9.3 11v8M12.8 11v8M16.3 11v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M4.5 19.5h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
const IconMusic=()=>(<svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none"><path d="M18 3v12.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18 5.2 9 7.5v10.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.2 20.2a2.7 2.7 0 1 0 0-5.4c-1.5 0-2.7 1.2-2.7 2.7s1.2 2.7 2.7 2.7Z" stroke="currentColor" strokeWidth="2"/><path d="M16.2 18.2a2.7 2.7 0 1 0 0-5.4c-1.5 0-2.7 1.2-2.7 2.7s1.2 2.7 2.7 2.7Z" stroke="currentColor" strokeWidth="2"/></svg>);
const IconUser=()=>(<svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M20 20a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
const IconStar=()=>(<svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none"><path d="M12 3l2.7 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.5 20.4l1.1-6.3L3 9.6l6.3-.9L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>);

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null)
  const navigate = useNavigate();

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
      await login(email, password); // Firebase sets auth.currentUser
      // onAuthStateChanged redirects on its own, but to be safe:
      // navigate("/")
    } catch (err) {
      setError("Invalid email or password");
    }
  }

return (
<div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
<div className="absolute inset-0 overflow-hidden pointer-events-none">
  <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
  <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
</div>
<div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
{/* Side category pillows (decorative) */}
<div className="pointer-events-none absolute inset-0 hidden sm:block max-[380px]:hidden">
  {/* Art */}
  <div className="absolute left-[clamp(2.1rem,10.5vw,8.2rem)] top-[42%] -translate-y-1/2">
    <div className="relative">
      <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-fuchsia-500/20 via-violet-500/12 to-fuchsia-500/18 blur-2xl"></div>
      <div className="relative inline-flex items-center gap-3 rounded-xl bg-gradient-to-b from-fuchsia-500/[0.18] via-white/[0.09] to-white/[0.06] px-5 py-3 ring-1 ring-white/10 shadow-[0_24px_70px_-50px_rgba(236,72,153,0.55)]">
        <div className="absolute inset-x-4 top-1 h-px bg-gradient-to-r from-transparent via-fuchsia-200/60 to-transparent"></div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500/24 via-violet-500/14 to-fuchsia-500/18 ring-1 ring-white/10 shadow-[0_14px_40px_-28px_rgba(236,72,153,0.45)] text-orange-200/95 drop-shadow-[0_2px_12px_rgba(251,146,60,0.35)]"><IconPalette/></span>
        <span className="text-[20px] font-semibold drop-shadow-[0_2px_10px_rgba(168,85,247,0.16)]"><span className="text-pink-400/75">A</span><span className="text-fuchsia-400/55">r</span><span className="text-indigo-400/85">t</span></span>
      </div>
    </div>
  </div>

  {/* History */}
  <div className="absolute left-[clamp(1.8rem,9.6vw,7.6rem)] top-[60%] -translate-y-1/2">
    <div className="relative">
      <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-fuchsia-500/18 via-violet-500/12 to-fuchsia-500/16 blur-2xl"></div>
      <div className="relative inline-flex items-center gap-3 rounded-xl bg-gradient-to-b from-fuchsia-500/[0.17] via-white/[0.09] to-white/[0.06] px-6 py-3 ring-1 ring-white/10 shadow-[0_24px_70px_-50px_rgba(168,85,247,0.42)]">
        <div className="absolute inset-x-4 top-1 h-px bg-gradient-to-r from-transparent via-fuchsia-200/60 to-transparent"></div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/10 shadow-[0_14px_40px_-30px_rgba(168,85,247,0.24)] text-orange-200/95 drop-shadow-[0_2px_12px_rgba(251,146,60,0.32)]"><IconLandmark/></span>
        <span className="text-[20px] font-semibold drop-shadow-[0_2px_10px_rgba(168,85,247,0.16)]"><span className="text-pink-400/75">H</span><span className="text-fuchsia-400/55">i</span><span className="text-violet-400/65">s</span><span className="text-violet-400/65">t</span><span className="text-violet-400/65">o</span><span className="text-indigo-400/85">r</span><span className="text-indigo-400/85">y</span></span>
      </div>
    </div>
  </div>

  {/* Music */}
  <div className="absolute right-[clamp(2.0rem,10.2vw,8.0rem)] top-[34%] -translate-y-1/2">
    <div className="relative">
      <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-fuchsia-500/16 via-violet-500/12 to-fuchsia-500/16 blur-2xl"></div>
      <div className="relative inline-flex items-center gap-3 rounded-xl bg-gradient-to-b from-fuchsia-500/[0.16] via-white/[0.09] to-white/[0.06] px-6 py-3 ring-1 ring-white/10 shadow-[0_24px_70px_-50px_rgba(168,85,247,0.38)]">
        <div className="absolute inset-x-4 top-1 h-px bg-gradient-to-r from-transparent via-fuchsia-200/60 to-transparent"></div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/10 shadow-[0_14px_40px_-30px_rgba(168,85,247,0.22)] text-orange-200/95 drop-shadow-[0_2px_12px_rgba(251,146,60,0.30)]"><IconMusic/></span>
        <span className="text-[20px] font-semibold drop-shadow-[0_2px_10px_rgba(168,85,247,0.16)]"><span className="text-pink-400/75">M</span><span className="text-fuchsia-400/55">u</span><span className="text-violet-400/65">s</span><span className="text-indigo-400/85">i</span><span className="text-indigo-400/85">c</span></span>
      </div>
    </div>
  </div>

  {/* Science */}
  <div className="absolute right-[clamp(1.7rem,9.6vw,7.4rem)] top-[52%] -translate-y-1/2">
    <div className="relative">
      <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-fuchsia-500/16 via-violet-500/12 to-fuchsia-500/16 blur-2xl"></div>
      <div className="relative inline-flex items-center gap-3 rounded-xl bg-gradient-to-b from-fuchsia-500/[0.16] via-white/[0.09] to-white/[0.06] px-6 py-3 ring-1 ring-white/10 shadow-[0_24px_70px_-50px_rgba(168,85,247,0.38)]">
        <div className="absolute inset-x-4 top-1 h-px bg-gradient-to-r from-transparent via-fuchsia-200/60 to-transparent"></div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/10 shadow-[0_14px_40px_-30px_rgba(168,85,247,0.22)] text-orange-200/95 drop-shadow-[0_2px_12px_rgba(251,146,60,0.30)]"><IconUser/></span>
        <span className="text-[20px] font-semibold drop-shadow-[0_2px_10px_rgba(168,85,247,0.16)]"><span className="text-pink-400/75">S</span><span className="text-fuchsia-400/55">c</span><span className="text-violet-400/65">i</span><span className="text-violet-400/65">e</span><span className="text-violet-400/65">n</span><span className="text-indigo-400/85">c</span><span className="text-indigo-400/85">e</span></span>
      </div>
    </div>
  </div>

  {/* Other */}
  <div className="absolute right-[clamp(2.7rem,11.8vw,9.0rem)] top-[74%] -translate-y-1/2">
    <div className="relative">
      <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-fuchsia-500/18 via-violet-500/12 to-fuchsia-500/18 blur-2xl"></div>
      <div className="relative inline-flex items-center gap-3 rounded-xl bg-gradient-to-b from-fuchsia-500/[0.18] via-white/[0.09] to-white/[0.06] px-6 py-3 ring-1 ring-white/10 shadow-[0_24px_70px_-50px_rgba(236,72,153,0.45)]">
        <div className="absolute inset-x-4 top-1 h-px bg-gradient-to-r from-transparent via-fuchsia-200/60 to-transparent"></div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/10 shadow-[0_14px_40px_-30px_rgba(168,85,247,0.22)] text-orange-200/95 drop-shadow-[0_2px_12px_rgba(251,146,60,0.32)]"><IconStar/></span>
        <span className="text-[20px] font-semibold drop-shadow-[0_2px_10px_rgba(168,85,247,0.16)]"><span className="text-pink-400/75">O</span><span className="text-fuchsia-400/55">t</span><span className="text-violet-400/65">h</span><span className="text-indigo-400/85">e</span><span className="text-indigo-400/85">r</span></span>
      </div>
    </div>
  </div>
</div>
{/* Auth card container (keeps the form centered and readable) */} 
<div className="w-full max-w-md">
{/* Top pill */}
<div className="mx-auto mt-4 mb-4 flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
  <span className="inline-flex items-center gap-2 text-sm sm:text-base font-medium tracking-wide text-white/70">
    <span className="h-1 w-1 rounded-full bg-violet-200/45" />
    Pick a category
  </span>
  <span className="h-1 w-1 rounded-full bg-violet-200/35" />
<button type="button" className="text-sm sm:text-base font-medium tracking-wide text-white/65 transition hover:text-white/80">
    Play
  </button>
  <span className="h-1 w-1 rounded-full bg-violet-200/45" />
<button type="button" className="text-sm sm:text-base font-medium tracking-wide text-white/65 transition hover:text-white/80">
    Add friends
  </button>
</div>

      <h1 className="text-center text-3xl sm:text-4xl font-semibold tracking-tight">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
          Welcome to Quiz.app
        </span>
      </h1>
      <p className="mt-2 text-center text-sm sm:text-base font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300">

        Build confidence — one quiz at a time.
      </p>

      <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 border border-white/20">
      <h2 className="text-lg font-medium">Log in</h2>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <label htmlFor="email" className="block text-sm text-white/80">Email</label>
      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/50 focus:ring-2 focus:ring-purple-400/60" />
      <label htmlFor="password" className="block text-sm text-white/80">Password</label>
      <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/50 focus:ring-2 focus:ring-purple-400/60" />
      <input role="submit-button" id="submit" type="submit" value="Log in" className="mt-2 w-full cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95" />
</form>

  {error && ( 
    <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"> 
      {error}
    </p>
)}
  <p className="mt-4 text-sm text-white/70">
    Don&apos;t have an account?{" "}
    <Link
      to="/signup"
      className="text-pink-300 hover:text-pink-200 underline underline-offset-4"
    >
      Sign up
    </Link>
      </p>
      </div>
    </div>
  </div>
</div>
);
}
