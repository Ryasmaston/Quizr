import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "./navBar";
import { useAuth } from "../hooks/useAuth";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile";
import { useUser } from "../hooks/useUser";

function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuth();
    const isMobile = useIsMobile();
    const { accountStatus, accountUsername, refreshUser } = useUser();
    const [statusRefreshKey, setStatusRefreshKey] = useState(0);

    const hideNavbar = location.pathname === "/login" || location.pathname === "/signup";

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
            {!hideNavbar && <NavBar accountStatus={accountStatus} accountUsername={accountUsername} />}
            <main className="flex-1"><Outlet /></main>
        </div>
    );
}
export default Layout;
