import { apiFetch } from "./api";

export async function getFriends() {
  const res = await apiFetch("/friends");
  if (!res.ok) throw new Error("Unable fo fetch friends")
  return res.json()
}

export async function getPendingRequests() {
  const res = await apiFetch("/friends/pending/all");
  if (!res.ok) throw new Error("Unable to fetch pending requests");
  return res.json();
}

export async function sendFriendRequest(userId) {
  const res = await apiFetch(`/friends/${userId}`, {
    method: "POST"
  })
  if(!res.ok) throw new Error("Unable to send friend request");
  return res.json();
}

// since I use friendId here, to accept a request you need to call acceptFriendRequest(request._id) not user._id
export async function acceptFriendRequest(friendId) {
  const res = await apiFetch(`/friends/${friendId}/accept`, {
    method: "PATCH"
  })
  if(!res.ok) throw new Error("Unable to accept friend request");
  return res.json();
}

export async function removeRequest(userId) {
  const res = await apiFetch(`/friends/${userId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Unable to remove friend");
  return res.json()
}
