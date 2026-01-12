import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "./navBar";
import { useAuth } from "../hooks/useAuth";
import { Outlet } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useIsMobile } from "../hooks/useIsMobile";

function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuth();
    const isMobile = useIsMobile();
    const [accountStatus, setAccountStatus] = useState(null);
    const [accountUsername, setAccountUsername] = useState(null);
    const [statusRefreshKey, setStatusRefreshKey] = useState(0);

    const hideNavbar = location.pathname === "/login" || location.pathname === "/signup";

    useEffect(() => {
        let mounted = true;
        async function loadStatus() {
            if (!user) {
                if (!mounted) return;
                setAccountStatus(null);
                setAccountUsername(null);
                return;
            }
            try {
                const res = await apiFetch("/me");
                const body = await res.json();
                if (!mounted) return;
                // Status can be in different locations depending on the API response
                setAccountStatus(body.user?.user_data?.status || body.user?.status || "active");
                setAccountUsername(body.user?.user_data?.username || null);
            } catch (error) {
                if (!mounted) return;
                setAccountStatus(null);
                setAccountUsername(null);
            }
        }
        loadStatus();
        return () => { mounted = false };
    }, [user, location.pathname, statusRefreshKey]);

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
