import api from "./api";

// JWT stays in an HTTP-only cookie. User info is fetched from /api/auth/me.
export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const res = await api.get("/api/auth/me");
  return res.data.user as AuthUser;
}
