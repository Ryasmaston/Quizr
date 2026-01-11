import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getLeaderboard } from "../../services/quizzes";

const columns = [
  { key: "rank", label: "#", isNumeric: true },
  { key: "username", label: "Player", isNumeric: false },
  { key: "avgPercent", label: "Average Score", isNumeric: true },
  // { key: "bestPercent", label: "Best %", isNumeric: true },
  { key: "totalCorrect", label: "Correct Answers", isNumeric: true },
  { key: "attemptsCount", label: "Total Attempts", isNumeric: true },
  { key: "quizzesTaken", label: "Quizzes Taken", isNumeric: true },
  { key: "quizzesCreated", label: "Quizzes Created", isNumeric: true }
];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "avgPercent",
    direction: "desc"
  });
  const avatarGradients = [
    "from-rose-300 to-pink-400",
    "from-sky-300 to-blue-400",
    "from-emerald-300 to-green-400",
    "from-orange-300 to-amber-400"
  ];
  const getAvatarGradient = (userId) => {
    const value = String(userId || "");
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % avatarGradients.length;
    }
    return avatarGradients[hash];
  };
  const opalBackdropStyle = {
    backgroundColor: "#f7f5f1",
    backgroundImage: `
      radial-gradient(1200px 800px at 5% 0%, rgba(255, 227, 170, 0.28), transparent 60%),
      radial-gradient(900px 700px at 85% 10%, rgba(255, 190, 220, 0.24), transparent 55%),
      radial-gradient(1000px 800px at 15% 90%, rgba(180, 220, 255, 0.24), transparent 60%),
      radial-gradient(900px 800px at 85% 85%, rgba(190, 235, 210, 0.24), transparent 60%)
    `
  };

  useEffect(() => {
    let mounted = true;
    async function loadLeaderboard() {
      try {
        const body = await getLeaderboard();
        if (!mounted) return;
        setEntries(body.leaderboard || []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load leaderboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadLeaderboard();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    return entries.map((entry) => {
      const totalQuestions = entry.totalQuestions || 0;
      const totalCorrect = entry.totalCorrect || 0;
      const avgPercent = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
      const bestPercent = Number.isFinite(entry.bestPercent) ? entry.bestPercent : 0;
      return {
        ...entry,
        avgPercent,
        bestPercent
      };
    });
  }, [entries]);

  const baseRanks = useMemo(() => {
    const base = [...rows];
    base.sort((a, b) => {
      if (a.avgPercent !== b.avgPercent) return b.avgPercent - a.avgPercent;
      return a.username.localeCompare(b.username);
    });
    return new Map(base.map((entry, index) => [entry.user_id, index + 1]));
  }, [rows]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    const { key, direction } = sortConfig;
    const order = direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      if (key === "rank") {
        const aRank = baseRanks.get(a.user_id) || 0;
        const bRank = baseRanks.get(b.user_id) || 0;
        if (aRank !== bRank) return (aRank - bRank) * order;
        return a.username.localeCompare(b.username);
      }
      if (key === "username") {
        return a.username.localeCompare(b.username) * order;
      }
      const aVal = Number.isFinite(a[key]) ? a[key] : 0;
      const bVal = Number.isFinite(b[key]) ? b[key] : 0;
      if (aVal !== bVal) return (aVal - bVal) * order;
      return a.username.localeCompare(b.username);
    });

    return sorted;
  }, [rows, sortConfig]);

  function handleSort(key) {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc"
        };
      }
      const defaultDirection = key === "username" ? "asc" : "desc";
      return { key, direction: defaultDirection };
    });
  }

  function renderSortIcon(key) {
    const isActive = sortConfig.key === key;
    const isAsc = sortConfig.direction === "asc";
    return (
      <span className="inline-flex w-4 justify-center text-slate-400">
        {isAsc ? (
          <svg
            className={`h-3 w-3 ${isActive ? "opacity-100" : "opacity-0"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10 5l4 6H6l4-6z" />
          </svg>
        ) : (
          <svg
            className={`h-3 w-3 ${isActive ? "opacity-100" : "opacity-0"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10 15l-4-6h8l-4 6z" />
          </svg>
        )}
      </span>
    );
  }

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={opalBackdropStyle}
      >
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4" style={opalBackdropStyle}>
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-slate-200/80 max-w-md text-center shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-amber-400 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Error</h3>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0" style={opalBackdropStyle}></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-amber-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-rose-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] -translate-x-1/2 -translate-y-1/2 bg-sky-200/25 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>
      <div className="relative min-h-screen pt-16 sm:pt-20">
        <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
          <div className="mb-9 sm:mb-12 text-center mt-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-3 sm:mb-4 select-none">
              Leaderboard
            </h1>
            <p className="text-slate-600 text-base sm:text-lg select-none">All quizzes combined</p>
          </div>

          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <div className="rounded-2xl border border-slate-200/80 bg-white/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm sm:text-base">
                  <thead className="bg-slate-100/70 text-left text-slate-600">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className={`px-3 sm:px-4 py-3 ${
                            column.key === "username" ? "text-left w-[220px] max-w-[220px]" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSort(column.key)}
                            className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                          >
                            <span>{column.label}</span>
                            <span className="text-xs text-slate-400">{renderSortIcon(column.key)}</span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 text-slate-700 text-left">
                    {sortedRows.length === 0 ? (
                      <tr>
                        <td className="px-3 sm:px-4 py-4 text-center text-slate-500" colSpan={columns.length}>
                          No leaderboard data yet.
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((entry, index) => (
                        <tr key={entry.user_id}>
                          <td className="px-3 sm:px-4 py-3 font-medium text-slate-800 text-left">
                            {baseRanks.get(entry.user_id) || index + 1}
                          </td>
                          <td className="px-3 sm:px-4 py-3 font-medium text-slate-800 text-left w-[220px] max-w-[220px]">
                            <Link
                              to={`/users/${entry.username}`}
                              className="flex items-center gap-3 min-w-0 cursor-pointer text-slate-800 hover:text-slate-800 hover:font-semibold"
                            >
                              <div
                                className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br ${getAvatarGradient(entry.user_id)} flex items-center justify-center text-white font-semibold text-sm`}
                              >
                                {(entry.username || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate">{entry.username}</span>
                            </Link>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-left">{Math.round(entry.avgPercent)}%</td>
                          <td className="px-3 sm:px-4 py-3 text-left">{entry.totalCorrect}</td>
                          <td className="px-3 sm:px-4 py-3 text-left">{entry.attemptsCount}</td>
                          <td className="px-3 sm:px-4 py-3 text-left">{entry.quizzesTaken}</td>
                          <td className="px-3 sm:px-4 py-3 text-left">{entry.quizzesCreated}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
