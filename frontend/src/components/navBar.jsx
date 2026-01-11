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
          setUsername(body.user?.user_data?.username);
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
    <nav className="fixed top-0 left-0 z-50 w-screen bg-white/70 backdrop-blur-lg border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-0">
            {!isAccountLocked && (
              <>
                <NavLink
                  to="/"
                  onClick={(event) => {
                    if (location.pathname === "/") {
                      event.preventDefault();
                      navigate(0);
                    }
                  }}
                  className={({ isActive }) =>
                    `text-sm transition-colors h-16 px-5 inline-flex items-center ${isActive
                      ? "text-slate-900 font-semibold hover:text-slate-800"
                      : "text-slate-700 hover:text-slate-500"
                    }`
                  }
                >
                  <span className="inline-grid items-center leading-none">
                    <span aria-hidden="true" className="col-start-1 row-start-1 font-semibold leading-none opacity-0">
                      Home
                    </span>
                    <span className="col-start-1 row-start-1 leading-none">Home</span>
                  </span>
                </NavLink>
                <NavLink
                  to="/quizzes/create"
                  state={{ returnTo: location.pathname }}
                  className={({ isActive }) =>
                    `text-sm transition-colors h-16 px-5 inline-flex items-center ${isActive
                      ? "text-slate-900 font-semibold hover:text-slate-800"
                      : "text-slate-700 hover:text-slate-500"
                    }`
                  }
                >
                  <span className="inline-grid items-center leading-none">
                    <span aria-hidden="true" className="col-start-1 row-start-1 font-semibold leading-none opacity-0">
                      Create Quiz
                    </span>
                    <span className="col-start-1 row-start-1 leading-none">Create Quiz</span>
                  </span>
                </NavLink>
                {user && (
                  <NavLink
                    to="/friends"
                    className={({ isActive }) =>
                      `text-sm transition-colors h-16 px-5 inline-flex items-center ${isActive
                        ? "text-slate-900 font-semibold hover:text-slate-800"
                        : "text-slate-700 hover:text-slate-500"
                      }`
                    }
                  >
                    <span className="inline-grid items-center leading-none">
                      <span aria-hidden="true" className="col-start-1 row-start-1 font-semibold leading-none opacity-0">
                        Friends
                      </span>
                      <span className="col-start-1 row-start-1 leading-none">Friends</span>
                    </span>
                  </NavLink>
                )}
                {user && (
                  <NavLink
                    to="/leaderboard"
                    className={({ isActive }) =>
                      `text-sm transition-colors h-16 px-5 inline-flex items-center ${isActive
                        ? "text-slate-900 font-semibold hover:text-slate-800"
                        : "text-slate-700 hover:text-slate-500"
                      }`
                    }
                  >
                    <span className="inline-grid items-center leading-none">
                      <span aria-hidden="true" className="col-start-1 row-start-1 font-semibold leading-none opacity-0">
                        Leaderboard
                      </span>
                      <span className="col-start-1 row-start-1 leading-none">Leaderboard</span>
                    </span>
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
                  `${profileSizeClass} transition-colors h-16 px-5 inline-flex items-center ${isActive
                    ? "text-slate-900 font-semibold hover:text-slate-800"
                    : "text-slate-700 hover:text-slate-500"
                  }`
                }
              >
                <span className="inline-grid items-center leading-none">
                  <span aria-hidden="true" className="col-start-1 row-start-1 font-semibold leading-none opacity-0">
                    {profileLabel}
                  </span>
                  <span className="col-start-1 row-start-1 leading-none">{profileLabel}</span>
                </span>
              </NavLink>
            )}
            {user && (
              <button
                onClick={() => signOut(auth)}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors hover:bg-slate-700"
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
