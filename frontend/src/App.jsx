import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./App.css";
import { Home } from "./pages/Home/Home";
import { Login } from "./pages/Login/Login";
import { Signup } from "./pages/Signup/Signup";
import TakeQuiz from "./components/takeQuiz";


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
    element: <TakeQuiz />,
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
