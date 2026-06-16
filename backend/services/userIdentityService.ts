import prisma from "../lib/db.ts";

const MAX_NAME_LENGTH = 50;
const MAX_LOGIN_ID_LENGTH = 50;

const stripDiacritics = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

export const normalizeHumanName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_NAME_LENGTH);

const normalizeLoginIdFragment = (value: string) =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const normalizeLoginIdValue = (value: string) =>
  normalizeLoginIdFragment(value).slice(0, MAX_LOGIN_ID_LENGTH) || "user";

export const buildFullName = (
  firstName: string,
  lastName: string,
  providedFullName?: string
) => {
  const explicitFullName = normalizeHumanName(providedFullName || "");
  if (explicitFullName) {
    return explicitFullName;
  }

  return [normalizeHumanName(firstName), normalizeHumanName(lastName)]
    .filter(Boolean)
    .join(" ");
};

export const buildLoginIdBase = (
  firstName: string,
  lastName: string,
  fallback = "user"
) => {
  const combined = [normalizeLoginIdFragment(firstName), normalizeLoginIdFragment(lastName)]
    .filter(Boolean)
    .join("_");

  return normalizeLoginIdValue(combined || fallback);
};

export const createUniqueDisplayName = async (
  requestedFullName: string,
  fallback = "Student"
) => {
  const baseName = buildFullName("", "", requestedFullName) || normalizeHumanName(fallback) || "Student";

  for (let suffix = 0; suffix < 200; suffix += 1) {
    const candidate = suffix === 0 ? baseName : `${baseName} ${suffix}`;
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) {
      return candidate;
    }
  }

  return `${baseName} ${Date.now().toString().slice(-4)}`.slice(0, MAX_NAME_LENGTH);
};

export const createUniqueLoginId = async (
  firstName: string,
  lastName: string,
  fallback = "user"
) => {
  const base = buildLoginIdBase(firstName, lastName, fallback);

  for (let suffix = 0; suffix < 200; suffix += 1) {
    const suffixText = suffix === 0 ? "" : `_${String(suffix).padStart(2, "0")}`;
    const candidate = normalizeLoginIdValue(`${base}${suffixText}`);
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM users
      WHERE LOWER(login_id) = LOWER(${candidate})
      LIMIT 1
    `;

    if (existing.length === 0) {
      return candidate;
    }
  }

  return normalizeLoginIdValue(`${base}_${Date.now().toString().slice(-6)}`);
};

export const saveUserIdentity = async (
  db: typeof prisma,
  userId: string,
  identity: {
    firstName: string;
    lastName: string;
    loginId: string;
  }
) => {
  const firstName = normalizeHumanName(identity.firstName);
  const lastName = normalizeHumanName(identity.lastName);
  const loginId = normalizeLoginIdValue(identity.loginId);

  await db.$executeRaw`
    UPDATE users
    SET first_name = ${firstName},
        last_name = ${lastName},
        login_id = ${loginId}
    WHERE id = ${userId}::uuid
  `;

  return {
    first_name: firstName,
    last_name: lastName,
    login_id: loginId,
  };
};

export const getUserIdentity = async (userId: string, fallbackFullName = "") => {
  const rows = await prisma.$queryRaw<
    Array<{
      first_name: string | null;
      last_name: string | null;
      login_id: string | null;
      username: string | null;
    }>
  >`
    SELECT first_name, last_name, login_id, username
    FROM users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;

  const row = rows[0];
  const firstName = normalizeHumanName(row?.first_name || "");
  const lastName = normalizeHumanName(row?.last_name || "");
  const fullName = buildFullName(firstName, lastName, row?.username || fallbackFullName);
  const loginId = normalizeLoginIdValue(
    row?.login_id || buildLoginIdBase(firstName, lastName, fullName || fallbackFullName || "user")
  );

  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    login_id: loginId,
  };
};

export const findUserIdByIdentifier = async (identifier: string) => {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM users
    WHERE LOWER(email) = LOWER(${normalized})
       OR LOWER(login_id) = LOWER(${normalized})
    LIMIT 1
  `;

  return rows[0]?.id ?? null;
};
