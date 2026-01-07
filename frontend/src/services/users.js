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
