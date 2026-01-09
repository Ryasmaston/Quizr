import { useEffect, useMemo, useState } from "react";
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
      <span className="inline-flex w-4 justify-center text-gray-300">
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
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="mt-4 text-white font-medium">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Error</h3>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto pt-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-3 sm:mb-4">
            Leaderboard
          </h1>
          <p className="text-gray-300 text-base sm:text-lg">All quizzes combined</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20">
          <div className="rounded-2xl border border-white/20 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm sm:text-base">
              <thead className="bg-white/10 text-left text-gray-200">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-3 sm:px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-center gap-2 text-left font-semibold text-gray-100 hover:text-white"
                      >
                        <span>{column.label}</span>
                        <span className="text-xs text-gray-300">{renderSortIcon(column.key)}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-gray-100">
                {sortedRows.length === 0 ? (
                  <tr>
                    <td className="px-3 sm:px-4 py-4 text-center text-gray-300" colSpan={columns.length}>
                      No leaderboard data yet.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((entry, index) => (
                    <tr key={entry.user_id}>
                      <td className="px-3 sm:px-4 py-3 font-medium text-white">
                        {baseRanks.get(entry.user_id) || index + 1}
                      </td>
                      <td className="px-3 sm:px-4 py-3 font-medium text-white">{entry.username}</td>
                      <td className="px-3 sm:px-4 py-3">{Math.round(entry.avgPercent)}%</td>
                      <td className="px-3 sm:px-4 py-3">{entry.totalCorrect}</td>
                      <td className="px-3 sm:px-4 py-3">{entry.attemptsCount}</td>
                      <td className="px-3 sm:px-4 py-3">{entry.quizzesTaken}</td>
                      <td className="px-3 sm:px-4 py-3">{entry.quizzesCreated}</td>
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
  );
}
