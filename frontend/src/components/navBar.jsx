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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <NavLink
                to="/"
                className={({isActive}) => `text-sm font-medium transition-colors ${isActive ? 'text-purple-400' : 'text-gray-300 hover:text-white'}`}
              >
                Home
              </NavLink>
              <NavLink
                to="/quizzes/create"
                className={({isActive}) => `text-sm font-medium transition-colors ${isActive ? 'text-purple-400' : 'text-gray-300 hover:text-white'}`}
              >
                Create Quiz
              </NavLink>
              {user && (
                <NavLink
                  to="/friends"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${isActive ? "text-purple-400" : "text-gray-300 hover:text-white"
                    }`
                  }
                >
                  Friends
                </NavLink>
              )}
            </div>
            {user && (
              <button
                onClick={() => signOut(auth)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </nav>
    );
}

export default NavBar;
