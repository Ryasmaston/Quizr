import { useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useIsMobile } from "../hooks/useIsMobile";
import UserSearchBar from "./UserSearchBar";
import {
  Home as HomeIcon,
  PlusSquare,
  Users,
  Trophy,
  User,
  LogOut,
  Sun,
  Moon
} from "lucide-react";

function NavBar({ accountStatus, accountUsername }) {
  const user = useAuth();
  const isMobile = useIsMobile();
  const { theme, toggleTheme, isLoading } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const username = accountUsername;
  const isAccountLocked = accountStatus === "pending_deletion";
  const profileLabel = username || "Profile";

  useEffect(() => {
    if (user === null) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (isLoading) {
    return null;
  }

  const navLinks = [
    { to: "/", icon: HomeIcon, label: "Home", mobileOnly: false },
    { to: "/quizzes/create", icon: PlusSquare, label: "Create", mobileOnly: false },
    { to: "/friends", icon: Users, label: "Friends", mobileOnly: false, requiresAuth: true },
    { to: "/leaderboard", icon: Trophy, label: "Rank", mobileOnly: false, requiresAuth: true },
    { to: `/users/${username}`, icon: User, label: "Profile", mobileOnly: false, requiresAuth: true, isProfile: true },
  ];

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {navLinks.map((link) => {
            if (link.requiresAuth && !user) return null;
            if (link.isProfile && !username) return null;

            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
                  }`
                }
              >
                <Icon size={24} />
                <span className="text-[10px] mt-1 font-medium">{link.label}</span>
              </NavLink>
            );
          })}

          <button
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center w-full h-full text-slate-500 dark:text-slate-400"
          >
            {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
            <span className="text-[10px] mt-1 font-medium">Theme</span>
          </button>

          {user && (
            <button
              onClick={() => signOut(auth)}
              className="flex flex-col items-center justify-center w-full h-full text-slate-500 dark:text-slate-400"
            >
              <LogOut size={24} />
              <span className="text-[10px] mt-1 font-medium">Exit</span>
            </button>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 z-50 w-screen bg-white/70 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-1.5">
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
                    `text-sm transition-all duration-200 h-11 px-4 min-w-[5.5rem] justify-center rounded-xl inline-flex items-center ${isActive
                      ? "text-slate-900 dark:text-slate-100 font-bold hover:text-slate-900 dark:hover:text-slate-100 dark:hover:bg-slate-800/40"
                      : "text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 dark:hover:bg-slate-800/40"
                    }`
                  }
                >
                  Home
                </NavLink>
                <NavLink
                  to="/quizzes/create"
                  className={({ isActive }) =>
                    `text-sm transition-all duration-200 h-11 px-4 min-w-[7.5rem] justify-center rounded-xl inline-flex items-center ${isActive
                      ? "text-slate-900 dark:text-slate-100 font-bold hover:text-slate-900 dark:hover:text-slate-100 dark:hover:bg-slate-800/40"
                      : "text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 dark:hover:bg-slate-800/40"
                    }`
                  }
                >
                  Create Quiz
                </NavLink>
                {user && (
                  <NavLink
                    to="/friends"
                    className={({ isActive }) =>
                      `text-sm transition-all duration-200 h-11 px-4 min-w-[6.5rem] justify-center rounded-xl inline-flex items-center ${isActive
                        ? "text-slate-900 dark:text-slate-100 font-bold hover:text-slate-900 dark:hover:text-slate-100 dark:hover:bg-slate-800/40"
                        : "text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 dark:hover:bg-slate-800/40"
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
                      `text-sm transition-all duration-200 h-11 px-4 min-w-[8.5rem] justify-center rounded-xl inline-flex items-center ${isActive
                        ? "text-slate-900 dark:text-slate-100 font-bold hover:text-slate-900 dark:hover:text-slate-100 dark:hover:bg-slate-800/40"
                        : "text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 dark:hover:bg-slate-800/40"
                      }`
                    }
                  >
                    Leaderboard
                  </NavLink>
                )}
              </>
            )}
          </div>

          <div className="flex-1 flex justify-center px-4">
            {user && !isAccountLocked && <UserSearchBar excludeUsername={username} />}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <button
                type="button"
                onClick={toggleTheme}
                className="h-10 w-10 inline-flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50 transition-colors"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            {user && username && (
              <NavLink
                to={`/users/${username}`}
                className={({ isActive }) =>
                  `text-sm transition-all duration-200 h-11 px-4 min-w-[6.5rem] justify-center rounded-xl inline-flex items-center ${isActive
                    ? "text-slate-900 dark:text-slate-100 font-bold hover:text-slate-900 dark:hover:text-slate-100 dark:hover:bg-slate-800/40"
                    : "text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 dark:hover:bg-slate-800/40"
                  }`
                }
              >
                {profileLabel}
              </NavLink>
            )}
            {user && (
              <button
                onClick={() => signOut(auth)}
                className="bg-slate-800 dark:bg-slate-900 text-white dark:text-slate-100 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors hover:bg-slate-700 dark:hover:bg-slate-700"
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
