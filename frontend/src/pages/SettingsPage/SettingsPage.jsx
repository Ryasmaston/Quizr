import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "../../services/firebase";
import { apiFetch } from "../../services/api";
import { scheduleAccountDeletion } from "../../services/users";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentEmailPassword, setCurrentEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [deletionMode, setDeletionMode] = useState(null);
  const [deletionStep, setDeletionStep] = useState("intro");
  const [deletionSaving, setDeletionSaving] = useState(false);
  const [deletionError, setDeletionError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setLoggedInUser(currentUser);
    });
    return unsub;
  }, []);

  const loadProfile = async () => {
    if (!loggedInUser) {
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/me");
      const body = await res.json();
      setProfile(body.user);
      setUsername(body.user.username);
      setProfilePic(body.user.profile_pic || "");
      setNewEmail(loggedInUser.email);
      setLoading(false);
    } catch (err) {
      setError("Failed to load profile");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [loggedInUser]);

  useEffect(() => {
    if (!profile) return;
    if (profile.status === "pending_deletion") {
      return;
    }
    if (deletionStep === "confirm") {
      setDeletionStep("intro");
    }
  }, [profile, deletionStep, deletionMode]);

  const isAccountLocked = profile?.status === "pending_deletion";

  if (!loggedInUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="mt-4 text-white font-medium">Please log in...</p>
        </div>
      </div>
    );
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    if (isAccountLocked) return;
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      const res = await apiFetch(`/users/${profile._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          profile_pic: profilePic
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }
      navigate(`/users/${username}`)
      await loadProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateEmail(e) {
    e.preventDefault();
    if (isAccountLocked) return;
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      if (newEmail === loggedInUser.email) {
        setError("This is already your current email");
        setSaving(false);
        return;
      }
      if (!currentEmailPassword) {
        setError("Please enter your current password to change email");
        setSaving(false);
        return;
      }
      const credential = EmailAuthProvider.credential(
        loggedInUser.email,
        currentEmailPassword
      );
      await reauthenticateWithCredential(loggedInUser, credential);
      await updateEmail(loggedInUser, newEmail);
      setMessage("Email updated successfully!");
      setCurrentEmailPassword("");
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setError("Please log out and log back in before changing your email");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use");
      } else if (err.code === 'auth/wrong-password') {
        setError("Current password is incorrect");
      } else {
        setError(err.message || "Failed to update email");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (isAccountLocked) return;
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }

    setSaving(true);

    try {
      const credential = EmailAuthProvider.credential(
        loggedInUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(loggedInUser, credential);
      await updatePassword(loggedInUser, newPassword);
      setMessage("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        setError("Current password is incorrect");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(err.message || "Failed to update password");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleChooseDeletion(mode) {
    setDeletionError(null);
    setDeletionSaving(true);
    try {
      await scheduleAccountDeletion(mode);
      setDeletionMode(mode);
      navigate(`/users/${profile?.username}`, { replace: true });
    } catch (err) {
      setDeletionError(err.message || "Failed to schedule deletion");
    } finally {
      setDeletionSaving(false);
    }
  }

  const deletionHeader = isAccountLocked
    ? "Account deletion scheduled"
    : deletionStep === "choose"
    ? "Delete all quizzes?"
    : "Delete Account";

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="mt-4 text-white font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-16 sm:pt-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-8">
          Settings
        </h1>
        {message && (
          <div className="mb-6 bg-green-500/20 border border-green-500/50 rounded-2xl p-4 backdrop-blur">
            <p className="text-green-300">{message}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-2xl p-4 backdrop-blur">
            <p className="text-red-300">{error}</p>
          </div>
        )}
        {isAccountLocked && (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">{deletionHeader}</h2>
            {deletionError && (
              <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-2xl p-4 backdrop-blur">
                <p className="text-red-300">{deletionError}</p>
              </div>
            )}
            <p className="text-gray-300 mb-4">
              Your account is scheduled for deletion. Manage the countdown from your profile.
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => navigate(`/users/${profile?.username}`)}
                className="px-6 py-3 rounded-full bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/20 transition-all"
              >
                Go to My Profile
              </button>
            </div>
          </div>
        )}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 mb-6">
          <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isAccountLocked}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Profile Picture URL</label>
              <input
                type="url"
                value={profilePic}
                onChange={(e) => setProfilePic(e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={isAccountLocked}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {profilePic && (
              <div className="flex items-center gap-4">
                <p className="text-gray-300">Preview:</p>
                <img
                  src={profilePic}
                  alt="Profile preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
            <button
              type="submit"
              disabled={saving || isAccountLocked}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 mb-6">
          <h2 className="text-2xl font-bold text-white mb-6">Email Address</h2>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">New Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isAccountLocked}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Current Password (required for security)</label>
              <input
                type="password"
                value={currentEmailPassword}
                onChange={(e) => setCurrentEmailPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isAccountLocked}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving || isAccountLocked || newEmail === loggedInUser?.email || !currentEmailPassword}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Updating..." : "Update Email"}
            </button>
          </form>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isAccountLocked}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={isAccountLocked}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isAccountLocked}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={saving || isAccountLocked || !currentPassword || !newPassword || !confirmPassword}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Updating..." : "Change Password"}
            </button>
          </form>
        </div>
        {!isAccountLocked && (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 mt-6">
            <h2 className="text-2xl font-bold text-white mb-4">{deletionHeader}</h2>
            {deletionStep === "intro" && (
              <>
                <p className="text-gray-300 mb-4">
                  You will then have 7 days to cancel if you change your mind, or delete immediately.
                </p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDeletionStep("choose")}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-white font-semibold hover:shadow-lg hover:shadow-rose-500/40 transition-all transform hover:scale-105 active:scale-95"
                  >
                    Delete Account
                  </button>
                </div>
              </>
            )}
            {deletionError && (
              <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-2xl p-4 backdrop-blur">
                <p className="text-red-300">{deletionError}</p>
              </div>
            )}
            {deletionStep === "choose" && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  You can delete all quizzes you created (this removes other users&apos; attempt history
                  on those quizzes), or preserve your quizzes and anonymise your authorship as
                  deleted user.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => handleChooseDeletion("delete_quizzes")}
                    disabled={deletionSaving}
                    className="px-6 py-3 rounded-full bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete My Quizzes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChooseDeletion("preserve_quizzes")}
                    disabled={deletionSaving}
                    className="px-6 py-3 rounded-full bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Preserve My Quizzes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
