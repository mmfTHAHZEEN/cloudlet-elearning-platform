const express = require('express');
const { db, uuid } = require('../data/store');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/courses/:courseId/quiz  (student takes the quiz - answers hidden)
router.get('/:courseId/quiz', authenticate, (req, res) => {
  const quiz = [...db.quizzes.values()].find(q => q.courseId === req.params.courseId);
  if (!quiz) return res.status(404).json({ error: 'No quiz found for this course' });

  const safeQuiz = {
    id: quiz.id,
    courseId: quiz.courseId,
    questions: quiz.questions.map(q => ({ id: q.id, text: q.text, options: q.options }))
  };
  res.json(safeQuiz);
});

// POST /api/courses/:courseId/quiz  (instructor creates/replaces a quiz)
router.post('/:courseId/quiz', authenticate, requireRole('instructor'), (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'questions array is required' });
  }

  const id = uuid();
  const quiz = {
    id,
    courseId: req.params.courseId,
    questions: questions.map(q => ({
      id: uuid(),
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex
    }))
  };
  db.quizzes.set(id, quiz);
  res.status(201).json(quiz);
});

// POST /api/courses/:courseId/quiz/submit  (student submits answers)
// body: { answers: { [questionId]: selectedIndex } }
router.post('/:courseId/quiz/submit', authenticate, (req, res) => {
  const quiz = [...db.quizzes.values()].find(q => q.courseId === req.params.courseId);
  if (!quiz) return res.status(404).json({ error: 'No quiz found for this course' });

  const { answers } = req.body;
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'answers object is required' });
  }

  let score = 0;
  const breakdown = quiz.questions.map(q => {
    const selected = answers[q.id];
    const correct = selected === q.correctIndex;
    if (correct) score += 1;
    return { questionId: q.id, correct, selected, correctIndex: q.correctIndex };
  });

  const id = uuid();
  const submission = {
    id,
    quizId: quiz.id,
    userId: req.user.id,
    score,
    total: quiz.questions.length,
    submittedAt: new Date().toISOString(),
    breakdown
  };
  db.submissions.set(id, submission);
  res.status(201).json(submission);
});

// GET /api/courses/:courseId/quiz/results  (student's own past results)
router.get('/:courseId/quiz/results', authenticate, (req, res) => {
  const quiz = [...db.quizzes.values()].find(q => q.courseId === req.params.courseId);
  if (!quiz) return res.json([]);

  const results = [...db.submissions.values()]
    .filter(s => s.quizId === quiz.id && s.userId === req.user.id);
  res.json(results);
});

module.exports = router;
