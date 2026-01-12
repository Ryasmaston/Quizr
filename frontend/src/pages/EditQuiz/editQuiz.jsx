import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation, useNavigate, useParams, unstable_useBlocker as useBlocker } from "react-router-dom";
import { auth } from "../../services/firebase";
import { apiFetch } from "../../services/api";
import { getQuizById, updateQuiz } from "../../services/quizzes";

function normalizeText(value) {
  return value == null ? "" : String(value);
}

function shouldResetAttempts(originalQuiz, updatedData) {
  const originalQuestions = Array.isArray(originalQuiz?.questions)
    ? originalQuiz.questions
    : [];
  const updatedQuestions = Array.isArray(updatedData?.questions)
    ? updatedData.questions
    : [];

  if (originalQuestions.length !== updatedQuestions.length) return true;

  for (let i = 0; i < originalQuestions.length; i += 1) {
    const originalQuestion = originalQuestions[i];
    const updatedQuestion = updatedQuestions[i];
    if (!updatedQuestion) return true;

    if (normalizeText(originalQuestion?.text) !== normalizeText(updatedQuestion?.text)) {
      return true;
    }

    const originalAnswers = Array.isArray(originalQuestion?.answers)
      ? originalQuestion.answers
      : [];
    const updatedAnswers = Array.isArray(updatedQuestion?.answers)
      ? updatedQuestion.answers
      : [];
    const sharedCount = Math.min(originalAnswers.length, updatedAnswers.length);

    for (let j = 0; j < sharedCount; j += 1) {
      if (normalizeText(originalAnswers[j]?.text) !== normalizeText(updatedAnswers[j]?.text)) {
        return true;
      }
    }

    const originalCorrectIndices = originalAnswers
      .map((answer, index) => (answer?.is_correct ? index : null))
      .filter((index) => index !== null);
    if (originalCorrectIndices.length > 0) {
      const remainingOriginalCorrect = originalCorrectIndices.filter(
        (index) => index < updatedAnswers.length
      );
      const hasOverlap = remainingOriginalCorrect.some(
        (index) => Boolean(updatedAnswers[index]?.is_correct)
      );
      if (!hasOverlap) {
        return true;
      }
    }
  }

  return false;
}

export default function EditQuiz() {
  const ANSWER_COUNT_OPTIONS = useMemo(() => [2, 3, 4, 5, 6], []);
  const DEFAULT_ANSWERS_PER_QUESTION = 4;
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || `/quiz/${id}`;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialQuiz, setInitialQuiz] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [difficulty, setDifficulty] = useState("medium");
  const [lockAnswers, setLockAnswers] = useState(false);
  const [answersPerQuestion, setAnswersPerQuestion] = useState(
    DEFAULT_ANSWERS_PER_QUESTION
  );
  const [allowMultipleCorrect, setAllowMultipleCorrect] = useState(false);
  const [requireAllCorrect, setRequireAllCorrect] = useState(false);
  const [questions, setQuestions] = useState([
    {
      text: "",
      answers: Array.from({ length: DEFAULT_ANSWERS_PER_QUESTION }, () => ({
        text: "",
        is_correct: false,
      })),
    },
  ]);
  const [reqToPass, setReqToPass] = useState(1);
  const prevQuestionCountRef = useRef(questions.length);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [ignoreBlocker, setIgnoreBlocker] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(false);
  const opalBackdropStyle = {
    backgroundColor: "var(--opal-bg-color)",
    backgroundImage: "var(--opal-backdrop-image)"
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setLoading(false);
        navigate("/login");
        return;
      }
      setLoading(false);
    });
    return unsub;
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    async function loadQuiz() {
      setLoading(true);
      try {
        const [meRes, quizBody] = await Promise.all([
          apiFetch("/users/me"),
          getQuizById(id),
        ]);
        const meBody = await meRes.json();
        const quiz = quizBody.quiz;
        if (!mounted) return;

        const creatorId =
          typeof quiz?.created_by === "string" ? quiz.created_by : quiz?.created_by?._id;
        if (!creatorId || creatorId !== meBody.user?._id) {
          navigate(returnTo);
          return;
        }

        setInitialQuiz(quiz);
        setTitle(quiz.title || "");
        setCategory(quiz.category || "other");
        setDifficulty(quiz.difficulty || "medium");
        setAllowMultipleCorrect(Boolean(quiz.allow_multiple_correct));
        setRequireAllCorrect(Boolean(quiz.require_all_correct));
        setLockAnswers(Boolean(quiz.lock_answers));
        const questionList = Array.isArray(quiz.questions) ? quiz.questions : [];
        const maxAnswersFromQuestions = Math.max(
          0,
          ...questionList.map((item) => item.answers?.length || 0)
        );
        const maxAnswers = maxAnswersFromQuestions || DEFAULT_ANSWERS_PER_QUESTION;
        const minAnswers = ANSWER_COUNT_OPTIONS[0];
        const maxAllowedAnswers = ANSWER_COUNT_OPTIONS[ANSWER_COUNT_OPTIONS.length - 1];
        const clampedAnswers = Math.min(
          Math.max(maxAnswers, minAnswers),
          maxAllowedAnswers
        );
        const normalizedQuestions = questionList.map((question) => ({
          _id: question._id,
          text: question.text || "",
          answers: Array.from({ length: clampedAnswers }, (_, index) => {
            const existing = question.answers?.[index];
            return {
              _id: existing?._id,
              text: existing?.text || "",
              is_correct: Boolean(existing?.is_correct),
            };
          }),
        }));
        const resolvedQuestions = normalizedQuestions.length ? normalizedQuestions : [];
        const resolvedReqToPass = Number.isFinite(quiz.req_to_pass)
          ? Math.min(quiz.req_to_pass, normalizedQuestions.length || 1)
          : 1;
        setAnswersPerQuestion(clampedAnswers);
        setQuestions(resolvedQuestions);
        setReqToPass(resolvedReqToPass);
        prevQuestionCountRef.current = normalizedQuestions.length || 1;
        setInitialSnapshot(
          buildSnapshot({
            title: quiz.title || "",
            category: quiz.category || "other",
            difficulty: quiz.difficulty || "medium",
            lockAnswers: Boolean(quiz.lock_answers),
            allowMultipleCorrect: Boolean(quiz.allow_multiple_correct),
            requireAllCorrect: Boolean(quiz.require_all_correct),
            reqToPass: resolvedReqToPass,
            questions: resolvedQuestions,
          })
        );
      } catch (error) {
        alert(error.message);
        navigate(returnTo);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQuiz();
    return () => {
      mounted = false;
    };
  }, [id, navigate, user, returnTo, ANSWER_COUNT_OPTIONS]);

  useEffect(() => {
    const currentCount = questions.length;
    const prevCount = prevQuestionCountRef.current;
    if (currentCount !== prevCount) {
      setReqToPass((prev) =>
        prev === prevCount ? currentCount : Math.min(prev, currentCount)
      );
      prevQuestionCountRef.current = currentCount;
    }
  }, [questions.length]);

  function normalizeAnswerCount(question, count) {
    const answers = Array.isArray(question.answers) ? question.answers : [];
    if (answers.length === count) return question;
    if (answers.length > count) {
      return { ...question, answers: answers.slice(0, count) };
    }
    const extras = Array.from({ length: count - answers.length }, () => ({
      text: "",
      is_correct: false,
    }));
    return { ...question, answers: [...answers, ...extras] };
  }

  function handleQuestionChange(index, value) {
    const updated = [...questions];
    updated[index].text = value;
    setQuestions(updated);
  }

  function handleAnswerChange(qIndex, aIndex, value) {
    const updated = [...questions];
    updated[qIndex].answers[aIndex].text = value;
    setQuestions(updated);
  }

  function setCorrectAnswer(qIndex, aIndex) {
    setQuestions((prev) =>
      prev.map((question, index) => {
        if (index !== qIndex) return question;
        if (allowMultipleCorrect) {
          const answers = question.answers.map((a, i) =>
            i === aIndex ? { ...a, is_correct: !a.is_correct } : a
          );
          return { ...question, answers };
        }
        const answers = question.answers.map((a, i) => ({
          ...a,
          is_correct: i === aIndex,
        }));
        return { ...question, answers };
      })
    );
  }

  function buildSnapshot(data) {
    const normalizedQuestions = (data.questions || []).map((question) => ({
      text: normalizeText(question?.text),
      answers: (question?.answers || []).map((answer) => ({
        text: normalizeText(answer?.text),
        is_correct: Boolean(answer?.is_correct),
      })),
    }));

    return JSON.stringify({
      title: normalizeText(data.title),
      category: data.category || "other",
      difficulty: data.difficulty || "medium",
      lockAnswers: Boolean(data.lockAnswers),
      allowMultipleCorrect: Boolean(data.allowMultipleCorrect),
      requireAllCorrect: data.allowMultipleCorrect ? Boolean(data.requireAllCorrect) : false,
      reqToPass: Number.isFinite(data.reqToPass) ? data.reqToPass : 1,
      questions: normalizedQuestions,
    });
  }

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        title,
        category,
        difficulty,
        lockAnswers,
        allowMultipleCorrect,
        requireAllCorrect,
        reqToPass,
        questions,
      }),
    [
      title,
      category,
      difficulty,
      lockAnswers,
      allowMultipleCorrect,
      requireAllCorrect,
      reqToPass,
      questions,
    ]
  );
  const hasChanges = Boolean(initialSnapshot) && currentSnapshot !== initialSnapshot;

  const blocker = useBlocker(hasChanges && !ignoreBlocker);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const shouldLeave = window.confirm("You have unsaved changes. Discard them?");
    if (shouldLeave) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  const handleCancel = useCallback(() => {
    navigate(returnTo);
  }, [navigate, returnTo]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        handleCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCancel]);

  useEffect(() => {
    if (!hasChanges) return undefined;
    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    if (!pendingNavigation || !ignoreBlocker) return;
    navigate(returnTo);
  }, [pendingNavigation, ignoreBlocker, navigate, returnTo]);

  if (loading)
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={opalBackdropStyle}
      >
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );

  if (!user) return null;

  function handleAnswersPerQuestionChange(value) {
    const count = Number(value);
    setAnswersPerQuestion(count);
    setQuestions((prev) => prev.map((question) => normalizeAnswerCount(question, count)));
  }

  function handleAllowMultipleCorrectChange(checked) {
    setAllowMultipleCorrect(checked);
    if (!checked) {
      setRequireAllCorrect(false);
      setQuestions((prev) =>
        prev.map((question) => {
          const firstCorrectIndex = question.answers.findIndex((a) => a.is_correct);
          if (firstCorrectIndex === -1) return question;
          const answers = question.answers.map((a, i) => ({
            ...a,
            is_correct: i === firstCorrectIndex,
          }));
          return { ...question, answers };
        })
      );
    }
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        text: "",
        answers: Array.from({ length: answersPerQuestion }, () => ({
          text: "",
          is_correct: false,
        })),
      },
    ]);
  }

  function removeQuestion(qIndex) {
    if (questions.length === 1) {
      alert("You must have at least one question");
      return;
    }
    const updated = questions.filter((_, i) => i !== qIndex);
    setQuestions(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const invalidQuestionIndex = questions.findIndex((question) =>
      question.answers.every((answer) => !answer.is_correct)
    );
    if (invalidQuestionIndex !== -1) {
      alert(`Question ${invalidQuestionIndex + 1} needs at least one correct answer.`);
      return;
    }

    const safeReqToPass = Math.min(Math.max(reqToPass, 0), questions.length);
    const resetAttempts = initialQuiz
      ? shouldResetAttempts(initialQuiz, { questions })
      : false;
    if (resetAttempts) {
      const confirmed = window.confirm(
        "Saving changes will reset all users' attempts history for this quiz. Continue?"
      );
      if (!confirmed) return;
    }

    try {
      await updateQuiz(id, {
        title,
        category,
        difficulty,
        questions,
        allow_multiple_correct: allowMultipleCorrect,
        require_all_correct: allowMultipleCorrect ? requireAllCorrect : false,
        lock_answers: lockAnswers,
        req_to_pass: safeReqToPass,
      });
      setIgnoreBlocker(true);
      setPendingNavigation(true);
    } catch (err) {
      setIgnoreBlocker(false);
      setPendingNavigation(false);
      alert(err.message);
    }
  }

  const difficultyOptions = [
    {
      value: "easy",
      label: "Easy",
      description: "Review every question after finishing, including the correct answers.",
      gradient: "from-emerald-500/80 via-emerald-500/80 to-emerald-500/80 dark:from-emerald-900/60 dark:via-emerald-900/60 dark:to-emerald-900/60",
      border: "border-emerald-400/50 dark:border-emerald-800/50",
      icon: "/easy.svg",
    },
    {
      value: "medium",
      label: "Medium",
      description: "Review every question after finishing, showing which selections were right or wrong.",
      gradient: "from-amber-400/85 via-amber-400/85 to-amber-400/85 dark:from-amber-900/60 dark:via-amber-900/60 dark:to-amber-900/60",
      border: "border-amber-400/50 dark:border-amber-800/50",
      icon: "/medium.svg",
    },
    {
      value: "hard",
      label: "Hard",
      description: "Only see the total number of correct answers after finishing.",
      gradient: "from-rose-500/85 via-rose-500/85 to-rose-500/85 dark:from-rose-900/60 dark:via-rose-900/60 dark:to-rose-900/60",
      border: "border-rose-400/50 dark:border-rose-800/50",
      icon: "/hard.svg",
    },
  ];
  const categories = [
    { value: "art", label: "Art" },
    { value: "history", label: "History" },
    { value: "music", label: "Music" },
    { value: "science", label: "Science" },
    { value: "other", label: "Other" },
  ];
  const categoryBarColors = {
    art: "bg-rose-200/80 dark:bg-rose-900/60 dark:text-rose-200",
    history: "bg-amber-200/80 dark:bg-amber-900/60 dark:text-amber-200",
    music: "bg-sky-200/80 dark:bg-sky-900/60 dark:text-sky-200",
    science: "bg-emerald-200/80 dark:bg-emerald-900/60 dark:text-emerald-200",
    other: "bg-slate-200/80 dark:bg-slate-800/60 dark:text-slate-200",
  };
  const questionCount = questions.length;
  const passPercent = questionCount > 0 ? Math.round((reqToPass / questionCount) * 100) : 0;
  const passLabel = `${reqToPass}/${questionCount} (${passPercent}%)`;
  const resetWarning = initialQuiz ? shouldResetAttempts(initialQuiz, { questions }) : false;
  const quizTitleLabel = title.trim() || "Untitled quiz";
  const questionBarClass = categoryBarColors[category] || categoryBarColors.other;

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
              Edit Quiz
            </h1>
            <p className="text-slate-600 text-base sm:text-lg select-none">Refine your quiz details</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <label className="block text-slate-800 font-semibold mb-3 text-lg">
                Quiz Title
              </label>
              <input
                type="text"
                placeholder="Enter your quiz title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-white/70 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:shadow-[0_0_16px_-6px_rgba(148,163,184,0.6)]"
              />
            </div>
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-slate-800 font-semibold text-lg text-center w-full">Quiz Options</h2>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="block text-slate-600 font-medium mb-3 text-sm">
                    Difficulty
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {difficultyOptions.map((option) => {
                      const isActive = difficulty === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDifficulty(option.value)}
                          aria-pressed={isActive}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wide transition-all ${isActive
                            ? `bg-gradient-to-r ${option.gradient} ${option.border} text-white shadow-sm`
                            : "bg-white/60 border-slate-200/80 text-slate-600 hover:border-slate-300/80 hover:text-slate-800"
                            }`}
                        >
                          <img
                            src={option.icon}
                            alt=""
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 px-1 text-sm text-slate-600 min-h-[60px]">
                    {difficultyOptions.map((option) => (
                      <p key={option.value} className={difficulty === option.value ? "block" : "hidden"}>
                        {option.description}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-2 text-sm">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/70 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-0 focus:shadow-[0_0_16px_-6px_rgba(148,163,184,0.6)]"
                  >
                    {categories.map((item) => (
                      <option key={item.value} value={item.value} className="text-slate-800">
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">Used for category chips and filters.</p>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-2 text-sm">
                    Answers per question
                  </label>
                  <select
                    value={answersPerQuestion}
                    onChange={(e) => handleAnswersPerQuestionChange(e.target.value)}
                    className="w-full bg-white/70 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-0 focus:shadow-[0_0_16px_-6px_rgba(148,163,184,0.6)]"
                  >
                    {ANSWER_COUNT_OPTIONS.map((count) => (
                      <option key={count} value={count} className="text-slate-800">
                        {count} answers
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">Applies to every question.</p>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-slate-600 font-medium mb-2 text-sm">
                    Pass threshold
                  </label>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Required correct answers</span>
                    <span className="text-slate-800 font-semibold">{passLabel}</span>
                  </div>
                  <div className="relative">
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1.5 bg-slate-200 dark:bg-slate-900/80 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-slate-800 dark:bg-slate-100"
                        style={{ width: `${(reqToPass / (questionCount || 1)) * 100}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={questionCount}
                      step="1"
                      value={reqToPass}
                      onChange={(e) => setReqToPass(Number(e.target.value))}
                      className="relative w-full h-1.5 appearance-none bg-transparent cursor-pointer z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 dark:[&::-webkit-slider-thumb]:bg-slate-100 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white dark:[&::-webkit-slider-thumb]:border-slate-950 [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-800 dark:[&::-moz-range-thumb]:bg-slate-100 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white dark:[&::-moz-range-thumb]:border-slate-950 [&::-moz-range-thumb]:shadow-sm"
                    />
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-slate-600 font-medium mb-2 text-sm">
                    Correctness rules
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/60 p-3 hover:border-slate-300/80 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowMultipleCorrect}
                        onChange={(e) => handleAllowMultipleCorrectChange(e.target.checked)}
                        className="mt-1 h-4 w-4 appearance-none rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-slate-800 dark:checked:bg-slate-200 checked:border-transparent transition-all cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[1px] after:w-[4px] after:h-[8px] after:border-white dark:after:border-slate-900 after:border-b-2 after:border-r-2 after:rotate-45"
                      />
                      <span className="text-left text-sm text-slate-700">
                        Allow multiple correct answers
                        <span className="block text-xs text-slate-500 mt-1">
                          Enables selecting more than one correct answer per question.
                        </span>
                      </span>
                    </label>
                    <label
                      className={`flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/60 p-3 transition-all ${allowMultipleCorrect ? "hover:border-slate-300/80 cursor-pointer" : "opacity-50 cursor-default"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={requireAllCorrect}
                        onChange={(e) => setRequireAllCorrect(e.target.checked)}
                        disabled={!allowMultipleCorrect}
                        className={`mt-1 h-4 w-4 appearance-none rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-slate-800 dark:checked:bg-slate-200 checked:border-transparent transition-all relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[1px] after:w-[4px] after:h-[8px] after:border-white dark:after:border-slate-900 after:border-b-2 after:border-r-2 after:rotate-45 ${allowMultipleCorrect ? "cursor-pointer" : "cursor-default"
                          }`}
                      />
                      <span className="text-left text-sm text-slate-700">
                        Require all correct answers
                        <span className="block text-xs text-slate-500 mt-1">
                          Mark correct only if the selection matches the full correct set.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-slate-600 font-medium mb-2 text-sm">
                    Answer lock
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/60 p-3 hover:border-slate-300/80 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockAnswers}
                      onChange={(e) => setLockAnswers(e.target.checked)}
                      className="mt-1 h-4 w-4 appearance-none rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-slate-800 dark:checked:bg-slate-200 checked:border-transparent transition-all cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[1px] after:w-[4px] after:h-[8px] after:border-white dark:after:border-slate-900 after:border-b-2 after:border-r-2 after:rotate-45"
                    />
                    <span className="text-left text-sm text-slate-700">
                      Lock answers after Next
                      <span className="block text-xs text-slate-500 mt-1">
                        You can go back to review, but answers cannot be changed.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {questions.map((q, qIndex) => {
                return (
                  <div
                    key={q._id || qIndex}
                    className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden"
                  >
                    <div
                      className={`-mx-6 sm:-mx-8 -mt-6 sm:-mt-8 px-6 sm:px-8 py-2 rounded-t-2xl sm:rounded-t-3xl flex items-center justify-between text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-700 ${questionBarClass}`}
                    >
                      <span>Question {qIndex + 1}</span>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-slate-600 font-medium uppercase truncate max-w-[160px] sm:max-w-[220px]">
                          {quizTitleLabel}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="mb-6">
                        <div className="flex items-center justify-center mb-2">
                          <label className="block text-slate-600 font-medium text-sm text-center">
                            Question Text
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Enter your question..."
                            value={q.text}
                            onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
                            required
                            className="flex-1 bg-white/70 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:shadow-[0_0_16px_-6px_rgba(148,163,184,0.6)]"
                          />
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuestion(qIndex)}
                              className="h-[46px] w-[46px] rounded-xl border border-rose-200 dark:border-none bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-800/60 dark:hover:text-white transition-colors flex items-center justify-center"
                              title="Remove question"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-slate-600 font-medium mb-3 text-sm">
                          Answer Options (select the correct {allowMultipleCorrect ? "answers" : "answer"})
                        </label>
                        {q.answers.map((a, aIndex) => (
                          <div
                            key={a._id || `${qIndex}-${aIndex}`}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${a.is_correct
                              ? "bg-emerald-100/70 border-emerald-300/70 dark:bg-emerald-900/40 dark:border-emerald-800/60"
                              : "bg-white/60 border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800/60 hover:border-slate-300/80 dark:hover:border-slate-700/80"
                              }`}
                            onClick={(event) => {
                              if (event.target.closest('input[type="checkbox"], input[type="radio"]')) return;
                              const input = document.getElementById(`answer-${qIndex}-${aIndex}`);
                              if (input) input.focus();
                            }}
                            style={{ cursor: "text" }}
                          >
                            <label className="inline-flex items-center p-2.5 -m-2.5 cursor-pointer">
                              <input
                                type={allowMultipleCorrect ? "checkbox" : "radio"}
                                name={`correct-${qIndex}`}
                                checked={a.is_correct}
                                onChange={() => setCorrectAnswer(qIndex, aIndex)}
                                className="w-5 h-5 appearance-none rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-slate-800 dark:checked:bg-slate-200 checked:border-transparent transition-all cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[7px] after:top-[3px] after:w-[5px] after:h-[9px] after:border-white dark:after:border-slate-900 after:border-b-2 after:border-r-2 after:rotate-45"
                              />
                            </label>
                            <label className="flex-1 flex items-center cursor-text">
                              <input
                                type="text"
                                placeholder={`Answer ${aIndex + 1}`}
                                value={a.text}
                                onChange={(e) => handleAnswerChange(qIndex, aIndex, e.target.value)}
                                required
                                id={`answer-${qIndex}-${aIndex}`}
                                className="w-full bg-transparent border-none text-slate-800 placeholder:text-slate-400 focus:outline-none"
                              />
                            </label>
                            {a.is_correct && (
                              <span className="text-emerald-600 dark:text-emerald-500 text-sm font-medium pointer-events-none">Correct</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {resetWarning && (
              <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-100/80 dark:bg-rose-950/40 px-4 py-3 text-rose-700 dark:text-rose-400 text-sm">
                Saving changes will reset all users&apos; attempts history for this quiz.
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={addQuestion}
                className="flex-1 bg-white/70 hover:bg-white/90 dark:bg-slate-800/40 dark:border-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100 backdrop-blur-lg text-slate-700 px-6 py-3 rounded-xl font-semibold border border-slate-200/80 hover:border-slate-300/80 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Question
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-white/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-semibold hover:bg-white/90 dark:hover:bg-slate-700/60 dark:hover:text-slate-100 transition-colors"
              >
                {hasChanges ? "Discard Changes" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={!hasChanges}
                className={`flex-1 bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold transition-colors hover:bg-slate-700 flex items-center justify-center gap-2 ${hasChanges
                  ? ""
                  : "opacity-50 cursor-not-allowed"
                  }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}
