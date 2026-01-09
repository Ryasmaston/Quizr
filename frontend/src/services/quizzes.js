import { apiFetch } from "./api";

export async function getQuizzes() {
  const res = await apiFetch("/quizzes");
  if (!res.ok) throw new Error("Unable to fetch quizzes")
  return res.json();
}

export async function createQuiz(quizData) {
  const res = await apiFetch("/quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quizData),
  });
  if (!res.ok) throw new Error("Unable to create quiz")
  return res.json();
}

export async function deleteQuiz(quizId) {
  const res = await apiFetch(`/quizzes/${quizId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Unable to delete quiz");
  return res.json();
}

export async function getLeaderboard() {
  const res = await apiFetch("/quizzes/leaderboard");
  if (!res.ok) throw new Error("Unable to fetch leaderboard");
  return res.json();
}

// import { auth } from "./firebase"
// const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

// export async function getQuizzes() {
//   const token = await auth.currentUser?.getIdToken()
//   if (!token) throw new Error("Not logged in")

//   const res = await fetch(`${BACKEND_URL}/quizzes`, {
//     headers: { Authorization: `Bearer ${token}` },
//   })

//   if (!res.ok) throw new Error("Unable to fetch quizzes")
//   return await res.json()
// }
