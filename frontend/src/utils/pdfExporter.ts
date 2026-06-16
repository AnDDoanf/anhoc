import { jsPDF } from "jspdf";
import { formatTemplate } from "./mathService";
import { getChoiceOptions, getOrderingItems, normalizeQuestionType } from "./questionType";

export const cleanMathText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\$\$(.*?)\$\$/g, "$1")
    .replace(/\$(.*?)\$/g, "$1")
    .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, "($1)/($2)")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\le/g, "≤")
    .replace(/\\ge/g, "≥")
    .replace(/\\ne/g, "≠")
    .replace(/\\pi/g, "π")
    .replace(/\\infty/g, "∞")
    .replace(/\\theta/g, "θ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\sqrt\{(.*?)\}/g, "√($1)")
    .replace(/\\pm/g, "±");
};

const translations = {
  en: {
    name: "Name: _________________________________",
    class: "Class: _____________",
    date: "Date: _____________",
    questions: "QUESTIONS",
    solutionsKey: "SOLUTIONS KEY & EXPLANATIONS",
    answerLabel: "Answer: _________________________________",
    trueLabel: "True",
    falseLabel: "False",
    orderLabel: "Order: _________________________________",
    solutionLabel: "Question {num} Answer: ",
    explanationLabel: "Explanation: ",
    page: "Page",
    of: "of"
  },
  vi: {
    name: "Họ và tên: _______________________________",
    class: "Lớp: _____________",
    date: "Ngày: _____________",
    questions: "CÂU HỎI BÀI TẬP",
    solutionsKey: "ĐÁP ÁN & LỜI GIẢI CHI TIẾT",
    answerLabel: "Đáp án: _________________________________",
    trueLabel: "Đúng",
    falseLabel: "Sai",
    orderLabel: "Thứ tự: _________________________________",
    solutionLabel: "Đáp án Câu {num}: ",
    explanationLabel: "Lời giải chi tiết: ",
    page: "Trang",
    of: "trên"
  }
};

export const exportWorksheetPDF = async (
  title: string,
  questions: any[],
  locale: string,
  isExam: boolean
) => {
  const t = translations[locale === "vi" ? "vi" : "en"];
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // 1. Fetch and Load Unicode Font (Roboto) to support Vietnamese characters
  try {
    const fontUrl = window.location.origin + "/Roboto-Regular.ttf";
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error("Failed to fetch font");
    const fontBuffer = await response.arrayBuffer();

    const bytes = new Uint8Array(fontBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Font = btoa(binary);

    doc.addFileToVFS("Roboto-Regular.ttf", base64Font);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");
  } catch (err) {
    console.warn("Could not load Unicode font. Falling back to Helvetica.", err);
    doc.setFont("helvetica");
  }

  const margin = 20;
  const pageHeight = 297;
  const pageWidth = 210;
  const contentWidth = pageWidth - 2 * margin; // 170mm
  let y = margin;

  // Header and Footer Drawing helpers
  const drawRunningHeader = (pageNumber: number) => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    // Draw running header top line
    doc.text("ANHOC LEARNING PLATFORM", margin, 12);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, 14, pageWidth - margin, 14);
  };

  const checkPageOverflow = (neededHeight: number, isSolutionsSection: boolean = false) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin + 5;
      drawRunningHeader(doc.getNumberOfPages());
    }
  };

  // --- PART 1: QUESTIONS SHEET ---
  // A. Cover Title & Header
  doc.setFontSize(16);
  doc.setFont("Roboto", "normal"); // standard style, we set text weight with sizes
  doc.setTextColor(33, 33, 33);
  
  // Title
  doc.text(title.toUpperCase(), margin, y);
  y += 8;

  // Student details info block
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(t.name, margin, y);
  doc.text(t.class, margin + 85, y);
  doc.text(t.date, margin + 125, y);
  y += 8;

  // Horizontal divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Draw Questions Title
  doc.setFontSize(12);
  doc.setTextColor(33, 33, 33);
  doc.text(t.questions, margin, y);
  y += 8;

  // Store options per question so we can retrieve correct answers later in the solution sheet
  const questionsWithOptions: any[] = [];

  questions.forEach((q: any, idx: number) => {
    const questionType = normalizeQuestionType(q.template?.template_type);
    
    // Process templates with generated variables
    const bodyEn = q.template?.body_template_en ? formatTemplate(q.template.body_template_en, q.generated_variables) : "";
    const bodyVi = q.template?.body_template_vi ? formatTemplate(q.template.body_template_vi, q.generated_variables) : "";
    const originalText = locale === "vi" ? bodyVi : bodyEn;
    const bodyText = cleanMathText(originalText);

    // Resolve options (scrambled)
    let choiceOptions: any[] = [];
    if (questionType === "multiple_choices" || questionType === "theoretical_question") {
      choiceOptions = getChoiceOptions(q.template, q.generated_variables, locale);
    } else if (questionType === "ordering") {
      choiceOptions = getOrderingItems(q.template, q.generated_variables, locale);
    }

    questionsWithOptions.push({
      ...q,
      resolvedType: questionType,
      resolvedBody: bodyText,
      resolvedChoices: choiceOptions
    });

    // Estimate height of question statement
    doc.setFontSize(11);
    const qLabel = `${idx + 1}. `;
    const splitBody = doc.splitTextToSize(bodyText, contentWidth - 8);
    const bodyHeight = splitBody.length * 5.5;

    // Estimate height of choices/write-ins
    let choiceHeight = 0;
    let optionLayout: "inline" | "two-column" | "vertical" = "vertical";
    let formattedChoices: string[][] = [];

    if (questionType === "multiple_choices" || questionType === "theoretical_question") {
      const maxOptLength = Math.max(...choiceOptions.map(opt => opt.label.length), 0);
      if (maxOptLength <= 15) {
        optionLayout = "inline";
        choiceHeight = 6;
      } else if (maxOptLength <= 38) {
        optionLayout = "two-column";
        // split choices for double column
        formattedChoices = choiceOptions.map(opt => doc.splitTextToSize(opt.label, 70));
        const row1Height = Math.max(formattedChoices[0]?.length || 0, formattedChoices[1]?.length || 0) * 5;
        const row2Height = Math.max(formattedChoices[2]?.length || 0, formattedChoices[3]?.length || 0) * 5;
        choiceHeight = row1Height + row2Height + 4;
      } else {
        optionLayout = "vertical";
        formattedChoices = choiceOptions.map(opt => doc.splitTextToSize(opt.label, contentWidth - 10));
        choiceHeight = formattedChoices.reduce((acc, splitOpt) => acc + splitOpt.length * 5 + 2, 0);
      }
    } else if (questionType === "true_false") {
      choiceHeight = 6;
    } else if (questionType === "ordering") {
      // Ordering prints the items list, then a write-in line
      formattedChoices = choiceOptions.map(opt => doc.splitTextToSize(opt.label, contentWidth - 10));
      const itemsHeight = formattedChoices.reduce((acc, splitOpt) => acc + splitOpt.length * 5 + 2, 0);
      choiceHeight = itemsHeight + 10; // items list + ordering write-in line
    } else {
      // numeric_input
      choiceHeight = 10; // spacing for answer line
    }

    const totalQuestionHeight = bodyHeight + choiceHeight + 8; // question body + choices + padding
    checkPageOverflow(totalQuestionHeight);

    // Draw question text
    doc.setFontSize(11);
    doc.setTextColor(33, 33, 33);
    doc.text(qLabel, margin, y);
    doc.text(splitBody, margin + 6, y);
    y += bodyHeight + 3;

    // Draw answer options/inputs
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);

    if (questionType === "multiple_choices" || questionType === "theoretical_question") {
      const letters = ["A", "B", "C", "D", "E", "F"];
      if (optionLayout === "inline") {
        let currentX = margin + 6;
        choiceOptions.forEach((opt, oIdx) => {
          const optText = `${letters[oIdx]}. ${cleanMathText(opt.label)}`;
          doc.text(optText, currentX, y);
          currentX += 42.5; // split 170mm by 4 columns
        });
        y += choiceHeight;
      } else if (optionLayout === "two-column") {
        // Option A (col 1, row 1)
        doc.text(`${letters[0]}. `, margin + 6, y);
        doc.text(formattedChoices[0], margin + 12, y);

        // Option B (col 2, row 1)
        doc.text(`${letters[1]}. `, margin + 90, y);
        doc.text(formattedChoices[1], margin + 96, y);

        const row1Height = Math.max(formattedChoices[0]?.length || 0, formattedChoices[1]?.length || 0) * 5;
        y += row1Height + 2;

        // Option C (col 1, row 2)
        doc.text(`${letters[2]}. `, margin + 6, y);
        doc.text(formattedChoices[2], margin + 12, y);

        // Option D (col 2, row 2)
        doc.text(`${letters[3]}. `, margin + 90, y);
        doc.text(formattedChoices[3], margin + 96, y);

        const row2Height = Math.max(formattedChoices[2]?.length || 0, formattedChoices[3]?.length || 0) * 5;
        y += row2Height + 2;
      } else {
        // vertical layout
        choiceOptions.forEach((opt, oIdx) => {
          const optPrefix = `${letters[oIdx]}. `;
          doc.text(optPrefix, margin + 6, y);
          doc.text(formattedChoices[oIdx], margin + 12, y);
          y += formattedChoices[oIdx].length * 5 + 2;
        });
      }
    } else if (questionType === "true_false") {
      const tfText = locale === "vi"
        ? `[  ] ${t.trueLabel}      [  ] ${t.falseLabel}`
        : `[  ] ${t.trueLabel}      [  ] ${t.falseLabel}`;
      doc.text(tfText, margin + 6, y);
      y += choiceHeight;
    } else if (questionType === "ordering") {
      const letters = ["A", "B", "C", "D", "E", "F", "G"];
      // Scrambled items listing
      choiceOptions.forEach((opt, oIdx) => {
        const itemText = `${letters[oIdx]}. ${cleanMathText(opt.label)}`;
        doc.text(itemText, margin + 6, y);
        y += formattedChoices[oIdx].length * 5 + 2;
      });
      // Order line
      doc.text(t.orderLabel, margin + 6, y);
      y += 8;
    } else {
      // numeric_input
      doc.text(t.answerLabel, margin + 6, y);
      y += choiceHeight;
    }

    y += 5; // bottom spacing
  });

  // --- PART 2: SOLUTIONS KEY SHEET ---
  doc.addPage();
  y = margin + 5;
  drawRunningHeader(doc.getNumberOfPages());

  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text(t.solutionsKey, margin, y);
  y += 10;

  questionsWithOptions.forEach((q: any, idx: number) => {
    const questionType = q.resolvedType;
    let answerText = "";

    if (questionType === "multiple_choices" || questionType === "theoretical_question") {
      const correctIdx = q.resolvedChoices.findIndex((opt: any) => q.right_answers.includes(opt.value));
      if (correctIdx !== -1) {
        const letter = String.fromCharCode(65 + correctIdx);
        answerText = `${letter}. ${cleanMathText(q.resolvedChoices[correctIdx].label)}`;
      } else {
        answerText = cleanMathText(q.right_answers.join(", "));
      }
    } else if (questionType === "true_false") {
      const val = q.right_answers[0];
      const isTrue = val === "true" || val === true;
      answerText = isTrue ? t.trueLabel : t.falseLabel;
    } else if (questionType === "ordering") {
      const correctVals = q.right_answers[0]?.split(",") || [];
      const letterSeq = correctVals.map((val: string) => {
        const cIdx = q.resolvedChoices.findIndex((opt: any) => opt.value === val);
        return cIdx !== -1 ? String.fromCharCode(65 + cIdx) : val;
      }).join(", ");
      answerText = letterSeq;
    } else {
      // numeric_input
      answerText = cleanMathText(q.right_answers.join(", "));
    }

    const explanationEn = q.template?.explanation_template_en ? formatTemplate(q.template.explanation_template_en, q.generated_variables) : "";
    const explanationVi = q.template?.explanation_template_vi ? formatTemplate(q.template.explanation_template_vi, q.generated_variables) : "";
    const explanationText = cleanMathText(locale === "vi" ? (explanationVi || explanationEn) : (explanationEn || explanationVi));

    // Estimate blocks height for solution
    doc.setFontSize(11);
    const solLabel = t.solutionLabel.replace("{num}", String(idx + 1));
    const splitSolution = doc.splitTextToSize(`${solLabel}${answerText}`, contentWidth - 6);
    let solBlockHeight = splitSolution.length * 5.5 + 2;

    let splitExplanation: string[] = [];
    if (explanationText) {
      splitExplanation = doc.splitTextToSize(`${t.explanationLabel}${explanationText}`, contentWidth - 6);
      solBlockHeight += splitExplanation.length * 5 + 4;
    }

    checkPageOverflow(solBlockHeight + 6, true);

    // Draw Answer Key
    doc.setFontSize(11);
    doc.setTextColor(16, 117, 107); // Sol accent teal color
    doc.text(splitSolution, margin, y);
    y += splitSolution.length * 5.5 + 1;

    // Draw Explanation
    if (explanationText) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(splitExplanation, margin, y);
      y += splitExplanation.length * 5 + 3;
    }

    y += 4; // spacing between solution key blocks
  });

  // --- POST PROCESSING: Page numbering ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    // Draw footer page number
    const pageString = `${t.page} ${i} ${t.of} ${totalPages}`;
    doc.text(pageString, pageWidth / 2, pageHeight - 10, { align: "center" });
  }

  // Save the document
  const cleanSlug = title
    .toLowerCase()
    .replace(/^(worksheet|exam|bảng bài tập|đề thi)\s*:\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const prefix = isExam ? "anhoc-exam" : "anhoc-worksheet";
  const fileName = `${prefix}-${cleanSlug}.pdf`;
  doc.save(fileName);
};
