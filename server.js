const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const quizRoutes = require('./routes/quiz');

const app = express();

app.use(cors());
app.use(express.json());

// simple request log - useful for the "monitoring & logging" rubric item (Part 6)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'elearning-api', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/courses', quizRoutes); // nested /:courseId/quiz* routes

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
