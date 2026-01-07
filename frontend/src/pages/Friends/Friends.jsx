import { useEffect, useState, useCallback } from "react";
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

  const loadData = useCallback(async () => {
    try {
      const profileRes = await apiFetch("/users/me");
      const profileBody = await profileRes.json();
      console.log("Profile from API:", profileBody.user)
      setProfile(profileBody.user)
      const friendsData = await getFriends();
      console.log("friendsData", friendsData)
      setFriends(friendsData.friends || []);
      const pendingData = await getPendingRequests()
      setPending(pendingData.requests || [])
    } catch (err) {
      console.error("Failed to load friend data", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      // setUser(currentUser);
      if (currentUser) {
        await loadData()
      }
    });
    return unsub
  }, [loadData])

  const getOtherUser = (friendDoc) => {
    return friendDoc.user1._id.toString() === profile._id.toString()
      ? friendDoc.user2 : friendDoc.user1;
  }
  const isIncoming = (request) => request.user2._id === profile._id

  const handleAccept = async (friendId) => {
    await acceptFriendRequest(friendId)
    await loadData();
  }
  const handleRemove = async (otherId) => {
    await removeRequest(otherId);
    await loadData();
  }

  const gradients = [
      "from-rose-500 to-pink-600",
      "from-violet-500 to-purple-600",
      "from-blue-500 to-cyan-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-fuchsia-500 to-pink-600"
    ];

    if (loading) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="relative flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="mt-4 text-white font-medium">Loading friends...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto pt-10">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-full">
          <div className="mb-8 sm:mb-12 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-3 sm:mb-4 animate-fade-in px-4">
              Friends
            </h1>
            <p className="text-gray-300 text-base sm:text-lg px-4">Connect and compete with your friends</p>
          </div>
          {(friends.length > 0 || pending.length > 0) && (
            <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto px-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/20">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{friends.length}</div>
                <div className="text-gray-300 text-xs sm:text-sm">Total Friends</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/20">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{pending.length}</div>
                <div className="text-gray-300 text-xs sm:text-sm">Pending Requests</div>
              </div>
            </div>
          )}
          <div className="max-w-5xl mx-auto px-4 space-y-8 sm:space-y-12">
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Your Friends</h2>
              {friends.length === 0 ? (
                <div className="text-center py-12 sm:py-16 max-w-md mx-auto">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-8 sm:p-10 border border-white/20">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No Friends Yet</h3>
                    <p className="text-gray-300 text-sm sm:text-base">
                      Start connecting with others to build your network
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {friends.map((f, index) => {
                    const other = getOtherUser(f);
                    const gradient = gradients[index % gradients.length];
                    return (
                      <div key={f._id} className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10"
                            style={{ background: `linear-gradient(135deg, rgb(168 85 247), rgb(236 72 153))` }}></div>
                        <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/20 hover:border-white/40 transition-all transform group-hover:-translate-y-1 overflow-hidden">
                          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradient}`}></div>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg transform group-hover:scale-110 transition-transform`}>
                                {other.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-white text-lg">{other.username}</p>
                                {other.profile_pic && (
                                  <p className="text-xs text-gray-300 truncate max-w-[150px]">{other.profile_pic}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemove(other._id)}
                              className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 min-w-[90px]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Pending Requests</h2>
              {pending.length === 0 ? (
                <div className="text-center py-12 sm:py-16 max-w-md mx-auto">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-8 sm:p-10 border border-white/20">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No Pending Requests</h3>
                    <p className="text-gray-300 text-sm sm:text-base">
                      You have no friend requests
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {pending.map((r, index) => {
                    const other = getOtherUser(r);
                    const incoming = isIncoming(r);
                    const gradient = gradients[(index + 2) % gradients.length];
                    return (
                      <div key={r._id} className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10"
                            style={{ background: `linear-gradient(135deg, rgb(168 85 247), rgb(236 72 153))` }}></div>
                        <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/20 hover:border-white/40 transition-all transform group-hover:-translate-y-1 overflow-hidden">
                          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradient}`}></div>
                          <div className="pt-2">
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg transform group-hover:scale-110 transition-transform`}>
                                {other.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-white text-lg">{other.username}</p>
                                <p className="text-sm text-gray-300">
                                  {incoming ? "Sent you a request" : "Request sent"}
                                </p>
                              </div>
                            </div>
                            {incoming ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAccept(r._id)}
                                  className="flex-1 px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 min-w-[90px]"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRemove(other._id)}
                                  className="flex-1 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 min-w-[90px]"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleRemove(other._id)}
                                className="w-full px-4 py-2 rounded-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 min-w-[90px]"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }
