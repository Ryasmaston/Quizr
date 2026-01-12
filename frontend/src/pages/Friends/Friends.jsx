import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase"
import { getFriends, getPendingRequests, acceptFriendRequest, removeRequest } from "../../services/friends";
import { apiFetch } from "../../services/api"

export default function FriendsPage() {
  // const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [friendsSort, setFriendsSort] = useState("newest");
  const [pendingSort, setPendingSort] = useState("newest");

  const loadData = useCallback(async () => {
    try {
      const profileRes = await apiFetch("/users/me");
      const profileBody = await profileRes.json();
      setProfile(profileBody.user)
      const friendsData = await getFriends();
      setFriends(friendsData.friends || []);
      const pendingData = await getPendingRequests()
      setPending(pendingData.requests || [])
    } catch (err) {
      console.error("Failed to load friend data", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const getOtherUser = (friendDoc) => {
    return friendDoc.user1._id.toString() === profile._id.toString()
      ? friendDoc.user2 : friendDoc.user1;
  }
  const isIncoming = useCallback((request) => profile && request.user2?._id === profile._id, [profile]);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      // setUser(currentUser);
      if (currentUser) {
        await loadData()
      }
    });
    return unsub
  }, [loadData])

  const handleAccept = async (friendId) => {
    await acceptFriendRequest(friendId)
    await loadData();
  }
  const handleRemove = async (otherId) => {
    await removeRequest(otherId);
    await loadData();
  }

  const opalBackdropStyle = {
    backgroundColor: "var(--opal-bg-color)",
    backgroundImage: "var(--opal-backdrop-image)"
  };

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
  const sortedFriends = useMemo(() => {
    const items = [...friends];
    items.sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
      return friendsSort === "newest" ? bTime - aTime : aTime - bTime;
    });
    return items;
  }, [friends, friendsSort]);
  const sortedPending = useMemo(() => {
    const items = [...pending];
    items.sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
      return pendingSort === "newest" ? bTime - aTime : aTime - bTime;
    });
    return items;
  }, [pending, pendingSort]);
  const incomingPending = useMemo(
    () => sortedPending.filter((request) => isIncoming(request)),
    [sortedPending, isIncoming]
  );
  const outgoingPending = useMemo(
    () => sortedPending.filter((request) => !isIncoming(request)),
    [sortedPending, isIncoming]
  );

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={opalBackdropStyle}
      >
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading friends...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0" style={opalBackdropStyle}></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-amber-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-rose-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] -translate-x-1/2 -translate-y-1/2 bg-sky-200/25 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>
      <div className="relative min-h-screen pt-16 sm:pt-20">
        <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
          <div className="mb-9 sm:mb-12 text-center mt-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-3 sm:mb-4 select-none">
              Friends
            </h1>
            <p className="text-slate-600 text-base sm:text-lg select-none">Connect and compete with your friends</p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <section className="bg-white/70 backdrop-blur-lg rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">Pending Requests</h2>
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/40 rounded-full">
                  <button
                    onClick={() => setPendingSort("newest")}
                    className={`sorting-button h-8 min-w-[70px] sm:min-w-[85px] px-3 rounded-full text-[10px] sm:text-xs font-semibold transition-all flex items-center justify-center ${pendingSort === "newest"
                      ? "isActive bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100"
                      : "bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                      }`}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setPendingSort("oldest")}
                    className={`sorting-button h-8 min-w-[70px] sm:min-w-[85px] px-3 rounded-full text-[10px] sm:text-xs font-semibold transition-all flex items-center justify-center ${pendingSort === "oldest"
                      ? "isActive bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100"
                      : "bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                      }`}
                  >
                    Oldest
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-200/80 dark:divide-slate-800/90 sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-2">
                <div className="pb-5 sm:pb-0 sm:pr-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">
                      {incomingPending.length} received
                    </h3>
                  </div>
                  {incomingPending.length === 0 ? (
                    <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>No received requests</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {incomingPending.map((r) => {
                        const other = getOtherUser(r);
                        const gradient = getAvatarGradient(other?._id || other?.id || other?.user_id);
                        return (
                          <Link
                            key={r._id}
                            to={`/users/${other.user_data?.username}`}
                            className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-lg rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_0_16px_-6px_rgba(148,163,184,0.4)] hover:border-slate-300/80 dark:hover:border-slate-700 block"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 text-left">
                                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[30%] overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-lg`}>
                                  {other.user_data?.profile_pic ? (
                                    <img
                                      src={other.user_data.profile_pic}
                                      alt={other.user_data.username}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.parentElement.innerHTML = `<span class="text-white font-semibold text-lg">${other.user_data.username.charAt(0).toUpperCase()}</span>`;
                                      }}
                                    />
                                  ) : (
                                    <span>{other.user_data?.username?.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-lg truncate">{other.user_data?.username}</p>
                                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Sent you a request</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAccept(r._id);
                                  }}
                                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 text-emerald-800 dark:text-emerald-400 text-xs sm:text-sm font-semibold transition-colors border border-emerald-200/50 dark:border-emerald-800/50"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleRemove(other._id);
                                  }}
                                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/40 text-rose-800 dark:text-rose-400 text-xs sm:text-sm font-semibold transition-colors border border-rose-200/50 dark:border-rose-800/50"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-5 sm:pt-0 sm:pl-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">
                      {outgoingPending.length} sent
                    </h3>
                  </div>
                  {outgoingPending.length === 0 ? (
                    <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>No sent requests</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {outgoingPending.map((r) => {
                        const other = getOtherUser(r);
                        const gradient = getAvatarGradient(other?._id || other?.id || other?.user_id);
                        return (
                          <Link
                            key={r._id}
                            to={`/users/${other.user_data?.username}`}
                            className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-lg rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_0_16px_-6px_rgba(148,163,184,0.4)] hover:border-slate-300/80 dark:hover:border-slate-700 block"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 text-left">
                                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[30%] overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-lg`}>
                                  {other.user_data?.profile_pic ? (
                                    <img
                                      src={other.user_data.profile_pic}
                                      alt={other.user_data.username}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.parentElement.innerHTML = `<span class="text-white font-semibold text-lg">${other.user_data.username.charAt(0).toUpperCase()}</span>`;
                                      }}
                                    />
                                  ) : (
                                    <span>{other.user_data?.username?.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-lg truncate">{other.user_data?.username}</p>
                                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Request sent</p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemove(other._id);
                                }}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/40 text-amber-800 dark:text-amber-400 text-xs sm:text-sm font-semibold transition-colors border border-amber-200/50 dark:border-amber-800/50"
                              >
                                Cancel
                              </button>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white/70 backdrop-blur-lg rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">Your Friends</h2>
                <div className="flex items-center gap-2">
                  <div className="shrink-0 rounded-full border border-slate-200/80 bg-white/60 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-600">
                    {friends.length} total
                  </div>
                  <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/40 rounded-full">
                    <button
                      onClick={() => setFriendsSort("newest")}
                      className={`sorting-button h-8 min-w-[70px] sm:min-w-[85px] px-3 rounded-full text-[10px] sm:text-xs font-semibold transition-all flex items-center justify-center ${friendsSort === "newest"
                        ? "isActive bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100"
                        : "bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                        }`}
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => setFriendsSort("oldest")}
                      className={`sorting-button h-8 min-w-[70px] sm:min-w-[85px] px-3 rounded-full text-[10px] sm:text-xs font-semibold transition-all flex items-center justify-center ${friendsSort === "oldest"
                        ? "isActive bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100"
                        : "bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                        }`}
                    >
                      Oldest
                    </button>
                  </div>
                </div>
              </div>
              {friends.length === 0 ? (
                <div className="text-center py-8 sm:py-10 max-w-md mx-auto">
                  <div className="bg-white/60 rounded-2xl p-6 sm:p-8 border border-slate-200/80">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-rose-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">No Friends Yet</h3>
                    <p className="text-slate-600 text-sm sm:text-base">
                      Start connecting with others to build your network
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {sortedFriends.map((f) => {
                    const other = getOtherUser(f);
                    const gradient = getAvatarGradient(other?._id || other?.id || other?.user_id);
                    return (
                      <Link
                        key={f._id}
                        to={`/users/${other.user_data?.username}`}
                        className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-lg rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_0_16px_-6px_rgba(148,163,184,0.4)] hover:border-slate-300/80 dark:hover:border-slate-700 block"
                      >
                        {confirmRemoveId === f._id ? (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                            <div className="min-w-0 text-left">
                              <p className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                                Remove {other.user_data?.username}?
                              </p>
                              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                This will remove them from your friends list.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setConfirmRemoveId(null);
                                }}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    await handleRemove(other._id);
                                  } finally {
                                    setConfirmRemoveId(null);
                                  }
                                }}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/40 text-rose-800 dark:text-rose-400 text-xs sm:text-sm font-semibold transition-colors border border-rose-200/50 dark:border-rose-800/50"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-3 min-w-0 text-left">
                              <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[30%] overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-lg`}>
                                {other.user_data?.profile_pic ? (
                                  <img
                                    src={other.user_data.profile_pic}
                                    alt={other.user_data.username}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.parentElement.innerHTML = `<span class="text-white font-semibold text-lg">${other.user_data.username.charAt(0).toUpperCase()}</span>`;
                                    }}
                                  />
                                ) : (
                                  <span>{other.user_data?.username?.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-lg truncate">{other.user_data?.username}</p>
                                {other.user_data?.created_at && (
                                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                    Since {new Date(other.user_data.created_at).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric"
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmRemoveId(f._id);
                              }}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/40 text-rose-800 dark:text-rose-400 text-xs sm:text-sm font-semibold transition-colors border border-rose-200/50 dark:border-rose-800/50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main >
      </div >
    </>
  );
}
