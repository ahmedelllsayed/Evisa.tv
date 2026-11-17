import "server-only";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { currentUserHasPermission } from "@/lib/rbac";
import { isFullAdmin } from "@/lib/rbac-constants";

/** Marketing follows the settings permission. Full admins always pass. */
export async function marketingAccess(locale: string) {
  const user = await requireAdmin(locale);
  const full = isFullAdmin(user.role);
  const [canView, canEdit] = await Promise.all([currentUserHasPermission("settings", "view"), currentUserHasPermission("settings", "edit")]);
  if (!canView && !full) redirect(`/${locale}/admin`);
  return { user, full, canEdit: canEdit || full };
}
