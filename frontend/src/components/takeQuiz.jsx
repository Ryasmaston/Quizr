import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import "./takeQuizPage.css";

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
    <div className="quiz-container">
    {/* Displaying the quiz title at the tip*/}
    <h1 className="quiz-title">{quiz.title}</h1>
    
    {/*Looping through each question in the quiz to then be displayed*/}
        {quiz.questions.map((question, questionIndex) => (
        <div className="question" key={questionIndex}>
        <p>{question.text}</p>

    {/* Displaying all possible answers*/}

        <div className="answers">
        {question.answers.map((answer, answerIndex) => (
            <button
            key={answerIndex}
            //Highlighting the button on any specific answer that is selected
            className={
                answers[questionIndex] === answer.text
                ? "answer selected"
                : "answer"
            }
            onClick={() => {
                //If the quiz has already been submitted, then dont allow changes
                if (result) return;

                const updatedAnswers = [...answers]; //Here we create a copy of the potential answers so we dont change the original state
                updatedAnswers[questionIndex] = answer.text; //This sets the answer for the current question questionIndex is given to the text of the button the user clicked
                setAnswers(updatedAnswers); //This will update the react state and then re-render the component showing the selected the answer as "selected"
            }}
            >
            {answer.text}
            </button>
        ))}
        </div>
    </div>
    ))}

    <button className="submit-btn" onClick={submitQuiz} disabled={answers.length !== quiz.questions.length}>Submit</button> 
    {/* Above we disable the option to resubmit the quiz once the button has been pressed as well as not letting the quiz be submitted if not all questions have been answered*/}
    {result && (
        <p className="result">
        Correct answers {result.correctAnswers}, ({result.scorePercentage})
        </p>
    )}
    </div>
);
}


export default TakeQuiz;