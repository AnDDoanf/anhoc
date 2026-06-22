import 'dotenv/config';
import prisma from './lib/db';
import * as MathService from './services/mathService';

async function diagnose() {
  try {
    console.log("Fetching grades and lessons with templates...");
    const grades = await prisma.grade.findMany({
      include: { lessons: { include: { templates: true } } }
    });
    
    console.log(`Found ${grades.length} grades.`);
    const gradeWithTemplates = grades.find(g => g.lessons.some(l => l.templates.length > 0));
    if (!gradeWithTemplates) {
      console.log("No grades with templates found!");
      return;
    }
    
    console.log(`Diagnosing for Grade ID: ${gradeWithTemplates.id} (${gradeWithTemplates.title_en})`);
    
    // Let's test for each game type
    const gameTypes = ['speed', 'climb', 'match', 'shooter', 'balance', 'bubbles'];
    
    const templates = await prisma.questionTemplate.findMany({
      where: { lesson: { grade_id: gradeWithTemplates.id } }
    });
    
    console.log(`Found ${templates.length} templates for this grade.`);
    
    const GAME_SNAPSHOT_TARGETS: Record<string, number> = {
      speed: 24,
      climb: 18,
      match: 6,
      shooter: 20,
      balance: 16,
      bubbles: 20
    };
    
    const GAME_COMPATIBLE_TEMPLATE_TYPES: Record<string, string[] | null> = {
      speed: null,
      climb: null,
      match: null,
      shooter: ['multiple_choices', 'theoretical_question', 'true_false'],
      balance: ['multiple_choices', 'theoretical_question', 'true_false'],
      bubbles: ['multiple_choices', 'theoretical_question', 'true_false']
    };

    for (const game_type of gameTypes) {
      console.log(`\n--- Testing game type: ${game_type} ---`);
      const compatibleTypes = GAME_COMPATIBLE_TEMPLATE_TYPES[game_type] ?? null;
      const compatibleTemplates = compatibleTypes
        ? templates.filter((template) => compatibleTypes.includes(template.template_type))
        : templates;

      console.log(`Compatible templates count: ${compatibleTemplates.length}`);
      if (compatibleTemplates.length === 0) {
        console.log("Skipping due to 0 compatible templates.");
        continue;
      }

      const snapshotTarget = GAME_SNAPSHOT_TARGETS[game_type] ?? 15;
      const shuffledTemplates = [...compatibleTemplates].sort(() => 0.5 - Math.random());
      
      try {
        const questions = Array.from({ length: snapshotTarget }, (_, index) => {
          const template = shuffledTemplates[index % shuffledTemplates.length];
          const isTheoretical = template.template_type === 'theoretical_question';
          const vars = isTheoretical ? {} : MathService.generateVars(template.logic_config);
          
          const right_answers = isTheoretical
            ? template.accepted_formulas.slice(0, 1).filter(Boolean)
            : template.accepted_formulas
                .map((f: string) => MathService.evaluateFormula(f, vars))
                .filter((ans: string | null) => ans !== null);

          return {
            template_id: template.id,
            template_type: template.template_type,
            body_template_en: template.body_template_en,
            body_template_vi: template.body_template_vi,
            logic_config: template.logic_config,
            accepted_formulas: template.accepted_formulas,
            generated_variables: vars,
            right_answers
          };
        });
        console.log(`Successfully generated ${questions.length} questions for ${game_type}!`);
      } catch (err: any) {
        console.error(`ERROR generating questions for ${game_type}:`, err);
      }
    }
  } catch (err) {
    console.error("Diagnosis failed globally:", err);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
