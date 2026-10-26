export const ROLES = ["ADMIN", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];
