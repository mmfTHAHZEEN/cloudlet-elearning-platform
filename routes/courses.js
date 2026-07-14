const express = require('express');
const { db, uuid } = require('../data/store');
const { authenticate, requireRole } = require('../middleware/auth');
const { getUploadUrl, getPlaybackUrl } = require('../data/s3Storage');

const router = express.Router();

// GET /api/courses  (public - browse catalog)
router.get('/', (req, res) => {
  res.json([...db.courses.values()]);
});

// GET /api/courses/:id
router.get('/:id', (req, res) => {
  const course = db.courses.get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

// POST /api/courses  (instructor only)
router.post('/', authenticate, requireRole('instructor'), (req, res) => {
  const { title, description, videoUrl } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const id = uuid();
  const course = { id, title, description: description || '', instructorId: req.user.id, videoUrl: videoUrl || null };
  db.courses.set(id, course);
  res.status(201).json(course);
});

// POST /api/courses/:id/enroll  (student)
router.post('/:id/enroll', authenticate, (req, res) => {
  const course = db.courses.get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const already = [...db.enrollments.values()]
    .find(e => e.userId === req.user.id && e.courseId === course.id);
  if (already) return res.status(200).json(already);

  const id = uuid();
  const enrollment = { id, userId: req.user.id, courseId: course.id, enrolledAt: new Date().toISOString() };
  db.enrollments.set(id, enrollment);
  res.status(201).json(enrollment);
});

// GET /api/courses/:id/students (instructor - roster)
router.get('/:id/students', authenticate, requireRole('instructor'), (req, res) => {
  const roster = [...db.enrollments.values()]
    .filter(e => e.courseId === req.params.id)
    .map(e => {
      const u = db.users.get(e.userId);
      return { userId: e.userId, name: u?.name, email: u?.email, enrolledAt: e.enrolledAt };
    });
  res.json(roster);
});

// POST /api/courses/:id/upload-url  (instructor - get a presigned S3 upload URL)
// The frontend PUTs the video file directly to this URL - it never
// passes through the API, so there's no payload size limit.
router.post('/:id/upload-url', authenticate, requireRole('instructor'), async (req, res) => {
  const course = db.courses.get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const { filename, contentType } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename is required' });

  try {
    const key = `courses/${course.id}/${uuid()}-${filename}`;
    const uploadUrl = await getUploadUrl(key, contentType || 'video/mp4');
    course.videoKey = key;
    res.json({ uploadUrl, key, expiresIn: 300 });
  } catch (err) {
    res.status(500).json({ error: 'Could not generate upload URL - check AWS credentials/bucket config' });
  }
});

// GET /api/courses/:id/video-url  (enrolled users - get a time-limited playback URL)
router.get('/:id/video-url', authenticate, async (req, res) => {
  const course = db.courses.get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (!course.videoKey) return res.status(404).json({ error: 'No video uploaded for this course yet' });

  try {
    const url = await getPlaybackUrl(course.videoKey);
    res.json({ url, expiresIn: 3600 });
  } catch (err) {
    res.status(500).json({ error: 'Could not generate playback URL - check AWS credentials/bucket config' });
  }
});

module.exports = router;