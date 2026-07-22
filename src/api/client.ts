import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  isAxiosError,
} from "axios";

import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from "../services/authStorage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.2:8000/api";

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = {
  access: string;
  refresh?: string;
};

type UnauthorizedHandler = () => void | Promise<void>;

class MissingRefreshTokenError extends Error {
  constructor() {
    super("No refresh token is available.");
    this.name = "MissingRefreshTokenError";
  }
}

let refreshPromise: Promise<string> | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null
): void {
  unauthorizedHandler = handler;
}

async function performTokenRefresh(): Promise<string> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    throw new MissingRefreshTokenError();
  }

  const response = await refreshClient.post<RefreshResponse>(
    "/auth/token/refresh/",
    { refresh: refreshToken }
  );

  await saveAccessToken(response.data.access);

  if (response.data.refresh) {
    await saveRefreshToken(response.data.refresh);
  }

  return response.data.access;
}

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function isPermanentRefreshFailure(error: unknown): boolean {
  if (error instanceof MissingRefreshTokenError) {
    return true;
  }

  if (!isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 400 || error.response?.status === 401;
}

API.interceptors.request.use(async (config) => {
  const accessToken = await getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";
    const isAuthenticationRequest = requestUrl.startsWith("/auth/");

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthenticationRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return API.request(originalRequest);
    } catch (refreshError) {
      if (isPermanentRefreshFailure(refreshError)) {
        await clearAuthSession();
        await unauthorizedHandler?.();
      }

      return Promise.reject(refreshError);
    }
  }
);

export default API;
