import 'dotenv/config';
import prisma from './lib/db';
import * as MathService from './services/mathService';

async function generateUniqueGameCode(): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  
  while (!isUnique) {
    code = 'G-';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const existing = await prisma.gameChallenge.findUnique({
      where: { code }
    });
    
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
}

async function testInsert() {
  try {
    console.log("Looking for a user in the database...");
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error("No user found in database!");
      return;
    }
    console.log(`Using user: ${user.username} (${user.id})`);

    console.log("Looking for a lesson...");
    const lesson = await prisma.lesson.findFirst({
      include: { templates: true }
    });
    if (!lesson) {
      console.error("No lesson found in database!");
      return;
    }
    console.log(`Using lesson: ${lesson.title_en} (${lesson.id})`);

    if (lesson.templates.length === 0) {
      console.error("Lesson has no templates!");
      return;
    }

    const template = lesson.templates[0];
    const isTheoretical = template.template_type === 'theoretical_question';
    const vars = isTheoretical ? {} : MathService.generateVars(template.logic_config);
    const right_answers = isTheoretical
      ? template.accepted_formulas.slice(0, 1).filter(Boolean)
      : template.accepted_formulas
          .map((f: string) => MathService.evaluateFormula(f, vars))
          .filter((ans: string | null) => ans !== null);

    const questions = [{
      template_id: template.id,
      template_type: template.template_type,
      body_template_en: template.body_template_en,
      body_template_vi: template.body_template_vi,
      logic_config: template.logic_config,
      accepted_formulas: template.accepted_formulas,
      generated_variables: vars,
      right_answers
    }];

    const code = await generateUniqueGameCode();
    console.log(`Generated code: ${code}`);

    console.log("Attempting prisma.gameChallenge.create...");
    const challenge = await prisma.gameChallenge.create({
      data: {
        code,
        game_type: 'speed',
        lesson_id: lesson.id,
        grade_id: lesson.grade_id,
        created_by: user.id,
        config: { questions }
      }
    });

    console.log("SUCCESS! Created challenge:", challenge);
  } catch (error: any) {
    console.error("DATABASE INSERTION FAILED!");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testInsert();
