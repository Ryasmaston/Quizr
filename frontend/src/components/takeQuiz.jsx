import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import "./takeQuizPage.css";
import { apiFetch } from "../services/api";

function TakeQuiz() {
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
//While quiz is being loaded or the user is logged out we return a message on the screen
if (!quiz) return <p>Loading...</p>;

const question = quiz.questions[currentIndex];
const isLastQuestion = currentIndex === quiz.questions.length - 1;
const currentAnswer = answers[currentIndex];
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
    <div className="quiz-container">
    {/* Displaying the quiz title at the tip*/}
    <h1 className="quiz-title">{quiz.title}</h1>

    {phase === "intro" && (
        <div className="question">
        <p>Category: {quiz.category}</p>
        <p>Questions: {quiz.questions.length}</p>
        <p>Options per question: {optionsPerQuestion}</p>
        <button className="submit-btn" onClick={startQuiz}>
            Take the quiz
        </button>
        </div>
    )}

    {phase === "inProgress" && (
        <div className="question">
        <p>
            Question {currentIndex + 1} of {quiz.questions.length}
        </p>
        <p>{question.text}</p>

        <div className="answers">
            {question.answers.map((answer) => (
            <button
                key={answer._id}
                className={
                currentAnswer === answer._id ? "answer selected" : "answer"
                }
                onClick={() => handleSelect(answer._id)}
            >
                {answer.text}
            </button>
            ))}
        </div>

        <div>
            <button
            className="submit-btn"
            onClick={goBack}
            disabled={currentIndex === 0}
            >
            Back
            </button>
            {!isLastQuestion && (
            <button
                className="submit-btn"
                onClick={goNext}
                disabled={!currentAnswer}
            >
                Next
            </button>
            )}
            {isLastQuestion && (
            <button
                className="submit-btn"
                onClick={submitQuiz}
                disabled={!currentAnswer}
            >
                Submit
            </button>
            )}
        </div>
        </div>
    )}

    {phase === "done" && result && (
        <p className="result">
        Correct answers {result.correctAnswers}, ({result.scorePercentage})
        </p>
    )}
    </div>
);
}


export default TakeQuiz;
