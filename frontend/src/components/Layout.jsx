import { useLocation } from "react-router-dom";
import NavBar from "./navBar";
import { Outlet } from "react-router-dom";

function Layout () {
    const location = useLocation();

    const hideNavbar = location.pathname === "/login" || location.pathname === "/signup";


    return (
        <>
        {!hideNavbar && <NavBar />}
        <main><Outlet /></main>
        </>
);
}
export default Layout;