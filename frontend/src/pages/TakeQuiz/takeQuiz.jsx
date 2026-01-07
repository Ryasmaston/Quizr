import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { apiFetch } from "../../services/api";
import { authReady } from "../../services/authState";
import { toggleFavourite } from "../../services/favourites";

function TakeQuizPage() {
    //Getting the quiz id from the URL e.g. /quiz/:id
    const { id } = useParams();
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

    useEffect(() => {
    // Listen for login state, then fetch the quiz if user is logged in
    const unsub = onAuthStateChanged(auth, async (user) => {
    //If no user, don't fetch a quiz
    if (!user) return;
    //Fetching the quiz
    const res = await apiFetch(`/quizzes/${id}`);
    //Saving the quiz data to state
    const data = await res.json();
    setQuiz(data.quiz);
    });

    // Stop listening when the page changes
    return () => unsub();
}, [id]);

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
const currentAnswer = answers[currentIndex];
const isFavourited = favouriteIds.includes(quiz._id);
const optionsPerQuestion = Math.max(
    0,
    ...quiz.questions.map((item) => item.answers.length)
);

function handleSelect(answerId) {
    if (result) return;
    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = answerId;
    setAnswers(updatedAnswers);
}

function goNext() {
    if (!currentAnswer) return;
    setCurrentIndex((index) => Math.min(index + 1, quiz.questions.length - 1));
}

function goBack() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
}

function startQuiz() {
    setPhase("inProgress");
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
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20">
            <div className="grid gap-3 text-gray-300 text-sm sm:text-base">
            <p>
                <span className="text-white font-semibold">Category:</span> {quiz.category}
            </p>
            <p>
                <span className="text-white font-semibold">Questions:</span> {quiz.questions.length}
            </p>
            <p>
                <span className="text-white font-semibold">Options per question:</span> {optionsPerQuestion}
            </p>
            <p>
                <span className="text-white font-semibold">Created by:</span> {quiz.created_by.username}
            </p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95"
                onClick={startQuiz}
            >
                Take the quiz
            </button>
            <button
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all"
                type="button"
                onClick={handleToggleFavourite}
            >
                {isFavourited ? "Remove from favourites" : "Add to favourites"}
            </button>
            </div>
        </div>
        )}

        {phase === "inProgress" && (
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300 mb-4">
            <span>Question {currentIndex + 1} of {quiz.questions.length}</span>
            <span className="text-white/70">{quiz.category}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-5">{question.text}</h2>

            <div className="grid gap-3 sm:grid-cols-2">
            {question.answers.map((answer) => {
                const isSelected = currentAnswer === answer._id;
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
                disabled={!currentAnswer}
                type="button"
                >
                Next
                </button>
            )}
            {isLastQuestion && (
                <button
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                onClick={submitQuiz}
                disabled={!currentAnswer}
                type="button"
                >
                Submit
                </button>
            )}
            </div>
        </div>
        )}

        {phase === "done" && result && (
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Quiz Complete</h2>
            <p className="text-gray-300 text-lg">
            Correct answers {result.correctAnswers}, ({result.scorePercentage})
            </p>
        </div>
        )}
    </main>
    </div>
);
}

export default TakeQuizPage;
