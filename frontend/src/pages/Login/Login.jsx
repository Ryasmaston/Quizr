import { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../../services/authentication";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/")
    })
    return unsub
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null)
    try {
      await login(email, password); // Firebase sets auth.currentUser
      // onAuthStateChanged redirects on its own
    } catch (err) {
      setError("Invalid email or password");
    }
  }

  return (
    <>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email:</label>
        <input id="email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password:</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input role="submit-button" id="submit" type="submit" value="Submit" />
      </form>
      {error && <p>{error}</p>}
      <p>
        Don&apos;t have an account?{" "}
        <Link to="/signup">
          <button type="button">Sign up</button>
        </Link>
      </p>
    </>
  );
}
