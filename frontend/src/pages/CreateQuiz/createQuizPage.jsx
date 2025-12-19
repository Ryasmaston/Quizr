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

  if (loading) return <div>Loading...</div>;
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

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create Quiz</h1>
      <input
        placeholder="Quiz title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      {questions.map((q, qIndex) => (
        <div key={qIndex}>
          <h3>Question {qIndex + 1}</h3>
          <input
            placeholder="Question text"
            value={q.text}
            onChange={(e) =>
              handleQuestionChange(qIndex, e.target.value)
            }
            required
          />
          {q.answers.map((a, aIndex) => (
            <div key={aIndex}>
              <input
                placeholder={`Answer ${aIndex + 1}`}
                value={a.text}
                onChange={(e) =>
                  handleAnswerChange(qIndex, aIndex, e.target.value)
                }
                required
              />
              <input
                type="radio"
                name={`correct-${qIndex}`}
                checked={a.is_correct}
                onChange={() => setCorrectAnswer(qIndex, aIndex)}
              />
            </div>
          ))}
        </div>
      ))}
      <button type="button" onClick={addQuestion}>
        Add Question
      </button>
      <button type="submit">Create Quiz</button>
    </form>
  );
}
