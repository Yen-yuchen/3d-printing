import type { AuthState } from "../state/authState";
import { STORAGE_KEYS } from "../utils/constants";
import { fetchJson } from "./apiClient";

export interface LoginResponse {
  token: string;
}

export interface UserExistsResponse {
  exists: boolean;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return fetchJson<LoginResponse>("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function loginByKnownEmail(email: string): Promise<boolean> {
  const result = await fetchJson<UserExistsResponse>(
    `/api/users/exists?email=${encodeURIComponent(email)}`,
  );
  return !!result.exists;
}

export function readStoredAuth(): AuthState {
  return {
    token: localStorage.getItem(STORAGE_KEYS.authToken),
    user: localStorage.getItem(STORAGE_KEYS.authUser),
  };
}

export function writeStoredAuth(token: string | null, username?: string | null): AuthState {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.authToken, token);
    if (username) {
      localStorage.setItem(STORAGE_KEYS.authUser, username);
    }
  } else {
    localStorage.removeItem(STORAGE_KEYS.authToken);
    localStorage.removeItem(STORAGE_KEYS.authUser);
  }

  return readStoredAuth();
}
