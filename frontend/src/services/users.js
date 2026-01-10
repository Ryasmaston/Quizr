import { apiFetch } from "./api";

export async function getUserByUsername(username) {
  const userIdRes = await apiFetch(`/users/username/${username}`);
  if (!userIdRes.ok) throw new Error("User not found");
  const { userId } = await userIdRes.json()
  const userRes = await apiFetch(`/users/${userId}`)
  if(!userRes.ok) throw new Error("Unable to fetch user profile")
  const body = await userRes.json()
  // backend returns { user }, unwrap to return the user object directly
  return body.user
}

export async function scheduleAccountDeletion(mode) {
  const res = await apiFetch("/users/me/deletion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode })
  });
  if (!res.ok) throw new Error("Unable to schedule deletion");
  return res.json();
}

export async function cancelAccountDeletion() {
  const res = await apiFetch("/users/me/deletion/cancel", {
    method: "POST"
  });
  if (!res.ok) throw new Error("Unable to cancel deletion");
  return res.json();
}

export async function executeAccountDeletion(mode) {
  const res = await apiFetch("/users/me/deletion/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Unable to delete account");
  }
  return res.json();
}
