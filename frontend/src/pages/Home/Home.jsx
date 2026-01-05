import { useEffect, useState } from "react";
import {Link} from "react-router-dom";
import { getQuizzes } from "../../services/quizzes";

export function Home() {
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  

useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await getQuizzes();
        setQuizzes(Array.isArray(data?.quizzes) ? data.quizzes : []);
      } catch (error) {
        console.error("Failed to load quizzes", error);
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);


  if (loading) return <div>Loading...</div>
  

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
          {/* <button onClick={() => signOut(auth)}>Sign out</button> */}
        </div>
  )
}
