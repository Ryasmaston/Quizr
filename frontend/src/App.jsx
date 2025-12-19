import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./App.css";
import { Home } from "./pages/Home/Home";
import { Login } from "./pages/Login/Login";
import { Signup } from "./pages/Signup/Signup";
import TakeQuizPage from "./pages/TakeQuiz/takeQuizPage";


// docs: https://reactrouter.com/en/main/start/overview
const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/take/:id",
    element: <TakeQuizPage />,
  }
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
