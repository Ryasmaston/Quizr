import { auth } from "./firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"

export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return await user.getIdToken()
}

export async function signup(email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  return await user.getIdToken()
}

export async function forgotPassword(email) {
  await sendPasswordResetEmail(auth, email);
}


export async function logout() {
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
      const NORMALIZED_BASE = RAW_BACKEND_URL.replace(/\/$/, "");
      const BACKEND_URL = NORMALIZED_BASE
        ? (NORMALIZED_BASE.endsWith("/api") ? NORMALIZED_BASE : `${NORMALIZED_BASE}/api`)
        : "/api";
      
      // Explicitly flush the exact theme state to the backend before signing out
      await fetch(`${BACKEND_URL}/me/theme`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ theme: currentTheme }),
      });
    } catch (e) {
      console.error("Failed to sync theme before logout", e);
    }
  }
  
  localStorage.removeItem("theme");
  await auth.signOut();
}