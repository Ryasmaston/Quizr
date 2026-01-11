import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { apiFetch } from "../../services/api";
import { authReady } from "../../services/authState";
import { toggleFavourite } from "../../services/favourites";

function formatScorePercentage(value) {
    if (value == null) return "";
    if (typeof value === "number") return `${Math.round(value)}%`;
    if (typeof value === "string") {
      const numeric = Number.parseFloat(value.replace("%", ""));
      if (!Number.isFinite(numeric)) return value;
      return `${Math.round(numeric)}%`;
    }
    return String(value);
}

function TakeQuizPage() {
    //Getting the quiz id from the URL e.g. /quiz/:id
    const { id } = useParams();
    const navigate = useNavigate();
    //Storing the quiz data from the backend
    const [quiz, setQuiz] = useState(null);
    // Phase of the quiz
    const [phase, setPhase] = useState("intro");
    // Question index
    const [currentIndex, setCurrentIndex] = useState(0);
    //Storing the user's selected answers which is one per question
    const [answers, setAnswers] = useState([]);
    //Storing the result returned after submitting the quiz
    const [result, setResult] = useState(null);
    const [lockedUntil, setLockedUntil] = useState(-1);
    const [favouriteIds, setFavouriteIds] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [summaryFilter, setSummaryFilter] = useState("all");
    const [quizSortConfig, setQuizSortConfig] = useState({
      key: "scorePercentValue",
      direction: "desc"
    });
    const opalBackdropStyle = {
      backgroundColor: "#f7f5f1",
      backgroundImage: `
        radial-gradient(1200px 800px at 5% 0%, rgba(255, 227, 170, 0.28), transparent 60%),
        radial-gradient(900px 700px at 85% 10%, rgba(255, 190, 220, 0.24), transparent 55%),
        radial-gradient(1000px 800px at 15% 90%, rgba(180, 220, 255, 0.24), transparent 60%),
        radial-gradient(900px 800px at 85% 85%, rgba(190, 235, 210, 0.24), transparent 60%)
      `
    };

    const loadQuiz = useCallback(async () => {
    const res = await apiFetch(`/quizzes/${id}`);
    const data = await res.json();
    setQuiz(data.quiz);
    }, [id]);

    useEffect(() => {
    // Listen for login state, then fetch the quiz if user is logged in
    const unsub = onAuthStateChanged(auth, async (user) => {
    //If no user, don't fetch a quiz
    if (!user) return;
    await loadQuiz();
    });

    // Stop listening when the page changes
    return () => unsub();
}, [id, loadQuiz]);

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
    setCurrentUserId(body.user?._id || null);
    } catch (error) {
    console.error("Failed to load user", error);
    }
    }
    fetchUser();
    return () => { mounted = false; };
}, []);
const isQuizOwner = useMemo(() => {
    if (!quiz || !currentUserId) return false;
    const creatorId = typeof quiz.created_by === "string"
    ? quiz.created_by
    : quiz.created_by?._id;
    return creatorId === currentUserId;
}, [quiz, currentUserId]);
const authorUsername = quiz?.created_by?.username;
const authorIsDeleted = quiz?.created_by?.authId === "deleted-user"
  || authorUsername === "__deleted__"
  || authorUsername === "Deleted user";
const authorName = authorIsDeleted
  ? "deleted user"
  : authorUsername || "Unknown";
const canNavigateToAuthor = !authorIsDeleted && Boolean(authorUsername);
const baseQuizLeaderboard = useMemo(() => {
    const attempts = Array.isArray(quiz?.attempts) ? quiz.attempts : [];
    const questionsCount = Array.isArray(quiz?.questions) ? quiz.questions.length : 0;
    if (questionsCount === 0 || attempts.length === 0) return [];
    const passThreshold = Number.isFinite(quiz?.req_to_pass) ? quiz.req_to_pass : questionsCount;

    const byUser = new Map();

    attempts.forEach((attempt) => {
    const user = attempt.user_id;
    const userId = typeof user === "string" ? user : user?._id;
    if (!userId) return;
    const username = typeof user === "object" && user?.username ? user.username : "Unknown";
    const attemptedAt = attempt.attempted_at ? new Date(attempt.attempted_at) : null;
    const correct = Number.isFinite(attempt.correct) ? attempt.correct : 0;

    const existing = byUser.get(userId);
    if (!existing) {
        byUser.set(userId, {
        userId,
        username,
        attemptsCount: 1,
        bestCorrect: correct,
        bestAttemptAt: attemptedAt
        });
        return;
    }

    existing.attemptsCount += 1;
    if (correct > existing.bestCorrect) {
        existing.bestCorrect = correct;
        existing.bestAttemptAt = attemptedAt;
    } else if (correct === existing.bestCorrect) {
        if (attemptedAt && (!existing.bestAttemptAt || attemptedAt < existing.bestAttemptAt)) {
        existing.bestAttemptAt = attemptedAt;
        }
    }

    if (existing.username === "Unknown" && username !== "Unknown") {
        existing.username = username;
    }
    });

    const entries = Array.from(byUser.values());
    entries.sort((a, b) => {
    if (b.bestCorrect !== a.bestCorrect) return b.bestCorrect - a.bestCorrect;
    if (a.attemptsCount !== b.attemptsCount) return a.attemptsCount - b.attemptsCount;
    const aTime = a.bestAttemptAt ? a.bestAttemptAt.getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.bestAttemptAt ? b.bestAttemptAt.getTime() : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
    });

    return entries.slice(0, 10).map((entry) => {
    const roundedPercent = Math.round((entry.bestCorrect / questionsCount) * 100);
    return {
        ...entry,
        scorePercent: `${roundedPercent}%`,
        scorePercentValue: roundedPercent,
        isPassing: entry.bestCorrect >= passThreshold
    };
    });
}, [quiz]);

const quizRankMap = useMemo(() => {
    const map = new Map();
    baseQuizLeaderboard.forEach((entry, index) => {
    map.set(entry.userId, index + 1);
    });
    return map;
}, [baseQuizLeaderboard]);

const sortedQuizLeaderboard = useMemo(() => {
    const sorted = [...baseQuizLeaderboard];
    const { key, direction } = quizSortConfig;
    const order = direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
    if (key === "rank") {
        const aRank = quizRankMap.get(a.userId) || 0;
        const bRank = quizRankMap.get(b.userId) || 0;
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
}, [baseQuizLeaderboard, quizRankMap, quizSortConfig]);

const quizColumns = [
    { key: "rank", label: "#" },
    { key: "username", label: "Player" },
    {
    key: "scorePercentValue",
    label: "Top score",
    render: (entry) => (
        <span
        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${
            entry.isPassing
            ? "border-emerald-200/80 bg-emerald-100/80 text-emerald-700"
            : "border-rose-200/80 bg-rose-100/80 text-rose-700"
        }`}
        >
        {entry.scorePercent}
        </span>
    )
    },
    { key: "bestCorrect", label: "Correct" },
    { key: "attemptsCount", label: "Attempts" }
];

function handleQuizSort(key) {
    setQuizSortConfig((prev) => {
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

function renderQuizSortIcon(key) {
    const isActive = quizSortConfig.key === key;
    const isAsc = quizSortConfig.direction === "asc";
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

const summaryItems = useMemo(() => {
    if (!quiz || !Array.isArray(quiz.questions)) return [];
    return quiz.questions.map((question, index) => {
    const selection = answers?.[index];
    const selectedIds = Array.isArray(selection)
        ? selection
        : selection
        ? [selection]
        : [];
    const selectedSet = new Set(
        selectedIds.map((id) => (id ? id.toString() : "")).filter(Boolean)
    );
    const correctIds = (question.answers || [])
        .filter((answer) => answer.is_correct)
        .map((answer) => (answer._id ? answer._id.toString() : ""))
        .filter(Boolean);
    const correctSet = new Set(correctIds);
    const hasIncorrect = Array.from(selectedSet).some((id) => !correctSet.has(id));
    const hasCorrect = Array.from(selectedSet).some((id) => correctSet.has(id));
    const isCorrect =
        selectedSet.size > 0 &&
        !hasIncorrect &&
        (quiz.require_all_correct ? selectedSet.size === correctSet.size : hasCorrect);
    const missingCorrectIds = Array.from(correctSet).filter((id) => !selectedSet.has(id));
    return {
        questionIndex: index,
        question,
        selectedSet,
        correctSet,
        isCorrect,
        missingCorrectIds
    };
    });
}, [answers, quiz]);

const filteredSummaryItems = useMemo(() => {
    if (summaryFilter === "correct") {
    return summaryItems.filter((item) => item.isCorrect);
    }
    if (summaryFilter === "wrong") {
    return summaryItems.filter((item) => !item.isCorrect);
    }
    return summaryItems;
}, [summaryItems, summaryFilter]);

const categoryStyles = {
    art: {
        header: "bg-gradient-to-r from-pink-50/90 via-rose-50/80 to-pink-50/90",
        badge: "bg-white/50 border border-pink-200 text-pink-700"
    },
    history: {
        header: "bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90",
        badge: "bg-white/50 border border-amber-200 text-amber-700"
    },
    music: {
        header: "bg-gradient-to-r from-purple-50/90 via-indigo-50/80 to-purple-50/90",
        badge: "bg-white/50 border border-purple-200 text-purple-700"
    },
    science: {
        header: "bg-gradient-to-r from-sky-50/90 via-cyan-50/80 to-blue-50/90",
        badge: "bg-white/50 border border-sky-200 text-sky-700"
    },
    other: {
        header: "bg-slate-100/90",
        badge: "bg-white/50 border border-slate-200 text-slate-600"
    }
};

const categoryIcons = {
    art: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    ),
    history: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    ),
    music: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    ),
    science: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    ),
    other: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    )
};

const difficultyMeta = {
    easy: {
    label: "Easy",
    icon: (
        <>
        <path d="M5 18c0-6 4.5-11 12-12 1 8-4 13-10 13-1.2 0-2-.3-2-.9z" />
        <path d="M8 16c1-3 4-5 8-6" />
        <path d="M8 12c1.5 0 3 .5 4.5 1.5" />
        </>
    )
    },
    medium: {
    label: "Medium",
    icon: (
        <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 15l6-6" />
        <path d="M9.5 14.5l1.5-4.5 4.5-1.5-1.5 4.5-4.5 1.5z" />
        </>
    )
    },
    hard: {
    label: "Hard",
    icon: (
        <>
        <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
        </>
    )
    }
};

//While quiz is being loaded or the user is logged out we return a message on the screen
if (!quiz)
    return (
    <div className="fixed inset-0 flex items-center justify-center" style={opalBackdropStyle}>
        <div className="relative flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium">Loading quiz...</p>
        </div>
    </div>
    );

const question = quiz.questions[currentIndex];
const isLastQuestion = currentIndex === quiz.questions.length - 1;
const currentSelections = Array.isArray(answers[currentIndex])
    ? answers[currentIndex]
    : answers[currentIndex]
    ? [answers[currentIndex]]
    : [];
const isFavourited = favouriteIds.includes(quiz._id);
const difficultyKey = difficultyMeta[quiz?.difficulty] ? quiz.difficulty : "medium";
const difficulty = difficultyMeta[difficultyKey];
const lockAnswers = Boolean(quiz.lock_answers);
const optionsPerQuestion = Math.max(
    0,
    ...quiz.questions.map((item) => item.answers.length)
);
const isLocked = lockAnswers && currentIndex <= lockedUntil;
const activeCategoryStyle = categoryStyles[quiz.category] || categoryStyles.other;

function handleSelect(answerId) {
    if (result || isLocked) return;
    setAnswers((prev) => {
    const updated = [...prev];
    const current = Array.isArray(updated[currentIndex])
        ? updated[currentIndex]
        : updated[currentIndex]
        ? [updated[currentIndex]]
        : [];
    if (quiz.allow_multiple_correct) {
        updated[currentIndex] = current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId];
    } else {
        updated[currentIndex] = [answerId];
    }
    return updated;
    });
}

function goNext() {
    if (currentSelections.length === 0) return;
    if (lockAnswers) {
    setLockedUntil((prev) => Math.max(prev, currentIndex));
    }
    setCurrentIndex((index) => Math.min(index + 1, quiz.questions.length - 1));
}

function goBack() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
}

function startQuiz() {
    setLockedUntil(-1);
    setPhase("inProgress");
}

function retakeQuiz() {
    setAnswers([]);
    setCurrentIndex(0);
    setResult(null);
    setLockedUntil(-1);
    setPhase("inProgress");
}

function returnToQuiz() {
    setAnswers([]);
    setCurrentIndex(0);
    setResult(null);
    setLockedUntil(-1);
    setPhase("intro");
}

async function handleToggleFavourite() {
    const next = !isFavourited;
    setFavouriteIds((prev) =>
    next ? [...prev, quiz._id] : prev.filter((itemId) => itemId !== quiz._id)
    );
    try {
    await toggleFavourite(quiz._id, isFavourited);
    } catch (error) {
    console.error("Failed to update favourite", error);
    setFavouriteIds((prev) =>
        next ? prev.filter((itemId) => itemId !== quiz._id) : [...prev, quiz._id]
    );
    }
}

async function handleDeleteQuiz() {
    try {
    const res = await apiFetch(`/quizzes/${id}`, {
        method: "DELETE"
    });
    if (res.ok) {
        navigate("/");
    } else {
        console.error("Failed to delete quiz");
    }
    } catch (error) {
    console.error("Error deleting quiz:", error);
    }
}

async function submitQuiz() {
    //Making sure user is still logged in
    const user = auth.currentUser;
    if (!user) return;
    //Sending the user's answers to the backend
    const res = await apiFetch(`/quizzes/${id}/submit`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({ answers })
    });
    //Saving the quiz result (percentage, correct answers)
    const data = await res.json();
    setResult(data);
    try {
    await loadQuiz();
    } catch (error) {
    console.error("Failed to refresh quiz data", error);
    }
    setPhase("done");
    console.log(data.correctAnswers);
}

return (
    <>
    <div className="fixed inset-0" style={opalBackdropStyle}></div>
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-amber-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-rose-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] -translate-x-1/2 -translate-y-1/2 bg-sky-200/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
    </div>
    <div className="relative min-h-screen pt-16 sm:pt-20">
    <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
        <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-3 sm:mb-4 select-none">
            {quiz.title}
        </h1>
        <p className="text-slate-600 text-base sm:text-lg select-none">Ready to take on this quiz?</p>
        </div>

        {phase === "intro" && (
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 sm:px-8 ${activeCategoryStyle.header}`}>
            <div className="inline-flex items-center gap-2 text-slate-700 font-semibold text-sm uppercase tracking-wide">
                <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold ${activeCategoryStyle.badge}`}>
                <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {categoryIcons[quiz.category] || categoryIcons.other}
                </svg>
                <span className="capitalize">{quiz.category}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold normal-case border border-slate-200/80 bg-white/40 text-slate-700">
                <svg
                    className="h-4 w-4 text-current"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    {difficulty.icon}
                </svg>
                <span className="normal-case">{difficulty.label}</span>
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canNavigateToAuthor ? (
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/users/${authorName}`);
                  }}
                  className="self-start sm:self-auto rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-white/70"
                >
                  Created by {isQuizOwner ? "you" : authorName}
                </button>
              ) : (
                <span className="self-start sm:self-auto rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 cursor-default">
                  Created by {authorName}
                </span>
              )}
              {isQuizOwner && (
                <>
                  <button
                    className="rounded-xl border border-slate-200/80 bg-white/40 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-white/80 hover:border-slate-200/80 flex items-center justify-center gap-2"
                    type="button"
                    onClick={() => navigate(`/quiz/${id}/edit`, { state: { from: "quiz", returnTo: `/quiz/${id}` } })}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487a2 2 0 112.828 2.828L8.828 18.175a4 4 0 01-1.414.944l-3.536 1.178 1.178-3.536a4 4 0 01.944-1.414L16.862 4.487z"
                      />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button
                    className="rounded-xl border border-slate-200/80 bg-white/40 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-white/80 hover:border-slate-200/80 flex items-center justify-center gap-2"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
            </div>
            <div className="p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 text-slate-700 text-sm sm:text-base">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 border border-slate-200/80">
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Questions</div>
                    <div className="text-lg font-semibold text-slate-800">{quiz.questions.length}</div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 border border-slate-200/80">
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h10" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Options per question</div>
                    <div className="text-lg font-semibold text-slate-800">{optionsPerQuestion}</div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 border border-slate-200/80">
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Pass threshold</div>
                    <div className="text-lg font-semibold text-slate-800">
                    {quiz.req_to_pass}/{quiz.questions.length} (
                    {Math.round((quiz.req_to_pass / quiz.questions.length) * 100)}%)
                    </div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 border border-slate-200/80">
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h7l-1.5-1.5m0 0L10 6m-1.5 2.5H21M21 14h-7l1.5 1.5m0 0L14 18m1.5-2.5H3" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Multiple correct</div>
                    <div className="text-lg font-semibold text-slate-800">
                    {quiz.allow_multiple_correct ? "Allowed" : "Single answer"}
                    </div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 border border-slate-200/80">
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 0a8 8 0 11-16 0 8 8 0 0116 0z" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Select all correct</div>
                    <div className="text-lg font-semibold text-slate-800">
                    {quiz.require_all_correct ? "Required" : "Not required"}
                    </div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 border border-slate-200/80">
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {lockAnswers ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 10V8a4 4 0 00-8 0v2m-1 0h10a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2z M17 10V8a4 4 0 00-8 0" />
                    )}
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Answer lock</div>
                    <div className="text-lg font-semibold text-slate-800">
                    {lockAnswers ? "Locked after Next" : "Can change answers"}
                    </div>
                </div>
                </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 w-full items-stretch">
            <button
                className="w-full h-full rounded-2xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center px-6 py-5 text-xl leading-tight"
                onClick={startQuiz}
            >
                Take the quiz
            </button>
            <button
                className="w-full h-full rounded-2xl bg-white/70 border border-slate-200/80 text-slate-700 font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 px-6 py-5 text-lg leading-tight"
                type="button"
                onClick={handleToggleFavourite}
            >
                <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill={isFavourited ? "currentColor" : "none"}
                strokeWidth={2}
                aria-hidden="true"
                >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.7 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.5 20.4l1.1-6.3L3 9.6l6.3-.9L12 3Z" />
                </svg>
                <span>{isFavourited ? "Remove from favourites" : "Add to favourites"}</span>
            </button>
            {isQuizOwner && (
            <>
                {showDeleteConfirm && (
                <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 shadow-xl"
                style={{
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)"
                }}
                >
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-md w-full shadow-xl">
                    <div className="flex items-center gap-3 mb-4 text-left">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                        <svg
                            className="h-6 w-6 text-rose-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        </div>
                        <div>
                        <h3 className="text-lg font-semibold text-slate-800">Delete Quiz</h3>
                        <p className="text-sm text-slate-500">This action cannot be undone</p>
                        </div>
                    </div>
                    <p className="text-slate-600 mb-6">
                        Are you sure you want to delete &apos;{quiz.title}&apos;? All quiz data, attempts, and leaderboard entries will be permanently removed.
                    </p>
                    <div className="flex gap-3">
                        <button
                        className="flex-1 px-4 py-2.5 rounded-lg bg-rose-100 text-rose-700 font-semibold hover:bg-rose-200 transition-colors"
                        type="button"
                        onClick={handleDeleteQuiz}
                        >
                        Delete Quiz
                        </button>
                        <button
                        className="flex-1 px-4 py-2.5 rounded-lg bg-white/70 border border-slate-200/80 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        >
                        Cancel
                        </button>
                    </div>
                    </div>
                </div>
                )}
            </>
            )}
            </div>
            <div className="mt-8">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">Leaderboard</h3>
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/60">
                <table className="w-full text-sm sm:text-base">
                <thead className="bg-slate-100/70 text-left text-slate-600">
                    <tr>
                    {quizColumns.map((column) => (
                        <th
                        key={column.key}
                        className={`px-4 py-3 text-left ${
                            column.key === "username" ? "w-[220px] max-w-[220px]" : ""
                        }`}
                        >
                        <button
                            type="button"
                            onClick={() => handleQuizSort(column.key)}
                            className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                        >
                            <span>{column.label}</span>
                            <span className="text-xs text-slate-400">{renderQuizSortIcon(column.key)}</span>
                        </button>
                        </th>
                    ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 text-slate-700">
                    {sortedQuizLeaderboard.length === 0 ? (
                    <tr>
                        <td className="px-4 py-4 text-center text-slate-500" colSpan={quizColumns.length}>
                        No attempts yet.
                        </td>
                    </tr>
                    ) : (
                    sortedQuizLeaderboard.map((entry, index) => (
                        <tr key={entry.userId}>
                        {quizColumns.map((column) => {
                            let cellContent;
                            let cellClass = "px-4 py-3 text-left text-slate-700";
                            if (column.key === "rank") {
                            cellContent = quizRankMap.get(entry.userId) || index + 1;
                            cellClass = "px-4 py-3 text-left font-medium text-slate-800";
                            } else if (column.key === "username") {
                            cellContent = entry.username;
                            cellClass = "px-4 py-3 text-left font-medium text-slate-800";
                            } else if (column.render) {
                            cellContent = column.render(entry);
                            } else {
                            cellContent = entry[column.key];
                            }
                            return (
                            <td key={`${entry.userId}-${column.key}`} className={cellClass}>
                                {cellContent}
                            </td>
                            );
                        })}
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            </div>
            </div>
            </div>
        </div>
        )}

        {phase === "inProgress" && (
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-slate-200/80 shadow-sm pt-4 sm:pt-5 pb-6 sm:pb-8 px-6 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 mb-4 pb-2">
            <span>Question {currentIndex + 1} of {quiz.questions.length}</span>
            <div className="flex flex-wrap items-center gap-2">
                <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${activeCategoryStyle.badge}`}
                >
                <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {categoryIcons[quiz.category] || categoryIcons.other}
                </svg>
                <span className="capitalize">{quiz.category}</span>
                </span>
                <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/80 bg-white/40 text-slate-700 text-xs font-semibold normal-case"
                >
                <svg
                    className="h-4 w-4 text-current"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    {difficulty.icon}
                </svg>
                <span className="normal-case">{difficulty.label}</span>
                </span>
            </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-6 pb-2">{question.text}</h2>

            <div className="grid gap-3 sm:grid-cols-2">
            {question.answers.map((answer) => {
                const isSelected = currentSelections.includes(answer._id);
                return (
                <button
                    key={answer._id}
                    className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                    isSelected
                        ? "bg-slate-100/80 border-slate-300 text-slate-900"
                        : "bg-white/60 border-slate-200/80 text-slate-700"
                    } ${isLocked ? "cursor-not-allowed opacity-60" : "hover:bg-white/80"}`}
                    onClick={() => handleSelect(answer._id)}
                    type="button"
                    disabled={isLocked}
                >
                    {answer.text}
                </button>
                );
            })}
            </div>

            <div className="mt-6 flex gap-3 flex-wrap">
            <button
                className="flex-1 min-w-[160px] px-6 py-3 rounded-xl bg-white/70 border border-slate-200/80 text-slate-700 font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
                onClick={goBack}
                disabled={currentIndex === 0}
                type="button"
            >
                Back
            </button>
            {!isLastQuestion && (
                <button
                className="flex-1 min-w-[160px] px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
                onClick={goNext}
                disabled={currentSelections.length === 0}
                type="button"
                >
                Next
                </button>
            )}
            {isLastQuestion && (
                <button
                className="flex-1 min-w-[160px] px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
                onClick={submitQuiz}
                disabled={currentSelections.length === 0}
                type="button"
                >
                Submit
                </button>
            )}
            </div>
        </div>
        )}

        {phase === "done" && result && (
        <div className="relative bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm text-center">
            <div className="absolute left-4 top-4 flex flex-wrap gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 ${activeCategoryStyle.badge}`}>
                <svg className="w-5 h-5 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {categoryIcons[quiz.category] || categoryIcons.other}
                </svg>
                <span className="capitalize">{quiz.category || "Other"}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700">
                <svg
                className="w-5 h-5 text-current"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                >
                {difficulty.icon}
                </svg>
                <span className="normal-case">{difficulty.label}</span>
            </span>
            </div>
            <button
            className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                isFavourited
                ? "border-amber-200/80 bg-amber-100/80 text-amber-700"
                : "border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white/90"
            }`}
            type="button"
            onClick={handleToggleFavourite}
            aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
            title={isFavourited ? "Remove from favourites" : "Add to favourites"}
            >
            <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill={isFavourited ? "currentColor" : "none"} strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.7 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.5 20.4l1.1-6.3L3 9.6l6.3-.9L12 3Z" />
            </svg>
            </button>
            <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center border border-emerald-200/80">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-2">Quiz Complete</h2>
            <p className="text-slate-600 text-lg">
            Correct answers {result.correctAnswers}, ({formatScorePercentage(result.scorePercentage)})
            </p>
            {difficultyKey !== "hard" && (
            <div className="mt-6 text-left">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-slate-800">Answer summary</h3>
                  <select
                    value={summaryFilter}
                    onChange={(event) => setSummaryFilter(event.target.value)}
                    className="rounded-full border border-slate-200/80 bg-white/60 px-3 pr-7 py-1 text-xs sm:text-sm font-semibold text-slate-600 focus:outline-none focus:ring-0 appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgb(148,163,184)' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.6rem center",
                      backgroundSize: "0.9rem"
                    }}
                  >
                    <option value="all" className="text-black">All</option>
                    <option value="correct" className="text-black">Correct</option>
                    <option value="wrong" className="text-black">Wrong</option>
                  </select>
                </div>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredSummaryItems.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
                    No answers match this filter.
                  </div>
                ) : (
                filteredSummaryItems.map((item, index) => {
                    const statusClasses = item.isCorrect
                    ? "border-emerald-300/90 bg-emerald-100/90"
                    : "border-rose-300/90 bg-rose-100/90";
                    const statusBadge = item.isCorrect
                    ? "bg-emerald-200/90 text-emerald-800 border-emerald-300/90"
                    : "bg-rose-200/90 text-rose-800 border-rose-300/90";
                    return (
                    <div
                        key={item.question._id || index}
                        className={`rounded-2xl border ${statusClasses} px-4 py-3`}
                    >
                        <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 text-sm font-semibold text-slate-800">
                            <span className="inline-flex items-center justify-center rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold tracking-wide text-slate-600 whitespace-nowrap border border-slate-200/80">
                              Q{item.questionIndex + 1}
                            </span>
                            <span>{item.question.text}</span>
                        </div>
                        <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge}`}
                        >
                            {item.isCorrect ? "Correct" : "Incorrect"}
                        </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                        {item.question.answers.map((answer) => {
                            const answerId = answer._id ? answer._id.toString() : "";
                            if (!answerId) return null;
                            const isSelected = item.selectedSet.has(answerId);
                            const isCorrectAnswer = item.correctSet.has(answerId);
                            const showMissing = difficultyKey === "easy" && isCorrectAnswer && !isSelected;
                            let toneClasses = "border-slate-300/90 bg-white text-slate-800 shadow-sm";
                            if (isSelected && isCorrectAnswer) {
                            toneClasses = "border-emerald-700 bg-emerald-700 text-white shadow-lg";
                            } else if (isSelected && !isCorrectAnswer) {
                            toneClasses = "border-rose-700 bg-rose-700 text-white shadow-lg";
                            } else if (showMissing) {
                            toneClasses = quiz.allow_multiple_correct
                                ? "border-amber-500 bg-amber-500 text-white"
                                : "border-emerald-700 bg-emerald-700 text-white";
                            }
                            return (
                            <span
                                key={answerId}
                                className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${toneClasses}`}
                            >
                                {answer.text}
                            </span>
                        );
                        })}
                        </div>
                        {item.selectedSet.size === 0 && (
                        <p className="mt-2 text-xs text-slate-500">No answer selected.</p>
                        )}
                    </div>
                    );
                })
                )}
                </div>
            </div>
            )}
            <div className="mt-6 flex gap-3 flex-wrap">
            <button
                className="flex-1 min-w-[160px] px-6 py-3 rounded-xl bg-white/70 border border-slate-200/80 text-slate-700 font-semibold hover:bg-white/90 transition-colors"
                onClick={() => navigate("/")}
                type="button"
            >
                Homepage
            </button>
            <button
                className="flex-1 min-w-[160px] px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
                onClick={retakeQuiz}
                type="button"
            >
                Retake quiz
            </button>
            <button
                className="flex-1 min-w-[160px] px-6 py-3 rounded-xl bg-white/70 border border-slate-200/80 text-slate-700 font-semibold hover:bg-white/90 transition-colors"
                onClick={returnToQuiz}
                type="button"
            >
                Return to quiz
            </button>
            </div>
        </div>
        )}
    </main>
    </div>
    </>
);
}

export default TakeQuizPage;
