import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useLocation, useNavigate, unstable_useBlocker as useBlocker } from "react-router-dom";
import { createQuiz } from "../../services/quizzes";
import { useIsMobile } from "../../hooks/useIsMobile";
import { LogOut } from "lucide-react";

export default function CreateQuiz() {
  const isMobile = useIsMobile();
  const ANSWER_COUNT_OPTIONS = useMemo(() => [2, 3, 4, 5, 6], []);
  const DEFAULT_ANSWERS_PER_QUESTION = 4;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/";
  const [ignoreBlocker, setIgnoreBlocker] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const opalBackdropStyle = {
    backgroundColor: "var(--opal-bg-color)",
    backgroundImage: "var(--opal-backdrop-image)"
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setLoading(false);
        navigate("/login");
        return;
      }
      setLoading(false);
    });
    return unsub;
  }, [navigate]);

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

  const hasChanges = useMemo(() => {
    const hasQuestionText = questions.some((q) => q.text.trim().length > 0);
    const hasAnswerText = questions.some((q) =>
      q.answers.some((a) => a.text.trim().length > 0 || a.is_correct)
    );
    const hasNonDefaultSettings =
      title.trim().length > 0 ||
      category !== "other" ||
      difficulty !== "medium" ||
      lockAnswers ||
      answersPerQuestion !== DEFAULT_ANSWERS_PER_QUESTION ||
      allowMultipleCorrect ||
      requireAllCorrect ||
      reqToPass !== 1 ||
      questions.length !== 1;
    return hasQuestionText || hasAnswerText || hasNonDefaultSettings;
  }, [
    title,
    category,
    difficulty,
    lockAnswers,
    answersPerQuestion,
    allowMultipleCorrect,
    requireAllCorrect,
    reqToPass,
    questions,
    DEFAULT_ANSWERS_PER_QUESTION,
  ]);

  const blocker = useBlocker(hasChanges && !ignoreBlocker);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const shouldLeave = window.confirm("You have unsaved changes. Discard them?");
    if (shouldLeave) {
      setIgnoreBlocker(true);
      setTimeout(() => blocker.proceed(), 0);
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    if (!hasChanges) return undefined;
    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const handleCancel = useCallback(() => {
    navigate(returnTo);
  }, [navigate, returnTo]);

  useEffect(() => {
    if (!pendingNavigation) return;
    navigate(pendingNavigation);
    setPendingNavigation(null);
  }, [navigate, pendingNavigation]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        handleCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCancel]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const categoryDropdown = document.getElementById('category-dropdown-create');
      const answersDropdown = document.getElementById('answers-dropdown-create');
      const button = event.target.closest('button');
      const isDropdownButton = button && (button.getAttribute('aria-haspopup') === 'true');

      if (categoryDropdown && !categoryDropdown.contains(event.target) && !isDropdownButton) {
        categoryDropdown.classList.add('hidden');
      }
      if (answersDropdown && !answersDropdown.contains(event.target) && !isDropdownButton) {
        answersDropdown.classList.add('hidden');
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

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

  const handleSignOut = async () => {
    if (hasChanges) {
      const confirmDiscard = window.confirm("You have unsaved changes. Discard them and sign out?");
      if (!confirmDiscard) return;
    }
    setIgnoreBlocker(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed:", err);
      setIgnoreBlocker(false);
    }
  };

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
    try {
      const data = await createQuiz({
        title,
        category,
        difficulty,
        questions,
        allow_multiple_correct: allowMultipleCorrect,
        require_all_correct: allowMultipleCorrect ? requireAllCorrect : false,
        lock_answers: lockAnswers,
        req_to_pass: safeReqToPass,
      });
      const quizId = data?.quiz?._id;
      ignoreBlockRef.current = true;
      setPendingNavigation(quizId ? `/quiz/${quizId}` : "/");
    } catch (err) {
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
      <div className={`relative min-h-screen pt-16 sm:pt-20`}>
        {/* Mobile Top Bar */}
        {questions.length > 0 && isMobile && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800/80 pt-[env(safe-area-inset-top)]">
            <div className="px-4 py-2 flex items-center gap-3">
              <div className="grid grid-cols-3 gap-2 flex-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-white/80 hover:bg-white dark:bg-slate-800/50 dark:border-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100 text-slate-700 px-3 py-2.5 rounded-lg text-xs font-semibold border border-slate-200/80 transition-colors flex items-center justify-center gap-1.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-white/80 hover:bg-white dark:bg-slate-800/50 dark:border-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100 text-slate-700 px-3 py-2.5 rounded-lg text-xs font-semibold border border-slate-200/80 transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e)}
                  className="bg-slate-800 dark:bg-blue-950/60 text-white px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors hover:bg-slate-700 dark:hover:bg-blue-900/60 dark:border dark:border-blue-400/30 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Create
                </button>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        )}
        <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
          <div className="mb-9 sm:mb-12 text-center mt-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-3 sm:mb-4 select-none">
              Create New Quiz
            </h1>
            <p className="text-slate-600 text-base sm:text-lg select-none">Design your own quiz</p>
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
                <div className="relative">
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-2 text-sm">
                    Category
                  </label>
                  <button
                    type="button"
                    aria-haspopup="true"
                    onClick={() => {
                      const dropdown = document.getElementById('category-dropdown-create');
                      dropdown.classList.toggle('hidden');
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:ring-0 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 flex items-center justify-between"
                  >
                    <span>{categories.find(c => c.value === category)?.label || category}</span>
                    <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div id="category-dropdown-create" className="hidden absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-lg z-50 max-h-64 overflow-y-auto">
                    {categories.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setCategory(item.value);
                          document.getElementById('category-dropdown-create').classList.add('hidden');
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60 first:rounded-t-xl last:rounded-b-xl ${category === item.value
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-300'
                          }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-2 text-sm">
                    Answers per question
                  </label>
                  <button
                    type="button"
                    aria-haspopup="true"
                    onClick={() => {
                      const dropdown = document.getElementById('answers-dropdown-create');
                      dropdown.classList.toggle('hidden');
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:ring-0 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 flex items-center justify-between"
                  >
                    <span>{answersPerQuestion} answers</span>
                    <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div id="answers-dropdown-create" className="hidden absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-lg z-50 max-h-64 overflow-y-auto">
                    {ANSWER_COUNT_OPTIONS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          handleAnswersPerQuestionChange(count);
                          document.getElementById('answers-dropdown-create').classList.add('hidden');
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60 first:rounded-t-xl last:rounded-b-xl ${answersPerQuestion === count
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-300'
                          }`}



                      >
                        {count} answers
                      </button>
                    ))}
                  </div>
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
                        className="mt-1 h-4 w-4 appearance-none rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-slate-800 dark:checked:bg-slate-200 checked:border-transparent transition-all cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[2px] after:w-[4px] after:h-[8px] after:border-white dark:after:border-slate-900 after:border-b-2 after:border-r-2 after:rotate-45"
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
                        className={`mt-1 h-4 w-4 appearance-none rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-slate-800 dark:checked:bg-slate-200 checked:border-transparent transition-all relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[2px] after:w-[4px] after:h-[8px] after:border-white dark:after:border-slate-900 after:border-b-2 after:border-r-2 after:rotate-45 ${allowMultipleCorrect ? "cursor-pointer" : "cursor-default"
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
                      className="mt-1 h-4 w-4 appearance-none rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-slate-800 dark:checked:bg-slate-200 checked:border-transparent transition-all cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[2px] after:w-[4px] after:h-[8px] after:border-white dark:after:border-slate-900 after:border-b-2 after:border-r-2 after:rotate-45"
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
                    key={qIndex}
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
                            key={aIndex}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all focus-within:shadow-[0_0_12px_-2px_rgba(100,116,139,0.25)] dark:focus-within:shadow-[0_0_16px_-2px_rgba(255,255,255,0.15)] ${a.is_correct
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
                                className="w-full bg-transparent border-none text-slate-800 placeholder:text-slate-400 focus:outline-none no-global-shadow"
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
            {questions.length > 0 && (
              <div className="sticky bottom-6 z-20 pt-4 hidden sm:block">
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 backdrop-blur-lg shadow-lg px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 bg-white/70 hover:bg-white/90 dark:bg-slate-800/40 dark:border-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100 backdrop-blur-lg text-slate-700 px-6 py-3 rounded-xl font-semibold border border-slate-200/80 hover:border-slate-300/80 transition-colors flex items-center justify-center gap-2"
                    >
                      Cancel
                    </button>
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
                      type="submit"
                      className="flex-1 bg-slate-800 dark:bg-blue-950/60 text-white px-6 py-3 rounded-xl font-semibold transition-colors hover:bg-slate-700 dark:hover:bg-blue-900/60 dark:border dark:border-blue-400/30 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Quiz
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </main>
      </div>
    </>
  );
}
