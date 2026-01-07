import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./components/Auth";

import "./App.css";
import { Home } from "./pages/Home/Home";
import { Login } from "./pages/Login/Login";
import { Signup } from "./pages/Signup/Signup";
import TakeQuizPage from "./pages/TakeQuiz/takeQuizPage";
import CreateQuiz from "./pages/CreateQuiz/createQuizPage";
import Layout from "./components/Layout";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import FriendsPage from "./pages/FriendsPage/FriendsPage"


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
      {path: "quizzes/create", element: <CreateQuiz /> },
      {path: "users/:username", element: <ProfilePage /> },
      {path: "friends", element: <FriendsPage /> }
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
