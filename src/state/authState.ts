export interface AuthState {
  token: string | null;
  user: string | null;
}

export function createAuthState(): AuthState {
  return {
    token: null,
    user: null,
  };
}
