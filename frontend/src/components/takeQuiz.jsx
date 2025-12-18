import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";

function TakeQuiz() {
    //Getting the quiz id from the URL e.g. /quiz/:id
    const { id } = useParams();
    //Storing the quiz data from the backend
    const [quiz, setQuiz] = useState(null);
    //Storing the user's selected answers which is one per question
    const [answers, setAnswers] = useState([]);
    //Storing the result returned after submitting the quiz
    const [result, setResult] = useState(null);

    useEffect(() => {
    // Listen for login state, then fetch the quiz if user is logged in
    const unsub = onAuthStateChanged(auth, async (user) => {
    //If no user, don't fetch a quiz
    if (!user) return;
    //Getting the firebase auth token to send to the backend
    const token = await user.getIdToken();
    //Fetching the quiz
    const res = await fetch(`http://localhost:3000/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    //Saving the quiz data to state
    const data = await res.json();
    setQuiz(data.quiz);
    });

    // Stop listening when the page changes
    return () => unsub();
}, [id]);
//While quiz is being loaded or the user is logged out we return a message on the screen
if (!quiz) return <p>Loading...</p>;

async function submitQuiz() {
    //Making sure user is still logged in
    const user = auth.currentUser;
    if (!user) return;
    //Getting the auth token for the submit request
    const token = await user.getIdToken();
    //Sending the user's answers to the backend
    const res = await fetch(`http://localhost:3000/quizzes/${id}/submit`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ answers })
    });
    //Saving the quiz result (percentage, correct answers)
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
        Correct answers {result.correctAnswers}, ({result.scorePercentage})
        </p>
    )}
    </div>
);
}


export default TakeQuiz;