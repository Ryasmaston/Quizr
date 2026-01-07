import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { apiFetch } from "../../services/api";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [takenQuizzes, setTakenQuizzes] = useState([]); //Stores quizzes attempted by logged in user
  const [createdQuizzes, setCreatedQuizzes] = useState([]); //Stores quizzes made by the user

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const res = await apiFetch("/users/me"); //Fetching current user profile from backend
        const body = await res.json();
        setProfile(body.user);

        const quizzesResponse = await apiFetch("/quizzes"); //Fetches all quizzes from backend
        const quizzesBody = await quizzesResponse.json(); // converts quiz response to json
        const userId = body.user._id; // Stores MongoDB user ID for comparison

        const createdResponse = await apiFetch("/quizzes?created_by=" + userId);
        const createdBody = await createdResponse.json();
        setCreatedQuizzes(createdBody.quizzes || []); // SAVES QUIZZES CREATED BY THIS USER

        const quizzesWithUserAttempts = quizzesBody.quizzes

        .map((quiz) => { //maps over all quizzes to find attempts by current user
          const userAttempt = quiz.attempts?.find( //Finds the user's attempt to this quiz if any exist
            (attempt) => attempt.user_id.toString() === userId.toString()
          );
          if (!userAttempt) return null;
          
          return {
          _id: quiz._id,
          title: quiz.title,
          correct: userAttempt.correct,
          attempted_at: userAttempt.attempted_at,
          totalQuestions: quiz.questions.length,
          
        };
  
        })
        .filter(Boolean); //Removes any quizzes not attenmpted nulls
      setTakenQuizzes(quizzesWithUserAttempts); //Saving filtered quizzes to state
      }
      
    });
    return unsub;
  }, []);

  if (!user) {
    return <p>Please log in.</p>;
  }

  return (
    <div>
      <p>Name: {profile && profile.username}</p>
      <p>Email: {user.email}</p>
      <p>Image link: {profile && profile.profile_pic}</p>
      <p>Account created: {user.metadata && user.metadata.creationTime}</p>
      <h2>Quizzes Taken</h2>
      {/* Conditional rendering if no quizzes are taken */}
      {takenQuizzes.length === 0 ? (
        <p>No quizzes taken yet.</p> 
      ) : (
        <ul>
          {takenQuizzes.map((quiz) => (
            <li key={quiz._id}>
              {quiz.title} - {quiz.correct} / {quiz.totalQuestions} correct (
              {Math.round((quiz.correct / quiz.totalQuestions) * 100)}%) - Attempted on {new Date(quiz.attempted_at).toLocaleDateString()}
                {/* Displays title, raw score, percentage, and formatted attempt date */}
            </li>
          ))}
        </ul>
      )}
      <h2>Quizzes Created</h2>
      {createdQuizzes.length === 0 ? (
        <p>You haven&apos;t created any quizzes yet.</p>
      ) : (
        <ul>
          {createdQuizzes.map((quiz) => (
          <li key={quiz._id}>
            {quiz.title} - {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
          </li>
        ))}
        </ul>
      )}
    </div>
  );
}
