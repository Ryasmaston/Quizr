import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../services/firebase";


function NavBar() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
        setUser(user);
        if (!user) {
        navigate("/login");
        }
    });
    return unsub;
    }, [navigate]);

    return (
        <nav className ="navbar">
            <div className="links">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/quizzes/create">Create Quiz</NavLink>
            {user && (
            <button onClick={() => signOut(auth)}>Sign out</button>
            )}
            </div>
            
            
        </nav>
    );
}

export default NavBar;