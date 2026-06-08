import prisma from "../lib/db.ts";

type ViewerContext = {
  id?: string | null;
  role?: string | null;
  learn_unit_id?: string | null;
};

type SubjectWithCreator = {
  id: number;
  slug: string;
  title_en: string;
  title_vi: string;
  color: string | null;
  is_classified: boolean;
  created_by: string | null;
  creator: {
    id: string;
    learn_unit_id: string | null;
    role: {
      name: string;
    };
  } | null;
};

type StandaloneTemplateLike = {
  created_by?: string | null;
  creator?: {
    role?: {
      name?: string | null;
    } | null;
    learn_unit_id?: string | null;
  } | null;
};

const isAdminRole = (role?: string | null) => role === "admin";

const buildCreatorVisibilityClauses = (learnUnitId: string | null) => ([
  { created_by: null },
  { creator: { role: { name: "admin" } } },
  ...(learnUnitId ? [{ creator: { learn_unit_id: learnUnitId } }] : []),
]);

const resolveViewerLearnUnitId = async (viewer?: ViewerContext | null) => {
  if (!viewer?.id) return null;
  if (typeof viewer.learn_unit_id !== "undefined") {
    return viewer.learn_unit_id ?? null;
  }

  const user = await prisma.user.findUnique({
    where: { id: viewer.id },
    select: { learn_unit_id: true },
  });

  return user?.learn_unit_id ?? null;
};

const globalSubjectWhere = {
  OR: [
    { created_by: null },
    { creator: { role: { name: "admin" } } },
  ],
} as const;

const visibleSubjectSelect = {
  id: true,
  slug: true,
  title_en: true,
  title_vi: true,
  color: true,
  is_classified: true,
  created_by: true,
  creator: {
    select: {
      id: true,
      learn_unit_id: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

const isPrivateLearnUnitSubject = (subject: SubjectWithCreator) =>
  Boolean(subject.creator?.learn_unit_id) && subject.creator?.role?.name !== "admin";

const isGlobalSubject = (subject: SubjectWithCreator) => !isPrivateLearnUnitSubject(subject);

export const getVisibleSubjectsForViewer = async (viewer?: ViewerContext | null) => {
  if (isAdminRole(viewer?.role)) {
    return prisma.subject.findMany({
      orderBy: { id: "asc" },
      select: visibleSubjectSelect,
    });
  }

  const learnUnitId = await resolveViewerLearnUnitId(viewer);
  const where = viewer?.id
    ? {
        OR: [
          globalSubjectWhere,
          ...(learnUnitId ? [{ creator: { learn_unit_id: learnUnitId } }] : []),
        ],
      }
    : {
        is_classified: false,
        ...globalSubjectWhere,
      };

  return prisma.subject.findMany({
    where,
    orderBy: { id: "asc" },
    select: visibleSubjectSelect,
  });
};

export const getAllowedSubjectIdsForViewer = async (viewer?: ViewerContext | null): Promise<number[] | null> => {
  if (isAdminRole(viewer?.role)) return null;

  const subjects = await getVisibleSubjectsForViewer(viewer);
  if (!viewer?.id) {
    return subjects.filter((subject) => isGlobalSubject(subject) && !subject.is_classified).map((subject) => subject.id);
  }

  const approvedRequests = await prisma.userSubjectAccessRequest.findMany({
    where: {
      user_id: viewer.id,
      status: "approved",
    },
    select: { subject_id: true },
  });
  const approvedSubjectIds = new Set(approvedRequests.map((request) => request.subject_id));

  return subjects
    .filter((subject) => {
      if (isPrivateLearnUnitSubject(subject)) return true;
      if (!subject.is_classified) return true;
      return approvedSubjectIds.has(subject.id);
    })
    .map((subject) => subject.id);
};

export const getSubjectCatalogForViewer = async (viewer: ViewerContext) => {
  if (isAdminRole(viewer.role)) {
    const subjects = await prisma.subject.findMany({
      orderBy: { id: "asc" },
    });

    return subjects.map((subject) => ({
      ...subject,
      role_visible: true,
      has_access: true,
      request_status: subject.is_classified ? "approved" : null,
    }));
  }

  const subjects = await getVisibleSubjectsForViewer(viewer);
  const requests = await prisma.userSubjectAccessRequest.findMany({
    where: { user_id: viewer.id as string },
    select: { subject_id: true, status: true },
  });
  const requestMap = new Map(requests.map((request) => [request.subject_id, request.status]));

  return subjects.map((subject) => {
    const requestStatus = requestMap.get(subject.id) ?? null;
    const privateLearnUnitSubject = isPrivateLearnUnitSubject(subject);
    const hasAccess = privateLearnUnitSubject || !subject.is_classified || requestStatus === "approved";

    return {
      id: subject.id,
      slug: subject.slug,
      title_en: subject.title_en,
      title_vi: subject.title_vi,
      color: subject.color,
      is_classified: subject.is_classified,
      created_by: subject.created_by,
      role_visible: true,
      has_access: hasAccess,
      request_status: privateLearnUnitSubject ? null : (subject.is_classified ? requestStatus : null),
    };
  });
};

export const canRequestSubjectAccess = async (viewer: ViewerContext, subjectId: number) => {
  const subjects = await getVisibleSubjectsForViewer(viewer);
  const subject = subjects.find((item) => item.id === subjectId);
  if (!subject) return { allowed: false, reason: "Subject not found or not visible" };
  if (isPrivateLearnUnitSubject(subject)) {
    return { allowed: false, reason: "Learn unit content does not support enrollment requests" };
  }
  if (!subject.is_classified) {
    return { allowed: false, reason: "This subject does not require approval" };
  }

  return { allowed: true, subject };
};

export const getVisibleGradeWhereForViewer = async (viewer?: ViewerContext | null) => {
  if (isAdminRole(viewer?.role)) return {};

  const [subjectIds, learnUnitId] = await Promise.all([
    getAllowedSubjectIdsForViewer(viewer),
    resolveViewerLearnUnitId(viewer),
  ]);

  return {
    AND: [
      { subject_id: { in: subjectIds ?? [] } },
      { OR: buildCreatorVisibilityClauses(learnUnitId) },
    ],
  };
};

export const getVisibleLessonWhereForViewer = async (viewer?: ViewerContext | null) => {
  if (isAdminRole(viewer?.role)) return {};

  const [subjectIds, learnUnitId] = await Promise.all([
    getAllowedSubjectIdsForViewer(viewer),
    resolveViewerLearnUnitId(viewer),
  ]);

  return {
    AND: [
      { subject_id: { in: subjectIds ?? [] } },
      { OR: buildCreatorVisibilityClauses(learnUnitId) },
    ],
  };
};

export const getVisibleLessonIdsForViewer = async (viewer?: ViewerContext | null) => {
  if (isAdminRole(viewer?.role)) {
    const lessons = await prisma.lesson.findMany({
      select: { id: true },
    });
    return lessons.map((lesson) => lesson.id);
  }

  const where = await getVisibleLessonWhereForViewer(viewer);
  const lessons = await prisma.lesson.findMany({
    where,
    select: { id: true },
  });

  return lessons.map((lesson) => lesson.id);
};

export const canAccessLessonForViewer = async (viewer: ViewerContext | undefined, lessonId?: string | null) => {
  if (!lessonId) return true;
  if (isAdminRole(viewer?.role)) return true;

  const where = await getVisibleLessonWhereForViewer(viewer);
  const lesson = await prisma.lesson.findFirst({
    where: {
      AND: [
        where,
        { id: lessonId },
      ],
    },
    select: { id: true },
  });

  return Boolean(lesson);
};

export const getVisibleTemplateWhereForViewer = async (viewer?: ViewerContext | null) => {
  if (isAdminRole(viewer?.role)) return {};

  const lessonIds = await getVisibleLessonIdsForViewer(viewer);
  const learnUnitId = await resolveViewerLearnUnitId(viewer);
  const templateClauses: Record<string, unknown>[] = [];

  if (lessonIds.length > 0) {
    templateClauses.push({
      lesson_id: { in: lessonIds },
      OR: buildCreatorVisibilityClauses(learnUnitId),
    });
  }

  templateClauses.push({
    lesson_id: null,
    OR: [
      { created_by: null },
      { creator: { role: { name: "admin" } } },
    ],
  });

  if (learnUnitId) {
    templateClauses.push({
      lesson_id: null,
      creator: { learn_unit_id: learnUnitId },
    });
  }

  return templateClauses.length > 0
    ? { OR: templateClauses }
    : { id: "__never_match_template__" };
};

export const canAccessStandaloneTemplate = async (
  viewer: ViewerContext | undefined,
  template: StandaloneTemplateLike
) => {
  if (isAdminRole(viewer?.role)) return true;
  if (!template.created_by || template.creator?.role?.name === "admin") return true;

  const learnUnitId = await resolveViewerLearnUnitId(viewer);
  return Boolean(learnUnitId && learnUnitId === (template.creator?.learn_unit_id ?? null));
};
