import 'dotenv/config';
import prisma from './lib/db';
import * as MathService from './services/mathService';

async function scanAll() {
  try {
    const grades = await prisma.grade.findMany({
      include: {
        lessons: {
          include: { templates: true }
        }
      }
    });

    console.log(`Scanning ${grades.length} grades...`);

    const GAME_SNAPSHOT_TARGETS: Record<string, number> = {
      speed: 24, climb: 18, match: 6, shooter: 20, balance: 16, bubbles: 20
    };
    
    const GAME_COMPATIBLE_TEMPLATE_TYPES: Record<string, string[] | null> = {
      speed: null, climb: null, match: null,
      shooter: ['multiple_choices', 'theoretical_question', 'true_false'],
      balance: ['multiple_choices', 'theoretical_question', 'true_false'],
      bubbles: ['multiple_choices', 'theoretical_question', 'true_false']
    };

    let errorCount = 0;

    // Scan Grades
    for (const grade of grades) {
      const templates = await prisma.questionTemplate.findMany({
        where: { lesson: { grade_id: grade.id } }
      });

      if (templates.length === 0) continue;

      for (const game_type of Object.keys(GAME_SNAPSHOT_TARGETS)) {
        const compatibleTypes = GAME_COMPATIBLE_TEMPLATE_TYPES[game_type];
        const compatibleTemplates = compatibleTypes
          ? templates.filter((t) => compatibleTypes.includes(t.template_type))
          : templates;

        if (compatibleTemplates.length === 0) continue;

        const snapshotTarget = GAME_SNAPSHOT_TARGETS[game_type];
        const shuffledTemplates = [...compatibleTemplates];

        try {
          Array.from({ length: snapshotTarget }, (_, index) => {
            const template = shuffledTemplates[index % shuffledTemplates.length];
            const isTheoretical = template.template_type === 'theoretical_question';
            const vars = isTheoretical ? {} : MathService.generateVars(template.logic_config);
            
            const right_answers = isTheoretical
              ? template.accepted_formulas.slice(0, 1).filter(Boolean)
              : template.accepted_formulas
                  .map((f: string) => MathService.evaluateFormula(f, vars))
                  .filter((ans: string | null) => ans !== null);

            if (!isTheoretical && right_answers.length === 0) {
              throw new Error(`Template ID ${template.id} generated 0 right answers`);
            }

            return { template_id: template.id, right_answers };
          });
        } catch (err: any) {
          console.error(`❌ Grade ID ${grade.id} (${grade.title_en}) for game "${game_type}" failed:`, err.message);
          errorCount++;
        }
      }
    }

    // Scan Lessons
    const lessons = await prisma.lesson.findMany({
      include: { templates: true }
    });

    console.log(`Scanning ${lessons.length} lessons...`);

    for (const lesson of lessons) {
      const templates = lesson.templates;
      if (templates.length === 0) continue;

      for (const game_type of Object.keys(GAME_SNAPSHOT_TARGETS)) {
        const compatibleTypes = GAME_COMPATIBLE_TEMPLATE_TYPES[game_type];
        const compatibleTemplates = compatibleTypes
          ? templates.filter((t) => compatibleTypes.includes(t.template_type))
          : templates;

        if (compatibleTemplates.length === 0) continue;

        const snapshotTarget = GAME_SNAPSHOT_TARGETS[game_type];
        const shuffledTemplates = [...compatibleTemplates];

        try {
          Array.from({ length: snapshotTarget }, (_, index) => {
            const template = shuffledTemplates[index % shuffledTemplates.length];
            const isTheoretical = template.template_type === 'theoretical_question';
            const vars = isTheoretical ? {} : MathService.generateVars(template.logic_config);
            
            const right_answers = isTheoretical
              ? template.accepted_formulas.slice(0, 1).filter(Boolean)
              : template.accepted_formulas
                  .map((f: string) => MathService.evaluateFormula(f, vars))
                  .filter((ans: string | null) => ans !== null);

            if (!isTheoretical && right_answers.length === 0) {
              throw new Error(`Template ID ${template.id} generated 0 right answers`);
            }

            return { template_id: template.id, right_answers };
          });
        } catch (err: any) {
          console.error(`❌ Lesson ID "${lesson.id}" (${lesson.title_en}) for game "${game_type}" failed:`, err.message);
          errorCount++;
        }
      }
    }

    console.log(`\nScan finished. Total question generation errors found: ${errorCount}`);

  } catch (err) {
    console.error("Scan failed globally:", err);
  } finally {
    await prisma.$disconnect();
  }
}

scanAll();
