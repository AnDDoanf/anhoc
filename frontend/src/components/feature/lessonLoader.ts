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
  // 🔥 Read file
  const file = fs.readFileSync(filePath, "utf-8");

  // 🔥 Parse frontmatter
  const { content, data } = matter(file);

  // 🔥 Process markdown WITH math support
  const processed = await remark()
    .use(remarkMath)        // parse $...$
    .use(remarkRehype)
    .use(rehypeKatex)       // render math
    .use(rehypeStringify)
    .process(content);

  const contentHtml = processed.toString();

  // 🔥 Extract TOC manually (H2, H3)
  const toc: { id: string; text: string; level: number }[] = [];
  const processedHtml = contentHtml.replace(
    /<h([2-3])>(.*?)<\/h\1>/g,
    (match, level, text) => {
      // Create a clean ID from the text (strip HTML tags first)
      const cleanText = text.replace(/<[^>]*>?/gm, "");
      const id = cleanText
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");

      toc.push({ id, text: cleanText, level: parseInt(level) });
      return `<h${level} id="${id}">${text}</h${level}>`;
    }
  );

  // 🎨 Transform <pre><code class="language-tikz">...</code></pre> to <script type="text/tikz">...</script>
  const finalHtml = processedHtml.replace(
    /<pre><code class="language-tikz">([\s\S]*?)<\/code><\/pre>/g,
    (match, code) => {
      // Decode HTML entities (remark-html might have encoded them differently)
      const decodedCode = code
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#x3C;/gi, "<") // Catch hex entities like &#x3C;
        .replace(/&#x3E;/gi, ">") // Catch hex entities like &#x3E;
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");

      // Wrap in a styled container and script tag for TikZJax
      return `<div class="tikz-diagram bg-sol-surface/50 p-8 rounded-3xl border border-sol-border/20 my-10 flex justify-center overflow-x-auto shadow-inner"><script type="text/tikz">${decodedCode}</script></div>`;
    }
  );

  return {
    contentHtml: finalHtml,
    meta: data,
    toc,
  };
}