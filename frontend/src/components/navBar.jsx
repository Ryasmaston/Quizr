import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "./Auth";
import { apiFetch } from "../services/api";
import UserSearchBar from "./UserSearchBar";

function NavBar() {
  const user = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState(null);
  const [accountStatus, setAccountStatus] = useState("active");
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);
  const profileLabel = username || "Profile";
  const profileSizeClass =
    username && username.length > 16
      ? "text-xs"
      : username && username.length > 12
      ? "text-sm"
      : "text-sm";

  useEffect(() => {
    // redirect to login when we know there's no user
    if (user === null) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    async function fetchUsername() {
      if (user) {
        try {
          const res = await apiFetch("/me"); // Changed from /users/me to /me
          const body = await res.json();
          setUsername(body.user?.username);
          setAccountStatus(body.user?.status || "active");
        } catch (err) {
          console.error("Could not fetch username", err);
        }
      }
    }
    fetchUsername();
  }, [user, location.pathname, location.search, navigate, statusRefreshKey]); // Added location as dependency

  useEffect(() => {
    function handleStatusChange() {
      setStatusRefreshKey((value) => value + 1);
    }
    window.addEventListener("account-status-changed", handleStatusChange);
    return () => window.removeEventListener("account-status-changed", handleStatusChange);
  }, []);

  const isAccountLocked = accountStatus === "pending_deletion";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            {!isAccountLocked && (
              <>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${isActive ? "text-purple-400" : "text-gray-300 hover:text-white"}`
                  }
                >
                  Home
                </NavLink>
                <NavLink
                  to="/quizzes/create"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${isActive ? "text-purple-400" : "text-gray-300 hover:text-white"}`
                  }
                >
                  Create Quiz
                </NavLink>
                {user && (
                  <NavLink
                    to="/friends"
                    className={({ isActive }) =>
                      `text-sm font-medium transition-colors ${
                        isActive
                          ? "text-purple-400"
                          : "text-gray-300 hover:text-white"
                      }`
                    }
                  >
                    Friends
                  </NavLink>
                )}
                {user && (
                  <NavLink
                    to="/leaderboard"
                    className={({ isActive }) =>
                      `text-sm font-medium transition-colors ${
                        isActive
                          ? "text-purple-400"
                          : "text-gray-300 hover:text-white"
                      }`
                    }
                  >
                    Leaderboard
                  </NavLink>
                )}
              </>
            )}
          </div>

          {/* Global user search (only when logged in) */}
          <div className="flex-1 flex justify-center px-4">
            {user && !isAccountLocked && <UserSearchBar excludeUsername={username} />}
          </div>

          <div className="flex items-center gap-3">
            {user && username && (
              <NavLink
                to={`/users/${username}`}
                className={({ isActive }) =>
                  `${profileSizeClass} font-medium transition-colors ${
                    isActive
                      ? "text-purple-400"
                      : "text-gray-300 hover:text-white"
                  }`
                }
              >
                {profileLabel}
              </NavLink>
            )}
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
      </div>
    </nav>
  );
}

export default NavBar;
