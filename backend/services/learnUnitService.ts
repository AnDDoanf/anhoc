import prisma from "../lib/db.ts";

type LearnUnitLimitPayload = {
  max_subjects?: number | null;
  max_grades?: number | null;
  max_lessons?: number | null;
  max_templates?: number | null;
  max_teachers?: number | null;
  max_students?: number | null;
};

const LEARN_UNIT_CODE_PREFIX = "LU";

const slugifyFragment = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6)
    .padEnd(6, "X");

export const normalizeLearnUnitCode = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase();

export const createDefaultLearnUnitName = (username: string) => {
  const normalized = username.trim().replace(/[_-]+/g, " ");
  return normalized ? `${normalized} Learn Unit` : "Learn Unit";
};

export const createUniqueLearnUnitCode = async (name: string) => {
  const fragment = slugifyFragment(name || "UNIT");

  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const code = `${LEARN_UNIT_CODE_PREFIX}-${fragment}-${String(suffix).padStart(3, "0")}`;
    const existing = await prisma.learnUnit.findUnique({ where: { code } });
    if (!existing) return code;
  }

  return `${LEARN_UNIT_CODE_PREFIX}-${fragment}-${Date.now().toString().slice(-6)}`;
};

export const getLearnUnitMemberIds = async (learnUnitId: string) => {
  const members = await prisma.user.findMany({
    where: { learn_unit_id: learnUnitId },
    select: { id: true },
  });

  return members.map((member) => member.id);
};

export const getLearnUnitForUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      learn_unit_id: true,
      learn_unit: true,
    },
  });

  return user?.learn_unit ?? null;
};

export const createLearnUnitForSupervisor = async (
  supervisorId: string,
  name: string,
  limits: LearnUnitLimitPayload = {},
  db: typeof prisma = prisma
) => {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Learn unit name is required");
  }

  const code = await createUniqueLearnUnitCode(normalizedName);

  return db.learnUnit.create({
    data: {
      name: normalizedName,
      code,
      supervisor_id: supervisorId,
      ...limits,
      users: {
        connect: { id: supervisorId },
      },
    },
  });
};

export const upsertSupervisorLearnUnit = async (
  supervisorId: string,
  name: string,
  limits: LearnUnitLimitPayload = {},
  db: typeof prisma = prisma
) => {
  const existing = await db.learnUnit.findUnique({
    where: { supervisor_id: supervisorId },
  });

  if (existing) {
    return db.learnUnit.update({
      where: { id: existing.id },
      data: {
        name: name.trim() || existing.name,
        ...limits,
      },
    });
  }

  return createLearnUnitForSupervisor(supervisorId, name, limits, db);
};
