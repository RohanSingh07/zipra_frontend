import { createContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

type AuthContextType = {
  user: any;
  loading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    const storedUser = await SecureStore.getItemAsync("user");
    const token = await SecureStore.getItemAsync("access_token");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  };

  const login = async (data: any) => {
    await SecureStore.setItemAsync("user", JSON.stringify(data.user));
    await SecureStore.setItemAsync("access_token", data.access);

    setUser(data.user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("user");
    await SecureStore.deleteItemAsync("access_token");

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}