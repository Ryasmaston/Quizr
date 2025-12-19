import {onAuthStateChanged} from "firebase/auth"
import {auth} from "./firebase"

export function listenToAuth(setUser, setLoading) {
    return onAuthStateChanged(auth, (user) => {
        setUser(user)
        setLoading(false)
    })
}