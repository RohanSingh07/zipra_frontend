import { create } from "zustand";

import {
  isPermanentRefreshFailure,
  refreshAccessToken,
  setUnauthorizedHandler,
} from "../api/client";
import {
  AuthUser,
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from "../services/authStorage";
import { useHomeStore } from "./homeStore";
import { useLocationStore } from "./locationStore";

type LoginData = {
  user: AuthUser;
  access: string;
  refresh: string;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
};

let initializationPromise: Promise<void> | null = null;

function clearAuthenticatedAppState() {
  useLocationStore.getState().clearSelectedLocation();
  useLocationStore.getState().resetRuntimeState();
  useHomeStore.getState().clearHome();
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,

  initialize: () => {
    setUnauthorizedHandler(() => {
      clearAuthenticatedAppState();
      set({ user: null, loading: false });
    });

    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
      try {
        const session = await loadAuthSession();

        if (!session.user || !session.refreshToken) {
          await clearAuthSession();
          clearAuthenticatedAppState();
          set({ user: null });
          return;
        }

        try {
          await refreshAccessToken();
          set({ user: session.user });
        } catch (error) {
          if (isPermanentRefreshFailure(error)) {
            await clearAuthSession();
            clearAuthenticatedAppState();
            set({ user: null });
            return;
          }

          // Keep a valid saved session during a temporary network failure.
          set({ user: session.user });
        }
      } catch (error) {
        console.log("AUTH RESTORE ERROR", error);
        set({ user: null });
      } finally {
        set({ loading: false, initialized: true });
      }
    })();

    return initializationPromise;
  },

  login: async (data) => {
    await saveAuthSession({
      user: data.user,
      accessToken: data.access,
      refreshToken: data.refresh,
    });

    set({ user: data.user, loading: false });
  },

  logout: async () => {
    await clearAuthSession();
    clearAuthenticatedAppState();
    set({ user: null, loading: false });
  },
}));