import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./App.css";
import { Home } from "./pages/Home/Home";
import { Login } from "./pages/Login/Login";
import { Signup } from "./pages/Signup/Signup";
import TakeQuizPage from "./pages/TakeQuiz/takeQuizPage";
import CreateQuiz from "./pages/CreateQuiz/createQuizPage";
import Layout from "./components/Layout";
import ProfilePage from "./pages/Profile Page/ProfilePage";


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
    ],
  },
  {
    path: "/quizzes/create",
    element: <CreateQuiz />
  },
  {
    path: "/profile",
    element: <ProfilePage />
  }
]);


function App() {
  return <RouterProvider router={router} />
}

export default App;
