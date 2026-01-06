import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { getUserByUsername } from '../../services/users'
import { apiFetch } from "../../services/api";

export default function ProfilePage() {
  const { username: routeUsername } = useParams();
  const [profile, setProfile] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [takenQuizzes, setTakenQuizzes] = useState([]); //Stores quizzes attempted by logged in user
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setLoggedInUser(currentUser);
    });
    return unsub;
  }, []);

  useEffect(() => {
    async function fetchProfileAndQuizzes() {
      setLoading(true);
      try {
        const userProfile = await getUserByUsername(routeUsername);
        setProfile(userProfile);
        const quizzesResponse = await apiFetch("/quizzes");
        const quizzesBody = await quizzesResponse.json();
        const userId = userProfile._id;
        const quizzesWithUserAttempts = quizzesBody.quizzes
          .map((quiz) => {
            const userAttempt = quiz.attempts?.find(
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
          .filter(Boolean);
        setTakenQuizzes(quizzesWithUserAttempts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfileAndQuizzes();
  }, [routeUsername]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!profile) return <p>User not found.</p>;

  return (
    <div>
      <p>Name: {profile.username}</p>
      {loggedInUser && <p>Email: {loggedInUser.email}</p>}
      <p>Image link: {profile.profile_pic}</p>
      {loggedInUser?.metadata && (
        <p>Account created: {loggedInUser.metadata.creationTime}</p>
      )}

      <h2>Quizzes Taken</h2>
      {takenQuizzes.length === 0 ? (
        <p>No quizzes taken yet.</p>
      ) : (
        <ul>
          {takenQuizzes.map((quiz) => (
            <li key={quiz._id}>
              {quiz.title} - {quiz.correct} / {quiz.totalQuestions} correct (
              {Math.round((quiz.correct / quiz.totalQuestions) * 100)}%) - Attempted on{" "}
              {new Date(quiz.attempted_at).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
