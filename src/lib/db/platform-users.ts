import { randomBytes } from "crypto";
import { Pool } from "pg";
import { verifyPassword } from "@/lib/auth/crypto";
import type { PlatformSessionUser } from "@/lib/auth/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type PlatformUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN";
  status: "ACTIVE" | "DISABLED";
  passwordHash: string | null;
};

export async function authenticatePlatformUser(
  email: string,
  password: string,
): Promise<PlatformSessionUser | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await pool.query<PlatformUserRow>(
    `SELECT id, email, "firstName", "lastName", role, status, "passwordHash"
     FROM "PlatformUser"
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalized],
  );

  const user = rows[0];
  if (!user || user.status !== "ACTIVE") return null;
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    scope: "platform",
    accountType: "PLATFORM",
  };
}

export async function getPlatformUserById(id: string): Promise<PlatformSessionUser | null> {
  const { rows } = await pool.query<PlatformUserRow>(
    `SELECT id, email, "firstName", "lastName", role, status, "passwordHash"
     FROM "PlatformUser" WHERE id = $1 LIMIT 1`,
    [id],
  );
  const user = rows[0];
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    scope: "platform",
    accountType: "PLATFORM",
  };
}

export function newPlatformId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}
