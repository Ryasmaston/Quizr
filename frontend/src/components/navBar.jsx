import { useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import UserSearchBar from "./UserSearchBar";

function NavBar({ accountStatus, accountUsername }) {
  const user = useAuth();
  const { theme, toggleTheme, isLoading } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const username = accountUsername;
  const isAccountLocked = accountStatus === "pending_deletion";
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

  // Don't render until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 z-50 w-screen bg-white/70 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800/80">
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
                      ? "text-slate-900 dark:text-slate-100 font-semibold hover:text-slate-800 dark:hover:text-slate-200"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-500 dark:hover:text-slate-200"
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
                      ? "text-slate-900 dark:text-slate-100 font-semibold hover:text-slate-800 dark:hover:text-slate-200"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-500 dark:hover:text-slate-200"
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
                        ? "text-slate-900 dark:text-slate-100 font-semibold hover:text-slate-800 dark:hover:text-slate-200"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-500 dark:hover:text-slate-200"
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
                        ? "text-slate-900 dark:text-slate-100 font-semibold hover:text-slate-800 dark:hover:text-slate-200"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-500 dark:hover:text-slate-200"
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
            {user && (
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="h-10 w-10 inline-flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                )}
              </button>
            )}
            {user && username && (
              <NavLink
                to={`/users/${username}`}
                className={({ isActive }) =>
                  `${profileSizeClass} transition-colors h-16 px-5 inline-flex items-center ${isActive
                    ? "text-slate-900 dark:text-slate-100 font-semibold hover:text-slate-800 dark:hover:text-slate-200"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-500 dark:hover:text-slate-200"
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
                className="bg-slate-800 dark:bg-slate-700 text-white dark:text-slate-100 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors hover:bg-slate-700 dark:hover:bg-slate-600"
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
