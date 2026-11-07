import "server-only";
import { isFullAdmin } from "@/lib/rbac-constants";
import type { AdminResource } from "@/lib/types";
import { currentUserHasPermission } from "@/lib/rbac";

export type ContentAccess = { canEdit: boolean; canDelete: boolean; canPublish: boolean };

/** Mirrors the `guard` check in the admin server actions so buttons match what the server allows. */
export async function contentAccess(role: string, resource: AdminResource = "content"): Promise<ContentAccess> {
  if (isFullAdmin(role)) return { canEdit: true, canDelete: true, canPublish: true };
  const [canEdit, canDelete, canPublish] = await Promise.all([
    currentUserHasPermission(resource, "edit"),
    currentUserHasPermission(resource, "delete"),
    currentUserHasPermission(resource, "publish"),
  ]);
  return { canEdit, canDelete, canPublish };
}

/** Today's date in Cairo as YYYY-MM-DD, computed on the server and passed to client editors. */
export function cairoToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
