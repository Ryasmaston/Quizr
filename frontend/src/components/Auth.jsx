// src/components/Auth.js
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) {
        return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
            <p className="mt-4">Checking authentication...</p>
            </div>
        </div>
        );
    }

    return <AuthContext.Provider value={currentUser}>{children}</AuthContext.Provider>;
};
