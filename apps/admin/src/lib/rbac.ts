/** RBAC roles for admin console (Prompt 6) */
export type AdminRole = "analyst" | "data-admin" | "source-admin" | "engine-admin";

export type Permission =
  | "corrections:read"
  | "corrections:write"
  | "identity:read"
  | "identity:resolve"
  | "providers:read"
  | "providers:edit-policy"
  | "qualification:read"
  | "qualification:configure";

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  analyst: ["corrections:read", "identity:read", "providers:read", "qualification:read"],
  "data-admin": [
    "corrections:read",
    "corrections:write",
    "identity:read",
    "identity:resolve",
    "providers:read",
    "qualification:read",
  ],
  "source-admin": [
    "providers:read",
    "providers:edit-policy",
    "identity:read",
    "identity:resolve",
  ],
  "engine-admin": ["qualification:read", "qualification:configure", "corrections:read"],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Clerk integration stub — replace with real session in production */
export function getCurrentRole(): AdminRole {
  return (import.meta.env.VITE_ADMIN_ROLE as AdminRole) ?? "data-admin";
}
