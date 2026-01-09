// this helper file fetches the user token ID from the Firebase and attaches it to any protected route request
import { auth } from "./firebase";
import { authReady } from "./authState";

const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
const NORMALIZED_BASE = RAW_BACKEND_URL.replace(/\/$/, "");
const BACKEND_URL = NORMALIZED_BASE
    ? (NORMALIZED_BASE.endsWith("/api") ? NORMALIZED_BASE : `${NORMALIZED_BASE}/api`)
    : "/api";

export async function apiFetch(path, options = {}) {
    // Wait for Firebase auth to initialize (authReady resolves on first state change)
    await authReady;
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "/login";
        throw new Error("Not authenticated");
    }
    const token = await user.getIdToken();

    const res = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) {
        window.location.href = "/login";
        throw new Error("Unauthorized");
    }
    return res;
}
