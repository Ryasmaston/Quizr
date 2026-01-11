import { useEffect, useState } from "react";
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
        setMyUsername(body.user?.username || null);
        setAccountStatus(body.user?.status || "active");
        setDeletionInfo(body.user?.deletion || null);
        const favs = Array.isArray(body.user?.favourites) ? body.user.favourites : [];
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

  function getOtherUser(friend, myId) {
    return friend.user1?._id?.toString() === myId?.toString() ? friend.user2 : friend.user1;
  }

  async function loadFriendState() {
    if (accountStatus === "pending_deletion") return;
    if (!loggedInUser || !profile?._id || !myUserId) return;
    setFriendsLoading(true);
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        getFriends(),
        getPendingRequests()
      ]);
      const friends = friendsRes.friends || [];
      const requests = pendingRes.requests || [];
      const isAlreadyFriend = friends.some((f) => {
        const other = getOtherUser(f, myUserId);
        return other?._id === profile._id;
      });
      setIsFriend(isAlreadyFriend);
      setPendingSent(false);
      setIncomingRequest(null);
      if (isAlreadyFriend) return;
      const relevantRequest = requests.find((r) => {
        const other = getOtherUser(r, myUserId);
        return other?._id === profile._id;
      });
      if (!relevantRequest) return;
      if (relevantRequest.user1._id === myUserId) {
        setPendingSent(true);
        return;
      }
      setIncomingRequest(relevantRequest);
    } catch (err) {
      console.error("Could not load friend status", err);
    } finally {
      setFriendsLoading(false);
    }
  }

  useEffect(() => {
    loadFriendState();
  }, [loggedInUser, profile, myUserId, accountStatus]);

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
    try {
      await removeFavourite(quizId);
    } catch (err) {
      console.error("Could not remove favourite", err);
      setMyFavourites(previous);
    }
  }

  async function handleToggleFavourite(quizId, isFavourited) {
    const previous = myFavourites;
    setMyFavourites((prev) => {
      if (isFavourited) {
        return prev.filter((item) => {
          const itemId = typeof item === "string" ? item : item._id;
          return itemId !== quizId;
        });
      }
      return [...prev, quizId];
    });
    try {
      await toggleFavourite(quizId, isFavourited);
    } catch (err) {
      console.error("Could not toggle favourite", err);
      setMyFavourites(previous);
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
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="mt-4 text-white font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Error</h3>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-slate-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">User Not Found</h3>
          <p className="text-gray-300">The user you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const categoryColors = {
    art: "from-pink-500 to-rose-500",
    history: "from-amber-500 to-orange-500",
    music: "from-purple-500 to-indigo-500",
    science: "from-blue-500 to-cyan-500",
    other: "from-gray-500 to-slate-500"
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
      className: "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
      icon: "/easy.svg"
    },
    medium: {
      label: "Medium",
      className: "border-amber-400/40 bg-amber-500/20 text-amber-100",
      icon: "/medium.svg"
    },
    hard: {
      label: "Hard",
      className: "border-rose-400/40 bg-rose-500/20 text-rose-100",
      icon: "/hard.svg"
    }
  };

  const totalQuestions = takenQuizzes.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);
  const totalCorrect = takenQuizzes.reduce((sum, quiz) => sum + quiz.correct, 0);
  const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-16 sm:pt-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/20 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {profile.profile_pic ? (
                    <img src={profile.profile_pic} alt={profile.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-4xl sm:text-5xl font-bold">
                      {profile.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {isOwnProfile && (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-2">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-2">
                  {profile.username}
                </h1>
                {isOwnProfile && loggedInUser && (
                  <p className="text-gray-300 mb-4">{loggedInUser.email}</p>
                )}
                {profile.created_at && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-400 text-sm mb-4">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      Joined {new Date(profile.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                )}
                {loggedInUser && (
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    {isOwnProfile && (
                      <>
                        {isAccountLocked ? (
                          <span className="px-6 py-2.5 rounded-full bg-white/10 text-white/70 font-semibold border border-white/20">
                            Settings Locked
                          </span>
                        ) : (
                          <a
                            href={`/settings`}
                            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                          </a>
                        )}
                        <span className="px-2 py-2.5 text-white font-semibold">
                          Your Profile
                        </span>
                      </>
                    )}
                    {!isOwnProfile && friendsLoading && (
                      <button disabled className="px-6 py-2.5 rounded-full bg-white/10 text-white font-semibold border border-white/20">
                        Loading...
                      </button>
                    )}
                    {!isOwnProfile && !friendsLoading && isFriend && (
                      <button
                        onClick={handleRemove}
                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all transform hover:scale-105 active:scale-95"
                      >
                        Remove Friend
                      </button>
                    )}
                    {!isOwnProfile && !friendsLoading && !isFriend && pendingSent && (
                      <button
                        onClick={handleRemove}
                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold border border-white/20 hover:shadow-lg hover:shadow-amber-500/40 transition-all transform hover:scale-105 active:scale-95"
                      >
                        Cancel Request
                      </button>
                    )}
                    {!isOwnProfile && !friendsLoading && !isFriend && incomingRequest && (
                      <>
                        <button
                          onClick={handleAccept}
                          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all transform hover:scale-105 active:scale-95"
                        >
                          Accept Request
                        </button>
                        <button
                          onClick={handleRemove}
                          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all transform hover:scale-105 active:scale-95"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {!isOwnProfile && !friendsLoading && !isFriend && !pendingSent && !incomingRequest && (
                      <button
                        onClick={handleSendRequest}
                        disabled={sendingRequest}
                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingRequest ? "Sending..." : "Add Friend"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {isAccountLocked && (
          <div className="mb-6 sm:mb-8 bg-amber-500/10 border border-amber-400/40 rounded-3xl p-6 sm:p-8 backdrop-blur-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-amber-100 mb-2">
                  Account scheduled for deletion
                </h2>
                <p className="text-amber-200 mb-2">
                  Deletion in {remainingLabel}. {deletionModeLabel}
                </p>
                {deletionInfo?.scheduled_for && (
                  <p className="text-amber-200/80 text-sm">
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
                  <p className="text-red-200 mt-3">{deletionActionError}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCancelDeletion}
                  disabled={deletionActionLoading}
                  className="px-5 py-2.5 rounded-full bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletionActionLoading ? "Working..." : "Cancel Deletion"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteNow}
                  disabled={deletionActionLoading}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-white font-semibold hover:shadow-lg hover:shadow-rose-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Now
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
              {takenQuizzes.length}
            </div>
            <div className="text-gray-300 text-sm">Quizzes Taken</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-2">
              {averageScore}%
            </div>
            <div className="text-gray-300 text-sm">Average Score</div>
          </div>
        </div>
        {isOwnProfile && (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Favourites</h2>
            {myFavourites.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l2.7 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.5 20.4l1.1-6.3L3 9.6l6.3-.9L12 3Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Favourites Yet</h3>
                <p className="text-gray-300">Star a quiz to save it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myFavourites.map((quiz) => {
                  const quizId = typeof quiz === "string" ? quiz : quiz._id;
                  const quizTitle = typeof quiz === "string" ? "Quiz" : quiz.title;
                  const quizCategory = typeof quiz === "string" ? null : quiz.category;
                  const creatorName = typeof quiz === "string" ? null : quiz.created_by?.username;
                  const creatorAuthId = typeof quiz === "string" ? null : quiz.created_by?.authId;
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
                      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${categoryColors[quizCategory] || categoryColors.other}`}></div>
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                            <h3 className="text-lg sm:text-xl font-semibold text-white truncate">{quizTitle}</h3>
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
                            className={`px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-semibold transition-all transform active:scale-95 ${isAccountLocked ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg hover:shadow-red-500/50 hover:scale-105"}`}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <div className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${categoryColors[quizCategory] || categoryColors.other} px-3 py-1.5 text-xs font-semibold text-white`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {categoryIcons[quizCategory] || categoryIcons.other}
                              </svg>
                              <span className="capitalize">{quizCategory || "other"}</span>
                            </div>
                            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${difficulty.className}`}>
                              <img src={difficulty.icon} alt="" aria-hidden="true" className="h-4 w-4" />
                              <span>{difficulty.label}</span>
                            </div>
                            {creatorName && (
                              creatorIsDeleted || isAccountLocked ? (
                                <span className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 bg-white/10 border border-white/20">
                                  Created by {creatorIsDeleted ? "deleted user" : creatorName}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    navigate(`/users/${creatorName}`);
                                  }}
                                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20 hover:text-white bg-white/10 border border-white/20"
                                >
                                  Created by {creatorName}
                                </button>
                              )
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-200">
                          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
                            <span className="font-semibold text-white">{questionCount}</span>
                            <span className="text-white/70">Questions</span>
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
                            <span className="font-semibold text-white">
                              {passThreshold ?? 0}/{questionCount || 0}
                            </span>
                            <span className="text-white/70">
                              Pass {passPercent !== null ? `${passPercent}%` : "--"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
                            <span className="font-semibold text-white">{allowsMultiple ? "Multi" : "Single"}</span>
                            <span className="text-white">Correct</span>
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
                            <span className="font-semibold text-white">{isQuizLocked ? "Locked" : "Editable"}</span>
                            <span className="text-white">Answers</span>
                          </span>
                        </div>
                      </div>
                    </>
                  );

                  const cardClass = `group relative block bg-white/5 backdrop-blur rounded-2xl border border-white/10 overflow-hidden ${
                    isAccountLocked ? "opacity-60 cursor-not-allowed" : "hover:border-white/30 transition-all hover:bg-white/10"
                  }`;

                  return isAccountLocked ? (
                    <div key={quizId} className={cardClass}>
                      {cardContent}
                    </div>
                  ) : (
                    <Link key={quizId} to={`/quiz/${quizId}`} className={cardClass}>
                      {cardContent}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Quizzes Taken</h2>
          {takenQuizzes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Quizzes Yet</h3>
              <p className="text-gray-300">
                {isOwnProfile ? "Start taking quizzes to see your progress here" : `${profile.username} hasn't taken any quizzes yet`}
              </p>
              {isOwnProfile && !isAccountLocked && (
                <div className="mt-6">
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-purple-500/40 active:scale-95"
                  >
                    Take a quiz
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {takenQuizzes.map((quiz) => {
                const percentage = Math.round((quiz.correct / quiz.totalQuestions) * 100);
                const gradientClass = percentage >= 80 ? "from-green-500 to-emerald-600" :
                                     percentage >= 60 ? "from-blue-500 to-cyan-600" :
                                     percentage >= 40 ? "from-amber-500 to-orange-600" :
                                     "from-red-500 to-pink-600";

                const takenClass = `group block bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10 ${
                  isAccountLocked ? "opacity-60 cursor-not-allowed" : "hover:border-white/30 transition-all hover:bg-white/10"
                }`;
                const takenContent = (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{quiz.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                              {new Date(quiz.attempted_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>{quiz.correct}/{quiz.totalQuestions} correct</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${gradientClass}`}>
                            {percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${gradientClass} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </>
                );

                return isAccountLocked ? (
                  <div key={quiz._id} className={takenClass}>
                    {takenContent}
                  </div>
                ) : (
                  <Link key={quiz._id} to={`/quiz/${quiz._id}`} className={takenClass}>
                    {takenContent}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Quizzes Created</h2>
            <div className="px-4 py-2 bg-white/10 rounded-full">
              <span className="text-white font-semibold">{createdQuizzes.length} Quiz{createdQuizzes.length !== 1 ? 'zes' : ''}</span>
            </div>
          </div>
          {createdQuizzes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Quizzes Created</h3>
              <p className="text-gray-300">
                {isOwnProfile ? "Create your first quiz to see it here" : `${profile.username} hasn't created any quizzes yet`}
              </p>
              {isOwnProfile && !isAccountLocked && (
                <div className="mt-6">
                  <Link
                    to="/quizzes/create"
                    state={{ returnTo: location.pathname }}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95"
                  >
                    Create a quiz
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {createdQuizzes.map((quiz) => {
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
                return (
                  <div
                    key={quiz._id}
                    onClick={() => {
                      if (isAccountLocked) return;
                      window.location.href = `/quiz/${quiz._id}`;
                    }}
                    className={`group relative bg-white/5 backdrop-blur rounded-2xl border border-white/10 overflow-hidden transform duration-300 ${
                      isAccountLocked
                        ? "cursor-not-allowed opacity-60"
                        : "hover:border-white/30 hover:bg-white/10 cursor-pointer hover:scale-[1.02]"
                    }`}
                  >
                    <div className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${categoryColors[quiz.category] || categoryColors.other}`}>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {categoryIcons[quiz.category] || categoryIcons.other}
                      </svg>
                      <span className="text-xs font-semibold text-white capitalize">{quiz.category}</span>
                    </div>
                    <div className="px-6 pt-4 pb-3">
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                          <img src={`/${quiz.difficulty || "medium"}.svg`} alt="" aria-hidden="true" className="h-4 w-4" />
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
                                handleToggleFavourite(quiz._id, isFavourited);
                              }}
                              className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 backdrop-blur text-white/70 transition-all hover:text-yellow-200 hover:bg-white/20"
                              aria-label="Toggle favourite"
                              title="Toggle favourite"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4 mx-auto"
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
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuizToDelete(quiz);
                                setShowDeleteConfirm(true);
                              }}
                              className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 backdrop-blur text-rose-200 transition-all hover:bg-rose-500/20 hover:text-rose-100"
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
                          className={`${titleSizeClass} font-bold text-white ${isAccountLocked ? "" : "group-hover:text-purple-300"} transition-colors line-clamp-2 text-center h-full w-full flex items-center justify-center`}
                        >
                          {quiz.title}
                        </h3>
                      </div>
                      <div className="mb-3 text-xs text-white/80 divide-y divide-white/10">
                        <div className="flex items-center justify-between py-2">
                          <span>Questions</span>
                          <span className="font-semibold">{quiz.questions.length}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span>Attempts</span>
                          <span className="font-semibold">{totalAttempts}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span>Pass Rate</span>
                          <span className="font-semibold">{passRate}%</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span>Avg Score</span>
                          <span className="font-semibold">{avgScore}%</span>
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
                            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
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
                          className={`w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                            isAccountLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          View Stats
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-1 text-xs text-white/80">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                );
              })}
            </div>
          )}
        </div>
      </main>
      {selectedQuizForStats && (
        <QuizStats
          quiz={selectedQuizForStats}
          onClose={() => setSelectedQuizForStats(null)}
        />
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl border border-white/20 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20">
                <svg
                  className="h-6 w-6 text-rose-400"
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
                <h3 className="text-lg font-semibold text-white">Delete Quiz</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete &apos;{quizToDelete?.title}&apos;? All quiz data,
              attempts, and leaderboard entries will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-all"
                type="button"
                onClick={handleDeleteQuiz}
              >
                Delete Quiz
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all"
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
      )}
    </div>
  );
}
