import { createSignal } from "solid-js";
import { setAuthToken as setTauriAuthToken } from "../lib/tauri-api";

// Supabase configuration for DUMO Works
const SUPABASE_URL = "https://chzzjbcnmfijzpyppwbj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoenpqYmNubWZpanpweXBwd2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTM0NzksImV4cCI6MjA3MjM2OTQ3OX0.Mi9QNOuqi6pw0TNuIGlnFfPlgMnKhGeEOZHM50A-FOo";

const DUMO_WORKS_URL = "https://works.dumo.kr";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
}

const AUTH_STORAGE_KEY = "dumo-cowork-auth";

const [authState, setAuthState] = createSignal<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  refreshToken: null,
  error: null,
});

// Persist auth tokens to localStorage
function persistAuth(accessToken: string, refreshToken: string) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      accessToken,
      refreshToken,
      savedAt: Date.now(),
    }));
  } catch (e) {
    console.error("[auth] Failed to persist auth:", e);
  }
}

function clearPersistedAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error("[auth] Failed to clear auth:", e);
  }
}

function loadPersistedAuth(): { accessToken: string; refreshToken: string } | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
  } catch {
    return null;
  }
}

// Supabase REST API helpers
async function supabaseSignIn(email: string, password: string): Promise<{
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; user_metadata?: any };
}> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || error.msg || "Login failed");
  }

  return response.json();
}

async function supabaseRefreshToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; user_metadata?: any };
}> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  return response.json();
}

// Verify token with dumo-works server and get user profile
async function verifyToken(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${DUMO_WORKS_URL}/api/cowork/auth/verify`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Token verification failed");
  }

  const data = await response.json();
  const resUser = data.user;
  return {
    ...resUser,
    displayName: resUser.displayName || resUser.name || resUser.full_name || resUser.email,
  };
}

// Login with email and password
export async function login(identifier: string, password: string): Promise<void> {
  setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

  try {
    // Normalize identifier - append @dumo.kr if no domain
    const email = identifier.includes("@") ? identifier : `${identifier}@dumo.kr`;

    // Sign in via Supabase REST API
    const authResult = await supabaseSignIn(email, password);

    // Persist tokens
    persistAuth(authResult.access_token, authResult.refresh_token);

    // Verify with dumo-works to get display name
    let user: AuthUser;
    try {
      user = await verifyToken(authResult.access_token);
    } catch {
      // Fallback if dumo-works is unreachable
      const meta = authResult.user.user_metadata || {};
      user = {
        id: authResult.user.id,
        email: authResult.user.email,
        displayName: meta.name || meta.full_name || meta.display_name || authResult.user.email,
      };
    }

    // Sync token to Rust backend
    setTauriAuthToken(authResult.access_token, DUMO_WORKS_URL).catch(() => {});

    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken: authResult.access_token,
      refreshToken: authResult.refresh_token,
      error: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      error: message === "Invalid login credentials"
        ? "invalid_credentials"
        : message,
    }));
  }
}

// Logout
export function logout() {
  clearPersistedAuth();
  setTauriAuthToken(null).catch(() => {});
  setAuthState({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    error: null,
  });
}

// Refresh access token
export async function refreshAccessToken(): Promise<string | null> {
  const state = authState();
  if (!state.refreshToken) return null;

  try {
    const result = await supabaseRefreshToken(state.refreshToken);
    persistAuth(result.access_token, result.refresh_token);

    setAuthState(prev => ({
      ...prev,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
    }));

    return result.access_token;
  } catch {
    // Refresh failed — force re-login
    logout();
    return null;
  }
}

// Get a valid access token (auto-refresh if needed)
export async function getValidToken(): Promise<string | null> {
  const state = authState();
  if (!state.accessToken) return null;

  // Check if token looks expired (JWT exp check)
  try {
    const payload = JSON.parse(atob(state.accessToken.split(".")[1]));
    const expiresAt = payload.exp * 1000;
    const buffer = 60 * 1000; // 1 minute buffer

    if (Date.now() >= expiresAt - buffer) {
      return refreshAccessToken();
    }
  } catch {
    // If we can't parse the token, try to use it anyway
  }

  return state.accessToken;
}

// Initialize auth on app startup
export async function initAuth() {
  const persisted = loadPersistedAuth();

  if (!persisted) {
    setAuthState(prev => ({ ...prev, isLoading: false }));
    return;
  }

  try {
    // Try to refresh the token first
    const result = await supabaseRefreshToken(persisted.refreshToken);
    persistAuth(result.access_token, result.refresh_token);

    // Get user info
    let user: AuthUser;
    try {
      user = await verifyToken(result.access_token);
    } catch {
      const meta = result.user.user_metadata || {};
      user = {
        id: result.user.id,
        email: result.user.email,
        displayName: meta.name || meta.full_name || meta.display_name || result.user.email,
      };
    }

    // Sync token to Rust backend
    setTauriAuthToken(result.access_token, DUMO_WORKS_URL).catch(() => {});

    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      error: null,
    });
  } catch {
    // Persisted tokens are invalid
    clearPersistedAuth();
    setAuthState(prev => ({ ...prev, isLoading: false }));
  }
}

export function useAuth() {
  return {
    authState,
    login,
    logout,
    getValidToken,
    initAuth,
    dumoWorksUrl: DUMO_WORKS_URL,
  };
}
