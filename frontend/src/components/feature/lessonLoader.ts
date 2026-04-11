// src/components/feature/lessonLoader.ts

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { remark } from "remark";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

const basePath = path.join(process.cwd(), "src/content/lessons");

export async function getLesson(gradeId: string, lessonId: string) {
  const filePath = path.join(basePath, gradeId, `${lessonId}.md`);
  const file = fs.readFileSync(filePath, "utf-8");

  const { content, data } = matter(file);

  const processed = await remark()
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(content);

  const contentHtml = processed.toString();

  const toc: { id: string; text: string; level: number }[] = [];
  const processedHtml = contentHtml.replace(
    /<h([2-3])>(.*?)<\/h\1>/g,
    (match, level, text) => {
      const cleanText = text.replace(/<[^>]*>?/gm, "");
      const id = cleanText
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");

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
    meta: data,
    toc,
  };
}