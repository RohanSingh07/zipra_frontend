import * as SecureStore from "expo-secure-store";

export type AuthUser = {
  id: number;
  phone: string;
  name: string;
  role: string;
};

export type AuthSession = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
};

const AUTH_KEYS = {
  user: "user",
  accessToken: "access_token",
  refreshToken: "refresh_token",
} as const;

export async function loadAuthSession(): Promise<AuthSession> {
  const [storedUser, accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(AUTH_KEYS.user),
    SecureStore.getItemAsync(AUTH_KEYS.accessToken),
    SecureStore.getItemAsync(AUTH_KEYS.refreshToken),
  ]);

  let user: AuthUser | null = null;

  if (storedUser) {
    try {
      user = JSON.parse(storedUser) as AuthUser;
    } catch {
      await clearAuthSession();
    }
  }

  return { user, accessToken, refreshToken };
}

export async function saveAuthSession(session: {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(AUTH_KEYS.user, JSON.stringify(session.user)),
    SecureStore.setItemAsync(AUTH_KEYS.accessToken, session.accessToken),
    SecureStore.setItemAsync(AUTH_KEYS.refreshToken, session.refreshToken),
  ]);
}

export function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_KEYS.accessToken);
}

export function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_KEYS.refreshToken);
}

export function saveAccessToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(AUTH_KEYS.accessToken, token);
}

export function saveRefreshToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(AUTH_KEYS.refreshToken, token);
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_KEYS.user),
    SecureStore.deleteItemAsync(AUTH_KEYS.accessToken),
    SecureStore.deleteItemAsync(AUTH_KEYS.refreshToken),
  ]);
}
