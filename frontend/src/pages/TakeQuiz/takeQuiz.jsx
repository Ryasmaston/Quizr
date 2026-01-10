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
const leaderboard = useMemo(() => {
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

    return entries.slice(0, 10).map((entry) => ({
    ...entry,
    scorePercent: `${Math.round((entry.bestCorrect / questionsCount) * 100)}%`,
    isPassing: entry.bestCorrect >= passThreshold
    }));
}, [quiz]);

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

const categoryColors = {
    art: "from-pink-500 to-rose-500",
    history: "from-amber-500 to-orange-500",
    music: "from-purple-500 to-indigo-500",
    science: "from-blue-500 to-cyan-500",
    other: "from-gray-500 to-slate-500"
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
    gradient: "from-emerald-500 to-lime-500",
    chip: "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
    icon: "/easy.svg"
    },
    medium: {
    label: "Medium",
    gradient: "from-amber-500 to-yellow-500",
    chip: "border-amber-400/40 bg-amber-500/20 text-amber-100",
    icon: "/medium.svg"
    },
    hard: {
    label: "Hard",
    gradient: "from-rose-500 to-red-600",
    chip: "border-rose-400/40 bg-rose-500/20 text-rose-100",
    icon: "/hard.svg"
    }
};

//While quiz is being loaded or the user is logged out we return a message on the screen
if (!quiz)
    return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        <p className="mt-4 text-white font-medium">Loading quiz...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-16 sm:pt-20">
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
    </div>
    <main className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
        <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-3 sm:mb-4">
            {quiz.title}
        </h1>
        <p className="text-gray-300 text-base sm:text-lg">Ready to take on this quiz?</p>
        </div>

        {phase === "intro" && (
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 overflow-hidden">
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 sm:px-8 bg-gradient-to-r ${
            categoryColors[quiz.category] || categoryColors.other
            }`}>
            <div className="inline-flex items-center gap-2 text-white font-semibold text-sm uppercase tracking-wide">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {categoryIcons[quiz.category] || categoryIcons.other}
                </svg>
                <span className="capitalize">{quiz.category}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90">
                <img src={difficulty.icon} alt="" aria-hidden="true" className="h-4 w-4" />
                <span>{difficulty.label}</span>
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canNavigateToAuthor ? (
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/users/${authorName}`);
                  }}
                  className="self-start sm:self-auto rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20"
                >
                  Created by {isQuizOwner ? "you" : authorName}
                </button>
              ) : (
                <span className="self-start sm:self-auto rounded-full px-3 py-1.5 text-xs font-semibold text-white/60 cursor-default">
                  Created by {authorName}
                </span>
              )}
              {isQuizOwner && (
                <>
                  <button
                    className="rounded-xl bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20 flex items-center justify-center gap-2"
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
                    className="rounded-xl bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20 flex items-center justify-center gap-2"
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
            <div className="grid gap-4 sm:grid-cols-2 text-gray-200 text-sm sm:text-base">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-white/60">Questions</div>
                    <div className="text-lg font-semibold text-white">{quiz.questions.length}</div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h10" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-white/60">Options per question</div>
                    <div className="text-lg font-semibold text-white">{optionsPerQuestion}</div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-white/60">Pass threshold</div>
                    <div className="text-lg font-semibold text-white">
                    {quiz.req_to_pass}/{quiz.questions.length} (
                    {Math.round((quiz.req_to_pass / quiz.questions.length) * 100)}%)
                    </div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h7l-1.5-1.5m0 0L10 6m-1.5 2.5H21M21 14h-7l1.5 1.5m0 0L14 18m1.5-2.5H3" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-white/60">Multiple correct</div>
                    <div className="text-lg font-semibold text-white">
                    {quiz.allow_multiple_correct ? "Allowed" : "Single answer"}
                    </div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 0a8 8 0 11-16 0 8 8 0 0116 0z" />
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-white/60">Select all correct</div>
                    <div className="text-lg font-semibold text-white">
                    {quiz.require_all_correct ? "Required" : "Not required"}
                    </div>
                </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {lockAnswers ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 10V8a4 4 0 00-8 0v2m-1 0h10a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2z M17 10V8a4 4 0 00-8 0" />
                    )}
                    </svg>
                </span>
                <div className="text-left pl-1">
                    <div className="text-xs uppercase tracking-wide text-white/60">Answer lock</div>
                    <div className="text-lg font-semibold text-white">
                    {lockAnswers ? "Locked after Next" : "Can change answers"}
                    </div>
                </div>
                </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <button
                className="w-full sm:flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95"
                onClick={startQuiz}
            >
                Take the quiz
            </button>
            <button
                className="w-full sm:flex-1 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl border border-white/20 p-6 max-w-md w-full shadow-2xl">
                    <div className="flex items-center gap-3 mb-4 text-left">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20">
                        <svg
                            className="h-6 w-6 text-rose-400"
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
                        <h3 className="text-lg font-semibold text-white">Delete Quiz</h3>
                        <p className="text-sm text-gray-400">This action cannot be undone</p>
                        </div>
                    </div>
                    <p className="text-gray-300 mb-6">
                        Are you sure you want to delete &apos;{quiz.title}&apos;? All quiz data, attempts, and leaderboard entries will be permanently removed.
                    </p>
                    <div className="flex gap-3">
                        <button
                        className="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-all"
                        type="button"
                        onClick={handleDeleteQuiz}
                        >
                        Delete Quiz
                        </button>
                        <button
                        className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all"
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
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">Leaderboard</h3>
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/5">
                <table className="w-full text-sm sm:text-base">
                <thead className="bg-white/10 text-left text-gray-200">
                    <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Top score</th>
                    <th className="px-4 py-3">Correct</th>
                    <th className="px-4 py-3">Attempts</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-gray-100">
                    {leaderboard.length === 0 ? (
                    <tr>
                        <td className="px-4 py-4 text-center text-gray-300" colSpan={5}>
                        No attempts yet.
                        </td>
                    </tr>
                    ) : (
                    leaderboard.map((entry, index) => (
                        <tr key={entry.userId}>
                        <td className="px-4 py-3 font-medium text-white">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-white">{entry.username}</td>
                        <td className="px-4 py-3">
                        <span
                            className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                              entry.isPassing
                                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                                : "border-rose-400/40 bg-rose-500/20 text-rose-200"
                            }`}
                          >
                            {entry.scorePercent}
                          </span>
                        </td>
                        <td className="px-4 py-3">{entry.bestCorrect}</td>
                        <td className="px-4 py-3">{entry.attemptsCount}</td>
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
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300 mb-4">
            <span>Question {currentIndex + 1} of {quiz.questions.length}</span>
            <div className="flex flex-wrap items-center gap-2">
                <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${
                    categoryColors[quiz.category] || categoryColors.other
                } text-white text-xs font-semibold`}
                >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {categoryIcons[quiz.category] || categoryIcons.other}
                </svg>
                <span className="capitalize">{quiz.category}</span>
                </span>
                <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-white/90 text-xs font-semibold"
                >
                <img src={difficulty.icon} alt="" aria-hidden="true" className="h-4 w-4" />
                <span>{difficulty.label}</span>
                </span>
            </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-5">{question.text}</h2>

            <div className="grid gap-3 sm:grid-cols-2">
            {question.answers.map((answer) => {
                const isSelected = currentSelections.includes(answer._id);
                return (
                <button
                    key={answer._id}
                    className={`text-left px-4 py-3 rounded-xl border transition-all ${
                    isSelected
                        ? "bg-white/20 border-purple-400 ring-2 ring-purple-400/70 text-white"
                        : "bg-white/10 border-white/20 text-gray-100"
                    } ${isLocked ? "cursor-not-allowed opacity-60" : "hover:bg-white/20"}`}
                    onClick={() => handleSelect(answer._id)}
                    type="button"
                    disabled={isLocked}
                >
                    {answer.text}
                </button>
                );
            })}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
            <button
                className="px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all disabled:opacity-50"
                onClick={goBack}
                disabled={currentIndex === 0}
                type="button"
            >
                Back
            </button>
            {!isLastQuestion && (
                <button
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                onClick={goNext}
                disabled={currentSelections.length === 0}
                type="button"
                >
                Next
                </button>
            )}
            {isLastQuestion && (
                <button
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
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
        <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 text-center">
            <button
            className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                isFavourited
                ? "border-amber-300/60 bg-amber-400/20 text-amber-200"
                : "border-white/20 bg-white/10 text-white hover:bg-white/20"
            }`}
            type="button"
            onClick={handleToggleFavourite}
            aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
            title={isFavourited ? "Remove from favourites" : "Add to favourites"}
            >
            <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill={isFavourited ? "currentColor" : "none"}
                strokeWidth={2}
                aria-hidden="true"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.7 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.5 20.4l1.1-6.3L3 9.6l6.3-.9L12 3Z" />
            </svg>
            </button>
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Quiz Complete</h2>
            <p className="text-gray-300 text-lg">
            Correct answers {result.correctAnswers}, ({formatScorePercentage(result.scorePercentage)})
            </p>
            {difficultyKey !== "hard" && (
            <div className="mt-6 text-left">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-white">Answer summary</h3>
                  <select
                    value={summaryFilter}
                    onChange={(event) => setSummaryFilter(event.target.value)}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus:outline-none"
                  >
                    <option value="all" className="text-black">All</option>
                    <option value="correct" className="text-black">Correct</option>
                    <option value="wrong" className="text-black">Wrong</option>
                  </select>
                </div>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredSummaryItems.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/70">
                    No answers match this filter.
                  </div>
                ) : (
                filteredSummaryItems.map((item, index) => {
                    const statusClasses = item.isCorrect
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-rose-400/40 bg-rose-500/10";
                    const statusBadge = item.isCorrect
                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                    : "bg-rose-500/20 text-rose-200 border-rose-400/40";
                    return (
                    <div
                        key={item.question._id || index}
                        className={`rounded-2xl border ${statusClasses} px-4 py-3`}
                    >
                        <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 text-sm font-semibold text-white">
                            <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold tracking-wide text-white/80 whitespace-nowrap">
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
                            let toneClasses = "border-white/20 bg-white/5 text-gray-200";
                            if (isSelected && isCorrectAnswer) {
                            toneClasses = "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
                            } else if (isSelected && !isCorrectAnswer) {
                            toneClasses = "border-rose-400/40 bg-rose-500/20 text-rose-100";
                            } else if (showMissing) {
                            toneClasses = quiz.allow_multiple_correct
                                ? "border-amber-400/40 bg-amber-500/20 text-amber-100"
                                : "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
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
                        <p className="mt-2 text-xs text-gray-300">No answer selected.</p>
                        )}
                    </div>
                    );
                })
                )}
                </div>
            </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all"
                onClick={() => navigate("/")}
                type="button"
            >
                Homepage
            </button>
            <button
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95"
                onClick={retakeQuiz}
                type="button"
            >
                Retake quiz
            </button>
            <button
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all"
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
);
}

export default TakeQuizPage;
