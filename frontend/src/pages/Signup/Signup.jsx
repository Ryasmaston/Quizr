import { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../../services/authentication";

export function Signup() {
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
      await signup(email, password); // creates user + signs them in
      // onAuthStateChanged redirects on its own, but to be safe:
      // navigate("/")
    } catch (err) {
      setError("Account already exists")
    }
  }

  return (
    <>
      <h2>Signup</h2>
      <form onSubmit={handleSubmit}>
        <label>Email:</label>
        <input id="email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password:</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input role="submit-button" id="submit" type="submit" value="Sign up" />
      </form>
      {error && <p>{error}</p>}
      <p>
        Already have an account?{" "}
        <Link to="/login">Log in</Link>
      </p>
    </>
  );
}
