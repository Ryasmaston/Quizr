import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getQuizzes } from "../../services/quizzes";
import { toggleFavourite } from "../../services/favourites";
import { apiFetch } from "../../services/api";
import { authReady } from "../../services/authState";

export function Home() {
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  const [favouriteIds, setFavouriteIds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [sortDirection, setSortDirection] = useState("desc");
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search || ""}`;
  const opalBackdropStyle = {
    backgroundColor: "var(--opal-bg-color)",
    backgroundImage: "var(--opal-backdrop-image)"
  };
  const logoBaseGradient = `
    radial-gradient(160px 120px at 15% 30%, rgba(255, 190, 70, 1), transparent 65%),
    radial-gradient(180px 140px at 45% 20%, rgba(255, 120, 190, 1), transparent 65%),
    radial-gradient(180px 140px at 70% 40%, rgba(90, 180, 255, 1), transparent 65%),
    radial-gradient(200px 150px at 85% 65%, rgba(95, 220, 175, 1), transparent 70%),
    linear-gradient(100deg, rgba(255, 200, 90, 1), rgba(255, 140, 200, 1) 35%, rgba(100, 190, 255, 1) 70%, rgba(105, 230, 185, 1))
  `;
  const logoHoverGradient = `
    linear-gradient(120deg, rgba(215, 55, 165, 1), rgba(235, 175, 55, 1) 38%, rgba(55, 140, 225, 1) 58%, rgba(45, 175, 120, 1))
  `;


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
  }, [location.state?.refreshKey]);

  useEffect(() => {
    let mounted = true;
    async function fetchUser() {
      await authReady;
      try {
        const res = await apiFetch("/users/me");
        const body = await res.json();
        if (!mounted) return;
        const favs = Array.isArray(body.user?.preferences?.favourites) ? body.user.preferences.favourites : [];
        const ids = favs.map((q) => (typeof q === "string" ? q : q._id));
        setFavouriteIds(ids);
      } catch (error) {
        console.error("Failed to load user", error);
      }
    }
    fetchUser();
    return () => { mounted = false; };
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

  const categoryGradients = {
    art: {
      className: "from-pink-500 to-rose-500 dark:bg-pink-500/10 dark:border-pink-500/30 dark:text-pink-400 dark:border",
      hover: { primary: "236 72 153", secondary: "244 63 94" }
    },
    history: {
      className: "from-orange-500 to-amber-500 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:border",
      hover: { primary: "249 115 22", secondary: "245 158 11" }
    },
    music: {
      className: "from-purple-500 to-indigo-500 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400 dark:border",
      hover: { primary: "168 85 247", secondary: "99 102 241" }
    },
    science: {
      className: "from-blue-500 to-cyan-500 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400 dark:border",
      hover: { primary: "59 130 246", secondary: "6 182 212" }
    },
    other: {
      className: "from-gray-500 to-slate-500 dark:bg-slate-500/10 dark:border-slate-500/30 dark:text-slate-400 dark:border",
      hover: { primary: "107 114 128", secondary: "100 116 139" }
    }
  };
  const categoryIcons = {
    art: "/art.svg",
    history: "/history.svg",
    music: "/music.svg",
    science: "/science.svg",
    other: "/other.svg"
  };
  const difficultyChips = {
    easy: {
      label: "Easy",
      className: "border-emerald-300/50 bg-emerald-400/25 text-emerald-700 hover:border-emerald-200/80 hover:bg-emerald-100/70 hover:text-emerald-700",
      iconPaths: [
        "M5 18c0-6 4.5-11 12-12 1 8-4 13-10 13-1.2 0-2-.3-2-.9z",
        "M8 16c1-3 4-5 8-6",
        "M8 12c1.5 0 3 .5 4.5 1.5"
      ]
    },
    medium: {
      label: "Medium",
      className: "border-amber-400/40 bg-amber-500/20 text-amber-700 hover:border-amber-200/80 hover:bg-amber-100/70 hover:text-amber-700",
      iconPaths: [
        "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
        "M9 15l6-6",
        "M9.5 14.5l1.5-4.5 4.5-1.5-1.5 4.5-4.5 1.5z"
      ]
    },
    hard: {
      label: "Hard",
      className: "border-rose-400/40 bg-rose-500/20 text-rose-700 hover:border-rose-200/80 hover:bg-rose-100/70 hover:text-rose-700",
      iconPaths: [
        "M13 2L4 14h6l-1 8 9-12h-6z"
      ]
    }
  };

  const categories = [
    "all",
    "favourites",
    ...new Set(
      quizzes
        .map((quiz) => quiz.category)
        .filter((category) => category && category !== "favourites")
    )
  ];

  const countLabel = selectedCategory === "all"
    ? "Total Quizzes"
    : selectedCategory === "favourites"
      ? "Favourite Quizzes"
      : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Quizzes`;

  const difficultyOrder = { easy: 1, medium: 2, hard: 3 };

  const filteredQuizzes = (selectedCategory === "all"
    ? quizzes
    : selectedCategory === "favourites"
      ? quizzes.filter((quiz) => favouriteIds.includes(quiz._id))
      : quizzes.filter((quiz) => quiz.category === selectedCategory)
  ).sort((a, b) => {
    if (sortBy === "stars") {
      const getStars = (q) => q.favourited_count ?? (Array.isArray(q.favourites) ? q.favourites.length : (q.favouritesCount ?? 0));
      return sortDirection === "desc" ? getStars(b) - getStars(a) : getStars(a) - getStars(b);
    }
    if (sortBy === "questions") {
      const getCount = (q) => q.questions?.length || 0;
      return sortDirection === "desc" ? getCount(b) - getCount(a) : getCount(a) - getCount(b);
    }
    if (sortBy === "difficulty") {
      const getDiff = (q) => difficultyOrder[q.difficulty] || 0;
      return sortDirection === "desc" ? getDiff(b) - getDiff(a) : getDiff(a) - getDiff(b);
    }
    // Default to date (newest/oldest)
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
  });

  const handleCardMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty("--hover-x", `${x}%`);
    event.currentTarget.style.setProperty("--hover-y", `${y}%`);
  };

  const handleCardMouseLeave = (event) => {
    event.currentTarget.style.setProperty("--hover-x", "50%");
    event.currentTarget.style.setProperty("--hover-y", "50%");
  };

  const handleOutsideClick = (event) => {
    const dropdown = document.getElementById('category-dropdown');
    const button = event.target.closest('button');
    if (dropdown && !dropdown.contains(event.target) && (!button || button.getAttribute('aria-haspopup') !== 'true')) {
      dropdown.classList.add('hidden');
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);
  const handleLogoMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    event.currentTarget.style.setProperty("--logo-x", `${x}%`);
    event.currentTarget.style.setProperty("--logo-y", `${y}%`);
  };

  const handleLogoMouseLeave = (event) => {
    event.currentTarget.style.setProperty("--logo-x", "50%");
    event.currentTarget.style.setProperty("--logo-y", "50%");
  };

  if (loading)
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={opalBackdropStyle}
      >
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading quizzes...</p>
        </div>
      </div>
    );

  return (
    <>
      <div className="fixed inset-0" style={opalBackdropStyle}></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-amber-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-rose-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] -translate-x-1/2 -translate-y-1/2 bg-sky-200/25 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
      </div>
      <div className="relative min-h-screen">
        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-12">
          <div className="mb-8 sm:mb-12 text-center mt-4 sm:mt-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold mb-3 sm:mb-4 animate-fade-in px-4">
              <span
                className="relative inline-block group select-none"
                onMouseMove={handleLogoMouseMove}
                onMouseLeave={handleLogoMouseLeave}
                style={{
                  "--logo-x": "50%",
                  "--logo-y": "50%",
                  fontFamily: '"Outfit", "Inter", sans-serif'
                }}
              >
                <span aria-hidden="true" className="absolute" style={{ inset: "-9rem" }}></span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 text-transparent bg-clip-text blur-[20px] opacity-65 dark:opacity-30"
                  style={{
                    backgroundImage: logoBaseGradient,
                    filter: "blur(18px) saturate(1.08) brightness(var(--logo-base-brightness, 0.9))",
                    transform: "translateY(4px) scale(1.03)"
                  }}
                >
                  Quizr.fun
                </span>
                <span
                  className="relative z-10 text-slate-800 dark:text-slate-500"
                  style={{
                    textShadow: "var(--logo-shadow)",
                    WebkitTextStroke: "var(--logo-stroke)"
                  }}
                  data-theme-text="true"
                >
                  Quizr.fun
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 text-transparent bg-clip-text opacity-0 group-hover:opacity-95 dark:group-hover:opacity-100 transition-opacity duration-200 z-20"
                  style={{
                    backgroundImage: logoHoverGradient,
                    backgroundSize: "220% 220%",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "var(--logo-x, 50%) var(--logo-y, 50%)",
                    filter: "saturate(1.8) brightness(var(--logo-hover-brightness, 1.06))",
                    mixBlendMode: "normal",
                    WebkitMaskImage: "radial-gradient(180px 120px at var(--logo-x, 50%) calc(var(--logo-y, 50%) + 18%), rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.85) 32%, rgba(0, 0, 0, 0.35) 55%, rgba(0, 0, 0, 0) 78%)",
                    maskImage: "radial-gradient(180px 120px at var(--logo-x, 50%) calc(var(--logo-y, 50%) + 18%), rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.85) 32%, rgba(0, 0, 0, 0.35) 55%, rgba(0, 0, 0, 0) 78%)"
                  }}
                >
                  Quizr.fun
                </span>
              </span>
            </h1>
            <p className="text-slate-600 text-base sm:text-lg px-4">Challenge yourself and expand your knowledge</p>
          </div>
          {quizzes.length > 0 && (
            <div className="mb-6 sm:mb-8 max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 [padding-left:calc(1rem+var(--removed-body-scroll-width,0px))] [padding-right:calc(1rem+var(--removed-body-scroll-width,0px))]">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Total Quizzes Card */}
                <div className="total-quizzes-card bg-white/70 backdrop-blur-lg rounded-xl sm:rounded-2xl px-4 border border-slate-200/80 flex flex-col justify-center min-w-[160px] h-[72px] flex-1 sm:flex-none cursor-default focus:outline-none">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">{filteredQuizzes.length}</div>
                  <div className="text-slate-500 text-xs sm:text-sm whitespace-nowrap">{countLabel}</div>
                </div>

                {/* Category filter drop down */}
                <div className="relative flex-1 sm:w-64">
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded="false"
                    onClick={() => {
                      const dropdown = document.getElementById('category-dropdown');
                      dropdown.classList.toggle('hidden');
                    }}
                    className="category-dropdown-button w-full h-[72px] bg-white/70 text-slate-800 rounded-2xl border border-slate-200/80 backdrop-blur text-left focus:outline-none focus:ring-0 appearance-none transition-all duration-200 hover:bg-white/90 hover:border-slate-300 hover:shadow-sm text-xs sm:text-sm font-semibold cursor-pointer flex items-center relative"
                  >
                    <span className="truncate text-center w-full px-8">
                      {selectedCategory === "all"
                        ? "All Categories"
                        : selectedCategory === "favourites"
                          ? "Favourites"
                          : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                    </span>
                    <svg className="w-4 h-4 text-slate-500 flex-shrink-0 absolute right-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div id="category-dropdown" className="hidden absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-lg rounded-2xl border border-slate-200/80 shadow-lg z-50 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          const dropdown = document.getElementById('category-dropdown');
                          dropdown.classList.add('hidden');
                        }}
                        className={`w-full text-left px-4 py-3 text-xs sm:text-sm font-semibold transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-700/30 first:rounded-t-2xl last:rounded-b-2xl ${selectedCategory === category
                          ? 'bg-slate-50/60 dark:bg-slate-700/40 text-slate-900 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-300'
                          }`}
                      >
                        {category === "all"
                          ? "All Categories"
                          : category === "favourites"
                            ? "Favourites"
                            : category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sorting Bar */}
              <div className="sorting-bar-container flex items-center gap-1.5 p-1 bg-white/70 dark:bg-slate-800/40 backdrop-blur-lg rounded-2xl border border-slate-200/80 dark:border-slate-800/60 h-[72px] w-full sm:w-auto overflow-x-auto no-scrollbar">
                {[
                  { id: 'newest', label: 'Date', options: { desc: 'Newest', asc: 'Oldest' }, width: 'w-[120px]' },
                  { id: 'stars', label: 'Stars', width: 'w-[100px]' },
                  { id: 'questions', label: 'Questions', width: 'w-[140px]' },
                  { id: 'difficulty', label: 'Difficulty', width: 'w-[130px]' }
                ].map((option) => {
                  const isActive = sortBy === option.id;
                  const isAsc = isActive && sortDirection === "asc";
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (isActive) {
                          setSortDirection(prev => prev === "desc" ? "asc" : "desc");
                        } else {
                          setSortBy(option.id);
                          setSortDirection("desc");
                        }
                      }}
                      className={`sorting-button h-full ${option.width} px-4 rounded-xl text-sm font-semibold flex items-center justify-center relative transition-[background-color,color,transform,shadow] duration-200 [outline:none] [box-shadow:none] [ring:none] [-webkit-tap-highlight-color:transparent] ${isActive ? 'bg-white/90 dark:bg-slate-700/90 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-700/50 isActive' : 'text-slate-900 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent hover:bg-slate-200/50 dark:hover:bg-transparent'}`}
                    >
                      <span className="truncate">
                        {option.id === 'newest'
                          ? (isActive ? option.options[sortDirection] : 'Date')
                          : option.label}
                      </span>
                      {isActive && (
                        <span className="absolute right-2 flex items-center justify-center w-4">
                          {isAsc ? (
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 5l4 6H6l4-6z" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 15l-4-6h8l-4 6z" />
                            </svg>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {quizzes.length === 0 && (
            <div className="text-center py-12 sm:py-20 max-w-md mx-auto px-4">
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 to-rose-400 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">No Quizzes Yet</h3>
                <p className="text-slate-600 text-sm sm:text-base mb-4 sm:mb-6">
                  Start your learning journey by creating your first quiz
                </p>
                <button className="bg-gradient-to-r from-amber-400 to-rose-400 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold hover:shadow-lg hover:shadow-amber-400/40 transition-all transform hover:scale-105 active:scale-95">
                  Create Your First Quiz
                </button>
              </div>
            </div>
          )}
          {quizzes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-4">
              {filteredQuizzes.map((quiz) => {
                const gradient = categoryGradients[quiz.category] || categoryGradients.other;
                const categoryLabel = quiz.category || "other";
                const categoryIcon = categoryIcons[quiz.category] || categoryIcons.other;
                const difficultyKey = difficultyChips[quiz?.difficulty] ? quiz.difficulty : "medium";
                const difficulty = difficultyChips[difficultyKey];
                const isFavourited = favouriteIds.includes(quiz._id);
                const authorUsername = quiz?.created_by?.user_data?.username;
                const authorIsDeleted = quiz?.created_by?.authId === "deleted-user"
                  || authorUsername === "__deleted__"
                  || authorUsername === "Deleted user";
                const authorName = authorIsDeleted
                  ? "deleted user"
                  : authorUsername || "Unknown";
                const canNavigateToAuthor = !authorIsDeleted && Boolean(authorUsername);
                return (
                  <Link
                    key={quiz._id}
                    to={`/quiz/${quiz._id}`}
                    state={{ returnTo }}
                    className="group relative block"
                    onMouseMove={handleCardMouseMove}
                    onMouseLeave={handleCardMouseLeave}
                  >
                    <div
                      className="relative z-10 bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl pt-4 px-5 pb-1.5 sm:pt-5 sm:px-6 sm:pb-2 border border-slate-200/80 hover:border-slate-300 transition-all transform group-hover:scale-[1.012] group-hover:[box-shadow:0_10px_26px_-18px_rgb(var(--shadow-color)/0.42),0_0_18px_-10px_rgb(var(--shadow-color)/0.32)] overflow-hidden h-[200px] flex flex-col"
                      style={{ "--shadow-color": gradient.hover.primary }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-45 transition-opacity blur-2xl"
                        style={{
                          background: `
                          radial-gradient(300px 220px at var(--hover-x, 50%) 110%, rgb(${gradient.hover.primary} / 0.4), transparent 70%),
                          radial-gradient(260px 200px at -6% var(--hover-y, 50%), rgb(${gradient.hover.secondary} / 0.32), transparent 70%),
                          radial-gradient(260px 200px at 106% var(--hover-y, 50%), rgb(${gradient.hover.secondary} / 0.32), transparent 70%)
                        `
                        }}
                      ></div>
                      <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r dark:bg-none ${gradient.className} text-white text-xs font-semibold`}>
                              <span
                                className="w-4 h-4 bg-current"
                                style={{
                                  WebkitMaskImage: `url(${categoryIcon})`,
                                  maskImage: `url(${categoryIcon})`,
                                  WebkitMaskSize: 'contain',
                                  maskSize: 'contain',
                                  WebkitMaskRepeat: 'no-repeat',
                                  maskRepeat: 'no-repeat'
                                }}
                              />
                              <span className="capitalize">{categoryLabel}</span>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/80 bg-white/70 text-xs font-semibold text-slate-700 transition-all duration-200 ease-in-out ${difficulty.className}`}>
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="h-4 w-4 text-current"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                {difficulty.iconPaths.map((path) => (
                                  <path key={path} d={path} />
                                ))}
                              </svg>
                              <span>{difficulty.label}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleToggleFavourite(quiz._id, isFavourited);
                            }}
                            className={`inline-flex items-center justify-center rounded-full border border-slate-200/70 bg-white/80 p-2 backdrop-blur transition-all duration-150 ease-out group-hover:border-white/30 ${isFavourited
                              ? "text-amber-500 hover:text-amber-400 group-hover:text-amber-500"
                              : "text-slate-500 hover:text-amber-500 group-hover:text-white/90"
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
                        </div>
                        <div className="flex-1 flex items-center -translate-y-2">
                          <h3 className="text-lg sm:text-xl font-bold text-slate-800 line-clamp-2 transition-all text-center w-full leading-tight">
                            {quiz.title}
                          </h3>
                        </div>
                        <div className="mt-auto -mx-5 sm:-mx-6">
                          <div className="h-px w-full bg-slate-200/70 mb-2"></div>
                          <div className="flex items-center justify-between gap-2 py-0.5 px-4 sm:px-5 text-xs sm:text-sm text-slate-600 dark:group-hover:text-white/90">
                            <div className="flex items-center gap-1.5 leading-none text-slate-600">
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-semibold select-none">?</span>
                              <span>{quiz?.questions?.length || 0} questions</span>
                            </div>
                            {canNavigateToAuthor ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  navigate(`/users/${authorName}`);
                                }}
                                className="rounded-lg px-3 py-1.5 transition-colors dark:group-hover:text-white hover:[background-color:rgb(var(--shadow-color)/0.2)]"
                              >
                                <span>By {authorName}</span>
                              </button>
                            ) : (
                              <span className="rounded-lg px-3 py-1.5 text-slate-400 cursor-default">
                                By {authorName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
