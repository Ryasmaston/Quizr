import { auth } from "./firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"

export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return await user.getIdToken()
}

export async function signup(email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  return await user.getIdToken()
}