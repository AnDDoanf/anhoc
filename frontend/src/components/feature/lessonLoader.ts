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

  return {
    contentHtml: processed.toString(),
    meta: data,
  };
}