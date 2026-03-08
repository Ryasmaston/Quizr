import { useEffect, useState, useRef } from "react";
import { apiFetch } from "../services/api";
import { auth } from "../services/firebase";
import { authReady } from "../services/authState";
import { onAuthStateChanged } from "firebase/auth";
import { ThemeContext } from "../context/ThemeContext";

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Initialize from localStorage or default to light
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return "light";
  });
  const [isLoading, setIsLoading] = useState(true);

  const [isPendingSave, setIsPendingSave] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    // Set loading to false after initial theme is applied
    setIsLoading(false);
  }, [theme]);

  // Load user's theme preference from API
  useEffect(() => {
    let mounted = true;

    const loadTheme = async () => {
      try {
        await authReady;
        if (!auth.currentUser) return;
        const res = await apiFetch("/me");
        if (res.ok) {
          const body = await res.json();
          const userTheme = body.user?.preferences?.theme;
          if (userTheme && userTheme !== "system") {
            if (!mounted) return;
            setTheme(userTheme);
            localStorage.setItem("theme", userTheme);
          } else {
            // New or logged-in users without a saved preference should default to light
            // instead of inheriting the previous user's local storage.
            if (!mounted) return;
            setTheme("light");
            localStorage.setItem("theme", "light");
          }
        }
      } catch (error) {
        console.error("Failed to load theme preference:", error);
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      // If the user logs out, clean up local storage and reset the theme immediately
      if (!user) {
        setTheme("light");
        localStorage.removeItem("theme");
        return;
      }
      loadTheme();
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Save theme to API with debounce
  const saveThemeToAPI = async (newTheme) => {
    try {
      await authReady;
      if (!auth.currentUser) return;
      const res = await apiFetch("/me/theme", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme: newTheme }),
      });

      if (!res.ok) {
        console.error("Failed to save theme preference");
      }
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    } finally {
      setIsPendingSave(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    
    // Update local state immediately
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set pending save state
    setIsPendingSave(true);
    
    // Save to API after 5 seconds
    saveTimeoutRef.current = setTimeout(() => {
      saveThemeToAPI(newTheme);
    }, 5000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isPendingSave, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};
