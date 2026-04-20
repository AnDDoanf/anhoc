import { getLesson } from "@/components/feature/lessonLoader";
import TableOfContents from "@/components/feature/TableOfContents";
import LearningRightSidebar from "@/components/feature/LearningRightSidebar";
import TikZRenderer from "@/components/feature/TikZRenderer";
import LessonPracticeButton from "@/components/feature/LessonPracticeButton";
import StudyTimer from "@/components/feature/StudyTimer";
import { getLocale, getTranslations } from "next-intl/server";
import { GraduationCap, ArrowLeft, MoreVertical } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{
    gradeId: string;
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: Props) {
  const { gradeId, lessonId } = await params;
  const locale = await getLocale();
  const t = await getTranslations("Learning");
  const lesson = await getLesson(lessonId, locale);

  // Split content by thematic breaks (---) which become <hr> in HTML
  // Using regex to catch various formats of <hr>
  const sections = lesson.contentHtml.split(/<hr\s*\/?>/i);

  const sidebarContent = (
    <>
      <TableOfContents toc={lesson.toc} />
      <LessonPracticeButton lessonId={lessonId} />

      {/* Decorative Tip */}
      <div className="mt-12 group/tip">
        <div className="p-6 rounded-[2rem] bg-sol-accent/5 border border-sol-accent/10 transition-all hover:bg-sol-accent/10">
          <div className="flex items-center gap-2 text-sol-accent font-black text-xs uppercase tracking-widest mb-3">
            <GraduationCap size={16} />
            <span>{t("proTip")}</span>
          </div>
          <p className="text-xs text-sol-muted leading-relaxed">
            {t("proTipDescription1")}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto mb-20 px-4 relative">
      <StudyTimer lessonId={lessonId} />

      <div className="flex-1 min-w-0 space-y-12">
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center justify-between px-2">
          <Link
            href={`/student/learning/${gradeId}`}
            className="group flex items-center gap-2 text-sm font-bold text-sol-muted hover:text-sol-accent transition-colors"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>{t("backToGrade")}</span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="p-2 text-sol-muted hover:text-sol-text"><MoreVertical size={20} /></button>
          </div>
        </nav>

        {/* Main Header Block */}
        <header className="bg-sol-surface/30 p-10 md:p-16 rounded-[3rem] border border-sol-border/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
            <GraduationCap size={200} className="text-sol-accent -rotate-12" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 text-sol-accent text-sm font-black uppercase tracking-[0.3em] mb-8">
              <div className="w-12 h-[2px] bg-sol-accent/30 rounded-full"></div>
              <span>{t("lessonOverview")}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-sol-text tracking-tight mb-8 leading-[1.05] max-w-3xl">
              {lesson.meta.title}
            </h1>
            <p className="text-lg md:text-xl text-sol-muted leading-relaxed max-w-2xl font-medium">
              {lesson.meta.description}
            </p>
          </div>
        </header>

        {/* Content Blocks */}
        <TikZRenderer key={lessonId}>
          <div className="space-y-12">
            {sections.map((sectionHtml, idx) => (
              <article
                key={idx}
                className="bg-sol-surface/20 p-10 md:p-16 rounded-[3rem] border border-sol-border/5 shadow-sm hover:shadow-2xl hover:bg-sol-surface/30 transition-all duration-500 relative group overflow-hidden"
              >
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-sol-accent/5 rounded-full flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                  <span className="text-4xl font-black text-sol-accent/10">{idx + 1}</span>
                </div>

                <div
                  className="lesson-content max-w-none 
                    [&>h2]:text-3xl [&>h2:first-child]:mt-0 [&>h2]:font-black [&>h2]:mt-20 [&>h2]:mb-10 [&>h2]:text-sol-text [&>h2]:tracking-tight
                    [&>h3]:text-2xl [&>h3:first-child]:mt-0 [&>h3]:font-black [&>h3]:mt-12 [&>h3]:mb-8 [&>h3]:text-sol-text [&>h3]:tracking-tight
                    [&>p]:text-lg [&>p]:mb-8 [&>p]:leading-[2] [&>p]:text-sol-text/80 [&>p]:font-medium
                    [&_ul]:list-disc [&_ul]:pl-10 [&_ul]:mb-10 [&_ul]:space-y-4 [&_ul]:text-sol-text/70
                    [&_ol]:list-decimal [&_ol]:pl-10 [&_ol]:mb-10 [&_ol]:space-y-4 [&_ol]:text-sol-text/70
                    [&_li]:text-lg [&_li]:leading-[2]
                    [&_.katex-display]:text-center [&_.katex-display]:my-16 [&_.katex-display]:w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-4
                    [&>pre]:bg-sol-bg/40 [&>pre]:p-10 [&>pre]:rounded-[2rem] [&>pre]:border [&>pre]:border-sol-border/10 [&>pre]:my-12 [&>pre]:shadow-2xl
                    [&>blockquote]:border-l-[6px] [&>blockquote]:border-sol-accent [&>blockquote]:pl-10 [&>blockquote]:italic [&>blockquote]:my-12 [&>blockquote]:text-sol-muted [&>blockquote]:bg-sol-accent/5 [&>blockquote]:py-10 [&>blockquote]:pr-10 [&>blockquote]:rounded-r-[2.5rem]"
                  dangerouslySetInnerHTML={{ __html: sectionHtml }}
                />
              </article>
            ))}
          </div>
        </TikZRenderer>
      </div>

      <LearningRightSidebar>
        {sidebarContent}
      </LearningRightSidebar>
    </div>
  );
}
