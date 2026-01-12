import { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../services/firebase";
import { getUserByUsername, cancelAccountDeletion, executeAccountDeletion } from '../../services/users';
import { apiFetch } from "../../services/api";
import { getPendingRequests, sendFriendRequest, getFriends, removeRequest, acceptFriendRequest } from '../../services/friends';
import { removeFavourite, toggleFavourite } from "../../services/favourites";
import { QuizStats } from '../../components/quizStats'

export default function ProfilePage() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [takenQuizzes, setTakenQuizzes] = useState([]);
  const [createdQuizzes, setCreatedQuizzes] = useState([]);
  const [myFavourites, setMyFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [myUsername, setMyUsername] = useState(null);
  const [accountStatus, setAccountStatus] = useState("loading");
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [deletionActionLoading, setDeletionActionLoading] = useState(false);
  const [deletionActionError, setDeletionActionError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [isFriend, setIsFriend] = useState(false);
  const [pendingSent, setPendingSent] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedQuizForStats, setSelectedQuizForStats] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [takenSortBy, setTakenSortBy] = useState("highest_score");
  const [takenSortDirection, setTakenSortDirection] = useState("desc");
  const avatarGradients = [
    "from-rose-300 to-pink-400 dark:from-rose-500/80 dark:to-pink-600/80",
    "from-sky-300 to-blue-400 dark:from-sky-500/80 dark:to-blue-600/80",
    "from-emerald-300 to-green-400 dark:from-emerald-500/80 dark:to-green-600/80",
    "from-orange-300 to-amber-400 dark:from-orange-500/80 dark:to-amber-600/80"
  ];
  const getAvatarGradient = (userId) => {
    const value = String(userId || "");
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % avatarGradients.length;
    }
    return avatarGradients[hash];
  };

  const returnTo = location.pathname;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setLoggedInUser(currentUser);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadMyProfile() {
      if (!loggedInUser) {
        setMyUserId(null);
        setMyUsername(null);
        setMyFavourites([]);
        setAccountStatus("active");
        setDeletionInfo(null);
        return;
      }
      try {
        const res = await apiFetch('/users/me');
        if (!mounted) return;
        const body = await res.json();
        setMyUserId(body.user?._id || null);
        setMyUsername(body.user?.user_data?.username || null);
        setAccountStatus(body.user?.user_data?.status || "active");
        setDeletionInfo(body.user?.user_data?.deletion || null);
        const favs = Array.isArray(body.user?.preferences?.favourites) ? body.user.preferences.favourites : [];
        setMyFavourites(favs);
      } catch (err) {
        setMyUserId(null);
        setMyUsername(null);
        setMyFavourites([]);
        setAccountStatus("active");
        setDeletionInfo(null);
      }
    }
    loadMyProfile();
    return () => { mounted = false };
  }, [loggedInUser]);

  const loadFriendState = useCallback(async () => {
    if (!loggedInUser || !profile || !myUserId || accountStatus === "loading") {
      setIsFriend(false);
      setPendingSent(false);
      setIncomingRequest(null);
      setFriendsLoading(false);
      return;
    }
    setFriendsLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getPendingRequests()
      ]);
      
      const friends = friendsData.friends || [];
      const requests = requestsData.requests || [];

      const isAlreadyFriend = Array.isArray(friends) && friends.some((f) => {
        const other = f.user1._id === myUserId ? f.user2 : f.user1;
        return other?._id === profile._id;
      });
      setIsFriend(isAlreadyFriend);
      
      setPendingSent(false);
      setIncomingRequest(null);
      
      const relevantRequest = Array.isArray(requests) && requests.find((r) => {
        const other = r.user1._id === myUserId ? r.user2 : r.user1;
        return other?._id === profile._id;
      });
      
      if (relevantRequest) {
        if (relevantRequest.user1._id === myUserId) {
          setPendingSent(true);
        } else {
          setIncomingRequest(relevantRequest);
        }
      }
    } catch (err) {
      console.error("Could not load friend status", err);
    } finally {
      setFriendsLoading(false);
    }
  }, [loggedInUser, profile, myUserId, accountStatus]);

  useEffect(() => {
    loadFriendState();
  }, [loadFriendState]);

  useEffect(() => {
    if (accountStatus !== "pending_deletion") return;
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, [accountStatus]);

  useEffect(() => {
    if (
      accountStatus === "pending_deletion" &&
      myUsername &&
      routeUsername &&
      routeUsername !== myUsername
    ) {
      navigate(`/users/${myUsername}`);
    }
  }, [accountStatus, myUsername, routeUsername, navigate]);

  useEffect(() => {
    let mounted = true;
    async function fetchProfileAndQuizzes() {
      if (loggedInUser && accountStatus === "loading") return;
      if (
        accountStatus === "pending_deletion" &&
        myUsername &&
        routeUsername &&
        routeUsername !== myUsername
      ) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const userProfile = await getUserByUsername(routeUsername);
        if (!mounted) return;
        setProfile(userProfile);

        const quizzesResponse = await apiFetch("/quizzes");
        const quizzesBody = await quizzesResponse.json();
        const userId = userProfile._id;
        const createdResponse = await apiFetch("/quizzes?created_by=" + userId);
        const createdBody = await createdResponse.json();
        setCreatedQuizzes(createdBody.quizzes || []);

        const quizzesWithUserAttempts = quizzesBody.quizzes
          .map((quiz) => {
            const attempts = Array.isArray(quiz.attempts) ? quiz.attempts : [];
            const userAttempts = attempts.filter(
              (attempt) => attempt.user_id.toString() === userId.toString()
            );
            if (userAttempts.length === 0) return null;
            const bestAttempt = userAttempts.reduce((best, attempt) => {
              if (!best) return attempt;
              if (attempt.correct > best.correct) return attempt;
              if (attempt.correct === best.correct) {
                const attemptTime = attempt.attempted_at ? new Date(attempt.attempted_at) : null;
                const bestTime = best.attempted_at ? new Date(best.attempted_at) : null;
                if (attemptTime && (!bestTime || attemptTime > bestTime)) return attempt;
              }
              return best;
            }, null);
            if (!bestAttempt) return null;
            return {
              _id: quiz._id,
              title: quiz.title,
              category: quiz.category,
              difficulty: quiz.difficulty,
              req_to_pass: quiz.req_to_pass,
              correct: bestAttempt.correct,
              attempted_at: bestAttempt.attempted_at,
              totalQuestions: quiz.questions.length,
            };
          })
          .filter(Boolean);
        setTakenQuizzes(quizzesWithUserAttempts);
      } catch (err) {
        if (!mounted) return;
        setError(err.message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    fetchProfileAndQuizzes();
    return () => {
      mounted = false;
    };
  }, [routeUsername, accountStatus, myUsername, loggedInUser]);

  async function handleSendRequest() {
    try {
      setSendingRequest(true);
      await sendFriendRequest(profile._id);
      await loadFriendState();
    } catch (err) {
      alert("Could not send request: " + (err.message || err));
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleAccept() {
    try {
      await acceptFriendRequest(incomingRequest._id);
      await loadFriendState();
    } catch (err) {
      alert("Could not accept: " + (err.message || err));
    }
  }

  async function handleRemove() {
    try {
      await removeRequest(profile._id);
      await loadFriendState();
    } catch (err) {
      alert("Could not remove: " + (err.message || err));
    }
  }

  async function handleRemoveFavourite(quizId) {
    const previous = myFavourites;
    setMyFavourites((prev) =>
      prev.filter((item) => {
        const itemId = typeof item === "string" ? item : item._id;
        return itemId !== quizId;
      })
    );
    setCreatedQuizzes((prev) =>
      prev.map((q) => {
        if (q._id === quizId) {
          const currentCount = q.favourited_count ?? (Array.isArray(q.favourites) ? q.favourites.length : (q.favouritesCount ?? 0));
          return { ...q, favourited_count: Math.max(0, currentCount - 1) };
        }
        return q;
      })
    );
    try {
      await removeFavourite(quizId);
    } catch (err) {
      console.error("Could not remove favourite", err);
      setMyFavourites(previous);
      setCreatedQuizzes((prev) =>
        prev.map((q) => {
          if (q._id === quizId) {
            const currentCount = q.favourited_count ?? (Array.isArray(q.favourites) ? q.favourites.length : (q.favouritesCount ?? 0));
            return { ...q, favourited_count: currentCount + 1 };
          }
          return q;
        })
      );
    }
  }

  async function handleToggleFavourite(quiz, isFavourited) {
    const quizId = quiz._id;
    const previous = myFavourites;
    setMyFavourites((prev) => {
      if (isFavourited) {
        return prev.filter((item) => {
          const itemId = typeof item === "string" ? item : item._id;
          return itemId !== quizId;
        });
      }
      return [...prev, quiz];
    });

    setCreatedQuizzes((prev) =>
      prev.map((q) => {
        if (q._id === quizId) {
          const currentCount = q.favourited_count ?? (Array.isArray(q.favourites) ? q.favourites.length : (q.favouritesCount ?? 0));
          return { ...q, favourited_count: isFavourited ? Math.max(0, currentCount - 1) : currentCount + 1 };
        }
        return q;
      })
    );

    try {
      await toggleFavourite(quizId, isFavourited);
    } catch (err) {
      console.error("Could not toggle favourite", err);
      setMyFavourites(previous);
      setCreatedQuizzes((prev) =>
        prev.map((q) => {
          if (q._id === quizId) {
            const currentCount = q.favourited_count ?? (Array.isArray(q.favourites) ? q.favourites.length : (q.favouritesCount ?? 0));
            return { ...q, favourited_count: isFavourited ? currentCount + 1 : Math.max(0, currentCount - 1) };
          }
          return q;
        })
      );
    }
  }

  async function handleViewStats(quizId) {
    try {
      const response = await apiFetch(`/quizzes/${quizId}`);
      const body = await response.json();
      setSelectedQuizForStats(body.quiz);
    } catch (err) {
      alert("Could not load quiz statistics: " + (err.message || err));
    }
  }

  async function handleDeleteQuiz() {
    if (!quizToDelete?._id) return;
    try {
      const response = await apiFetch(`/quizzes/${quizToDelete._id}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("Unable to delete quiz");
      }
      setCreatedQuizzes((prev) =>
        prev.filter((quiz) => quiz._id !== quizToDelete._id)
      );
      setMyFavourites((prev) =>
        prev.filter((item) => {
          const itemId = typeof item === "string" ? item : item._id;
          return itemId !== quizToDelete._id;
        })
      );
      setShowDeleteConfirm(false);
      setQuizToDelete(null);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCancelDeletion() {
    setDeletionActionError(null);
    setDeletionActionLoading(true);
    try {
      const result = await cancelAccountDeletion();
      setAccountStatus(result.user?.status || "active");
      setDeletionInfo(result.user?.deletion || null);
      window.dispatchEvent(new CustomEvent("account-status-changed"));
    } catch (err) {
      setDeletionActionError(err.message || "Failed to cancel deletion");
    } finally {
      setDeletionActionLoading(false);
    }
  }

  async function handleDeleteNow() {
    setDeletionActionError(null);
    const confirmed = window.confirm("Delete your account now? This cannot be undone.");
    if (!confirmed) return;
    setDeletionActionLoading(true);
    try {
      await executeAccountDeletion(deletionInfo?.mode);
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      setDeletionActionError(err.message || "Failed to delete account");
    } finally {
      setDeletionActionLoading(false);
    }
  }

  const isOwnProfile = myUserId && profile?._id && profile && myUserId === profile._id;
  const isAccountLocked = isOwnProfile && accountStatus === "pending_deletion";
  const deletionDeadline = deletionInfo?.scheduled_for ? new Date(deletionInfo.scheduled_for) : null;
  const remainingMs = deletionDeadline ? Math.max(0, deletionDeadline.getTime() - now) : 0;
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
  const remainingLabel = deletionDeadline
    ? remainingMs > 0
      ? `${remainingDays}d ${remainingHours}h`
      : "less than 1 hour"
    : "soon";
  const deletionModeLabel = deletionInfo?.mode === "preserve_quizzes"
    ? "Your quizzes will remain, with author shown as deleted user."
    : "Your quizzes and attempts will be deleted.";

  if (loading) {
    return (
      <>
        <div
          className="fixed inset-0"
          style={{
            backgroundColor: "var(--opal-bg-color)",
            backgroundImage: "var(--opal-backdrop-image)"
          }}
        ></div>
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="relative flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div
          className="fixed inset-0"
          style={{
            backgroundColor: "var(--opal-bg-color)",
            backgroundImage: "var(--opal-backdrop-image)"
          }}
        ></div>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-slate-200/80 max-w-md text-center shadow-sm">
            <div className="w-16 h-16 bg-rose-500/15 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-slate-800 mb-3">Error</h3>
            <p className="text-slate-600">{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <div
          className="fixed inset-0"
          style={{
            backgroundColor: "var(--opal-bg-color)",
            backgroundImage: "var(--opal-backdrop-image)"
          }}
        ></div>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-slate-200/80 max-w-md text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-slate-800 mb-3">User Not Found</h3>
            <p className="text-slate-600">The user you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </>
    );
  }

  const categoryColors = {
    art: "border-pink-400/40 bg-pink-500/20 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-400 hover:border-pink-200/80 hover:bg-pink-100/70 hover:text-pink-700 dark:hover:border-pink-400/50 dark:hover:bg-pink-500/20",
    history: "border-amber-400/40 bg-amber-500/20 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 hover:border-amber-200/80 hover:bg-amber-100/70 hover:text-amber-700 dark:hover:border-amber-400/50 dark:hover:bg-amber-500/20",
    music: "border-indigo-400/40 bg-indigo-500/20 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400 hover:border-indigo-200/80 hover:bg-indigo-100/70 hover:text-indigo-700 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-500/20",
    science: "border-emerald-400/40 bg-emerald-500/20 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 hover:border-emerald-200/80 hover:bg-emerald-100/70 hover:text-emerald-700 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-500/20",
    other: "border-slate-400/40 bg-slate-500/20 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400 hover:border-slate-200/80 hover:bg-slate-100/70 hover:text-slate-700 dark:hover:border-slate-400/50 dark:hover:bg-slate-500/20"
  };
  const categoryGradients = {
    art: {
      className: "from-pink-500 to-rose-500",
      hover: { primary: "236 72 153", secondary: "244 63 94" }
    },
    history: {
      className: "from-amber-500 to-orange-500",
      hover: { primary: "245 158 11", secondary: "249 115 22" }
    },
    music: {
      className: "from-purple-500 to-indigo-500",
      hover: { primary: "168 85 247", secondary: "99 102 241" }
    },
    science: {
      className: "from-blue-500 to-cyan-500",
      hover: { primary: "59 130 246", secondary: "6 182 212" }
    },
    other: {
      className: "from-gray-500 to-slate-500",
      hover: { primary: "107 114 128", secondary: "100 116 139" }
    }
  };
  const categoryStripeColors = {
    art: "bg-pink-500/15 text-pink-700 border-b border-pink-500/20 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800/40",
    history: "bg-amber-500/15 text-amber-700 border-b border-amber-500/20 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800/40",
    music: "bg-indigo-500/15 text-indigo-700 border-b border-indigo-500/20 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800/40",
    science: "bg-emerald-500/15 text-emerald-700 border-b border-emerald-500/20 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800/40",
    other: "bg-slate-500/15 text-slate-700 border-b border-slate-500/20 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800/40"
  };

  const categoryIcons = {
    art: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    ),
    history: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    ),
    music: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    ),
    science: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    ),
    other: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    )
  };
  const difficultyChips = {
    easy: {
      label: "Easy",
      className: "border-emerald-300/50 bg-emerald-400/25 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 hover:border-emerald-200/80 hover:bg-emerald-100/70 hover:text-emerald-700 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-500/20",
      icon: "/easy.svg"
    },
    medium: {
      label: "Medium",
      className: "border-amber-400/40 bg-amber-500/20 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 hover:border-amber-200/80 hover:bg-amber-100/70 hover:text-amber-700 dark:hover:border-amber-400/50 dark:hover:bg-amber-500/20",
      icon: "/medium.svg"
    },
    hard: {
      label: "Hard",
      className: "border-rose-400/40 bg-rose-500/20 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 hover:border-rose-200/80 hover:bg-rose-100/70 hover:text-rose-700 dark:hover:border-rose-400/50 dark:hover:bg-rose-500/20",
      icon: "/hard.svg"
    }
  };

  const handleCardMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty("--hover-x", `${x}%`);
    event.currentTarget.style.setProperty("--hover-y", `${y}%`);
  };

  const handleCardMouseLeave = (event) => {
    event.currentTarget.style.setProperty("--hover-x", "50%");
    event.currentTarget.style.setProperty("--hover-y", "50%");
  };

  const totalQuestions = takenQuizzes.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);
  const totalCorrect = takenQuizzes.reduce((sum, quiz) => sum + quiz.correct, 0);
  const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <>
      <div
        className="fixed inset-0"
        style={{
          backgroundColor: "var(--opal-bg-color)",
          backgroundImage: "var(--opal-backdrop-image)"
        }}
      ></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-amber-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-rose-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] -translate-x-1/2 -translate-y-1/2 bg-sky-200/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>
      <div className="relative min-h-screen pt-16 sm:pt-20">
        <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
          <div className="mb-6 sm:mb-8">
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 relative overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-[30%] overflow-hidden border-2 border-slate-200/80 bg-gradient-to-br ${getAvatarGradient(profile._id)} flex items-center justify-center`}>
                    {profile.user_data?.profile_pic ? (
                      <img src={profile.user_data.profile_pic} alt={profile.user_data.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-3xl sm:text-4xl font-semibold">
                        {profile.user_data?.username?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-2">{profile.user_data?.username}</h1>
                  {profile.user_data?.created_at && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 text-sm mb-4">
                      {isOwnProfile && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.45a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.45a1 1 0 00-1.175 0l-3.37 2.45c-.784.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.963 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                          </svg>
                          You
                        </span>
                      )}
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Joined {new Date(profile.user_data.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  )}

                  {loggedInUser && (
                    <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                      {isOwnProfile ? (
                        isAccountLocked ? (
                          <span className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-semibold border border-slate-200/80">Settings Locked</span>
                        ) : (
                          <a href="/settings" className="bg-slate-800 dark:bg-blue-950/60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors hover:bg-slate-700 dark:hover:bg-blue-900/60 dark:border dark:border-blue-400/30 hover:text-white visited:text-white focus:text-white active:text-white flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                          </a>
                        )
                      ) : friendsLoading ? (
                        <button disabled className="px-6 py-2.5 rounded-xl bg-white/70 text-slate-600 font-semibold border border-slate-200/80">Loading...</button>
                      ) : isFriend ? (
                        <div className="flex items-center gap-3">
                          <span className="px-4 py-2 text-sm rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Friends
                          </span>
                          <button onClick={handleRemove} className="px-4 py-2 text-sm rounded-xl bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/40 text-rose-700 dark:text-rose-400 font-semibold transition-colors border border-rose-200/50 dark:border-rose-800/50">Remove</button>
                        </div>
                      ) : pendingSent ? (
                        <div className="flex items-center gap-3">
                          <span className="px-4 py-2 text-sm rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200/50 dark:border-amber-800/50 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pending
                          </span>
                          <button onClick={handleRemove} className="px-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition-colors border border-slate-200/80 dark:border-slate-700">Cancel Request</button>
                        </div>
                      ) : incomingRequest ? (
                        <div className="flex items-center gap-3">
                          <button onClick={handleAccept} className="px-4 py-2 text-sm rounded-xl bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 text-emerald-800 dark:text-emerald-400 font-semibold transition-colors border border-emerald-200/50 dark:border-emerald-800/50">Accept Request</button>
                          <button onClick={handleRemove} className="px-4 py-2 text-sm rounded-xl bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/40 text-rose-800 dark:text-rose-400 font-semibold transition-colors border border-rose-200/50 dark:border-rose-800/50">Decline</button>
                        </div>
                      ) : (
                        <button onClick={handleSendRequest} disabled={sendingRequest} className="px-4 py-2 text-sm rounded-xl bg-slate-800 dark:bg-blue-950/60 text-white font-semibold hover:bg-slate-700 dark:hover:bg-blue-900/60 dark:border dark:border-blue-400/30 transition-colors disabled:opacity-50">{sendingRequest ? "Sending..." : "Add Friend"}</button>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-[32rem] mt-4 sm:mt-0 sm:ml-6">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-4">
                    {(() => {
                      const favsReceived = createdQuizzes.reduce((sum, q) => {
                        const v = q.favourited_count ?? (Array.isArray(q.favourites) ? q.favourites.length : (q.favouritesCount ?? 0));
                        return sum + (v || 0);
                      }, 0);
                      const attemptsOnTheirQuizzes = createdQuizzes.reduce((sum, q) => {
                        const v = Array.isArray(q.attempts) ? q.attempts.length : (q.attemptsCount ?? 0);
                        return sum + (v || 0);
                      }, 0);
                      const myTotalAttempts = takenQuizzes.length;
                      const myAvgScore = averageScore;
                      const quizzesTakenCount = takenQuizzes.length;
                      const quizzesCreatedCount = createdQuizzes.length;
                      // Column-major order: first column top->bottom, then second column
                      const statsList = [
                        { label: "Stars on my quizzes", value: favsReceived },
                        { label: "My attempts", value: myTotalAttempts },
                        { label: "Attempts on my quizzes", value: attemptsOnTheirQuizzes },
                        { label: "Quizzes taken", value: quizzesTakenCount },
                        { label: "Quizzes created", value: quizzesCreatedCount },
                        { label: "My average score", value: `${myAvgScore}%` }
                      ];
                      const total = statsList.length;
                      return statsList.map((s, idx) => (
                        <div
                          key={s.label + s.value}
                          className={`flex items-end justify-between py-1 px-1 text-sm ${idx < total - 2 ? 'border-b border-slate-200/80 dark:border-slate-800/90' : ''}`}
                        >
                          <div className="text-sm text-slate-500 flex-1 pr-1 text-left">{s.label}</div>
                          <div className="text-sm font-semibold text-slate-800 w-14 text-right">{s.value}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {isAccountLocked && (
            <div className="mb-6 sm:mb-8 bg-amber-100/70 border border-amber-200/80 rounded-3xl p-6 sm:p-8 backdrop-blur-lg shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-amber-800 mb-2">
                    Account scheduled for deletion
                  </h2>
                  <p className="text-amber-700 mb-2">
                    Deletion in {remainingLabel}. {deletionModeLabel}
                  </p>
                  {deletionInfo?.scheduled_for && (
                    <p className="text-amber-700/80 text-sm">
                      Scheduled for {new Date(deletionInfo.scheduled_for).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  )}
                  {deletionActionError && (
                    <p className="text-rose-700 mt-3">{deletionActionError}</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleCancelDeletion}
                    disabled={deletionActionLoading}
                    className="px-5 py-2.5 rounded-xl bg-white/80 text-slate-700 font-semibold border border-amber-200/80 hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {deletionActionLoading ? "Working..." : "Cancel Deletion"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteNow}
                    disabled={deletionActionLoading}
                    className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50"
                  >
                    Delete Now
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 mb-6 sm:mb-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800">Quizzes created</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 h-[38px]">
                  {['date', 'stars'].map((option) => {
                    const isActive = sortBy === option;
                    const isAsc = isActive && sortDirection === "asc";
                    return (
                      <button
                        key={option}
                        disabled={isAccountLocked}
                        onClick={() => {
                          if (isActive) {
                            setSortDirection(prev => prev === "desc" ? "asc" : "desc");
                          } else {
                            setSortBy(option);
                            setSortDirection("desc");
                          }
                        }}
                        className={`sorting-button ${isActive ? 'isActive' : ''} w-20 py-1.5 rounded-xl text-xs font-semibold transition-all outline-none focus:outline-none focus:ring-0 active:scale-95 select-none flex items-center justify-center gap-1 ${isAccountLocked
                          ? "opacity-50 text-slate-400"
                          : isActive
                            ? 'bg-white dark:bg-slate-500 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-400'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {option === 'date' ? (isAsc ? 'Oldest' : 'Newest') : 'Stars'}
                        <span className="inline-flex w-3 justify-center">
                          {isActive ? (
                            isAsc ? (
                              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 5l4 6H6l4-6z" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 15l-4-6h8l-4 6z" />
                              </svg>
                            )
                          ) : (
                            <span className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className={`px-4 py-2.5 rounded-2xl border flex items-center h-[38px] cursor-default ${isAccountLocked ? 'bg-slate-50/80 border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-800/40' : 'bg-slate-100/80 border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-700/50'}`}>
                  <span className={`font-semibold text-xs whitespace-nowrap leading-none ${isAccountLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {createdQuizzes.length} quiz{createdQuizzes.length !== 1 ? 'zes' : ''}
                  </span>
                </div>
              </div>
            </div>
            {createdQuizzes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">No Quizzes Created</h3>
                <p className="text-slate-600">
                  {isOwnProfile ? "Create your first quiz to see it here" : `${profile.user_data.username} hasn't created any quizzes yet`}
                </p>
                {isOwnProfile && !isAccountLocked && (
                  <div className="mt-6">
                    <Link
                      to="/quizzes/create"
                      state={{ returnTo: location.pathname }}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                      Create a quiz
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...createdQuizzes]
                  .sort((a, b) => {
                    if (sortBy === "stars") {
                      const getCount = (q) =>
                        q.favourited_count ??
                        (Array.isArray(q.favourites) ? q.favourites.length : q.favouritesCount ?? 0);
                      return sortDirection === "desc" ? getCount(b) - getCount(a) : getCount(a) - getCount(b);
                    }
                    if (sortBy === "date") {
                      return sortDirection === "desc" ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at);
                    }
                    return 0;
                  })
                  .map((quiz) => {
                    const totalAttempts = quiz.attempts?.length || 0;
                    const passes = quiz.attempts?.filter(attempt => {
                      const percentage = (attempt.correct / quiz.questions.length) * 100;
                      return percentage >= 60;
                    }).length || 0;
                    const passRate = totalAttempts > 0 ? Math.round((passes / totalAttempts) * 100) : 0;
                    const avgScore = totalAttempts > 0
                      ? Math.round((quiz.attempts.reduce((sum, a) => sum + a.correct, 0) / totalAttempts / quiz.questions.length) * 100)
                      : 0;
                    const titleLength = quiz.title?.length || 0;
                    const titleSizeClass = titleLength > 60
                      ? "text-sm"
                      : titleLength > 36
                        ? "text-base"
                        : "text-lg";

                    const totalAnswers = quiz.questions?.reduce((sum, q) => sum + (q.answers?.length || 0), 0) || 0;
                    const answersPerQuestion = quiz.questions?.length > 0
                      ? (totalAnswers / quiz.questions.length).toFixed(1).replace(/\.0$/, '')
                      : 0;
                    return (
                      <div
                        key={quiz._id}
                        onClick={() => {
                          if (isAccountLocked) return;
                          navigate(`/quiz/${quiz._id}`, { state: { returnTo } });
                        }}
                        onMouseMove={isAccountLocked ? undefined : handleCardMouseMove}
                        onMouseLeave={isAccountLocked ? undefined : handleCardMouseLeave}
                        className={`group relative bg-white/80 backdrop-blur rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transform transition-all duration-300 ease-out ${isAccountLocked
                          ? "opacity-60"
                          : "hover:border-slate-300 hover:bg-white hover:scale-[1.012] cursor-pointer"
                          }`}
                        style={{ "--shadow-color": (categoryGradients[quiz.category] || categoryGradients.other).hover.primary }}
                      >
                        <div
                          className={`pointer-events-none absolute inset-0 transition-opacity blur-2xl ${isAccountLocked ? "opacity-0" : "opacity-0 group-hover:opacity-45"}`}
                          style={{
                            background: `
                            radial-gradient(300px 220px at var(--hover-x, 50%) 110%, rgb(${(categoryGradients[quiz.category] || categoryGradients.other).hover.primary} / 0.4), transparent 70%),
                            radial-gradient(260px 200px at -6% var(--hover-y, 50%), rgb(${(categoryGradients[quiz.category] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%),
                            radial-gradient(260px 200px at 106% var(--hover-y, 50%), rgb(${(categoryGradients[quiz.category] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%)
                          `
                          }}
                        ></div>
                        <div className="relative z-10">
                          <div className={`flex items-center justify-between px-4 py-2 ${categoryStripeColors[quiz.category] || categoryStripeColors.other}`}>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {categoryIcons[quiz.category] || categoryIcons.other}
                              </svg>
                              <span className="text-xs font-semibold capitalize">{quiz.category}</span>
                            </div>
                            <span className="text-xs font-semibold">
                              {quiz.questions.length} Question{quiz.questions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="px-6 pt-4 pb-3">
                            <div className="flex items-center justify-between mb-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all duration-200 ease-in-out ${difficultyChips[quiz.difficulty || "medium"].className}`}>
                                <span
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  style={{
                                    backgroundColor: "currentColor",
                                    maskImage: `url(${difficultyChips[quiz.difficulty || "medium"].icon})`,
                                    WebkitMaskImage: `url(${difficultyChips[quiz.difficulty || "medium"].icon})`,
                                    maskRepeat: "no-repeat",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskPosition: "center",
                                    WebkitMaskPosition: "center",
                                    maskSize: "contain",
                                    WebkitMaskSize: "contain"
                                  }}
                                ></span>
                                <span className="capitalize">{quiz.difficulty || "medium"}</span>
                              </span>
                              {isOwnProfile && !isAccountLocked && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isFavourited = myFavourites.some((item) => {
                                        const itemId = typeof item === "string" ? item : item._id;
                                        return itemId === quiz._id;
                                      });
                                      handleToggleFavourite(quiz, isFavourited);
                                    }}
                                    className="h-10 px-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 backdrop-blur text-slate-500 dark:text-slate-400 transition-all duration-100 ease-out hover:text-amber-500 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-slate-700/80 active:scale-95 flex items-center gap-2"
                                    aria-label="Toggle favourite"
                                    title="Toggle favourite"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4"
                                      fill={myFavourites.some((item) => {
                                        const itemId = typeof item === "string" ? item : item._id;
                                        return itemId === quiz._id;
                                      }) ? "currentColor" : "none"}
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M12 3l2.7 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.5 20.4l1.1-6.3L3 9.6l6.3-.9L12 3Z" />
                                    </svg>
                                    <span className="text-sm font-semibold">
                                      {quiz.favourited_count ?? (Array.isArray(quiz.favourites) ? quiz.favourites.length : (quiz.favouritesCount ?? 0))}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQuizToDelete(quiz);
                                      setShowDeleteConfirm(true);
                                    }}
                                    className="h-10 w-10 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 backdrop-blur text-rose-500 dark:text-rose-400 transition-all duration-100 ease-out hover:bg-rose-100/70 dark:hover:bg-rose-500 dark:hover:text-white active:scale-95"
                                    aria-label="Delete quiz"
                                    title="Delete quiz"
                                  >
                                    <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="mb-3 h-16 w-full">
                              <h3
                                className={`${titleSizeClass} font-semibold text-slate-800 transition-colors line-clamp-2 text-center h-full w-full flex items-center justify-center`}
                              >
                                {quiz.title}
                              </h3>
                            </div>
                            <div className="mb-3 text-xs text-slate-600 dark:text-slate-400 divide-y divide-slate-200/80 dark:divide-slate-800/90">
                              <div className="flex items-center justify-between py-2">
                                <span>Answers per question</span>
                                <span className="font-semibold text-slate-800">{answersPerQuestion}</span>
                              </div>
                              <div className="flex items-center justify-between py-2">
                                <span>Attempts</span>
                                <span className="font-semibold text-slate-800">{totalAttempts}</span>
                              </div>
                              <div className="flex items-center justify-between py-2">
                                <span>Pass Rate</span>
                                <span className="font-semibold text-slate-800">{passRate}%</span>
                              </div>
                              <div className="flex items-center justify-between py-2">
                                <span>Avg Score</span>
                                <span className="font-semibold text-slate-800">{avgScore}%</span>
                              </div>
                            </div>
                            <div className={`grid gap-2 ${isOwnProfile ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                              {isOwnProfile && !isAccountLocked && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/quiz/${quiz._id}/edit`, {
                                      state: { from: "profile", returnTo: `/users/${routeUsername}` }
                                    });
                                  }}
                                  className="w-full px-4 py-2.5 bg-white/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-slate-700 dark:text-slate-200 text-sm font-bold transition-all duration-100 ease-out hover:bg-slate-100/80 dark:hover:bg-slate-700/50 active:scale-95 flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487a2 2 0 112.828 2.828L8.828 18.175a4 4 0 01-1.414.944l-3.536 1.178 1.178-3.536a4 4 0 01.944-1.414L16.862 4.487z" />
                                  </svg>
                                  Edit Quiz
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isAccountLocked) return;
                                  handleViewStats(quiz._id);
                                }}
                                disabled={isAccountLocked}
                                className={`w-full px-4 py-2.5 bg-white/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-slate-700 dark:text-slate-200 text-sm font-bold transition-all duration-100 ease-out flex items-center justify-center gap-2 ${isAccountLocked ? "opacity-50" : "hover:bg-slate-100/80 dark:hover:bg-slate-700/50 active:scale-95"
                                  }`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                View Stats
                              </button>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-500 dark:group-hover:text-white/80">
                              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>
                                Created {new Date(quiz.created_at).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {isOwnProfile && (
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 mb-6 sm:mb-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800">Favourites</h2>
                <div className={`px-4 py-2.5 rounded-2xl border flex items-center h-[38px] cursor-default ${isAccountLocked ? 'bg-slate-50/80 border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-800/40' : 'bg-slate-100/80 border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-700/50'}`}>
                  <span className={`font-semibold text-xs whitespace-nowrap leading-none ${isAccountLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {myFavourites.length} quiz{myFavourites.length !== 1 ? 'zes' : ''}
                  </span>
                </div>
              </div>
              {myFavourites.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l2.7 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.5 20.4l1.1-6.3L3 9.6l6.3-.9L12 3Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">No Favourites Yet</h3>
                  <p className="text-slate-600 text-sm">Star a quiz to save it here</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {myFavourites.map((quiz) => {
                    const quizId = typeof quiz === "string" ? quiz : quiz._id;
                    const quizTitle = typeof quiz === "string" ? "Quiz" : quiz.title;
                    const quizCategory = typeof quiz === "string" ? null : quiz.category;
                    const creatorName = typeof quiz === "string" ? null : quiz.created_by?.user_data?.username;
                    const creatorAuthId = typeof quiz === "string" ? null : quiz.created_by?.authId;
                    const creatorId = typeof quiz === "string" ? null : quiz.created_by?._id;
                    const isMyOwnQuiz = creatorId && myUserId && creatorId.toString() === myUserId.toString();
                    const creatorIsDeleted = creatorAuthId === "deleted-user"
                      || creatorName === "__deleted__"
                      || creatorName === "Deleted user";
                    const difficultyKey = difficultyChips[quiz?.difficulty] ? quiz.difficulty : "medium";
                    const difficulty = difficultyChips[difficultyKey];
                    const questionCount = typeof quiz === "string" ? 0 : quiz?.questions?.length || 0;
                    const passThreshold = typeof quiz === "string" ? null : quiz?.req_to_pass;
                    const passPercent = questionCount > 0 && typeof passThreshold === "number"
                      ? Math.round((passThreshold / questionCount) * 100)
                      : null;
                    const allowsMultiple = typeof quiz === "string" ? null : quiz?.allow_multiple_correct;
                    const isQuizLocked = typeof quiz === "string" ? null : quiz?.lock_answers;
                    const cardContent = (
                      <>
                        <div className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                              <h3 className="text-base font-semibold text-slate-800 truncate">{quizTitle}</h3>
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (isAccountLocked) return;
                                handleRemoveFavourite(quizId);
                              }}
                              disabled={isAccountLocked}
                              className={`px-3 py-1.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 backdrop-blur text-rose-600 dark:text-rose-400 text-xs font-bold transition-all duration-100 ease-out ${isAccountLocked ? "opacity-50" : "hover:bg-rose-100/80 dark:hover:bg-rose-900/50 active:scale-95"}`}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 ease-in-out ${categoryColors[quizCategory] || categoryColors.other}`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {categoryIcons[quizCategory] || categoryIcons.other}
                              </svg>
                              <span className="capitalize">{quizCategory || "other"}</span>
                            </div>
                            <div className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all duration-200 ease-in-out ${difficulty.className}`}>
                              <span
                                aria-hidden="true"
                                className="h-4 w-4"
                                style={{
                                  backgroundColor: "currentColor",
                                  maskImage: `url(${difficulty.icon})`,
                                  WebkitMaskImage: `url(${difficulty.icon})`,
                                  maskRepeat: "no-repeat",
                                  WebkitMaskRepeat: "no-repeat",
                                  maskPosition: "center",
                                  WebkitMaskPosition: "center",
                                  maskSize: "contain",
                                  WebkitMaskSize: "contain"
                                }}
                              ></span>
                              <span>{difficulty.label}</span>
                            </div>
                            {creatorName && (
                              creatorIsDeleted || isAccountLocked || isMyOwnQuiz ? (
                                <span className={`rounded-full px-3 py-1.5 text-xs font-bold border border-slate-200/80 bg-white/70 ${creatorIsDeleted ? "text-slate-400" : "text-slate-600 dark:group-hover:text-white"}`}>
                                  {isMyOwnQuiz ? 'Created by you' : `Created by ${creatorIsDeleted ? "deleted user" : creatorName}`}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    navigate(`/users/${creatorName}`);
                                  }}
                                  className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 dark:group-hover:text-white transition-all hover:bg-white/20 bg-white/70 border border-slate-200/80 active:scale-95"
                                >
                                  Created by {creatorName}
                                </button>
                              )
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:group-hover:text-white/80">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-100/70 px-2.5 py-1">
                              <span className="font-semibold text-slate-800">{questionCount}</span>
                              <span className="text-slate-500">Questions</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-100/70 px-2.5 py-1">
                              <span className="font-semibold text-slate-800">
                                {passPercent !== null ? `${passPercent}%` : "--"}
                              </span>
                              <span className="text-slate-500">
                                to pass
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-100/70 px-2.5 py-1">
                              <span className="font-semibold text-slate-800">{allowsMultiple ? "Multi" : "Single"}</span>
                              <span className="text-slate-600">Correct</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-100/70 px-2.5 py-1">
                              <span className="font-semibold text-slate-800">{isQuizLocked ? "Locked" : "Changeable"}</span>
                              <span className="text-slate-600">Answers</span>
                            </span>
                          </div>
                        </div>
                      </>
                    );

                    const cardClass = `group relative block bg-white/80 backdrop-blur rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm transition-all duration-300 ease-out ${isAccountLocked ? "opacity-60" : "hover:border-slate-300 hover:bg-white hover:scale-[1.012]"
                      }`;

                    return isAccountLocked ? (
                      <div
                        key={quizId}
                        className={cardClass}
                        style={{ "--shadow-color": (categoryGradients[quizCategory] || categoryGradients.other).hover.primary }}
                      >
                        <div
                          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity blur-2xl"
                          style={{
                            background: `
                            radial-gradient(300px 220px at var(--hover-x, 50%) 110%, rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.primary} / 0.4), transparent 70%),
                            radial-gradient(260px 200px at -6% var(--hover-y, 50%), rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%),
                            radial-gradient(260px 200px at 106% var(--hover-y, 50%), rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%)
                          `
                          }}
                        ></div>
                        <div className="relative z-10">
                          {cardContent}
                        </div>
                      </div>
                    ) : (
                      <Link
                        key={quizId}
                        to={`/quiz/${quizId}`}
                        state={{ returnTo }}
                        className={cardClass}
                        onMouseMove={handleCardMouseMove}
                        onMouseLeave={handleCardMouseLeave}
                        style={{ "--shadow-color": (categoryGradients[quizCategory] || categoryGradients.other).hover.primary }}
                      >
                        <div
                          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-45 transition-opacity blur-2xl"
                          style={{
                            background: `
                            radial-gradient(300px 220px at var(--hover-x, 50%) 110%, rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.primary} / 0.4), transparent 70%),
                            radial-gradient(260px 200px at -6% var(--hover-y, 50%), rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%),
                            radial-gradient(260px 200px at 106% var(--hover-y, 50%), rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%)
                          `
                          }}
                        ></div>
                        <div className="relative z-10">
                          {cardContent}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="w-full">
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 mb-6 sm:mb-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800">Quizzes Taken</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 h-[38px]">
                    {['highest_score', 'category', 'difficulty', 'questions', 'taken_on'].map((option) => {
                      const isActive = takenSortBy === option;
                      const isAsc = isActive && takenSortDirection === "asc";
                      return (
                        <button
                          key={option}
                          disabled={isAccountLocked}
                          onClick={() => {
                            if (isActive) {
                              setTakenSortDirection(prev => prev === "desc" ? "asc" : "desc");
                            } else {
                              setTakenSortBy(option);
                              setTakenSortDirection("desc");
                            }
                          }}
                          className={`sorting-button ${isActive ? 'isActive' : ''} w-20 py-1.5 rounded-xl text-xs font-semibold transition-all outline-none focus:outline-none focus:ring-0 active:scale-95 select-none flex items-center justify-center gap-1 ${isAccountLocked
                            ? "opacity-50 text-slate-400"
                            : isActive
                              ? 'bg-white dark:bg-slate-500 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-400'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          {option === 'highest_score' ? 'Score' : option === 'questions' ? 'Questions' : option === 'taken_on' ? 'Taken on' : option === 'category' ? 'Category' : option === 'difficulty' ? 'Difficulty' : option}
                          <span className="inline-flex w-3 justify-center">
                            {isActive ? (
                              isAsc ? (
                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 5l4 6H6l4-6z" />
                                </svg>
                              ) : (
                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 15l-4-6h8l-4 6z" />
                                </svg>
                              )
                            ) : (
                              <span className="h-3 w-3" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl border flex items-center h-[38px] cursor-default ${isAccountLocked ? 'bg-slate-50/80 border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-800/40' : 'bg-slate-100/80 border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-700/50'}`}>
                    <span className={`font-semibold text-xs whitespace-nowrap leading-none ${isAccountLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {takenQuizzes.length} quiz{takenQuizzes.length !== 1 ? 'zes' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {takenQuizzes.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="bg-white/50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/40 text-center shadow-sm">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Favorite Topic</div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">
                      <span className={(() => {
                        if (takenQuizzes.length === 0) return "text-slate-800";
                        const counts = {};
                        takenQuizzes.forEach(q => {
                          const cat = q.category || 'other';
                          counts[cat] = (counts[cat] || 0) + 1;
                        });
                        const favoriteCat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
                        const categoryColors = {
                          art: "text-pink-600 dark:text-pink-400",
                          history: "text-amber-600 dark:text-amber-400",
                          music: "text-purple-600 dark:text-purple-400",
                          science: "text-blue-600 dark:text-blue-400",
                          other: "text-slate-600 dark:text-slate-400"
                        };
                        return categoryColors[favoriteCat] || categoryColors.other;
                      })()}>
                        {(() => {
                          if (takenQuizzes.length === 0) return "--";
                          const counts = {};
                          takenQuizzes.forEach(q => {
                            const cat = q.category || 'other';
                            counts[cat] = (counts[cat] || 0) + 1;
                          });
                          return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/40 text-center shadow-sm">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Average Score</div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {Math.round(takenQuizzes.reduce((acc, q) => acc + (q.correct / q.totalQuestions) * 100, 0) / takenQuizzes.length)}%
                    </div>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/40 text-center shadow-sm">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Quizzes Mastered</div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {takenQuizzes.filter(q => q.correct === q.totalQuestions).length}
                    </div>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/40 text-center shadow-sm">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Correct Answers</div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {takenQuizzes.reduce((sum, q) => sum + q.correct, 0)}
                    </div>
                  </div>
                </div>
              )}

              {takenQuizzes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">No Quizzes Yet</h3>
                  <p className="text-slate-600">
                    {isOwnProfile ? "Start taking quizzes to see your progress here" : `${profile.user_data.username} hasn't taken any quizzes yet`}
                  </p>
                  {isOwnProfile && !isAccountLocked && (
                    <div className="mt-6">
                      <Link
                        to="/"
                        className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                      >
                        Take a quiz
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...takenQuizzes].sort((a, b) => {
                    if (takenSortBy === "highest_score") {
                      const aPercentage = (a.correct / a.totalQuestions) * 100;
                      const bPercentage = (b.correct / b.totalQuestions) * 100;
                      return takenSortDirection === "desc" ? bPercentage - aPercentage : aPercentage - bPercentage;
                    }
                    if (takenSortBy === "category") {
                      const aCat = a.category || 'other';
                      const bCat = b.category || 'other';
                      return takenSortDirection === "desc" ? bCat.localeCompare(aCat) : aCat.localeCompare(bCat);
                    }
                    if (takenSortBy === "difficulty") {
                      const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
                      const aDifficulty = difficultyOrder[a.difficulty] || 2;
                      const bDifficulty = difficultyOrder[b.difficulty] || 2;
                      return takenSortDirection === "desc" ? bDifficulty - aDifficulty : aDifficulty - bDifficulty;
                    }
                    if (takenSortBy === "questions") {
                      return takenSortDirection === "desc" ? b.totalQuestions - a.totalQuestions : a.totalQuestions - b.totalQuestions;
                    }
                    if (takenSortBy === "taken_on") {
                      const aDate = new Date(a.attempted_at);
                      const bDate = new Date(b.attempted_at);
                      return takenSortDirection === "desc" ? bDate - aDate : aDate - bDate;
                    }
                    return 0;
                  }).map((quiz) => {
                    const percentage = Math.round((quiz.correct / quiz.totalQuestions) * 100);
                    const isMastered = percentage === 100;
                    const getGradientStyle = () => {
                      if (percentage === 100) {
                        return { background: 'linear-gradient(to right, rgb(245 158 11), rgb(217 119 6))' };
                      }
                      if (percentage >= 70) {
                        // Create a smooth gradient transition starting at 70%
                        const goldTransitionStart = (70 / percentage) * 100;
                        const goldTransitionEnd = Math.min((80 / percentage) * 100, 100);
                        return {
                          background: `linear-gradient(to right, 
                            rgb(71 85 105) 0%, 
                            rgb(71 85 105) ${goldTransitionStart}%, 
                            rgb(158 124 58) ${goldTransitionEnd}%, 
                            rgb(245 158 11) 100%)`
                        };
                      }
                      return { background: 'linear-gradient(to right, rgb(71 85 105), rgb(51 65 85))' };
                    };

                    const quizCategory = quiz.category || "other";

                    const takenClass = `group block bg-white/80 backdrop-blur rounded-2xl p-5 border shadow-sm transition-all duration-200 ease-out ${isAccountLocked ? "opacity-60" : `hover:border-slate-300 hover:bg-white hover:scale-[1.005] ${isMastered ? 'border-amber-300/60 hover:border-amber-400/80' : 'border-slate-200/80'}`
                      }`;
                    const difficultyKey = difficultyChips[quiz.difficulty] ? quiz.difficulty : "medium";
                    const difficulty = difficultyChips[difficultyKey];

                    const takenContent = (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">{quiz.title}</h3>
                            <div className="text-xs font-medium text-slate-500 dark:group-hover:text-white/80 text-left">
                              Took on {new Date(quiz.attempted_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </div>
                          </div>
                          {isMastered && (
                            <div className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                                <path d="M5 16h14l-1 7H6l-1-7z" />
                              </svg>
                              <span>Mastered</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 ease-in-out ${categoryColors[quizCategory] || categoryColors.other}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              {categoryIcons[quizCategory] || categoryIcons.other}
                            </svg>
                            <span className="capitalize">{quizCategory}</span>
                          </div>

                          <div className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all duration-200 ease-in-out ${difficulty.className}`}>
                            <span
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                              style={{
                                backgroundColor: "currentColor",
                                maskImage: `url(${difficulty.icon})`,
                                WebkitMaskImage: `url(${difficulty.icon})`,
                                maskRepeat: "no-repeat",
                                WebkitMaskRepeat: "no-repeat",
                                maskPosition: "center",
                                WebkitMaskPosition: "center",
                                maskSize: "contain",
                                WebkitMaskSize: "contain"
                              }}
                            ></span>
                            <span>{difficulty.label}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-end justify-between text-xs">
                            <span className="font-semibold text-slate-600">Score</span>
                            <span className="font-bold text-slate-800">
                              {quiz.correct}/{quiz.totalQuestions} <span className="text-slate-400 font-medium ml-1">({percentage}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-900/60 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                            <div
                              className="h-full transition-all duration-500 ease-out rounded-r-full"
                              style={{
                                width: `${percentage}%`,
                                ...getGradientStyle()
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );

                    return isAccountLocked ? (
                      <div
                        key={quiz._id}
                        className={takenClass}
                        onMouseMove={isAccountLocked ? undefined : handleCardMouseMove}
                        onMouseLeave={isAccountLocked ? undefined : handleCardMouseLeave}
                        style={{ "--shadow-color": (categoryGradients[quizCategory] || categoryGradients.other).hover.primary }}
                      >
                        <div
                          className={`pointer-events-none absolute inset-0 transition-opacity blur-2xl ${isAccountLocked ? "opacity-0" : "opacity-0 group-hover:opacity-45"}`}
                          style={{
                            background: `
                            radial-gradient(300px 220px at var(--hover-x, 50%) 110%, rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.primary} / 0.4), transparent 70%),
                            radial-gradient(260px 200px at -6% var(--hover-y, 50%), rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%),
                            radial-gradient(260px 200px at 106% var(--hover-y, 50%), rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%)
                          `
                          }}
                        ></div>
                        <div className="relative z-10">
                          {takenContent}
                        </div>
                      </div>
                    ) : (
                      <Link
                        key={quiz._id}
                        to={`/quiz/${quiz._id}`}
                        state={{ returnTo }}
                        className={takenClass}
                        onMouseMove={handleCardMouseMove}
                        onMouseLeave={handleCardMouseLeave}
                        style={{ "--shadow-color": (categoryGradients[quizCategory] || categoryGradients.other).hover.primary }}
                      >
                        <div
                          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-45 transition-opacity blur-2xl"
                          style={{
                            background: `
                            radial-gradient(300px 220px at var(--hover-x, 50%) 110%, rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.primary} / 0.4), transparent 70%),
                            radial-gradient(260px 200px at -6% var(--hover-y, 50%), rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%),
                            radial-gradient(260px 200px at 106% var(--hover-y, 50%), rgb(${(categoryGradients[quizCategory] || categoryGradients.other).hover.secondary} / 0.32), transparent 70%)
                          `
                          }}
                        ></div>
                        <div className="relative z-10">
                          {takenContent}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
        {selectedQuizForStats && (
          <QuizStats
            quiz={selectedQuizForStats}
            onClose={() => setSelectedQuizForStats(null)}
          />
        )}
        {
          showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
              <div className="bg-white/90 rounded-2xl border border-slate-200/80 p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-4 text-left">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                    <svg
                      className="h-6 w-6 text-rose-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Delete Quiz</h3>
                    <p className="text-sm text-slate-500">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-6">
                  Are you sure you want to delete &apos;{quizToDelete?.title}&apos;? All quiz data,
                  attempts, and leaderboard entries will be permanently removed.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-4 py-2.5 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
                    type="button"
                    onClick={handleDeleteQuiz}
                  >
                    Delete Quiz
                  </button>
                  <button
                    className="flex-1 px-4 py-2.5 rounded-lg bg-white/70 border border-slate-200/80 text-slate-700 font-semibold hover:bg-white transition-colors"
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setQuizToDelete(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </>
  );
}
