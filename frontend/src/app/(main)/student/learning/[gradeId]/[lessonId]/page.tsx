// app/student/learning/[gradeId]/[lessonId]/page.tsx

import { getLesson } from "@/components/feature/lessonLoader";
import TableOfContents from "@/components/feature/TableOfContents";
import LearningRightSidebar from "@/components/feature/LearningRightSidebar";

type Props = {
  params: Promise<{
    gradeId: string;
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: Props) {
  const { gradeId, lessonId } = await params;
  const lesson = await getLesson(gradeId, lessonId);

  // Split content by thematic breaks (---) which become <hr> in HTML
  // Using regex to catch various formats of <hr>
  const sections = lesson.contentHtml.split(/<hr\s*\/?>/i);

  return (
    <div className="flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto mb-20 px-4">
      <div className="flex-1 min-w-0 space-y-8">
        {/* Main Header Block */}
        <header className="bg-sol-surface/40 p-8 md:p-12 rounded-[2.5rem] border border-sol-border/10 shadow-sm">
          <div className="flex items-center gap-2 text-sol-accent text-sm font-bold uppercase tracking-widest mb-6">
            <span className="w-8 h-px bg-sol-accent/30"></span>
            <span>Lesson Overview</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-sol-text tracking-tight mb-6 leading-[1.1]">
            {lesson.meta.title}
          </h1>
          <p className="text-xl text-sol-muted leading-relaxed max-w-2xl">
            {lesson.meta.description}
          </p>
        </header>

        {/* Content Blocks */}
        {sections.map((sectionHtml, idx) => (
          <article
            key={idx}
            className="bg-sol-surface/30 p-8 md:p-12 rounded-[2.5rem] border border-sol-border/10 shadow-sm hover:shadow-xl hover:bg-sol-surface/40 transition-all duration-500 relative group overflow-hidden"
          >
            {/* Section Index Indicator */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-sol-accent/5 rounded-full flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform duration-700">
              <span className="text-3xl font-black text-sol-accent/10">{idx + 1}</span>
            </div>

            <div
              className="lesson-content max-w-none 
                [&>h2]:text-3xl [&>h2:first-child]:mt-0 [&>h2]:font-bold [&>h2]:mt-16 [&>h2]:mb-8 [&>h2]:text-sol-text [&>h2]:flex [&>h2]:items-center [&>h2]:gap-4
                [&>h3]:text-2xl [&>h3:first-child]:mt-0 [&>h3]:font-bold [&>h3]:mt-10 [&>h3]:mb-6 [&>h3]:text-sol-text
                [&>p]:text-lg [&>p]:mb-8 [&>p]:leading-[1.9] [&>p]:text-sol-text/90
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-10 [&_ul]:space-y-4 [&_ul]:text-sol-text/80
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-10 [&_ol]:space-y-4 [&_ol]:text-sol-text/80
                [&_li]:text-lg [&_li]:pl-2 [&_li]:leading-[1.9]
                [&_.katex-display]:text-center [&_.katex-display]:my-12 [&_.katex-display]:w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden
                [&>pre]:bg-sol-bg/50 [&>pre]:p-8 [&>pre]:rounded-2xl [&>pre]:border [&>pre]:border-sol-border/20 [&>pre]:my-10 [&>pre]:shadow-inner
                [&>blockquote]:border-l-4 [&>blockquote]:border-sol-accent [&>blockquote]:pl-8 [&>blockquote]:italic [&>blockquote]:my-10 [&>blockquote]:text-sol-muted [&>blockquote]:bg-sol-accent/5 [&>blockquote]:py-6 [&>blockquote]:pr-6 [&>blockquote]:rounded-r-2xl"
              dangerouslySetInnerHTML={{ __html: sectionHtml }}
            />
          </article>
        ))}
      </div>

      <LearningRightSidebar>
        <TableOfContents toc={lesson.toc} />
      </LearningRightSidebar>
    </div>
  );
}
