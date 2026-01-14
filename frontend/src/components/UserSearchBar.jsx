import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";

// Navbar user search component.
// - Uses apiFetch (project convention)
// - Debounced requests to avoid spamming API
// - Minimal dropdown UI; closes on blur/escape/select
export default function UserSearchBar({ excludeUsername }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Ignore stale responses when typing quickly
  const requestIdRef = useRef(0);

  useEffect(() => {
    const query = q.trim();

    if (query.length < 2) {
      setUsers([]);
      setOpen(false);
      return;
    }

    const id = ++requestIdRef.current;

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await apiFetch(
          `/users/search?q=${encodeURIComponent(query)}`
        );
        const body = await res.json();

        if (requestIdRef.current !== id) return;

        const list = Array.isArray(body.users) ? body.users : [];
        const filtered = excludeUsername
          ? list.filter((u) => u.username !== excludeUsername)
          : list;

        setUsers(filtered);
        setOpen(true);
      } catch (err) {
        console.error("User search failed", err);
        setUsers([]);
        setOpen(false);
      } finally {
        if (requestIdRef.current === id) setLoading(false);
      }
    }, 100);

    return () => clearTimeout(t);
  }, [q, excludeUsername]);

  function selectUser(username) {
    setOpen(false);
    setQ("");
    if (inputRef.current) {
      inputRef.current.blur();
    }
    // Matches existing navbar profile link format
    navigate(`/users/${username}`);
  }

  return (
    <div className="relative w-full max-w-md">
      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (users.length) setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            e.currentTarget.blur();
          }
        }}
        placeholder="Search users…"
        className="w-full rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 px-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300/30 dark:focus:ring-white/40 focus:shadow-[0_0_12px_-2px_rgba(100,116,139,0.25)] dark:focus:shadow-[0_0_16px_-2px_rgba(255,255,255,0.15)] transition-all"
      />

      {open && (
        <div className="absolute mt-2 w-full rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/80 backdrop-blur-md shadow-lg overflow-hidden z-50">
          {loading && (
            <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-300">Searching…</div>
          )}

          {!loading && users.length === 0 && (
            <div className="px-4 py-2 text-sm text-slate-400 dark:text-slate-500">No users found</div>
          )}

          {!loading &&
            users.map((u) => (
              <button
                key={u.id || u.username}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectUser(u.username)}
                className="w-full text-left px-4 py-5 text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-900/60 flex items-center gap-3"
              >
                <span>{u.username}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
