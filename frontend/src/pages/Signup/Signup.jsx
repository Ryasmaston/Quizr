import { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../../services/authentication";
import { apiFetch } from "../../services/api";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/")
    })
    return unsub
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      if (!username.trim()) {
        setError("Username is required");
        return;
      }
      const availabilityRes = await fetch(
        `${BACKEND_URL}/users/availability?username=${encodeURIComponent(username)}`
      );
      const availabilityBody = await availabilityRes.json().catch(() => ({}));
      if (!availabilityRes.ok) {
        throw new Error(availabilityBody.message || "Unable to check username");
      }
      const { available } = availabilityBody;
      if (!available) {
        setError("Username already taken");
        return;
      }

      await signup(email, password); // creates user + signs them in
      const res = await apiFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Unable to create user");
      }
      // onAuthStateChanged redirects on its own, but to be safe:
      // navigate("/")
    } catch (err) {
      setError(err.message || "Signup failed");
    }
  }

  return (
    <>
      <h2>Signup</h2>
      <form onSubmit={handleSubmit}>
        <label>Username:</label>
        <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
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
