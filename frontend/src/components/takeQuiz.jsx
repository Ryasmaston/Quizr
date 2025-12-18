import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";

function TakeQuiz() {
    const { id } = useParams();
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setQuiz(null);
                return;
            }
            const token = await user.getIdToken();
            const res = await fetch(`http://localhost:3000/quizzes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                // could show an error message here
                setQuiz(null);
                return;
            }
            const data = await res.json();
            setQuiz(data.quiz);
        });

        return () => unsub();
    }, [id]);

    if (!quiz) return null;

    async function submitQuiz() {
        const user = auth.currentUser;
        if (!user) return; // or redirect to login
        const token = await user.getIdToken();

        const res = await fetch(`http://localhost:3000/quizzes/${id}/submit`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ answers })
        });

        if (!res.ok) {
            // handle error (e.g., 401)
            const err = await res.json().catch(() => ({}));
            setResult({ error: err.message || 'Error submitting' });
            return;
        }

        const data = await res.json();
        setResult(data);
    }

    return (
    <div>
        <h1>{quiz.title}</h1>

        {quiz.questions.map((question, questionIndex) => (
            <div key={questionIndex}>
                <p>{question.text}</p>

                {question.answers.map((answer, answerIndex) => (
                <button
                key={answerIndex}
                onClick={() => {
                    const updatedAnswers = [...answers];
                    updatedAnswers[questionIndex] = answer.text;
                    setAnswers(updatedAnswers);
            }}
            >
                {answer.text}
            </button>
        ))}
        </div>
    ))}

    <button onClick={submitQuiz}>Submit</button>

    {result && (
        <p>
        Score: {result.scorePercentage} ({result.correctAnswers})
        </p>
    )}
</div>
    )
}

export default TakeQuiz;