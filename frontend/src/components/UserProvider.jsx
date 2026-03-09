import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../services/api";
import { UserContext } from "../context/UserContext";
import { useAuth } from "../hooks/useAuth";
import { isSigningUp } from "../services/signupGate";

export const UserProvider = ({ children }) => {
  const authUser = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [favouriteIds, setFavouriteIds] = useState([]);
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountUsername, setAccountUsername] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const resetUserState = useCallback(() => {
    setUserProfile(null);
    setFavouriteIds([]);
    setAccountStatus(null);
    setAccountUsername(null);
    setCurrentUserId(null);
    setIsLoading(false);
    hasLoadedRef.current = false;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!authUser || isSigningUp()) {
      if (!authUser) resetUserState();
      return;
    }
    // Only show spinner on initial load, not background re-fetches
    if (!hasLoadedRef.current) setIsLoading(true);
    try {
      const res = await apiFetch("/me");
      const body = await res.json();
      const user = body.user || null;
      const favs = Array.isArray(user?.preferences?.favourites)
        ? user.preferences.favourites
        : Array.isArray(user?.favourites)
          ? user.favourites
          : [];
      setUserProfile(user);
      setFavouriteIds(favs.map((q) => (typeof q === "string" ? q : q._id)));
      setAccountStatus(user?.user_data?.status || user?.status || "active");
      setAccountUsername(user?.user_data?.username || null);
      setCurrentUserId(user?._id || null);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error("Failed to load user", error);
      resetUserState();
    } finally {
      setIsLoading(false);
    }
  }, [authUser, resetUserState]);

  useEffect(() => {
    if (!authUser) {
      resetUserState();
      return;
    }
    refreshUser();
  }, [authUser, refreshUser, resetUserState]);

  const value = useMemo(() => ({
    userProfile,
    favouriteIds,
    setFavouriteIds,
    accountStatus,
    accountUsername,
    currentUserId,
    refreshUser,
    isLoading
  }), [
    userProfile,
    favouriteIds,
    accountStatus,
    accountUsername,
    currentUserId,
    refreshUser,
    isLoading
  ]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
