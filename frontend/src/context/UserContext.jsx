import { createContext } from "react";

export const UserContext = createContext({
  userProfile: null,
  favouriteIds: [],
  setFavouriteIds: () => {},
  accountStatus: null,
  accountUsername: null,
  currentUserId: null,
  refreshUser: async () => {},
  isLoading: false
});
