import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { getUserByUsername } from '../../services/users';
import { apiFetch } from "../../services/api";
import { getPendingRequests, sendFriendRequest, getFriends, removeRequest, acceptFriendRequest } from '../../services/friends';
import { removeFavourite } from "../../services/favourites";

export default function ProfilePage() {
  const { username: routeUsername } = useParams();
  const [profile, setProfile] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [takenQuizzes, setTakenQuizzes] = useState([]);
  const [createdQuizzes, setCreatedQuizzes] = useState([]);
  const [myFavourites, setMyFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [pendingSent, setPendingSent] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [friendsLoading, setFriendsLoading] = useState(false);

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
        setMyFavourites([]);
        return;
      }
      try {
        const res = await apiFetch('/users/me');
        if (!mounted) return;
        const body = await res.json();
        setMyUserId(body.user?._id || null);
        const favs = Array.isArray(body.user?.favourites) ? body.user.favourites : [];
        setMyFavourites(favs);
      } catch (err) {
        setMyUserId(null);
        setMyFavourites([]);
      }
    }
    loadMyProfile();
    return () => { mounted = false };
  }, [loggedInUser]);

  function getOtherUser(friend, myId) {
    return friend.user1?._id?.toString() === myId?.toString() ? friend.user2 : friend.user1;
  }

  async function loadFriendState() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUser, profile, myUserId]);

  useEffect(() => {
    async function fetchProfileAndQuizzes() {
      setLoading(true);
      try {
        const userProfile = await getUserByUsername(routeUsername);
        setProfile(userProfile);
        const quizzesResponse = await apiFetch("/quizzes");
        const quizzesBody = await quizzesResponse.json();
        const userId = userProfile._id;

        // Fetch quizzes created by this specific user
        const createdResponse = await apiFetch("/quizzes?created_by=" + userId);
        const createdBody = await createdResponse.json();
        setCreatedQuizzes(createdBody.quizzes || []);

        const quizzesWithUserAttempts = quizzesBody.quizzes
          .map((quiz) => {
            const userAttempt = quiz.attempts?.find(
              (attempt) => attempt.user_id.toString() === userId.toString()
            );
            if (!userAttempt) return null;
            return {
              _id: quiz._id,
              title: quiz.title,
              correct: userAttempt.correct,
              attempted_at: userAttempt.attempted_at,
              totalQuestions: quiz.questions.length,
            };
          })
          .filter(Boolean);
        setTakenQuizzes(quizzesWithUserAttempts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfileAndQuizzes();
  }, [routeUsername]);

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

  const isOwnProfile = myUserId && profile?._id && profile && myUserId === profile._id;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
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

  const totalQuestions = takenQuizzes.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);
  const totalCorrect = takenQuizzes.reduce((sum, quiz) => sum + quiz.correct, 0);
  const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto pt-10">
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
                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                )}
                {loggedInUser && (
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    {isOwnProfile && (
                      <button disabled className="px-6 py-2.5 rounded-full bg-white/20 text-white font-semibold border border-white/30 cursor-not-allowed">
                        Your Profile
                      </button>
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
                      <button disabled className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold border border-white/20">
                        Request Pending
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
                  return (
                    <Link
                      key={quizId}
                      to={`/quiz/${quizId}`}
                      className="group block bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10 hover:border-white/30 transition-all hover:bg-white/10"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2">{quizTitle}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                            {quizCategory && (
                              <span className="inline-flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{quizCategory}</span>
                              </span>
                            )}
                            {creatorName && (
                              <span>Created by {creatorName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRemoveFavourite(quizId);
                            }}
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all transform hover:scale-105 active:scale-95"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quizzes Taken Section */}
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
            </div>
          ) : (
            <div className="space-y-4">
              {takenQuizzes.map((quiz) => {
                const percentage = Math.round((quiz.correct / quiz.totalQuestions) * 100);
                const gradientClass = percentage >= 80 ? "from-green-500 to-emerald-600" :
                  percentage >= 60 ? "from-blue-500 to-cyan-600" :
                  percentage >= 40 ? "from-amber-500 to-orange-600" :
                  "from-red-500 to-pink-600";

                return (
                  <div key={quiz._id} className="group bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10 hover:border-white/30 transition-all hover:bg-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{quiz.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(quiz.attempted_at).toLocaleDateString()}</span>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quizzes Created Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Quizzes Created</h2>
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
            </div>
          ) : (
            <div className="space-y-4">
              {createdQuizzes.map((quiz) => (
                <div key={quiz._id} className="group bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10 hover:border-white/30 transition-all hover:bg-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{quiz.title}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-300">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-white text-sm font-semibold">
                        Created
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
