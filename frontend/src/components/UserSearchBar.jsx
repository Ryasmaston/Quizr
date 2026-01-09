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
    // Matches existing navbar profile link format
    navigate(`/users/${username}`);
  }

  return (
    <div className="relative w-full max-w-md">
      <input
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
        className="w-full rounded-full bg-white/10 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />

      {open && (
        <div className="absolute mt-2 w-full rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-lg overflow-hidden z-50">
          {loading && (
            <div className="px-4 py-2 text-sm text-gray-300">Searching…</div>
          )}

          {!loading && users.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-400">No users found</div>
          )}

          {!loading &&
            users.map((u) => (
              <button
                key={u.id || u.username}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectUser(u.username)}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3"
              >
                {u.profile_pic ? (
                  <img
                    src={u.profile_pic}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-white/10" />
                )}
                <span>{u.username}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
