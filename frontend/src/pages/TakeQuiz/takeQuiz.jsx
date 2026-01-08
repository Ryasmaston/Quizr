import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { apiFetch } from "../../services/api";
import { authReady } from "../../services/authState";
import { toggleFavourite } from "../../services/favourites";

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
    const [favouriteIds, setFavouriteIds] = useState([]);

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
    } catch (error) {
    console.error("Failed to load user", error);
    }
    }
    fetchUser();
    return () => { mounted = false; };
}, []);
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
const optionsPerQuestion = Math.max(
    0,
    ...quiz.questions.map((item) => item.answers.length)
);

function handleSelect(answerId) {
    if (result) return;
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
    setCurrentIndex((index) => Math.min(index + 1, quiz.questions.length - 1));
}

function goBack() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
}

function startQuiz() {
    setPhase("inProgress");
}

function retakeQuiz() {
    setAnswers([]);
    setCurrentIndex(0);
    setResult(null);
    setPhase("inProgress");
}

function returnToQuiz() {
    setAnswers([]);
    setCurrentIndex(0);
    setResult(null);
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
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto pt-10">
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
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {categoryIcons[quiz.category] || categoryIcons.other}
                </svg>
                <span className="capitalize">{quiz.category}</span>
                </span>
            </div>
            <button
                type="button"
                onClick={() => navigate(`/users/${quiz.created_by.username}`)}
                className="self-start sm:self-auto rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20"
            >
                Created by {quiz.created_by.username}
            </button>
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
                    {quiz.req_to_pass}/{quiz.questions.length}
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
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <button
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95"
                onClick={startQuiz}
            >
                Take the quiz
            </button>
            <button
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
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
            </div>
            <div className="mt-8">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">Leaderboard</h3>
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/5">
                <table className="w-full text-sm sm:text-base">
                <thead className="bg-white/10 text-left text-gray-200">
                    <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Top score</th>
                    <th className="px-4 py-3">Correct</th>
                    <th className="px-4 py-3">Attempts</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-gray-100">
                    {leaderboard.length === 0 ? (
                    <tr>
                        <td className="px-4 py-4 text-center text-gray-300" colSpan={4}>
                        No attempts yet.
                        </td>
                    </tr>
                    ) : (
                    leaderboard.map((entry) => (
                        <tr key={entry.userId}>
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
                        : "bg-white/10 border-white/20 text-gray-100 hover:bg-white/20"
                    }`}
                    onClick={() => handleSelect(answer._id)}
                    type="button"
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
            Correct answers {result.correctAnswers}, ({result.scorePercentage})
            </p>
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
