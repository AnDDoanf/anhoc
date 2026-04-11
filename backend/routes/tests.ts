import { Router } from 'express';
import prisma from '../lib/db';
import * as MathService from '../services/mathService';
import { authenticate } from '../middleware/auth';

const router = Router();

// 1. Start a Test Attempt (Generate specific numbers for the kid)
router.post('/:test_id/start', authenticate, async (req, res) => {
  const test_id = Array.isArray(req.params.test_id) ? req.params.test_id[0] : req.params.test_id;
  const userId = (req as any).user.id; // From Auth Middleware

  // Fetch templates associated with this test
  const testMap = await prisma.testTemplateMap.findMany({
    where: { test_id },
    include: { template: true }
  });

  // Create the Attempt record
  const attempt = await prisma.testAttempt.create({
    data: { user_id: userId, test_id }
  });

  // Generate snapshots for each question in the test
  const questions = testMap.map((m: typeof testMap[number]) => {
    const vars = MathService.generateVars(m.template.logic_config);
    return {
      attemptId: attempt.id,
      templateId: m.template.id,
      generatedVariables: vars,
      bodyText: MathService.formatTemplate(m.template.body_template_vi, vars)
    };
  });

  // Batch save snapshots
  await prisma.questionSnapshot.createMany({
    data: questions.map((q: typeof questions[number]) => ({
      // Change attemptId to attempt_id
      attempt_id: q.attemptId,

      // Change templateId to template_id
      template_id: q.templateId,

      // Change generatedVariables to generated_variables
      generated_variables: q.generatedVariables as any
    }))
  });

  res.json({ attemptId: attempt.id, questions });
});

// 2. Submit Answer for a Snapshot
router.post('/submit-answer', async (req, res) => {
  const { snapshotId, studentAnswer } = req.body;

  const snapshot = await prisma.questionSnapshot.findUnique({
    where: { id: snapshotId },
    include: { template: true }
  });

  if (!snapshot || !snapshot.template) return res.status(404).send("Question not found");

  const primaryFormula = (snapshot.template.accepted_formulas?.[0]) || "0";
  const isCorrect = MathService.checkAnswer(
    primaryFormula,
    snapshot.generated_variables,
    studentAnswer,
    snapshot.template.accepted_formulas?.slice(1)
  );

  const updated = await prisma.questionSnapshot.update({
    where: { id: snapshotId },
    data: {
      studentAnswer,
      isCorrect,
      points_earned: isCorrect ? 10 : 0, // Logic for weighting
      responded_at: new Date()
    }
  });

  res.json({ isCorrect, explanation: snapshot.template.explanation_template_vi });
});

// 3. Create Question Template (Admin)
router.post('/templates', authenticate, async (req, res) => {
  try {
    const { 
      lesson_id, template_type, 
      body_template_en, body_template_vi, 
      explanation_template_en, explanation_template_vi, 
      logic_config, accepted_formulas
    } = req.body;

    const template = await prisma.questionTemplate.create({
      data: {
        lesson_id: lesson_id || null,
        template_type,
        body_template_en,
        body_template_vi,
        explanation_template_en,
        explanation_template_vi,
        logic_config: logic_config || {},
        accepted_formulas: Array.isArray(accepted_formulas) ? accepted_formulas : []
      }
    });

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create template", details: error.message });
  }
});

// Get all Question Templates (Admin)
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await prisma.questionTemplate.findMany({
      include: { lesson: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Update a Question Template
router.put('/templates/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { 
      lesson_id, template_type, 
      body_template_en, body_template_vi, 
      explanation_template_en, explanation_template_vi, 
      logic_config, accepted_formulas
    } = req.body;

    const template = await prisma.questionTemplate.update({
      where: { id },
      data: {
        lesson_id: lesson_id || null,
        template_type,
        body_template_en,
        body_template_vi,
        explanation_template_en,
        explanation_template_vi,
        logic_config: logic_config || {},
        accepted_formulas: Array.isArray(accepted_formulas) ? accepted_formulas : []
      }
    });

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update template" });
  }
});

// Delete a Question Template
router.delete('/templates/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    await prisma.questionTemplate.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete template" });
  }
});

export default router;