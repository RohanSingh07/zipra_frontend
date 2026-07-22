import { create } from "zustand";

type UIState = {
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  tabBarVisible: true,
  setTabBarVisible: (tabBarVisible) => set({ tabBarVisible }),
}));
