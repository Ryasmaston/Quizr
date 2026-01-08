import { useEffect, useState } from "react";
import {Link} from "react-router-dom";
import { getQuizzes } from "../../services/quizzes";
import { toggleFavourite } from "../../services/favourites";
import { apiFetch } from "../../services/api";
import { authReady } from "../../services/authState";

export function Home() {
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  const [favouriteIds, setFavouriteIds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");


useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await getQuizzes();
        setQuizzes(Array.isArray(data?.quizzes) ? data.quizzes : []);
      } catch (error) {
        console.error("Failed to load quizzes", error);
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

useEffect(() => {
  let mounted = true;
  async function fetchUser() {
    await authReady;
    try {
      const res = await apiFetch("/users/me");
      const body = await res.json();
      if (!mounted) return;
      const favs = Array.isArray(body.user?.favourites) ? body.user.favourites : [];
      const ids = favs.map((q) => (typeof q === "string" ? q : q._id));
      setFavouriteIds(ids);
    } catch (error) {
      console.error("Failed to load user", error);
    }
  }
  fetchUser();
  return () => {mounted = false;};
}, []);

  async function handleToggleFavourite(quizId, isFavourited) {
    const next = !isFavourited;
    setFavouriteIds((prev) =>
      next ? [...prev, quizId] : prev.filter((id) => id !== quizId)
    );
    try {
      await toggleFavourite(quizId, isFavourited);
    } catch (error) {
      console.error("Failed to update favourite", error);
      setFavouriteIds((prev) =>
        next ? prev.filter((id) => id !== quizId) : [...prev, quizId]
      );
    }
  }

  const gradients = [
    "from-rose-500 to-pink-600",
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-fuchsia-500 to-pink-600"
  ];

  const categories = [
    "all",
    ...new Set(quizzes.map((quiz) => quiz.category))
  ];

  const filteredQuizzes = selectedCategory === "all" ? quizzes : quizzes.filter(
    (quiz) => quiz.category === selectedCategory
  );
  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="mt-4 text-white font-medium">Loading quizzes...</p>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto pt-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-3 sm:mb-4 animate-fade-in px-4">
            Quiz app
          </h1>
          <p className="text-gray-300 text-base sm:text-lg px-4">Challenge yourself and expand your knowledge</p>
        </div>
        {quizzes.length > 0 && (
  <div className="mb-6 sm:mb-8 max-w-3xl mx-auto px-4 flex flex-col-reverse sm:flex-row sm:flex-wrap items-center justify-between gap-4">
    {/* Total Quizzes Card */}
    <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl px-4 py-3 border border-white/20 flex flex-col justify-center min-w-[150px] w-full sm:w-auto">
      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{filteredQuizzes.length}</div>
      <div className="text-gray-300 text-xs sm:text-sm">Total Quizzes</div>
    </div>

    {/* Category filter drop down */}
    <select
      value={selectedCategory}
      onChange={(e) => setSelectedCategory(e.target.value)}
      className="
        h-16
        w-full max-w-md
        bg-white/10 text-white
        px-6
        rounded-2xl
        border border-white/20
        backdrop-blur
        text-center
        focus:outline-none focus:ring-2 focus:ring-purple-400
      "
    >
      {categories.map((category) => (
        <option
          key={category}
          value={category}
          className="text-black"
        >
          {category === "all"
            ? "All Quizzes"
            : category.charAt(0).toUpperCase() + category.slice(1)}
        </option>
      ))}
    </select>
  </div>
)}

        {quizzes.length === 0 && (
          <div className="text-center py-12 sm:py-20 max-w-md mx-auto px-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-white/20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">No Quizzes Yet</h3>
              <p className="text-gray-300 text-sm sm:text-base mb-4 sm:mb-6">
                Start your learning journey by creating your first quiz
              </p>
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95">
                Create Your First Quiz
              </button>
            </div>
          </div>
        )}
        {quizzes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-4">
            {filteredQuizzes.map((quiz, index) => {
              const gradient = gradients[index % gradients.length];
              const isFavourited = favouriteIds.includes(quiz._id);
              return (
                <Link
                  key={quiz._id}
                  to={`/quiz/${quiz._id}`}
                  className="group relative block"
                >
                  <button
                    type="button"
                    aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleToggleFavourite(quiz._id, isFavourited);
                    }}
                    className={`absolute top-3 right-3 z-10 inline-flex items-center justify-center rounded-full border border-white/20 bg-black/30 p-2 backdrop-blur transition-transform duration-200 group-hover:-translate-y-2 group-hover:scale-110 ${
                      isFavourited ? "text-yellow-300" : "text-white/70 hover:text-yellow-200"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill={isFavourited ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3l2.7 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.5 20.4l1.1-6.3L3 9.6l6.3-.9L12 3Z" />
                    </svg>
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10"
                    style={{ background: `linear-gradient(135deg, rgb(168 85 247), rgb(236 72 153))` }}></div>
                  <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/20 hover:border-white/40 transition-all transform group-hover:-translate-y-2 group-hover:shadow-2xl overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 bg-gradient-to-r ${gradient}`}></div>
                    <div className="relative z-10 pt-2">
                      <div className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${gradient} mb-3 sm:mb-4 transform group-hover:scale-110 transition-transform`}>
                        <span className="text-white font-bold text-lg sm:text-xl">{index + 1}</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 line-clamp-2 transition-all">
                        {quiz.title}
                      </h3>
                      <div className="flex flex-col items-center justify-center gap-1 text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4">
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{quiz?.questions?.length || 0} questions</span>
                        </div>
                        <div>
                          <span>Created by {quiz?.created_by?.username}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -bottom-8 -right-8 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
