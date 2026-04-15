// JWT is stored in an HTTP-only cookie managed by the backend.
// Only non-sensitive user metadata (id, email, role) is kept in localStorage
// for UI purposes such as role-based redirects and displaying the user's name.
export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function setUser(user: AuthUser): void {
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem("user");
}
