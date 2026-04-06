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

  const isCorrect = MathService.checkAnswer(
    snapshot.template.answer_formula || "0",
    snapshot.generated_variables,
    studentAnswer
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

export default router;