import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"

// Simple promise that resolves the first time Firebase reports the auth state.
// Other modules can await `authReady` to know when `auth.currentUser` is usable.
export const authReady = new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
        resolve(user)
        unsub()
    })
})

// Helper to listen for auth changes in components
export function listenToAuth(setUser, setLoading) {
    return onAuthStateChanged(auth, (user) => {
        setUser(user)
        setLoading(false)
    })
}