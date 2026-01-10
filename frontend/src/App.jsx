import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./components/Auth";

import "./App.css";
import { Home } from "./pages/Home/Home";
import { Login } from "./pages/Login/Login";
import { Signup } from "./pages/Signup/Signup";
import TakeQuizPage from "./pages/TakeQuiz/takeQuiz";
import CreateQuiz from "./pages/CreateQuiz/createQuiz";
import EditQuiz from "./pages/EditQuiz/editQuiz";
import Layout from "./components/Layout";
import ProfilePage from "./pages/Profile/Profile";
import FriendsPage from "./pages/Friends/Friends"
import SettingsPage from "./pages/SettingsPage/SettingsPage"
import LeaderboardPage from "./pages/Leaderboard/Leaderboard";


// docs: https://reactrouter.com/en/main/start/overview
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {index: true, element: <Home /> },
      {path: "login", element: <Login /> },
      {path: "signup", element: <Signup /> },
      {path: "quiz/:id", element: <TakeQuizPage /> },
      {path: "quiz/:id/edit", element: <EditQuiz /> },
      {path: "quizzes/create", element: <CreateQuiz /> },
      {path: "users/:username", element: <ProfilePage /> },
      {path: "friends", element: <FriendsPage /> },
      {path: "leaderboard", element: <LeaderboardPage /> },
      {path: "settings", element: <SettingsPage />}
    ],
  },
]);


function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App;
