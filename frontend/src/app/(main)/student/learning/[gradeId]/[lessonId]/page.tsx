// app/student/learning/[gradeId]/[lessonId]/page.tsx

import { getLesson } from "@/components/feature/lessonLoader";

type Props = {
  params: Promise<{
    gradeId: string;
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: Props) {
  const { gradeId, lessonId } = await params;
  const lesson = await getLesson(gradeId, lessonId);
  return (
    <div>
      <h1>{lesson.meta.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: lesson.contentHtml }} />
    </div>
  );
}