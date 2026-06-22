import { remark } from "remark";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import { cookies } from "next/headers";
import { SERVER_API_BASE_URL } from "@/services/api";

type LessonApiResponse = {
  title_en: string;
  title_vi: string;
  content_markdown_en: string;
  content_markdown_vi: string;
  grade?: { title_vi: string; title_en?: string } | null;
  subject?: { title_vi: string; title_en?: string } | null;
};

export async function getLesson(lessonId: string, locale: string = "vi") {
  try {
    const token = (await cookies()).get("token")?.value;
    const response = await fetch(`${SERVER_API_BASE_URL}/lessons/${encodeURIComponent(lessonId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Failed to fetch lesson ${lessonId}: ${response.status} ${response.statusText}`);
      return null;
    }

    const lesson = (await response.json()) as LessonApiResponse;
    const content = (locale === "vi" ? lesson.content_markdown_vi : lesson.content_markdown_en) || "";
    const title = (locale === "vi" ? lesson.title_vi : lesson.title_en) || "";
    
    const gradeTitle = lesson.grade
      ? (locale === "vi" ? lesson.grade.title_vi : lesson.grade.title_en || lesson.grade.title_vi)
      : "";
    const subjectTitle = lesson.subject
      ? (locale === "vi" ? lesson.subject.title_vi : lesson.subject.title_en || lesson.subject.title_vi)
      : "";
    const description = gradeTitle ? `${gradeTitle}${subjectTitle ? ` - ${subjectTitle}` : ""}` : "";

    const processed = await remark()
      .use(remarkMath)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeStringify)
      .process(content);

    const contentHtml = processed.toString();

    const toc: { id: string; text: string; level: number }[] = [];
    const processedHtml = contentHtml.replace(
      /<h([2-3])>(.*?)<\/h\1>/g,
      (match, level, text) => {
        const cleanText = text.replace(/<[^>]*>?/gm, "").trim();
        // Simpler slugify that is more deterministic across environments
        const id = cleanText
          .toLowerCase()
          .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
          .replace(/[èéẹẻẽêềếệểễ]/g, "e")
          .replace(/[ìíịỉĩ]/g, "i")
          .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
          .replace(/[ùúụủũưừứựửữ]/g, "u")
          .replace(/[ỳýỵỷỹ]/g, "y")
          .replace(/đ/g, "d")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        toc.push({ id, text: cleanText, level: parseInt(level) });
        return `<h${level} id="${id}">${text}</h${level}>`;
      }
    );

    const finalHtml = processedHtml.replace(
      /<pre><code class="language-tikz">([\s\S]*?)<\/code><\/pre>/g,
      (match, code) => {
        const decodedCode = code
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#x3C;/gi, "<")
          .replace(/&#x3E;/gi, ">")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&");

        return `<div class="tikz-diagram bg-sol-surface/50 p-8 rounded-3xl border border-sol-border/20 my-10 flex justify-center overflow-x-auto shadow-inner"><script type="text/tikz">${decodedCode}</script></div>`;
      }
    );

    return {
      contentHtml: finalHtml,
      meta: { title, description },
      toc,
    };
  } catch (error) {
    console.error("Error loading or processing lesson:", error);
    return null;
  }
}
