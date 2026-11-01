import "server-only";
import type { AdminRole, StaffProfile } from "@/lib/types";
import { json, one, sql } from "./db";

export type StaffWithUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
  phone: string | null;
  banned: boolean;
  createdAt: string;
  staff: StaffProfile | null;
};

/**
 * Get staff member by user ID
 */
export async function getStaffProfile(userId: string): Promise<StaffProfile | null> {
  const row = await one(
    `SELECT user_id, department, specialty, max_applications, notes, active, hired_at, created_at, updated_at
     FROM staff_profiles WHERE user_id = $1`,
    [userId]
  );

  if (!row) return null;

  return {
    userId: String(row.user_id),
    department: row.department ? String(row.department) : null,
    specialty: Array.isArray(row.specialty) ? row.specialty.map(String) : [],
    maxApplications: Number(row.max_applications) || 10,
    notes: row.notes ? String(row.notes) : null,
    active: Boolean(row.active),
    hiredAt: row.hired_at ? String(row.hired_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * List all staff members (admin roles only)
 */
export async function listStaff(): Promise<StaffWithUser[]> {
  const rows = await sql(
    `SELECT p.id, p.email, p.full_name, p.role, p.phone, p.banned, p.created_at,
            s.user_id as staff_user_id, s.department, s.specialty, s.max_applications,
            s.notes, s.active, s.hired_at,
            s.created_at as staff_created_at, s.updated_at as staff_updated_at
     FROM profiles p
     LEFT JOIN staff_profiles s ON s.user_id = p.id
     WHERE p.role != 'user'
     ORDER BY
       CASE p.role
         WHEN 'super_admin' THEN 1
         WHEN 'admin' THEN 2
         WHEN 'manager' THEN 3
         WHEN 'operator' THEN 4
         WHEN 'support' THEN 5
         WHEN 'viewer' THEN 6
         ELSE 7
       END,
       p.full_name ASC`
  );

  return rows.map((row) => ({
    id: String(row.id),
    email: String(row.email),
    fullName: row.full_name ? String(row.full_name) : null,
    role: String(row.role) as AdminRole,
    phone: row.phone ? String(row.phone) : null,
    banned: Boolean(row.banned),
    createdAt: String(row.created_at),
    staff: row.staff_user_id
      ? {
          userId: String(row.staff_user_id),
          department: row.department ? String(row.department) : null,
          specialty: Array.isArray(row.specialty) ? row.specialty.map(String) : [],
          maxApplications: Number(row.max_applications) || 10,
          notes: row.notes ? String(row.notes) : null,
          active: Boolean(row.active),
          hiredAt: row.hired_at ? String(row.hired_at) : null,
          createdAt: String(row.staff_created_at),
          updatedAt: String(row.staff_updated_at),
        }
      : null,
  }));
}

/**
 * Create or update staff profile
 */
export async function upsertStaffProfile(
  userId: string,
  input: {
    department?: string | null;
    specialty?: string[];
    maxApplications?: number;
    notes?: string | null;
    active?: boolean;
    hiredAt?: string | null;
  }
): Promise<void> {
  await sql(
    `INSERT INTO staff_profiles (user_id, department, specialty, max_applications, notes, active, hired_at)
     VALUES ($1, $2, $3::text[], $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       department = EXCLUDED.department,
       specialty = EXCLUDED.specialty,
       max_applications = EXCLUDED.max_applications,
       notes = EXCLUDED.notes,
       active = EXCLUDED.active,
       hired_at = EXCLUDED.hired_at,
       updated_at = NOW()`,
    [
      userId,
      input.department ?? null,
      input.specialty ?? [],
      input.maxApplications ?? 10,
      input.notes ?? null,
      input.active ?? true,
      input.hiredAt ?? null,
    ]
  );
}

/**
 * Delete staff profile
 */
export async function deleteStaffProfile(userId: string): Promise<void> {
  await sql("DELETE FROM staff_profiles WHERE user_id = $1", [userId]);
}

/**
 * Get staff workload (applications assigned)
 */
export async function getStaffWorkload(userId: string): Promise<{ total: number; pending: number; late: number }> {
  const row = await one(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status IN ('submitted', 'in_review')) as pending,
       COUNT(*) FILTER (WHERE status IN ('submitted', 'in_review') AND guaranteed_at < NOW()) as late
     FROM applications
     WHERE assignee_id = $1`,
    [userId]
  );

  return {
    total: Number(row?.total) || 0,
    pending: Number(row?.pending) || 0,
    late: Number(row?.late) || 0,
  };
}

/**
 * Get staff with least workload (for auto-assignment)
 */
export async function getLeastBusyStaff(specialty?: string): Promise<string | null> {
  let query = `
    SELECT p.id, COUNT(a.id) as workload
    FROM profiles p
    INNER JOIN staff_profiles s ON s.user_id = p.id
    LEFT JOIN applications a ON a.assignee_id = p.id AND a.status IN ('submitted', 'in_review')
    WHERE p.role IN ('admin', 'manager', 'operator')
      AND s.active = true
  `;

  const params: unknown[] = [];

  if (specialty) {
    query += ` AND $1 = ANY(s.specialty)`;
    params.push(specialty);
  }

  query += `
    GROUP BY p.id, s.max_applications
    HAVING COUNT(a.id) < s.max_applications
    ORDER BY workload ASC
    LIMIT 1
  `;

  const row = await one(query, params);
  return row ? String(row.id) : null;
}

/**
 * Get staff performance metrics
 */
export async function getStaffPerformance(userId: string, days: number = 30): Promise<{
  processed: number;
  approved: number;
  rejected: number;
  avgProcessingHours: number;
}> {
  const row = await one(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('approved', 'rejected', 'cancelled')) as processed,
       COUNT(*) FILTER (WHERE status = 'approved') as approved,
       COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
       AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) FILTER (WHERE status IN ('approved', 'rejected')) as avg_hours
     FROM applications
     WHERE assignee_id = $1
       AND created_at >= NOW() - INTERVAL '1 day' * $2`,
    [userId, days]
  );

  return {
    processed: Number(row?.processed) || 0,
    approved: Number(row?.approved) || 0,
    rejected: Number(row?.rejected) || 0,
    avgProcessingHours: Number(row?.avg_hours) || 0,
  };
}

/**
 * Get all staff performance for leaderboard
 */
export async function getAllStaffPerformance(days: number = 30): Promise<
  Array<{
    userId: string;
    fullName: string | null;
    role: AdminRole;
    processed: number;
    approved: number;
    rejected: number;
    avgProcessingHours: number;
  }>
> {
  const rows = await sql(
    `SELECT
       p.id, p.full_name, p.role,
       COUNT(a.id) FILTER (WHERE a.status IN ('approved', 'rejected', 'cancelled')) as processed,
       COUNT(a.id) FILTER (WHERE a.status = 'approved') as approved,
       COUNT(a.id) FILTER (WHERE a.status = 'rejected') as rejected,
       AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at)) / 3600) FILTER (WHERE a.status IN ('approved', 'rejected')) as avg_hours
     FROM profiles p
     LEFT JOIN applications a ON a.assignee_id = p.id
       AND a.created_at >= NOW() - INTERVAL '1 day' * $1
     WHERE p.role IN ('super_admin', 'admin', 'manager', 'operator')
     GROUP BY p.id, p.full_name, p.role
     ORDER BY processed DESC`,
    [days]
  );

  return rows.map((row) => ({
    userId: String(row.id),
    fullName: row.full_name ? String(row.full_name) : null,
    role: String(row.role) as AdminRole,
    processed: Number(row.processed) || 0,
    approved: Number(row.approved) || 0,
    rejected: Number(row.rejected) || 0,
    avgProcessingHours: Number(row.avg_hours) || 0,
  }));
}
