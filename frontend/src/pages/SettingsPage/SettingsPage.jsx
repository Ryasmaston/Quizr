import { useEffect, useState, useCallback } from "react";
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

  const loadProfile = useCallback(async () => {
    if (!loggedInUser) {
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/me");
      const body = await res.json();
      setProfile(body.user);
      setUsername(body.user.user_data.username);
      setProfilePic(body.user.user_data.profile_pic || "");
      setNewEmail(loggedInUser.email);
      setLoading(false);
    } catch (err) {
      setError("Failed to load profile");
      setLoading(false);
    }
  }, [loggedInUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
      <>
        <div
          className="fixed inset-0"
          style={{
            backgroundColor: "#f7f5f1",
            backgroundImage: `
              radial-gradient(1200px 800px at 5% 0%, rgba(255, 227, 170, 0.28), transparent 60%),
              radial-gradient(900px 700px at 85% 10%, rgba(255, 190, 220, 0.24), transparent 55%),
              radial-gradient(1000px 800px at 15% 90%, rgba(180, 220, 255, 0.24), transparent 60%),
              radial-gradient(900px 800px at 85% 85%, rgba(190, 235, 210, 0.24), transparent 60%)
            `
          }}
        ></div>
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="relative flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600 font-medium">Please log in...</p>
          </div>
        </div>
      </>
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
      navigate(`/users/${profile?.user_data?.username}`, { replace: true });
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
      <>
        <div
          className="fixed inset-0"
          style={{
            backgroundColor: "#f7f5f1",
            backgroundImage: `
              radial-gradient(1200px 800px at 5% 0%, rgba(255, 227, 170, 0.28), transparent 60%),
              radial-gradient(900px 700px at 85% 10%, rgba(255, 190, 220, 0.24), transparent 55%),
              radial-gradient(1000px 800px at 15% 90%, rgba(180, 220, 255, 0.24), transparent 60%),
              radial-gradient(900px 800px at 85% 85%, rgba(190, 235, 210, 0.24), transparent 60%)
            `
          }}
        ></div>
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="relative flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading settings...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0"
        style={{
          backgroundColor: "#f7f5f1",
          backgroundImage: `
            radial-gradient(1200px 800px at 5% 0%, rgba(255, 227, 170, 0.28), transparent 60%),
            radial-gradient(900px 700px at 85% 10%, rgba(255, 190, 220, 0.24), transparent 55%),
            radial-gradient(1000px 800px at 15% 90%, rgba(180, 220, 255, 0.24), transparent 60%),
            radial-gradient(900px 800px at 85% 85%, rgba(190, 235, 210, 0.24), transparent 60%)
          `
        }}
      ></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-amber-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-rose-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] -translate-x-1/2 -translate-y-1/2 bg-sky-200/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>
      <div className="relative min-h-screen pt-16 sm:pt-20">
        <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h1 className="text-4xl font-semibold text-slate-800 mb-8">
            Settings
          </h1>
          {isAccountLocked && (
            <div className="mb-6 bg-amber-100/70 border border-amber-200/80 rounded-3xl p-4 backdrop-blur">
              <p className="text-amber-700">Your account is scheduled for deletion. Manage the countdown from your profile.</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigate(`/users/${profile?.user_data?.username}`)}
                  className="px-6 py-3 rounded-xl bg-white/70 text-slate-700 font-semibold border border-slate-200/80 hover:bg-white transition-colors"
                >
                  Go to My Profile
                </button>
              </div>
            </div>
          )}
          {message && (
            <div className="mb-6 bg-emerald-100/70 border border-emerald-200/80 rounded-2xl p-4 backdrop-blur">
              <p className="text-emerald-700">{message}</p>
            </div>
          )}
          {error && (
            <div className="mb-6 bg-rose-100/80 border border-rose-200/80 rounded-2xl p-4 backdrop-blur">
              <p className="text-rose-700">{error}</p>
            </div>
          )}
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 mb-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Profile Information</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-slate-600 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isAccountLocked}
                  className="w-full px-4 py-3 bg-white/70 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/70 disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-2">Profile Picture URL</label>
                <input
                  type="url"
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  disabled={isAccountLocked}
                  className="w-full px-4 py-3 bg-white/70 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/70 disabled:opacity-50"
                />
              </div>
              {profilePic && (
                <div className="flex items-center gap-4">
                  <p className="text-slate-600">Preview:</p>
                  <img
                    src={profilePic}
                    alt="Profile preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-200/80"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={saving || isAccountLocked}
                className="px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 mb-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Email Address</h2>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label className="block text-slate-600 mb-2">New Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isAccountLocked}
                  className="w-full px-4 py-3 bg-white/70 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/70 disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-2">Current Password (required for security)</label>
                <input
                  type="password"
                  value={currentEmailPassword}
                  onChange={(e) => setCurrentEmailPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={isAccountLocked}
                  className="w-full px-4 py-3 bg-white/70 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/70 disabled:opacity-50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving || isAccountLocked || newEmail === loggedInUser?.email || !currentEmailPassword}
                className="px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Updating..." : "Update Email"}
              </button>
            </form>
          </div>
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Change Password</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-slate-600 mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={isAccountLocked}
                  className="w-full px-4 py-3 bg-white/70 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/70 disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={isAccountLocked}
                  className="w-full px-4 py-3 bg-white/70 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/70 disabled:opacity-50"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={isAccountLocked}
                  className="w-full px-4 py-3 bg-white/70 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/70 disabled:opacity-50"
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={saving || isAccountLocked || !currentPassword || !newPassword || !confirmPassword}
                className="px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Updating..." : "Change Password"}
              </button>
            </form>
          </div>
          {!isAccountLocked && (
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-slate-200/80 mt-6 shadow-sm min-h-[240px] flex flex-col justify-center">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">{deletionHeader}</h2>
              {deletionStep === "intro" && (
                <>
                  <p className="text-slate-600 mb-4">
                    You will then have 7 days to cancel if you change your mind, or delete immediately.
                  </p>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setDeletionStep("choose")}
                      className="px-6 py-3 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
                    >
                      Delete Account
                    </button>
                  </div>
                </>
              )}
              {deletionError && (
                <div className="mb-4 bg-rose-100/80 border border-rose-200/80 rounded-2xl p-4 backdrop-blur">
                  <p className="text-rose-700">{deletionError}</p>
                </div>
              )}
              {deletionStep === "choose" && (
                <div className="space-y-4">
                  <p className="text-slate-600">
                    You can delete all quizzes you created (this removes other users&apos; attempt history
                    on those quizzes), or preserve your quizzes and anonymise your authorship as
                    deleted user.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={() => setDeletionStep("intro")}
                      disabled={deletionSaving}
                      className="px-6 py-3 rounded-xl bg-white/70 text-slate-700 font-semibold border border-slate-200/80 hover:bg-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChooseDeletion("delete_quizzes")}
                      disabled={deletionSaving}
                      className="px-6 py-3 rounded-xl bg-white/70 text-slate-700 font-semibold border border-slate-200/80 hover:bg-white transition-colors disabled:opacity-50"
                    >
                      Delete My Quizzes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChooseDeletion("preserve_quizzes")}
                      disabled={deletionSaving}
                      className="px-6 py-3 rounded-xl bg-white/70 text-slate-700 font-semibold border border-slate-200/80 hover:bg-white transition-colors disabled:opacity-50"
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
    </>
  );
}
