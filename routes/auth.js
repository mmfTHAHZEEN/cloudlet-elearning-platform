const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, uuid } = require('../data/store');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const existing = [...db.users.values()].find(u => u.email === email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const id = uuid();
  const user = {
    id,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 8),
    role: role === 'instructor' ? 'instructor' : 'student'
  };
  db.users.set(id, user);

  const token = jwt.sign({ id, email, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  res.status(201).json({ token, user: { id, name, email, role: user.role } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = [...db.users.values()].find(u => u.email === email);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

module.exports = router;
