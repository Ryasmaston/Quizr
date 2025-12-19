import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useNavigate, Link } from "react-router-dom";
import { getQuizzes } from "../../services/quizzes";

export function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  const navigate = useNavigate()

useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    setUser(user);
    if (!user) {
      setLoading(false);
      navigate("/login");
      return;
    }
    try {
      const data = await getQuizzes();
      setQuizzes(Array.isArray(data?.quizzes) ? data.quizzes : []);
    } catch (error) {
      console.error("Failed to load quizzes", error);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  });
  return unsub;
}, [navigate]);


  if (loading) return <div>Loading...</div>
  if (!user) return null

  return (
    <div>
          <h1>Available Quizzes</h1>
          {quizzes.length === 0 && <p>No quizzes found.</p>}
          <ul>
            {quizzes.map((quiz) => (
              <li key={quiz._id}>
                <Link to={`/quiz/${quiz._id}`}>
                  {quiz.title}
                </Link>
              </li>
            ))}
          </ul>
          <button onClick={() => signOut(auth)}>Sign out</button>
        </div>
  )
}
