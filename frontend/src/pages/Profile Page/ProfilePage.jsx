import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { apiFetch } from "../../services/api";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const res = await apiFetch("/users/me");
        const body = await res.json();
        setProfile(body.user);
      }
    });
    return unsub;
  }, []);

  if (!user) {
    return <p>Please log in.</p>;
  }

  return (
    <div>
      <p>Name: {profile && profile.username}</p>
      <p>Email: {user.email}</p>
      <p>Image link: {profile && profile.profile_pic}</p>
      <p>Account created: {user.metadata && user.metadata.creationTime}</p>
    </div>
  );
}
