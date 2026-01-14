import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "./navBar";
import { useAuth } from "../hooks/useAuth";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile";
import { useUser } from "../hooks/useUser";
import UserSearchBar from "./UserSearchBar";

function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuth();
    const isMobile = useIsMobile();
    const { accountStatus, accountUsername, refreshUser } = useUser();
    const [statusRefreshKey, setStatusRefreshKey] = useState(0);

    const hideNavbar = location.pathname === "/login" || location.pathname === "/signup";
    const isQuizEditor = location.pathname === "/quizzes/create"
        || (location.pathname.startsWith("/quiz/") && location.pathname.endsWith("/edit"));

    useLayoutEffect(() => {
        const root = document.getElementById("root");
        if (root) {
            root.scrollTop = 0;
            root.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [location.key]);

    useEffect(() => {
        if (!user) return;
        refreshUser();
    }, [user, location.pathname, statusRefreshKey, refreshUser]);

    useEffect(() => {
        function handleStatusChange() {
            setStatusRefreshKey((value) => value + 1);
        }
        window.addEventListener("account-status-changed", handleStatusChange);
        return () => window.removeEventListener("account-status-changed", handleStatusChange);
    }, []);

    useEffect(() => {
        if (accountStatus !== "pending_deletion" || !accountUsername) return;
        const profilePath = `/users/${accountUsername}`;
        if (location.pathname !== profilePath) {
            navigate(profilePath, { replace: true });
        }
    }, [accountStatus, accountUsername, location.pathname, navigate]);

    return (
        <div className={`flex flex-col min-h-screen ${isMobile ? 'pb-16' : 'pt-16'}`}>
            {isMobile && !hideNavbar && !isQuizEditor && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800/80 pt-[env(safe-area-inset-top)]">
                    <div className="max-w-7xl mx-auto px-4 py-2">
                        <UserSearchBar excludeUsername={accountUsername} />
                    </div>
                </div>
            )}
            {!hideNavbar && <NavBar accountStatus={accountStatus} accountUsername={accountUsername} />}
            <main className="flex-1"><Outlet /></main>
        </div>
    );
}
export default Layout;
