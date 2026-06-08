export const FIXED_ROLE_NAMES = [
  "free_student",
  "sub_student",
  "teacher",
  "supervisor",
  "admin",
] as const;

export const STUDENT_ROLE_NAMES = ["free_student", "sub_student"] as const;

export type FixedRoleName = (typeof FIXED_ROLE_NAMES)[number];
export type StudentRoleName = (typeof STUDENT_ROLE_NAMES)[number];

export const isFixedRoleName = (roleName: string): roleName is FixedRoleName => {
  return FIXED_ROLE_NAMES.includes(roleName as FixedRoleName);
};

export const isStudentRoleName = (roleName?: string | null): roleName is StudentRoleName => {
  return !!roleName && STUDENT_ROLE_NAMES.includes(roleName as StudentRoleName);
};
