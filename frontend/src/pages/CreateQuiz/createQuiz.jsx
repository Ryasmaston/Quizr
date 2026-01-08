import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import { createQuiz } from "../../services/quizzes";

export default function CreateQuiz() {
  const ANSWER_COUNT_OPTIONS = [2, 3, 4, 5, 6];
  const DEFAULT_ANSWERS_PER_QUESTION = 4;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
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

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="mt-4 text-white font-medium">Loading...</p>
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
      await createQuiz({
        title,
        category,
        questions,
        allow_multiple_correct: allowMultipleCorrect,
        require_all_correct: allowMultipleCorrect ? requireAllCorrect : false,
        req_to_pass: safeReqToPass,
      });
      alert("Quiz created!");
      navigate("/");
    } catch (err) {
      alert(err.message);
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
    { value: "art", label: "Art" },
    { value: "history", label: "History" },
    { value: "music", label: "Music" },
    { value: "science", label: "Science" },
    { value: "other", label: "Other" },
  ];
  const questionCount = questions.length;
  const passPercent = questionCount > 0 ? Math.round((reqToPass / questionCount) * 100) : 0;
  const passLabel = `${reqToPass}/${questionCount} (${passPercent}%)`;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto pt-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-3 sm:mb-4 px-4">
            Create New Quiz
          </h1>
          <p className="text-gray-300 text-base sm:text-lg px-4">Design your own quiz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/20">
            <label className="block text-white font-semibold mb-3 text-lg">
              Quiz Title
            </label>
            <input
              type="text"
              placeholder="Enter your quiz title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">Quiz Options</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="block text-gray-300 font-medium mb-2 text-sm">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  {categories.map((item) => (
                    <option key={item.value} value={item.value} className="bg-slate-900">
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-2">Used for category chips and filters.</p>
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2 text-sm">
                  Answers per question
                </label>
                <select
                  value={answersPerQuestion}
                  onChange={(e) => handleAnswersPerQuestionChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  {ANSWER_COUNT_OPTIONS.map((count) => (
                    <option key={count} value={count} className="bg-slate-900">
                      {count} answers
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-2">Applies to every question.</p>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-gray-300 font-medium mb-2 text-sm">
                  Pass threshold
                </label>
                <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                  <span>Required correct answers</span>
                  <span className="text-white font-semibold">{passLabel}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={questionCount}
                  step="1"
                  value={reqToPass}
                  onChange={(e) => setReqToPass(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-gray-300 font-medium mb-2 text-sm">
                  Correctness rules
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/5 p-3 hover:border-white/30 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowMultipleCorrect}
                      onChange={(e) => handleAllowMultipleCorrectChange(e.target.checked)}
                      className="mt-1 h-4 w-4 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-gray-200">
                      Allow multiple correct answers
                      <span className="block text-xs text-gray-400 mt-1">
                        Enables selecting more than one correct answer per question.
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex items-start gap-3 rounded-xl border border-white/20 bg-white/5 p-3 transition-all ${
                      allowMultipleCorrect ? "hover:border-white/30 cursor-pointer" : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={requireAllCorrect}
                      onChange={(e) => setRequireAllCorrect(e.target.checked)}
                      disabled={!allowMultipleCorrect}
                      className={`mt-1 h-4 w-4 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 ${
                        allowMultipleCorrect ? "cursor-pointer" : "cursor-not-allowed"
                      }`}
                    />
                    <span className="text-sm text-gray-200">
                      Require all correct answers
                      <span className="block text-xs text-gray-400 mt-1">
                        Mark correct only if the selection matches the full correct set.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {questions.map((q, qIndex) => {
              const gradient = gradients[qIndex % gradients.length];
              return (
                <div
                  key={qIndex}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/20 relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 bg-gradient-to-r ${gradient}`}></div>
                  <div className="flex items-center justify-between mb-6 pt-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <span className="text-white font-bold text-lg sm:text-xl">{qIndex + 1}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white">Question {qIndex + 1}</h3>
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-400 hover:text-red-300 transition-colors p-2"
                        title="Remove question"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="mb-6">
                    <label className="block text-gray-300 font-medium mb-2 text-sm">
                      Question Text
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your question..."
                      value={q.text}
                      onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-gray-300 font-medium mb-3 text-sm">
                      Answer Options (select the correct {allowMultipleCorrect ? "answers" : "answer"})
                    </label>
                    {q.answers.map((a, aIndex) => (
                      <div
                        key={aIndex}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          a.is_correct
                            ? 'bg-green-500/20 border-green-500/50'
                            : 'bg-white/5 border-white/20 hover:border-white/30'
                        }`}
                      >
                        <input
                          type={allowMultipleCorrect ? "checkbox" : "radio"}
                          name={`correct-${qIndex}`}
                          checked={a.is_correct}
                          onChange={() => setCorrectAnswer(qIndex, aIndex)}
                          className="w-5 h-5 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          placeholder={`Answer ${aIndex + 1}`}
                          value={a.text}
                          onChange={(e) => handleAnswerChange(qIndex, aIndex, e.target.value)}
                          required
                          className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:outline-none"
                        />
                        {a.is_correct && (
                          <span className="text-green-400 text-sm font-medium">Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="button"
              onClick={addQuestion}
              className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-lg text-white px-6 py-3 rounded-xl font-semibold border border-white/20 hover:border-white/40 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Question
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Create Quiz
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
