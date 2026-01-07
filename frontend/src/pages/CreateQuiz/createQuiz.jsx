import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import { createQuiz } from "../../services/quizzes";

export default function CreateQuiz() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([
    {
      text: "",
      answers: [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    },
  ]);
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

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="mt-4 text-white font-medium">Loading...</p>
        </div>
      </div>
    );

  if (!user) return null;

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
    const updated = [...questions];
    updated[qIndex].answers = updated[qIndex].answers.map((a, i) => ({
      ...a,
      is_correct: i === aIndex,
    }));
    setQuestions(updated);
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        text: "",
        answers: [
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ],
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
    try {
      await createQuiz({ title, questions });
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
                      Answer Options (select the correct one)
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
                          type="radio"
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
