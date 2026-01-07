import { apiFetch } from "./api";

export async function addFavourite(quizId) {
  const res = await apiFetch(`/users/me/favourites/${quizId}`, {
    method: "POST"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Unable to add favourite");
  }
  return res.json();
}

export async function removeFavourite(quizId) {
  const res = await apiFetch(`/users/me/favourites/${quizId}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Unable to remove favourite");
  }
  return res.json();
}

export async function toggleFavourite(quizId, isFavourited) {
  return isFavourited ? removeFavourite(quizId) : addFavourite(quizId);
}
