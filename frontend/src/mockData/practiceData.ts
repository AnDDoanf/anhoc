// src/mockData/practiceData.ts

export interface LessonPractice {
  id: string;
  gradeId: string;
  title_en: string;
  title_vi: string;
  description_en: string;
  description_vi: string;
  exerciseCount: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  iconType: "math" | "logic" | "geometry" | "numbers";
}

export const practiceData: LessonPractice[] = [
  {
    id: "lesson-1",
    gradeId: "grade-1",
    title_en: "Basic Counting",
    title_vi: "Đếm số cơ bản",
    description_en: "Learn to count from 1 to 10 with fun exercises.",
    description_vi: "Học đếm từ 1 đến 10 với các bài tập thú vị.",
    exerciseCount: 15,
    difficulty: "Beginner",
    iconType: "numbers",
  },
  {
    id: "lesson-2",
    gradeId: "grade-1",
    title_en: "Addition Basics",
    title_vi: "Phép cộng cơ bản",
    description_en: "Simple addition for beginners.",
    description_vi: "Phép cộng đơn giản cho người mới bắt đầu.",
    exerciseCount: 12,
    difficulty: "Beginner",
    iconType: "math",
  },
  {
    id: "lesson-5",
    gradeId: "grade-6",
    title_en: "Mastering Fractions",
    title_vi: "Làm chủ phân số",
    description_en: "Advanced subtraction and multiplication of fractions.",
    description_vi: "Phép trừ và phép nhân phân số nâng cao.",
    exerciseCount: 20,
    difficulty: "Intermediate",
    iconType: "math",
  },
  {
    id: "lesson-6",
    gradeId: "grade-6",
    title_en: "Geometric Shapes",
    title_vi: "Hình học cơ bản",
    description_en: "Explore circles, triangles, and squares.",
    description_vi: "Khám phá hình tròn, hình tam giác và hình vuông.",
    exerciseCount: 10,
    difficulty: "Beginner",
    iconType: "geometry",
  },
];
