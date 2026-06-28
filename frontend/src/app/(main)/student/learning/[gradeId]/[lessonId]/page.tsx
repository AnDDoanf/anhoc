import { getLesson, getGradeLessons } from "@/components/feature/lessonLoader";
import TableOfContents from "@/components/feature/TableOfContents";
import LearningRightSidebar from "@/components/feature/LearningRightSidebar";
import TikZRenderer from "@/components/feature/TikZRenderer";
import LessonPracticeButton from "@/components/feature/LessonPracticeButton";
import StudyTimer from "@/components/feature/StudyTimer";
import { getLocale, getTranslations } from "next-intl/server";
import { GraduationCap, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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

  if (!lesson) {
    notFound();
  }

  // Fetch sibling lessons in the same grade
  const gradeLessons = await getGradeLessons(gradeId, locale);
  // Find current index
  const currentIndex = gradeLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? gradeLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex !== -1 && currentIndex < gradeLessons.length - 1 ? gradeLessons[currentIndex + 1] : null;

  // Split content by thematic breaks (---) which become <hr> in HTML
  // Using regex to catch various formats of <hr>
  const sections = lesson.contentHtml.split(/<hr\s*\/?>/i);

  const sidebarContent = (
    <>
      <TableOfContents toc={lesson.toc} />
      <LessonPracticeButton lesson={{ id: lessonId, title_en: lesson.meta.title, title_vi: lesson.meta.title }} />

      <div className="mt-12 group/tip">
        <div className="p-6 rounded-[2rem] bg-sol-accent/10 border border-sol-accent/20 transition-all hover:bg-sol-accent/20">
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
    <div className="flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto mb-20 px-0 sm:px-4 relative">
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
        </nav>

        {/* Main Header Block */}
        <header className="bg-sol-surface p-5 sm:p-8 md:p-12 rounded-3xl sm:rounded-[2.5rem] md:rounded-[3rem] border border-sol-border/30 shadow-xl sm:shadow-2xl relative overflow-hidden group">
          {/* Premium Pulsing Gradient Glows aligned with student/games */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sol-accent/15 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sol-orange/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

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
                className="bg-sol-surface p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] md:rounded-[3rem] border border-sol-border/20 shadow-sm hover:shadow-2xl hover:bg-sol-surface/80 transition-all duration-500 relative group overflow-hidden"
              >
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-sol-accent/5 rounded-full flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                  <span className="text-4xl font-black text-sol-accent/10">{idx + 1}</span>
                </div>

                <div
                  className="lesson-content max-w-none 
                    [&>h2]:text-2xl md:[&>h2]:text-3xl [&>h2:first-child]:mt-0 [&>h2]:font-black [&>h2]:mt-16 md:[&>h2]:mt-20 [&>h2]:mb-8 md:[&>h2]:mb-10 [&>h2]:text-sol-text [&>h2]:tracking-tight
                    [&>h3]:text-xl md:[&>h3]:text-2xl [&>h3:first-child]:mt-0 [&>h3]:font-black [&>h3]:mt-10 md:[&>h3]:mt-12 [&>h3]:mb-6 md:[&>h3]:mb-8 [&>h3]:text-sol-text [&>h3]:tracking-tight
                    [&>p]:text-base md:[&>p]:text-lg [&>p]:mb-6 md:[&>p]:mb-8 [&>p]:leading-relaxed md:[&>p]:leading-[2] [&>p]:text-sol-text/80 [&>p]:font-medium
                    [&_ul]:list-disc [&_ul]:pl-6 md:[_ul]:pl-10 [&_ul]:mb-8 md:[_ul]:mb-10 [&_ul]:space-y-3 md:[_ul]:space-y-4 [&_ul]:text-sol-text/70
                    [&_ol]:list-decimal [&_ol]:pl-6 md:[_ol]:pl-10 [&_ol]:mb-8 md:[_ol]:mb-10 [&_ol]:space-y-3 md:[_ol]:space-y-4 [&_ol]:text-sol-text/70
                    [&_li]:text-base md:[&_li]:text-lg [&_li]:leading-relaxed md:[&_li]:leading-[2]
                    [&_.katex-display]:text-center [&_.katex-display]:my-10 md:[_.katex-display]:my-16 [&_.katex-display]:w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-4
                    [&>pre]:bg-sol-bg [&>pre]:p-4 sm:[&>pre]:p-6 md:[&>pre]:p-8 [&>pre]:rounded-2xl md:[&>pre]:rounded-[2.5rem] [&>pre]:border [&>pre]:border-sol-border/20 [&>pre]:my-6 md:[&>pre]:my-10 [&>pre]:shadow-2xl
                    [&>blockquote]:border-l-4 md:[&>blockquote]:border-l-[6px] [&>blockquote]:border-sol-accent [&>blockquote]:pl-4 sm:[&>blockquote]:pl-6 md:[&>blockquote]:pl-8 [&>blockquote]:italic [&>blockquote]:my-6 md:[&>blockquote]:my-10 [&>blockquote]:text-sol-muted [&>blockquote]:bg-sol-accent/5 [&>blockquote]:p-4 sm:[&>blockquote]:p-6 md:[&>blockquote]:py-8 md:[&>blockquote]:pr-8 [&>blockquote]:rounded-r-2xl md:[&>blockquote]:rounded-r-[2.5rem]
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-8 [&_table]:text-left
                    [&_th]:border-b-2 [&_th]:border-sol-border/30 [&_th]:p-2 sm:[&_th]:p-3 [&_th]:font-black [&_th]:text-sol-text
                    [&_td]:border-b [&_td]:border-sol-border/10 [&_td]:p-2 sm:[&_td]:p-3 [&_td]:text-sol-text/80 [&_tr:nth-child(even)]:bg-sol-bg/20"
                  dangerouslySetInnerHTML={{ __html: sectionHtml }}
                />
              </article>
            ))}
          </div>
        </TikZRenderer>

        {/* Mobile Practice & Pro Tip Block (hidden on xl screens where sidebar is visible) */}
        <div className="block xl:hidden space-y-6 px-2">
          <LessonPracticeButton lesson={{ id: lessonId, title_en: lesson.meta.title, title_vi: lesson.meta.title }} />
          
          <div className="group/tip">
            <div className="p-6 rounded-[2rem] bg-sol-accent/10 border border-sol-accent/20 transition-all hover:bg-sol-accent/20">
              <div className="flex items-center gap-2 text-sol-accent font-black text-xs uppercase tracking-widest mb-3">
                <GraduationCap size={16} />
                <span>{t("proTip")}</span>
              </div>
              <p className="text-xs text-sol-muted leading-relaxed">
                {t("proTipDescription1")}
              </p>
            </div>
          </div>
        </div>

        {/* Previous / Next Lesson Navigation */}
        <div className="flex items-center gap-4 pt-6 border-t border-sol-border/10">
          {prevLesson ? (
            <Link
              href={`/student/learning/${gradeId}/${prevLesson.id}`}
              className="flex-1 min-w-0 group flex items-center gap-3 sm:gap-4 bg-sol-surface hover:bg-sol-bg border border-sol-border/10 hover:border-sol-accent/30 p-3 sm:p-4 rounded-2xl transition-all shadow-sm active:scale-[0.98] justify-center sm:justify-start"
            >
              <div className="w-10 h-10 shrink-0 rounded-xl bg-transparent flex items-center justify-center text-sol-accent group-hover:-translate-x-1 transition-transform">
                <ArrowLeft size={20} />
              </div>
              <div className="min-w-0 hidden sm:block">
                <div className="text-[10px] font-black uppercase tracking-wider text-sol-muted mb-0.5">
                  {t("prevLesson")}
                </div>
                <div className="text-sm font-black text-sol-text group-hover:text-sol-accent transition-colors truncate">
                  {prevLesson.title}
                </div>
              </div>
            </Link>
          ) : (
            <div
              className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4 bg-sol-muted/10 border border-sol-border/5 p-3 sm:p-4 rounded-2xl opacity-40 cursor-not-allowed justify-center sm:justify-start"
            >
              <div className="w-10 h-10 shrink-0 rounded-xl bg-transparent flex items-center justify-center text-sol-muted">
                <ArrowLeft size={20} />
              </div>
              <div className="min-w-0 hidden sm:block">
                <div className="text-[10px] font-black uppercase tracking-wider text-sol-muted mb-0.5">
                  {t("prevLesson")}
                </div>
                <div className="text-sm font-black text-sol-muted/65 truncate">
                  {t("noLesson")}
                </div>
              </div>
            </div>
          )}

          {nextLesson ? (
            <Link
              href={`/student/learning/${gradeId}/${nextLesson.id}`}
              className="flex-1 min-w-0 group flex items-center justify-between gap-3 sm:gap-4 bg-sol-surface hover:bg-sol-bg border border-sol-border/10 hover:border-sol-accent/30 p-3 sm:p-4 rounded-2xl transition-all shadow-sm active:scale-[0.98] justify-center sm:justify-end text-right"
            >
              <div className="min-w-0 hidden sm:block text-left">
                <div className="text-[10px] font-black uppercase tracking-wider text-sol-muted mb-0.5 text-right">
                  {t("nextLesson")}
                </div>
                <div className="text-sm font-black text-sol-text group-hover:text-sol-accent transition-colors truncate">
                  {nextLesson.title}
                </div>
              </div>
              <div className="w-10 h-10 shrink-0 rounded-xl bg-transparent flex items-center justify-center text-sol-accent group-hover:translate-x-1 transition-transform">
                <ArrowRight size={20} />
              </div>
            </Link>
          ) : (
            <div
              className="flex-1 min-w-0 flex items-center justify-between gap-3 sm:gap-4 bg-sol-muted/10 border border-sol-border/5 p-3 sm:p-4 rounded-2xl opacity-40 cursor-not-allowed justify-center sm:justify-end text-right"
            >
              <div className="min-w-0 hidden sm:block text-left">
                <div className="text-[10px] font-black uppercase tracking-wider text-sol-muted mb-0.5 text-right">
                  {t("nextLesson")}
                </div>
                <div className="text-sm font-black text-sol-muted/65 truncate">
                  {t("noLesson")}
                </div>
              </div>
              <div className="w-10 h-10 shrink-0 rounded-xl bg-transparent flex items-center justify-center text-sol-muted">
                <ArrowRight size={20} />
              </div>
            </div>
          )}
        </div>
      </div>

      <LearningRightSidebar>
        {sidebarContent}
      </LearningRightSidebar>
    </div>
  );
}
