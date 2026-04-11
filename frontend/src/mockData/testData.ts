// src/mockData/testData.ts

export interface LessonTest {
  id: string;
  gradeId: string;
  title_en: string;
  title_vi: string;
  description_en: string;
  description_vi: string;
  questionCount: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  iconType: "timer" | "medal" | "target";
}

export const testData: LessonTest[] = [
  {
    id: "test-1",
    gradeId: "grade-1",
    title_en: "End of Term Math",
    title_vi: "Kiểm tra Toán cuối kỳ",
    description_en: "A comprehensive test covering counting and basic addition.",
    description_vi: "Bài kiểm tra tổng hợp về đếm số và phép cộng cơ bản.",
    questionCount: 20,
    difficulty: "Intermediate",
    iconType: "medal",
  },
  {
    id: "test-2",
    gradeId: "grade-6",
    title_en: "Advanced Fractions Exam",
    title_vi: "Kỳ thi Phân số nâng cao",
    description_en: "Formal assessment of fraction operations and word problems.",
    description_vi: "Đánh giá chính thức về các phép tính phân số và bài toán có lời văn.",
    questionCount: 25,
    difficulty: "Advanced",
    iconType: "target",
  },
  {
    id: "test-3",
    gradeId: "grade-6",
    title_en: "Geometry Proficiency",
    title_vi: "Kiểm tra năng lực Hình học",
    description_en: "Verify your understanding of circles and volume.",
    description_vi: "Xác nhận sự hiểu biết của bạn về hình tròn và thể tích.",
    questionCount: 15,
    difficulty: "Intermediate",
    iconType: "timer",
  },
];
